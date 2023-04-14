import seedRandom from "seedrandom";
import * as tu from "./test-utils";
import {expect} from "chai";
import {diff} from "../src";

seedRandom('diff', {global: true});

describe("Randomized edits in small strings", () => {
  for (let n = 15; n < 25; ++n) {
    for (let d1 = 0; d1 < 10; ++d1) {
      for (let d2 = 0; d2 < 10; ++d2) {
        // It can be made tight
        const complexityBound = 2 * (2 * n + d1 + d2) * (d1 + d2 + 1);
        const [xs, ys] = tu.subsequences(n, d1, d2);
        const [xst, yst] = [xs.toString(), ys.toString()];
        const [xsw, ysw] = tu.accessWatchDog(complexityBound, [xs.array(), ys.array()]);
        it(`patch (${n}, ${d1}, ${d2}) '${xst}' -> '${yst}'`, () => {
          // this will throw an error if the number of accesses exceeds
          // the complexity bound
          expect(xs.length).eqls(n - d1);
          expect(ys.length).eqls(n - d2);
          let es: number[][] = [];
          try {
            es = [...diff(xsw, ysw)];
            expect(tu.diffSize(es)).lessThan(d1 + d2 + 1);
          } catch(e) {
            if(e.message.indexOf('Too many operations')){
              expect.fail({xst, yst}.toString() + '\nToo many operations');
            }else{
              throw e;
            }
          }
          const edited = tu.edit(xs.array(), ys.array(), es as any).join('');
          expect(edited).eqls(ys.toString());
        });
      }
    }
  }
});


describe('Diff pieces', () => {

  describe('sparse inputs with predictable results', () => {
    for (let c1 = 2; c1 <= 100; c1 += 5) {
      for (let c2 = 2; c2 <= 100; c2 += 5) {
        for (let n = (c1 + c2 + 1) * (c1 + c2 + 1); n <= 1000; n += 100) {
          it(JSON.stringify({c1, c2, n}), () => {
            const {x, y, s1, s2, diffs} = tu.sparseBinaryPredictable(n, c1, c2);
            let seen: number[][] = [];
            try {
              seen = tu.checkDiffComputation(x, y, 400 * n * (c1 + c2));
            } catch (e) {
              if (e.message.indexOf('Too many operations')) {
                throw new Error(JSON.stringify({n, s1:[...s1], s2: [...s2]}));
              } else {
                throw e;
              }
            }
            expect(seen).eqls(diffs);
          });
        }
      }
    }
  });
  describe('dense inputs with predictable results', () => {
    for (let c1 = 1; c1 <= 10; c1 += 1) {
      for (let c2 = 1; c2 <= 10; c2 += 1) {
        for (let n = 2*(c1 + c2 + 1); n <= 30; n += 1) {
          it(JSON.stringify({c1, c2, n}), () => {
            const {x, y, s1, s2, diffs} = tu.densePredictable(n, c1, c2);
            let seen: number[][] = [];
            try {
              seen = tu.checkDiffComputation(x, y, 4 * n * (c1 + c2));
            } catch (e) {
              if (e.message.indexOf('Too many operations')) {
                throw new Error(JSON.stringify({n, s1:[...s1], s2: [...s2]}));
              } else {
                throw e;
              }
            }
            expect(seen).eqls(diffs);

          });
        }
      }
    }
  });
});


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

describe("Randomized edits in big strings", () => {
  for (let n = 5000; n < 10000; n += 500) {
    for (let d1 = 0; d1 < 50; d1 += 10) {
      for (let d2 = 0; d2 < 50; d2 += 10) {
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
