import 'mocha';
import {expect} from 'chai';
import {applyPatch, calcPatch, diff} from '../src';
import * as tu from "./test-utils";


describe("Exhaustive patch tests", () => {
  for (let N = 1; N < 5; ++N) {
    for (let M = 0; M < 5; ++M) {
      describe(`all sequences of sizes N=${N}, M=${M}`, () => {
        // It can be made tight
        const complexityBound = (N + M + 1) * (N + M + 1) * 1000;
        for (const [xs, ys] of tu.allPairs(N, M)) {
          const [xsw, ysw] = tu.accessWatchDog(complexityBound, [xs, ys]);
          it(`patch '${xs.join('')}' -> '${ys.join('')}'`, () => {
            const es = diff(xsw, ysw);
            const edited = tu.edit(xs, ys, es).join('');
            expect(edited).eqls(ys.join(''));
            const patched = [...applyPatch(xs, calcPatch(xs, ys))].map(x => x.join('')).join('');
            expect(patched).eqls(ys.join(''));
          });
        }
      });
    }
  }
});

