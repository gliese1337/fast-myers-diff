export type GenericIndexable = { [key: number]: unknown, readonly length: number };
type TypedArray = Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array | Float32Array | Float64Array;
export type Indexable = string | unknown[] | TypedArray | GenericIndexable;
export type Sliceable = TypedArray | (GenericIndexable & { slice(start: number, end?: number): Indexable });
type Vec4 = [number, number, number, number];
type Vec3 = [number, number, number];

function * diff_rec<T extends Indexable>(
  xs: T, i: number, N: number,
  ys: T, j: number, M: number,
): Generator<Vec4, undefined> {
  const stack: Vec4[] = [];
  let s = 0;

  let Z = 2 * Math.min(N, M) + 2;
  const b = new Uint32Array(2 * Z);

  let [x, y, u, v] = [0, 0, 0, 0, 0];

  for (;;) {
    Z_block: {
      //console.log("N & M", N, M);
      if (N > 0 && M > 0) {
        const L = N + M;
        const parity = L & 1;
        const delta = N - M;
        const hmax = (L >>> 1) + parity;
        const xoffset = i + N - 1;
        const yoffset = j + M - 1;
        hloop: for (let h = 0; h <= hmax; h++) {
          const kmin = 2 * Math.max(0, h - M) - h;
          const kmax = h - 2 * Math.max(0, h - N);

          // forward pass
          for (let k = kmin; k <= kmax; k += 2) {
            const Zk = (k % Z) + Z;
            let ckm, ckp = b[(Zk + 1) % Z];
            x = u = (k === -h || (ckm = b[(Zk - 1) % Z], k < h && ckm < ckp)) ? ckp : ckm + 1;
            y = v = u - k;
            while (u < N && v < M && xs[i + u] === ys[j + v]) u++, v++;
            b[Zk % Z] = u;
            const z = delta - k;
            if (parity === 1 && z < h && z > -h && u + b[Z + (Z + z % Z) % Z] >= N) {
              if (2 * h - 1 > 1 || x !== u) {
                stack[s++] = [i + u, N - u, j + v, M - v];
                [N, M] = [x, y];
              }
              break hloop;
            }
          }

          // reverse pass
          for (let k = kmin; k <= kmax; k += 2) {
            const Zk = (k % Z) + Z;
            let ckm, ckp = b[Z + (Zk + 1) % Z];
            x = u = (k === -h || (ckm = b[Z + (Zk - 1) % Z], k < h && ckm < ckp)) ? ckp : ckm + 1;
            y = v = u - k;
            while (x < N && y < M && xs[xoffset - x] === ys[yoffset - y]) x++, y++;
            b[Z + Zk % Z] = x;
            const z = delta - k;
            if (parity === 0 && z <= h && z >= -h && x + b[(Z + z % Z) % Z] >= N) {
              if (h > 0 || x !== u) {
                stack[s++] = [i + N - u, u, j + M - v, v];
                [N, M] = [N - x, M - y];
              }
              break hloop;
            }
          }
        }
      }

      // yield delete_start, delete_end, insert_start, insert_end
      if      (N === 0) yield [i, i, j, j + M];
      else if (M === 0) yield [i, i + N, j, j];
      else break Z_block;

      if (s === 0) return;
      [i, N, j, M] = stack[--s];
    }

    Z = 2 * Math.min(N, M) + 2;
    b[1] = b[Z + 1] = 0;
  }
}

export function * diff<T extends Indexable>(xs: T, ys: T): Generator<Vec4> {
  let [i, N, M] = [0, xs.length, ys.length];

  // skip common prefix
  while (i < N && i < M && xs[i] === ys[i]) i++;
  if (i === N && N === M) return; // the inputs are identical

  // skip common suffix
  while (N > i && M > i && xs[--N] === ys[--M]);
  if (N === 0) { // xs is a suffix of ys
    yield [0, 0, 0, M]; // insert prefix from ys
    return;
  } 
  if (M === 0) { // ys is a suffix of xs
    yield [0, N, M, M]; // delete prefix from xs
    return;
  }

  const iter = diff_rec(xs, i, N + 1 - i, ys, i, M + 1 - i);

  // If the inputs are not identical, there
  // *will* be at least one yielded value.
  let last = iter.next().value as Vec4;
  for (const next of iter) {
    const [nds, nde, nis, nie] = next;
    if (nds === nde) { // this is an insert
      if (nis === last[3]) { // Multiple adjacent inserts
        last[3] = nie;
        continue;
      } else if (nds >= last[0] && nds <= last[1] && last[2] === last[3]) {
        // Last record was a deletion, & this insert replaces it
        [last[2], last[3]] = [nis, nie];
        continue;
      }
    } else if (nds === last[1]) { // Multiple adjacent deletes
      last[1] = nde;
      continue;
    }
    yield last;
    last = next;
  }
  yield last;
}

export function * lcs<T extends Indexable>(xs: T, ys: T): Generator<Vec3> {
  let [i, N, M] = [0, xs.length, ys.length];
  console.log('lcs', xs, ys, N, M);
  // skip common prefix
  while (i < N && i < M && xs[i] === ys[i]) i++;
  if (i > 0) yield [0, 0, i];
  if (i === N || i === M) return; // One input is a prefix of the other

  let [n, m] = [N, M]; // skip common suffix
  while (n > i && m > i && xs[--n] === ys[--m]);
  if (n === 0 || m === 0) { // One input is a suffix of the other
    yield [n, m, Math.min(N, M)];
    return;
  }

  const iter = diff_rec(xs, i, n + 1 - i, ys, i, m + 1 - i);

  // If the inputs are not identical, there
  // *will* be at least one yielded value.
  let [sx, ex, sy, ey] = iter.next().value as Vec4;

  // Convert diffs into the dual similar-aligned representation.
  // In each iteration, i and j will be aligned at the beginning
  // of a shared section. This section is yielded, and i and j
  // are re-aligned at the end of the succeeding unique sections.
  let j = i + ey - sy;
  i += ex - sx;
  for (const rec of iter) {
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

export function * calcPatch<T extends Sliceable>(xs: T, ys: T): Generator<[number, number, T]> {
  // Taking subarrays is cheaper than slicing for TypedArrays.
  const slice = ArrayBuffer.isView(ys) ? Uint8Array.prototype.subarray : ys.slice;
  for (const [ds, de, is, ie] of diff(xs, ys)) {
    yield [ds, de, slice.call(ys, is, ie) as T];
  }
}

export function * applyPatch<T extends Sliceable>(xs: T, patch: Iterable<[number, number, T]>): Generator<T> {
  let i = 0;
  // Taking subarrays is cheaper than slicing for TypedArrays.
  const slice = ArrayBuffer.isView(xs) ? Uint8Array.prototype.subarray : xs.slice;
  for (const [ds, de, ins] of patch) {
    if (i < ds) yield slice.call(xs, i, ds) as T;
    if (ins.length > 0) yield ins;
    i = de;
  }
  if (i < xs.length) yield slice.call(xs, i) as T;
}