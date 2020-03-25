/**
 * Calculates LCS length (last row of dynamic matrix)
 */
function lcs_lens_fwd(xs, sx, ex, ys, sy, ey, curr, prev) {
  const ny = ey - sy;
  curr.fill(0, 0, ny + 1);
  prev.fill(0, 0, ny + 1);

	for (let j = sx; j < ex; j++) {
    const x = xs[j];
		[prev, curr] = [curr, prev];
    for (let i = 0; i < ny; i++) {
      const y = ys[sy + i];
			if (x === y) {
				curr[i + 1] = prev[i] + 1;
			} else {
				curr[i + 1] = Math.max(curr[i], prev[i + 1]);
			}
		}
	}

	return [curr, prev];
}

function lcs_lens_rev(xs, sx, ex, ys, sy, ey, curr, prev) {
  const ny = ey - sy;
  curr.fill(0, 0, ny + 1);
  prev.fill(0, 0, ny + 1);

	for (let j = ex - 1; j >= sx; j--) {
    const x = xs[j];
		[prev, curr] = [curr, prev];
    for (let k = 0, i = ey - 1; i >= sy; i--, k++) {
      const y = ys[i];
			if (x === y) {
				curr[k + 1] = prev[k] + 1;
			} else {
				curr[k + 1] = Math.max(curr[k], prev[k + 1]);
			}
		}
	}

	return curr;
}

/* Find the y-axis split point when the target sum is not previously known */
function argmax(ll_b, ll_e, ny) {
  let j = 0;
  let maxSum = 0;

  for (let k = 0; k <= ny; k++) {
      const sum = ll_b[k] + ll_e[ny - k];
      if (sum > maxSum) [maxSum, j] = [sum, k];
  }

  return j;
}

function * lcs_rec(xs, sx, ex, ys, sy, ey, target, a, b, c) {
  const stack = [];
  let prefix = null;
  for (;;) {
    tail_loop: {
      const nx = ex - sx;
      const ny = ey - sy;
      if (nx === 0 || ny === 0) break tail_loop;
      if (nx === 1) {
        const idx = ys.indexOf(xs[sx], sy);
        if (idx > -1 && idx < ey) yield [sx, sx+1, idx, idx+1];
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
      const center = mxb !== mxe ? [[mxb, mxe, myb, mye]] : [];
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

function strip(xs, sx, ex, ys, sy, ey) {
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

function * seq(iters) {
  for (const i of iters) yield * i;
}

function * merge_records(...iters) {
  const tail = seq(iters);
  let last = tail.next().value;
  if (!last) return;
  const result = [];
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

function expand(xs, sx, mx, ex, ys, sy, my, ey) {
  let [mxb, mxe, myb, mye] = [mx, mx, my, my];

  //return [mxb, mxe, myb, mye];

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

function lcs(xs, ys) {
  const [sx, ex, sy, ey] = strip(xs, 0, xs.length, ys, 0, ys.length); 
  const prefix = sx > 0 ? [[0, sx, 0, sy]] : [];
  const suffix = ex < xs.length ? [[ex, xs.length, ey, ys.length]] : [];

  const nx = ex - sx;
  const ny = ey - sy;
  if (nx === 0 || ny === 0) return [...prefix, ...suffix][Symbol.iterator]();
  if (nx === 1) {
    const idx = ys.indexOf(xs[sx], sy);
    const list = (idx > -1 && idx < ey) ?
      [...prefix, [sx, sx+1, idx, idx+1], ...suffix] :
      [...prefix, ...suffix];
    return list[Symbol.iterator]();
  }

  const a = new Array(ny);
  const b = new Array(ny);
  const c = new Array(ny);

  // Find split points
  const mx = sx + (nx >>> 1);
  const [ll_b, tmp] = lcs_lens_fwd(xs, sx, mx, ys, sy, ey, a, b);
  const ll_e = lcs_lens_rev(xs, mx, ex, ys, sy, ey, c, tmp);
  const j = argmax(ll_b, ll_e, ny);
  const my = sy + j;

  // Expand from center
  const [mxb, mxe, myb, mye] = expand(xs, sx, mx, ex, ys, sy, my, ey);
  const center = mxb !== mxe ? [[mxb, mxe, myb, mye]] : [];
  const tb = ll_b[j] - (mx - mxb);
  const te = ll_e[ny - j] - (mye - my);

  const lft = sy < myb ? lcs_rec(xs, sx, mxb, ys, sy, myb, tb, a, b, c) : [];
  const rgt = mye < ey ? lcs_rec(xs, mxe, ex, ys, mye, ey, te, a, b, c) : [];
  
  return merge_records(prefix, lft, center, rgt, suffix);
}

function extract(xs, indices) {
  return indices.map(([s, e]) => xs.slice(s, e)).join('');
}

const tests = [
  ['abcfboopqxyz', 'abcgbooprxyz', 'abcboopxyz'],
  ['', '', ''],
  ['a', '', ''],
  ['', 'b', ''],
  ['abc', 'abc', 'abc'],
  ['abcd', 'obce', 'bc'],
  ['abc', 'ab', 'ab'],
  ['abc', 'bc', 'bc'],
  ['abcde', 'zbodf', 'bd'],
  ['aa','aaaa', 'aa'],
  ['GTCGTTCGGAATGCCGTTGCTCTGTAAA', 'ACCGGTCGAGTGCGCGGAAGCCGGCCGAA', 'GTCGTCGGAAGCCGGCCGAA'],
];

for (const [xs, ys, ans] of tests) {
  const arr = [...lcs(xs, ys)];
  //console.log(arr);
  const res = extract(xs, arr);
  if (res !== ans) console.error(xs, ys, res);
}