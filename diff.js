function * diff_rec(e, i, N, f, j, M) {
  const stack = [];
  for (;;) {
    N = e.length;
    M = f.length;
    const L = N+M;
    const Z = 2*Math.min(N,M)+2
    const hmax = L>>>1+(L&1);
    if (N > 0 && M > 0) {
      let D, x, y, u, v;
      const [delta, g, p] = [N-M, new Uint32Array(Z), new Uint32Array(Z)];
      hloop: for (let h = 0; h <= hmax; h++) {
        const kmin = 2 * Math.max(0, h - M) - h;
        const kmax = h - 2 * Math.max(0, h - N);
        // forward pass
        let [c,d] = [g,p];
        for (let k = kmin; k <= kmax; k += 2) {
          const ckp = c[(Z+k+1)%Z];
          const ckm = c[(Z+k-1)%Z];
          u = (k==-h || (k!=h && ckm<ckp)) ? ckp : ckm+1;
          v = u - k;
          [x,y] = [u,v];
          while (u < N && v < M && e[u] === f[v]) [u,v] = [u+1,v+1];
          c[(Z + k) % Z] = u;
          const z = delta - k;
          if ((L&1) === 1 && z >= 1-h && z<=h-1 && u + d[(Z+z)%Z] >= N) {
            D = 2*h-1;
            break hloop;
          }
        }

        // reverse pass
        [c,d] = [p,g];
        for (let k = kmin; k <= kmax; k += 2) {
          const ckp = c[(Z+k+1)%Z];
          const ckm = c[(Z+k-1)%Z];
          let a = (k==-h || (k!=h && ckm<ckp)) ? ckp : ckm+1;
          let b = a - k
          const [s,t] = [a,b];
          const eoffset = N - 1;
          const foffset = M - 1;
          while (a < N && b < M && e[eoffset - a] === f[foffset - b]) [a,b] = [a+1,b+1];
          c[(Z + k) % Z] = a;
          const z = delta - k;
          if ((L&1)===0 && z>=-h && z<=h && a + d[(Z+z)%Z] >= N) {
            [D,x,y,u,v] = [2*h,N-a,M-b,N-s,M-t];
            break hloop;
          }
        }
      }

      if (D > 1 || (x !== u && y !== v)) {
        stack.push([e.slice(u, N), f.slice(v, M), i + u, j + v]);
        [e, f] = [e.slice(0, x), f.slice(0, y)];
        continue;
      }
    }

    if (M > N) {
      yield { "op": "ins", "at": i + N, "s": j + N, "e": j + M - N };
    } else if (M < N) {
      yield { "op": "del", "s": i + M, "e": i + N };
    }

    if (stack.length === 0) return;
    [e, f, i, j] = stack.pop();
  }
}

function diff(e, f) {
  return diff_rec(e, 0, e.length, f, 0, f.length);
}

console.log([...diff('preabmcdpost', 'prezxmywpost')]);