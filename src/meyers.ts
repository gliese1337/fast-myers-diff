import { Indexable, Vec4 } from './types';

function * diff_rec<T extends Indexable>(
  xs: T, i: number, N: number,
  ys: T, j: number, M: number,
): Generator<Vec4> {
  const stack: Vec4[] = [];
  let Z = 2 * Math.min(N,M) + 2;
  let c = new Uint32Array(Z);
  let d = new Uint32Array(Z);
  for (;;) {
    Z_block: {
      if (N > 0 && M > 0) {
        let [D, x, y, u, v] = [0,0,0,0,0];

        const L = N+M;
        const delta = N-M;
        const hmax = L>>>1+(L&1);
        hloop: for (let h = 0; h <= hmax; h++) {
          const kmin = 2 * Math.max(0, h - M) - h;
          const kmax = h - 2 * Math.max(0, h - N);

          // forward pass
          for (let k = kmin; k <= kmax; k += 2) {
            const ckp = c[(Z+k+1)%Z];
            const ckm = c[(Z+k-1)%Z];
            u = (k==-h || (k!=h && ckm<ckp)) ? ckp : ckm+1;
            v = u - k;
            [x,y] = [u,v];
            while (u < N && v < M && xs[i + u] === ys[j + v]) u++,v++;
            c[(Z + k) % Z] = u;
            const z = delta - k;
            if ((L&1) === 1 && z >= 1-h && z<=h-1 && u + d[(Z+z)%Z] >= N) {
              D = 2*h-1;
              break hloop;
            }
          }

          // reverse pass
          [c,d] = [d,c];
          for (let k = kmin; k <= kmax; k += 2) {
            const ckp = c[(Z+k+1)%Z];
            const ckm = c[(Z+k-1)%Z];
            x = (k==-h || (k!=h && ckm<ckp)) ? ckp : ckm+1;
            y = x - k;
            [u, v] = [N - x, M - y];
            const xoffset = i + N - 1;
            const yoffset = j + M - 1;
            while (x < N && y < M && xs[xoffset - x] === ys[yoffset - y]) x++,y++;
            c[(Z + k) % Z] = x;
            const z = delta - k;
            if ((L&1)===0 && z>=-h && z<=h && x + d[(Z+z)%Z] >= N) {
              [D,x,y] = [2*h,N-x,M-y];
              break hloop;
            }
          }
          [c,d] = [d,c];
        }

        if (D > 1 || (x !== u && y !== v)) {
          stack.push([i + u, N - u, j + v, M - v]);
          [N, M] = [x, y];
          if (N > 0 && M > 0) break Z_block;
        }
      }

      if (M > N) {
        yield [i + N, i + N, j + N, j + M - N];
      } else if (M < N) {
        yield [i + M, i + N, 0, 0];
      }

      if (stack.length === 0) return;
      [i, N, j, M] = stack.pop() as Vec4;
    }

    Z = 2 * Math.min(N,M) + 2;
    c.fill(0, 0, Z);
    d.fill(0, 0, Z);
  }
}

// TODO: merge adjacent records
export function diff<T extends Indexable>(xs: T, ys: T) {
  let i = 0; // skip common prefix
  while (xs[i] === ys[i]) i++;

  // skip common suffix
  let N = xs.length;
  let M = ys.length;
  while (xs[--N] === ys[--M]);

  return diff_rec(xs, i, N + 1 - i, ys, i, M + 1 - i);
}