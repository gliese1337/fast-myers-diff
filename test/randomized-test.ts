import seedRandom from "seedrandom";
// @ts-ignore
import * as tu from "./test-utils";
import {expect} from "chai";
import {diff} from "../src";

seedRandom('diff', {global: true});

describe("Randomized editions in small strings", () => {
  for (let n = 15; n < 25; ++n) {
    for (let d1 = 0; d1 < 10; ++d1) {
      for (let d2 = 0; d2 < 10; ++d2) {
        // It can be made tight
        const complexityBound = 2 * n * (d1 + d2);
        const [xs, ys] = tu.subsequences(n, d1, d2);
        const [xst, yst] = [xs.toString(), ys.toString()]
        const [xsw, ysw] = tu.accessWatchDog(complexityBound, [xs.array(), ys.array()]);
        it(`patch (${n}, ${d1}, ${d2}) '${xst}' -> '${yst}'`, () => {
          // this will throw an error if the number of access exceeds
          // complexity bound
          expect(xs.length).eqls(n - d1);
          expect(ys.length).eqls(n - d2);
          let es = []
          try {
            es = [...diff(xsw, ysw)];
            expect(tu.diffSize(es)).lessThan(d1 + d2 + 1);
          } catch {
            expect.fail({xst, yst}.toString() + '\nToo many operations')
          }
          const edited = tu.edit(xs.array(), ys.array(), es).join('');
          expect(edited).eqls(ys.toString());
        });
      }
    }
  }
});


describe('Diff 2 pos', () => {

  it('diff 2 pos [1,2,3,...]', () => {
    const n = 257;
    const complexityBound = 8 * n;
    const range = Array.from(Array(n)).map((_, i) => i);
    const r1 = [...range];
    for (let i1 = 0; i1 < n; ++i1) {
      r1[i1] = i1 + 1;
      const r2 = [...range];
      for (let i2 = 0; i2 < n; ++i2) {
        r2[i2] = i2 + 1;
        let es = [];
        try {
          const [xsw, ysw] = tu.accessWatchDog(complexityBound, [r1, r2]);
          es = [...diff(xsw, ysw)];
        } catch {
          throw new Error(JSON.stringify({message: 'Too many operations', i1, i2}, null, 2))
        }
        expect(tu.diffSize(es)).eqls(i1 === i2 ? 0 : 2, JSON.stringify({es, i1, i2, n}));
      }
    }
    range.slice()
  })

  it('two one hot arrays', () => {
    for (let n = 2; n <= 256; n += n) {
      const complexityBound = 8 * n;
      const range = Array.from(Array(n)).map(() => 0);
      const r1 = [...range];
      for (let i1 = 0; i1 < n; r1[i1] = 0, ++i1) {
        r1[i1] = 1;
        const r2 = [...range];
        for (let i2 = 0; i2 < n; r2[i2] = 0, ++i2) {
          r2[i2] = 1;
          let es = [];
          const [xsw, ysw] = tu.accessWatchDog(complexityBound, [r1, r2]);
          es = [...diff(xsw, ysw)];
          expect(tu.diffSize(es)).eqls(i1 === i2 ? 0 : 2, JSON.stringify({es, i1, i2, n, r1, r2}));
        }
      }
    }
  })

  describe('sparse inputs with predictable results', () => {
    for (let c1 = 2; c1 <= 3; c1 += 1) {
      for (let c2 = 2; c2 <= 3; c2 += 1) {
        for (let n = 500; n <= 1000; n += 100) {
          it(JSON.stringify({c1, c2, n}), () => {
            const {x, y, s1, s2, diffs} = tu.sparseBinaryPredictable(n, c1, c2);
            console.log({s1: [...s1], s2: [...s2], diffs})
            let seen = [];
            try {
              seen = tu.checkDiffComputation(x, y, 400 * n * (c1 + c2));
            } catch (e) {
              if (e.message.indexOf('Too many operations')) {
                throw new Error(JSON.stringify({n, s1:[...s1], s2: [...s2]}))
              } else {
                throw e;
              }
            }
            expect(seen).eqls(diffs);
          })
        }
      }
    }
  })
  describe('dense inputs with predictable results', () => {
    for (let c1 = 1; c1 <= 10; c1 += 1) {
      for (let c2 = 1; c2 <= 10; c2 += 1) {
        for (let n = 2*(c1 + c2 + 1); n <= 30; n += 1) {
          it(JSON.stringify({c1, c2, n}), () => {
            console.log('starting')
            const {x, y, s1, s2, diffs} = tu.densePredictable(n, c1, c2);
            let seen = [];
            console.log({s1:[...s1], s2:[...s2], diffs})
            try {
              seen = tu.checkDiffComputation(x, y, 4 * n * (c1 + c2));
            } catch (e) {
              if (e.message.indexOf('Too many operations')) {
                throw new Error(JSON.stringify({n, s1:[...s1], s2: [...s2]}))
              } else {
                throw e;
              }
            }
            expect(seen).eqls(diffs);

          })
        }
      }
    }
  })
})


describe("Search good examples", () => {

  for (let d1 = 5; d1 <= 6; d1 += 3) {
    for (let d2 = 5; d2 <= 6; d2 += 3) {
      for (let n = 200; n < 2100; n += 100) {
        // It can be made tight
        const complexityBound = 100 * n * (d1 + d2 + 1);
        it(`patch (${n}, ${d1}, ${d2}) `, () => {
          for (let k = 0; k * n < 1000; ++k) {
            const [xs, ys] = tu.subsequences(n, d1, d2);
            tu.checkDiffComputation(xs, ys, complexityBound);
          }
        });
      }
    }
  }
});

describe("Randomized editions (medium size)", () => {
  for (let n = 50; n < 200; n += 10) {
    for (let d1 = 0; d1 < 50; d1 += 2) {
      for (let d2 = 0; d2 < 50; d2 += 2) {
        // It can be made tight
        const complexityBound = 40 * n * (d1 + d2 + 1);
        it(`patch (${n}, ${d1}, ${d2})`, () => {
          const [xs, ys] = tu.subsequences(n, d1, d2);
          tu.checkDiffComputation(xs, ys, complexityBound);
        });
      }
    }
  }
});
