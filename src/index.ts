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

type DiffState = {
  i: number;
  N: number;
  j: number;
  M: number;
  Z: number;
  b: TypedArray;
  eq: (x: number, y: number) => boolean;
  pxs: number;
  pxe: number;
  pys: number;
  pye: number;
  oxs: number;
  oxe: number;
  oys: number;
  oye: number;
  stack_top: number;
  stack_base: number[];
}

// Find the list of differences between 2 lists by
// recursive subdivision, requring O(min(N,M)) space
// and O(min(N,M)*D) worst-case execution time where
// D is the number of differences.
function diff_internal(state: DiffState, c: number): number {
  const { b, eq, stack_base } = state;
  let { i, N, j, M, Z, stack_top } = state;
  for (;;) {
    switch(c) {
      case 0: {
        Z_block: while (N > 0 && M > 0) {
          b.fill(0, 0, 2 * Z);

          const W = N - M;
          const L = N + M;
          const parity = L & 1;
          const offsetx = i + N - 1;
          const offsety = j + M - 1;
          const hmax = (L + parity) / 2;
          let z: number;
          h_loop: for (let h = 0; h <= hmax; h++) {
            const kmin = 2 * Math.max(0, h - M) - h;
            const kmax = h - 2 * Math.max(0, h - N);

            // Forward pass
            for (let k = kmin; k <= kmax; k += 2) {
              const gkm = b[k - 1 - Z * Math.floor((k - 1)/Z)];
              const gkp = b[k + 1 - Z * Math.floor((k + 1)/Z)];
              const u = (k === -h || (k !== h && gkm < gkp)) ? gkp : gkm + 1;
              const v = u - k;
              let x = u;
              let y = v;
              while (x < N && y < M && eq(i + x, j + y)) x++, y++;
              b[k - Z * Math.floor(k/Z)] = x;
              if (parity === 1 && (z = W - k) >= 1 - h && z < h && x + b[Z + z - Z * Math.floor(z/Z)] >= N) {
                if (h > 1 || x !== u) {
                  stack_base[stack_top++] = i + x;
                  stack_base[stack_top++] = N - x;
                  stack_base[stack_top++] = j + y;
                  stack_base[stack_top++] = M - y;
                  N = u;
                  M = v;
                  Z = 2 * (Math.min(N, M) + 1);
                  continue Z_block;
                } else break h_loop;
              }
            }

            // Reverse pass
            for (let k = kmin; k <= kmax; k += 2) {
              const pkm = b[Z + k - 1 - Z * Math.floor((k - 1)/Z)];
              const pkp = b[Z + k + 1 - Z * Math.floor((k + 1)/Z)];
              const u = (k === -h || (k !== h && pkm < pkp)) ? pkp : pkm + 1;
              const v = u - k;
              let x = u;
              let y = v;
              while (x < N && y < M && eq(offsetx - x, offsety - y)) x++, y++;
              b[Z + k - Z * Math.floor(k/Z)] = x;
              if (parity === 0 && (z = W - k) >= -h && z <= h && x + b[z - Z * Math.floor(z/Z)] >= N) {
                if (h > 0 || x !== u) {
                  stack_base[stack_top++] = i + N - u;
                  stack_base[stack_top++] = u;
                  stack_base[stack_top++] = j + M - v;
                  stack_base[stack_top++] = v;
                  N = N - x;
                  M = M - y;
                  Z = 2 * (Math.min(N, M) + 1);
                  continue Z_block;
                } else break h_loop;
              }
            }
          }

          if (N === M) continue;
          if (M > N) {
            i += N;
            j += N;
            M -= N;
            N = 0;
          } else {
            i += M;
            j += M;
            N -= M;
            M = 0;
          }

          // We already know either N or M is zero, so we can
          // skip the extra check at the top of the loop.
          break;
        }

        // yield delete_start, delete_end, insert_start, insert_end
        // At this point, at least one of N & M is zero, or we
        // wouldn't have gotten out of the preceding loop yet.
        if (N + M !== 0) {
          if (state.pxe === i || state.pye === j) {
            // it is a contiguous difference extend the existing one
            state.pxe = i + N;
            state.pye = j + M;
          } else {
            const sx = state.pxs;
            state.oxs = state.pxs;
            state.oxe = state.pxe;
            state.oys = state.pys;
            state.oye = state.pye;
            
            // Defer this one until we can check the next one
            state.pxs = i;
            state.pxe = i + N;
            state.pys = j;
            state.pye = j + M;

            if(sx >= 0) {
              state.i = i;
              state.N = N;
              state.j = j;
              state.M = M;
              state.Z = Z;
              state.stack_top = stack_top;
              return 1;
            }
          }
        }
      }
      case 1: {
        if (stack_top === 0) return 2;

        M = stack_base[--stack_top];
        j = stack_base[--stack_top];
        N = stack_base[--stack_top];
        i = stack_base[--stack_top];
        Z = 2 * (Math.min(N, M) + 1);
        c = 0;
      }
    }
  }
}

export function * diff_core(
  i: number, N: number, j: number, M: number,
  eq: (i: number, j: number) => boolean,
): Generator<Vec4> {
  const Z = (Math.min(N, M) + 1) * 2;
  const L = N + M;
  const b = new (L < 256 ? Uint8Array : L < 65536 ? Uint16Array : Uint32Array)(2 * Z);

  const state: DiffState = {
    i, N, j, M, Z, b, eq,
    pxs: -1, pxe: -1, pys: -1, pye: -1,
    oxs: -1, oxe: -1, oys: -1, oye: -1,
    stack_top: 0, stack_base: [],
  };

  let c = diff_internal(state, 0);

  while (c === 1) {
    yield [state.oxs, state.oxe, state.oys, state.oye];
    c = diff_internal(state, c);
  }
  if (state.pxs >= 0) yield [state.pxs, state.pxe, state.pys, state.pye];
}

export function diff<T extends Indexable<unknown>>(xs: T, ys: T): Generator<Vec4> {
  let [i, N, M] = [0, xs.length, ys.length];

  // eliminate common prefix
  while (i < N && i < M && xs[i] === ys[i]) i++;

  // check for equality
  if (i === N && i === M) [][Symbol.iterator]();

  // eliminate common suffix
  while (xs[--N] === ys[--M] && N > i && M > i);

  const eq = (x: number, y: number) => xs[x] === ys[y];

  return diff_core(i, N + 1 - i, i, M + 1 - i, eq);
}

export function * lcs<T extends Indexable<unknown>>(xs: T, ys: T): Generator<Vec3> {
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

export function * calcPatch<T, S extends Sliceable<T>>(xs: S, ys: S): Generator<[number, number, S]> {
  // Taking subarrays is cheaper than slicing for TypedArrays.
  const slice = ArrayBuffer.isView(xs) ?
    Uint8Array.prototype.subarray as unknown as typeof xs.slice : xs.slice;
  for (const [dels, dele, inss, inse] of diff(xs, ys)) {
    yield [dels, dele, slice.call(ys, inss, inse)];
  }
}

export function * applyPatch<T, S extends Sliceable<T>>(xs: S, patch: Iterable<[number, number, S]>): Generator<S> {
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