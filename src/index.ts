export type GenericIndexable<T> = { [key: number]: T, readonly length: number };
type TypedArray =
  Int8Array
  | Int16Array
  | Int32Array
  | Uint8Array
  | Uint16Array
  | Uint32Array
  | Float32Array
  | Float64Array;
export type Indexable<T> = string | T[] | TypedArray | GenericIndexable<T>;

export interface Sliceable<T> extends GenericIndexable<T> {
  slice(start: number, end?: number): this;
}

type Vec4 = [number, number, number, number];
type Vec3 = [number, number, number];


// Find the list of differences between 2 lists by
// recursive subdivision, requring O(min(N,M)) space
// and O(min(N,M)*D) worst-case execution time where
// D is the number of differences.
export function* diff_rec<T extends Indexable<unknown>>(xs: T, i: number, N: number, ys: T, j: number, M: number): Generator<Vec4> {
  let Z = (Math.min(N, M) + 1) * 2;

  const b = new ArrayBuffer(8 * Z);
  const g = new Int32Array(b, 0, Z);
  const p = new Int32Array(b, 4 * Z, Z);

  let [x, y, u, v, z, s] = [0, 0, 0, 0, 0, 0];
  // previous difference used to disambiguate the results
  let [pxs, pxe, pys, pye] = [-1, -1, -1, -1];
  const stack: Vec4[] = [];
  for (; ;) {
    Z_block: while (N > 0 && M > 0) {
      Z = (Math.min(N, M) + 1) * 2;
      g.fill(0, 0, Z);
      p.fill(0, 0, Z);

      const W = N - M;
      const L = N + M;
      const parity = L & 1;
      const offsetx = i + N - 1;
      const offsety = j + M - 1;
      const hmax = (L + parity) / 2;
      h_loop: for (let h = 0; h <= hmax; h++) {
        const kmin = 2 * Math.max(0, h - M) - h;
        const kmax = h - 2 * Math.max(0, h - N);

        // Forward pass
        for (let k = kmin; k <= kmax; k += 2) {
          const Zk = (k % Z) + Z;
          const gkm = g[(Zk - 1) % Z];
          const gkp = g[(Zk + 1) % Z];
          x = u = (k === -h || (k !== h && gkm < gkp)) ? gkp : gkm + 1;
          y = v = x - k;
          while (x < N && y < M && xs[i + x] === ys[j + y]) {
            x++; y++;
          }
          g[Zk % Z] = x;
          if (parity === 1 && (z = W - k) >= 1 - h && z < h && x + p[(Z + z % Z) % Z] >= N) {
            if (h > 1 || x !== u) {
              stack[s++] = [i + x, N - x, j + y, M - y];
              [N, M] = [u, v];
              continue Z_block;
            } else break h_loop;
          }
        }

        // Reverse pass
        for (let k = kmin; k <= kmax; k += 2) {
          const Zk = (k % Z) + Z;
          const pkm = p[(Zk - 1) % Z];
          const pkp = p[(Zk + 1) % Z];
          x = u = (k === -h || (k !== h && pkm < pkp)) ? pkp : pkm + 1;
          y = v = x - k;
          while (x < N && y < M && xs[offsetx - x] === ys[offsety - y]) {
            x++; y++;
          }
          p[Zk % Z] = x;
          if (parity === 0 && (z = W - k) >= -h && z <= h && x + g[(Z + z % Z) % Z] >= N) {
            if (h > 0 || x !== u) {
              stack[s++] = [i + N - u, u, j + M - v, v];
              [N, M] = [N - x, M - y];
              continue Z_block;
            } else break h_loop;
          }
        }
      }

      if (N === M) continue;
      if (M > N) [i, N, j, M] = [i + N, 0, j + N, M - N];
      else [i, N, j, M] = [i + M, N - M, j + M, 0];

      // We already know either N or M is zero, so we can
      // skip the extra check at the top of the loop.
      break;
    }

    // yield delete_start, delete_end, insert_start, insert_end
    // At this point, at least one of N & M is zero, or we
    // wouldn't have gotten out of the preceding loop yet.
    if (N + M !== 0) {
      if(pxe === i || pye === j){
        // it is a contiguous difference extend the existing one
        [pxe, pye] = [i + N, j + M];
      }else{
        if(pxs >= 0){
          yield [pxs, pxe, pys, pye];
        }
        // defer this difference until the next is checked
        [pxs, pxe, pys, pye] = [i, i + N, j, j + M];
      }
    }
    if (s === 0) {
      break;
    }
    [i, N, j, M] = stack[--s];
    Z = (Math.min(N, M) + 1) << 1;
  }
  // output the deferred difference
  if (pxs >= 0) {
    yield [pxs, pxe, pys, pye];
  }

}

export function* diff<T extends Indexable<unknown>>(xs: T, ys: T): Generator<Vec4> {
  let [i, N, M] = [0, xs.length, ys.length];

  // eliminate common prefix
  while (i < N && i < M && xs[i] === ys[i]) i++;

  // check for equality
  if (i === N && i === M) return;

  // eliminate common suffix
  while (xs[--N] === ys[--M] && N > i && M > i){}

  yield* diff_rec(xs, i, N + 1 - i, ys, i, M + 1 - i);
}

export function* lcs<T extends Indexable<unknown>>(xs: T, ys: T): Generator<Vec3> {
  const N = xs.length;

  // Convert diffs into the dual similar-aligned representation.
  // In each iteration, i and j will be aligned at the beginning
  // of a shared section. This section is yielded, and i and j
  // are re-aligned at the end of the succeeding unique sections.
  let [i, j, sx, ex, ey] = [0, 0, 0, 0, 0];
  for (const rec of diff(xs, ys)) {
    [sx, ex, , ey] = rec;
    if (i !== sx) {
      rec.length--; // re-use the vec4 as a vec3 to avoid allocation
      [rec[0], rec[1], rec[2]] = [i, j, sx - i];
      yield rec as unknown as Vec3;
    }
    [i, j] = [ex, ey];
  }
  if (i < N) yield [i, j, N - i];
}

export function* calcPatch<T, S extends Sliceable<T>>(xs: S, ys: S): Generator<[number, number, S]> {
  // Taking subarrays is cheaper than slicing for TypedArrays.
  const slice = ArrayBuffer.isView(xs) ?
    Uint8Array.prototype.subarray as unknown as typeof xs.slice : xs.slice;
  for (const [dels, dele, inss, inse] of diff_rec(xs, 0, xs.length, ys, 0, ys.length)) {
    yield [dels, dele, slice.call(ys, inss, inse)];
  }
}

export function* applyPatch<T, S extends Sliceable<T>>(xs: S, patch: Iterable<[number, number, S]>): Generator<S> {
  let i = 0; // Taking subarrays is cheaper than slicing for TypedArrays.
  const slice = ArrayBuffer.isView(xs) ?
    Uint8Array.prototype.subarray as unknown as typeof xs.slice : xs.slice;
  for (const [dels, dele, ins] of patch) {
    if (i < dels) yield slice.call(xs, i, dels);
    if (ins.length > 0) yield ins;
    i = dele;
  }
  if (i < xs.length) yield slice.call(xs, i);
}