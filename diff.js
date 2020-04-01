function * diff(e, f, i=0, j=0) {
  const N = e.length;
  const M = f.length;
  const L = N+M;
  const Z = 2*Math.min(N,M)+2
  hmax = L>>>1+(L&1);
  if (N > 0 && M > 0) {
    const [w, g, p] = [N-M, new Uint32Array(Z), new Uint32Array(Z)];
    for (let h = 0; h <= hmax; h++) {
      const kmin = 2 * Math.max(0, h - M) - h;
      const kmax = h - 2 * Math.max(0, h - N);
      // forward pass
      let [c,d] = [g,p];
      for (let k = kmin; k <= kmax; k += 2) {
        const ckp = c[(Z+k+1)%Z];
        const ckm = c[(Z+k-1)%Z];
        let u = (k==-h || (k!=h && ckm<ckp)) ? ckp : ckm+1;
        let v = u - k;
        const [x,y] = [u,v];
        while (u < N && v < M && e[u] === f[v]) [u,v] = [u+1,v+1];
        c[(Z + k) % Z] = u;
        const z = w - k;
        if ((L&1) === 1 && z >= 1-h && z<=h-1 && u + d[(Z+z)%Z] >= N) {
          const D = 2*h-1;
          if (D > 1 || (x !== u && y !== v)) {
            yield * diff(e.slice(0, x), f.slice(0, y), i, j);
            yield * diff(e.slice(u, N), f.slice(v, M), i + u, j + v);
          } else if (M > N) {
            yield { "op": "ins", "at": i + N, "s": j + N, "e": j + M - N };
          } else if (M < N) {
            yield { "op": "del", "s": i + M, "e": i + N };
          }
          return;
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
        const z = w - k;
        if ((L&1)===0 && z>=-h && z<=h && a + d[(Z+z)%Z] >= N) {
          const [D,x,y,u,v] = [2*h,N-a,M-b,N-s,M-t];
          if (D > 1 || (x !== u && y !== v)) {
            yield * diff(e.slice(0, x), f.slice(0, y), i, j);
            yield * diff(e.slice(u, N), f.slice(v, M), i + u, j + v);
          } else if (M > N) {
            yield { "op": "ins", "at": i + N, "s": j + N, "e": j + M - N };
          } else if (M < N) {
            yield { "op": "del", "s": i + M, "e": i + N };
          }
          return;
        }
      }
    }
  } else if (N > 0) {
    yield {"op": "del", "s": i, "e": i+N};
  } else if (M > 0) {
    yield {"op": "ins", "at": i, "s":j, "e": j+M}
  }
}

console.log([...diff('preabmcdpost', 'prezxmywpost')]);