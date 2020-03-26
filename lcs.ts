import { Indexable, Vec4 } from './types';
import lcs_grid from './grid';

export { Indexable, Vec4 };

/**
 * Calculates LCS length (last row of dynamic matrix)
 */
function lcs_lens_fwd(
  xs: Indexable, sx: number, ex: number,
  ys: Indexable, sy: number, ey: number,
  curr: Uint16Array, prev: Uint16Array,
) {
  const ny = ey - sy;
  curr.fill(0, 0, ny + 1);
  prev.fill(0, 0, ny + 1);

	for (let j = sx; j < ex; j++) {
    const x = xs[j];
		[prev, curr] = [curr, prev];
    for (let i = 0; i < ny; i++) {
      curr[i + 1] = x === ys[sy + i] ?
        prev[i] + 1 : Math.max(curr[i], prev[i + 1]);
		}
	}

	return [curr, prev];
}

function lcs_lens_rev(
  xs: Indexable, sx: number, ex: number,
  ys: Indexable, sy: number, ey: number,
  curr: Uint16Array, prev: Uint16Array,
) {
  const ny = ey - sy;
  curr.fill(0, 0, ny + 1);
  prev.fill(0, 0, ny + 1);

	for (let j = ex - 1; j >= sx; j--) {
    const x = xs[j];
		[prev, curr] = [curr, prev];
    for (let k = 0, i = ey - 1; i >= sy; i--, k++) {
      curr[k + 1] = x === ys[i] ?
        prev[k] + 1 : Math.max(curr[k], prev[k + 1]);
		}
	}

	return curr;
}

function expand(
  xs: Indexable, sx: number, mx: number, ex: number,
  ys: Indexable, sy: number, my: number, ey: number,
) {
  let [mxb, mxe, myb, mye] = [mx, mx, my, my];

  // Remove prefix from right
  for (; mxe < ex && mye < ey; mxe++, mye++) {
    if (xs[mxe] !== ys[mye]) break;
  }

  // Strip suffix from left
  for (mxb--, myb--; mxb >= sx && myb >= sy; mxb--, myb--) {
    if (xs[mxb] !== ys[myb]) break;
  }

  return [++mxb, mxe, ++myb, mye];
}

function * lcs_rec(
  xs: Indexable, sx: number, ex: number,
  ys: Indexable, sy: number, ey: number,
  target: number,
  a: Uint16Array, b: Uint16Array, c: Uint16Array,
): Generator<Vec4, unknown, undefined> {
  const stack: [Vec4[], number, number, number, number, number][] = [];
  let prefix: Vec4[] = null;
  for (;;) {
    tail_loop: {
      const nx = ex - sx;
      const ny = ey - sy;
      if (nx === 0 || ny === 0) break tail_loop;
      if (nx === 1) {
        const x = xs[sx];
        for (let idx = sy; idx < ey; idx++) {
          if (ys[idx] === x) {
            yield [sx, sx+1, idx, idx+1];
            break tail_loop;
          }
        }
        break tail_loop;
      }

      if ((nx + 1) * (ny + 1) <= a.length) {
        // bail out to the fast grid algorithm
        // when memory constraints get small enough
        yield * lcs_grid(xs, sx, ex, ys, sy, ey, a, b);
        break tail_loop;
      }

      // Find split points
      const mx = sx + (nx >>> 1);
      const [ll_b, tmp] = lcs_lens_fwd(xs, sx, mx, ys, sy, ey, a, b);
      const ll_e = lcs_lens_rev(xs, mx, ex, ys, sy, ey, c, tmp);

      let j = 0;
      while (ll_b[j] + ll_e[ny-j] !== target) j++;
      const my = sy + j;

      // Expand from center
      const [mxb, mxe, myb, mye] = expand(xs, sx, mx, ex, ys, sy, my, ey);
      const center: Vec4[] = mxb !== mxe ? [[mxb, mxe, myb, mye]] : [];
      const tb = ll_b[j] - (mx - mxb);
      const te = ll_e[ny - j] - (mye - my);

      if (sy === myb) {
        // Left is empty, so emit the center and tail-recurse right
        yield * center;
        [sx, sy, target] = [mxe, mye, te];
      } else {
        // Right recursion; save the center to emit after left recursion
        stack.push([center, mxe, ex, mye, ey, te]);
        [ex, ey, target] = [mxb, myb, tb]; // tail-recurse left
      }

      continue;
    }

    if (!stack.length) return;
    // Simulate return from left recursion
    // and immediate call to right recursion.
    [prefix, sx, ex, sy, ey, target] = stack.pop();
    yield * prefix;
  }
}

