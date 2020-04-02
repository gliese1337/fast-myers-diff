export type Indexable = string | unknown[] | Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array | Float32Array | Float64Array;
type Vec4 = [number, number, number, number];
type Vec3 = [number, number, number];

function * diff_rec<T extends Indexable>(
  xs: T, i: number, N: number,
  ys: T, j: number, M: number,
): Generator<Vec4, undefined> {
  const stack: Vec4[] = [];

  let Z = 2 * Math.min(N, M) + 2;
  let c = new Uint32Array(Z);
  let d = new Uint32Array(Z);
  let [D, x, y, u, v] = [0, 0, 0, 0, 0];

  for (;;) {
    Z_block: {
      if (N > 0 && M > 0) {
        const L = N + M;
        const delta = N - M;
        const hmax = (L >>> 1) + (L&1);
        hloop: for (let h = 0; h <= hmax; h++) {
          const kmin = 2 * Math.max(0, h - M) - h;
          const kmax = h - 2 * Math.max(0, h - N);

          // forward pass
          for (let k = kmin; k <= kmax; k += 2) {
            const ckp = c[(Z + k + 1) % Z];
            const ckm = c[(Z + k - 1) % Z];
            u = (k === -h || (k !== h && ckm < ckp)) ? ckp : ckm + 1;
            v = u - k;
            [x, y] = [u, v];
            while (u < N && v < M && xs[i + u] === ys[j + v]) u++, v++;
            c[(Z + k) % Z] = u;
            const z = delta - k;
            if ((L&1) === 1 && z > -h && z < h && u + d[(Z + z) % Z] >= N) {
              D = 2 * h - 1;
              break hloop;
            }
          }

          // reverse pass
          [c, d] = [d, c];
          for (let k = kmin; k <= kmax; k += 2) {
            const ckp = c[(Z + k + 1) % Z];
            const ckm = c[(Z + k - 1) % Z];
            x = (k === -h || (k !== h && ckm < ckp)) ? ckp : ckm + 1;
            y = x - k;
            [u, v] = [N - x, M - y];
            const xoffset = i + N - 1;
            const yoffset = j + M - 1;
            while (x < N && y < M && xs[xoffset - x] === ys[yoffset - y]) x++, y++;
            c[(Z + k) % Z] = x;
            const z = delta - k;
            if ((L&1) === 0 && z >= -h && z <= h && x + d[(Z + z) % Z] >= N) {
              [D, x, y] = [2 * h, N - x, M - y];
              break hloop;
            }
          }
          [c, d] = [d, c];
        }

        if (D > 1 || (x !== u && y !== v)) {
          stack.push([i + u, N - u, j + v, M - v]);
          [N, M] = [x, y];
          if (N > 0 && M > 0) break Z_block;
        }
      }

      if (M > N) {
        const [ni, nj] = [i + N, j + N];
        yield [ni, ni, nj, nj + M];
      } else if (M < N) {
        const [mi, mj] = [i + M, j + M];
        yield [mi, mi + N, mj, mj];
      }

      if (stack.length === 0) return;
      [i, N, j, M] = stack.pop() as Vec4;
    }

    Z = 2 * Math.min(N, M) + 2;
    D = c[1] = d[1] = 0;
  }
}

export function * diff<T extends Indexable>(xs: T, ys: T) {
  let i = 0; // skip common prefix
  let N = xs.length;
  let M = ys.length;
  while (i < N && i < M && xs[i] === ys[i]) i++;
  if (i === N && N === M) return; // the inputs are identical

  // skip common suffix
  while (N > i && M > i && xs[--N] === ys[--M]);

  const iter = diff_rec(xs, i, N + 1 - i, ys, i, M + 1 - i);

  // If the inputs are not identical, there *will*
  // be at least one yielded value. Identity was
  // checked above, so we don't need to check for
  // a non-empty sequence here.
  let last = iter.next().value as Vec4;
  for (const next of iter) {
    const [nds, nde, nis, nie] = next;
    if (nds === nde) { // this is an insert
      if (nis === last[3]) {
        // Multiple adjacent inserts in a row
        last[3] = nie;
      } else if (last[2] === last[3] && nds >= last[0] && nds <= last[1]) {
        // Last record was a deletion, & this insert replaces it
        last[2] = nis;
        last[3] = nie;
      } else {
        yield last;
        last = next;
      }
    } else if (nds === last[1]) {
      // Multiple adjacent deletions in a row
      last[1] = nde;
    } else {
      yield last;
      last = next;
    }
  }
  yield last;
}

export function * lcs<T extends Indexable>(xs: T, ys: T): Generator<Vec3> {
  const N = xs.length;
  const M = ys.length;

  let i = 0; // skip common prefix
  while (i < N && i < M && xs[i] === ys[i]) i++;
  if (i > 0) yield [0, 0, i];
  if (i === N && N === M) return; // the inputs are identical

  let [n, m] = [N, M]; // skip common suffix
  while (n > i && m > i && xs[--n] === ys[--m]);

  const iter = diff_rec(xs, i, n + 1 - i, ys, i, m + 1 - i);

  // convert diffs into the dual similar-aligned representation

  // If the inputs are not identical, there *will*
  // be at least one yielded value. Identity was
  // checked above, so we don't need to check for
  // a non-empty sequence here.
  let [sx, ex, sy, ey] = iter.next().value as Vec4;

  // align i and j at the beginning of a shared section
  let j = i + ey - sy;
  i += ex - sx;
  for (const [sx, ex, , ey] of iter) {
    // yield common span, then re-align after a deletion
    if (i !== sx) yield [i, j, sx - i];
    [i, j] = [ex, ey];
  }
  if (i < N) yield [i, j, N - i];
}

export function * calcPatch<T extends Indexable>(xs: T, ys: T): Generator<[number, number, T]> {
  if (ArrayBuffer.isView(ys)) {
    // distinguish typed arrays from strings and generic arrays,
    // because taking subarrays is cheaper than making shallow
    // copies for slices.
    for (const [ds, de, is, ie] of diff(xs, ys)) {
      yield [ds, de, (ys as any).subarray(is, ie)];
    }
  } else {
    for (const [ds, de, is, ie] of diff(xs, ys)) {
      yield [ds, de, ys.slice(is, ie) as T];
    }
  }
}

export function * applyPatch<T extends Indexable>(xs: T, patch: Iterable<[number, number, T]>): Generator<T> {
  let i = 0;
  if (ArrayBuffer.isView(xs)) {
    // distinguish typed arrays from strings and generic arrays,
    // because taking subarrays is cheaper than making shallow
    // copies for slices.
    for (const [ds, de, ins] of patch) {
      if (i < ds) yield (xs as any).subarray(i, ds);
      if (ins.length > 0) yield ins;
      i = de;
    }
    if (i < xs.length) yield (xs as any).subarray(i);
  } else {
    for (const [ds, de, ins] of patch) {
      if (i < ds) yield xs.slice(i, ds) as T;
      if (ins.length > 0) yield ins;
      i = de;
    }
    if (i < xs.length) yield xs.slice(i) as T;
  }
}