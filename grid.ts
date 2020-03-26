import { Indexable, Vec4 } from './types';

const DIAG = 1;
const DOWN = 2;
const RIGHT = 3;

export default function * lcs_grid(
  xs: Indexable, sx: number, ex: number,
  ys: Indexable, sy: number, ey: number,
  lgrid: Uint16Array, mgrid: Uint16Array,
): Generator<Vec4> {
  const nx = ex - sx + 1;
  const ny = ey - sy + 1;
  const size = nx * ny;
  lgrid.fill(0, 0, size);
  mgrid.fill(0, 0, size);

  for (let i = nx - 2; i >= 0; i--) {
    const x = xs[sx + i];
    for (let j = ny - 2; j >= 0; j--) {
      const y = ys[sy + j];
      const idx = i * ny + j;
      if (x === y) {
        lgrid[idx] = lgrid[idx + ny + 1] + 1;
        mgrid[idx] = DIAG;
      } else {
        const right = lgrid[idx + ny];
        const under = lgrid[idx + 1];
        if (right < under) {
          lgrid[idx] = under;
          mgrid[idx] = DOWN;
        } else {
          lgrid[idx] = right;
          mgrid[idx] = RIGHT;
        }
      }
    }
  }

  let move = mgrid[0];
  let [idx, i, j] = [0, 0, 0];
  loop: for (;;) {
    switch (move) {
      case 0: break loop;
      case DIAG: {
        sx = i;
        sy = j;
        do {
          idx += ny + 1;
          move = mgrid[idx];
          i++;
          j++;
        } while (move === DIAG);
        yield [sx, i, sy, j];
        break;
      }
      case DOWN: {
        move = mgrid[++idx];
        j++;
        break;
      }
      case RIGHT: {
        idx += ny;
        move = mgrid[idx];
        i++;
        break;
      }
    }
  }
}