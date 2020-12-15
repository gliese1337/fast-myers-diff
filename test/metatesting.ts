import 'mocha';
import {expect} from 'chai';

// @ts-ignore
import * as tu from './test-utils';

describe('Meta testing', () => {
  describe('test generation', () => {
    it('the distribution of x', () => {
      // http://oeis.org/A000110
      // The number of equivalence relations that can be defined on a set of n elements.
      const N = 7;
      const counts = [...Array(N)].map((_, n) => [...tu.equivalencyClasses(n)].length)
      expect(counts).eql([1, 1, 2, 5, 15, 52, 203, 877, 4140, 21147, 115975, 678570, 4213597, 27644437, 190899322].slice(0, N));
    })
    it('the sequences with just one class', () => {
      expect([...tu.equivalencyClasses(4, 1, 1)]).eql([[1, ['a', 'a', 'a', 'a']]])
      expect([...tu.equivalencyClasses(4, 10, 1)]).eql([[1, ['a', 'a', 'a', 'a']]])
    })
    describe('the distribution of y', () => {
      for (let c = 1; c < 5; ++c) {
        for (let n = 0; n < 4; ++n) {
          it(`n=${n}, c=${c}, k=${c + 1}, ${Math.pow(c + 1, n)} elements`, () => {
            expect([...tu.equivalencyClasses(n, c, c + 1)].length).eql(Math.pow(c + 1, n));
          })
        }
      }
    })
    describe('saves a few checks :)', () => {
      for (let n1 = 0; n1 < 5; ++n1) {
        for (let n2 = 0; n2 < 5; ++n2) {
          it(`${n1}, ${n2}`, () => {
            expect([...tu.allPairs(n2, n1)].length - 1).lessThan([...tu.equivalencyClasses(n1 + n2)].length);
          })
        }
      }
    })
    describe('inputs x and y are symmetric', () => {
      for (let n1 = 0; n1 < 5; ++n1) {
        for (let n2 = 0; n2 < 5; ++n2) {
          it(`${n1}, ${n2} vs ${n2}, ${n1}`, () => {
            expect([...tu.allPairs(n2, n1)].length - 1).lessThan([...tu.allPairsCore(n1, n2)].length);
          })
        }
      }
    })
  })

  describe('CharArray', () => {
    it('must be an UInt16Array', () => {
      expect(new tu.CharArray([]) instanceof Uint16Array)
        .eqls(true, 'CharArray must be instance of Uint16Array');
    })
    it('must be mutable', () => {
      const v = new tu.CharArray([48, 49, 50, 51]);
      expect(v.toString())
        .eqls('0123', 'Must be initialized accordingly to constructor argument');
      v[1] += 5;
      expect(v.toString()).eqls('0623', 'Must be changed after mutation')
      expect(v.array().join('')).eqls('0623', 'Must provide an array of single char strings')
    })
  })

  describe("Randomized tests", () => {
    it('expect consistent sizes and types', () => {
      const [x, y] = tu.subsequences(100, 14, 20);
      expect(x.length).eqls(86, 'incorrect size for x');
      expect(y.length).eqls(80, 'incorrect size for y');
      expect(typeof x.toString()).eqls('string');
      expect(typeof y.toString()).eqls('string');
      expect(Array.isArray(x.array())).eqls(true);
    })
    it('size of substrings', () => {
      const z = new tu.CharArray(10);
      z.fill('0'.charCodeAt(0), 0, 10);
      expect(z.length).eql(10);
      expect(tu.substring(z, 5).toString()).eqls('00000')
    })
  })

  describe('Predicted diffs', () => {
    it('Check the sequence excluding the differences', () => {
      for (let c1 = 1; c1 < 20; ++c1) {
        for (let c2 = 1; c2 < 20; ++c2) {
          for(const {s1, s2, x, y, diffs} of [
            tu.sparseBinaryPredictable((c1+c2)*(c1+c2+1)+1000, c1, c2),
            tu.densePredictable(2*(c1+c2)+2, c1, c2)
          ]){
            const n = x.length - c1;
            const [xc, yc] = tu.excludeDiff([...x], [...y], diffs);
            expect(xc.length).eqls(n);
            expect(yc.length).eqls(n);
            expect(s1.length).eqls(c1);
            expect(s2.length).eqls(c2);
            expect(x.length).eqls(n + c1);
            expect(y.length).eqls(n + c2)
            expect(xc.map((_, i) => xc[i] === yc[i]).reduce((a, b) => a && b))
              .eqls(true, 'Excluding the differences the both sides must converge to a common string')
          }
        }
      }
    })
  })
});