function strip(
  xs: Indexable, sx: number, ex: number,
  ys: Indexable, sy: number, ey: number,
) {
  // strip common prefixes
  for (; sx < ex && sy < ey; sx++, sy++) {
    if (xs[sx] !== ys[sy]) break;
  }

  // strip common suffixes
  for (ex--, ey--; ex >= sx && ey >= sy; ex--, ey--) {
    if (xs[ex] !== ys[ey]) break;
  }

  return [sx, ++ex, sy, ++ey];
}

/* Find the y-axis split point when the target sum is not previously known */
function argmax(ll_b: Uint16Array, ll_e: Uint16Array, ny: number) {
  let j = 0;
  let maxSum = 0;

  for (let k = 0; k <= ny; k++) {
      const sum = ll_b[k] + ll_e[ny - k];
      if (sum > maxSum) [maxSum, j] = [sum, k];
  }

  return j;
}

function * seq<T>(iters: Iterable<T>[]) {
  for (const i of iters) yield * i;
}

function * merge_records(...iters: Iterable<Vec4>[]) {
  const tail = seq(iters);
  let last = tail.next().value;
  if (!last) return;
  for (const r of tail) {
    if (r[0] === last[1] && r[2] === last[3]) {
      last[1] = r[1];
      last[3] = r[3];
    } else {
      yield last;
      last = r;
    }
  }
  yield last;
}

export function lcs(xs: Indexable, ys: Indexable): IterableIterator<Vec4> {
  const [sx, ex, sy, ey] = strip(xs, 0, xs.length, ys, 0, ys.length); 
  const prefix: Vec4[] = sx > 0 ? [[0, sx, 0, sy]] : [];
  const suffix: Vec4[] = ex < xs.length ? [[ex, xs.length, ey, ys.length]] : [];

  const nx = ex - sx;
  const ny = ey - sy;
  if (nx === 0 || ny === 0) return [...prefix, ...suffix][Symbol.iterator]();
  if (nx === 1) {
    let [x, idx] = [xs[sx], sy];
    for (; idx < ey; idx++) {
      if (ys[idx] === x) break;
    }

    const list: Vec4[] = idx < ey ?
      [...prefix, [sx, sx+1, idx, idx+1], ...suffix] :
      [...prefix, ...suffix];

    return list[Symbol.iterator]();
  }

  const a = new Uint16Array(ny);
  const b = new Uint16Array(ny);
  const c = new Uint16Array(ny);

  // Find split points
  const mx = sx + (nx >>> 1);
  const [ll_b, tmp] = lcs_lens_fwd(xs, sx, mx, ys, sy, ey, a, b);
  const ll_e = lcs_lens_rev(xs, mx, ex, ys, sy, ey, c, tmp);
  const j = argmax(ll_b, ll_e, ny);
  const my = sy + j;

  // Expand from center
  const [mxb, mxe, myb, mye] = expand(xs, sx, mx, ex, ys, sy, my, ey);
  const center: Vec4[] = mxb !== mxe ? [[mxb, mxe, myb, mye]] : [];
  const tb = ll_b[j] - (mx - mxb);
  const te = ll_e[ny - j] - (mye - my);

  const lft = sy < myb ? lcs_rec(xs, sx, mxb, ys, sy, myb, tb, a, b, c) : [];
  const rgt = mye < ey ? lcs_rec(xs, mxe, ex, ys, mye, ey, te, a, b, c) : [];
  
  return merge_records(prefix, lft, center, rgt, suffix);
}