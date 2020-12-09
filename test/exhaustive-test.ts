
import 'mocha';
import { expect } from 'chai';
import { applyPatch, calcPatch, diff } from '../src';

const chars = 'abcdefghijklmnopqrstuvwxyz01234567890';

/**
 * Let E(x) = [0..n).map( i => [0..n).map(j => x[i] == y[j] ))
 *
 * Generates sequences such that for every x of length n, there is one
 * representative output r, such that E(r, r) equals E(x, r)
 *
 * If k is given then it will produce at most k distinct elements
 * If c is given then produces the representatives such that given
 * a sequence x with n elements and a sequence y with c distinct elements
 * one of the outputs r will have E([0..c), r) = E(uniq(y), x)
 * where uniq remove repeated elements from y.
 *
 */
function* equivalencyClasses(n: number, c: number = 0, k: number = Infinity):
  Generator<[number, string[]], void, any> {
  let seq: number[] = [];
  let work: (i: number, j: number) => Generator<[number, string[]], void, any>;
  work = function* (i: number, j: number) {
    if (i == n) {
      yield [j, seq.map(i => chars[i])];
    } else {
      for (seq[i] = 0; seq[i] < j; ++seq[i]) {
        yield* work(i + 1, j);
      }
      if(j < k) {
        yield* work(i + 1, j + 1);
      }
    }
  };
  yield * work(0, Math.min(c, k));
}

function *allPairsCore(n1: number, n2: number): Generator<[ string[], string[] ], void, any> {
  for(const [c, v1] of equivalencyClasses(n1)){
    for(const [, v2] of equivalencyClasses(n2, c, c+1)){
      yield [v1, v2];
    }
  }
}
function *allPairs(n1: number, n2: number): Generator<[ string[], string[] ], void, any> {
  // promote less redundancy
  if(n1 > n2){
    for(const [v2, v1] of allPairsCore(n2, n1)){
      yield [v1, v2]
    }
  }else{
    yield * allPairsCore(n1, n2);
  }
}

// meta testing. tests the tests
describe('test generation', () => {
  it('the distribution of x', () => {
    // http://oeis.org/A000110
    // The number of equivalence relations that can be defined on a set of n elements.
    const N = 7;
    const counts = [...Array(N)].map((_, n) => [...equivalencyClasses(n)].length)
    expect(counts).eql([1, 1, 2, 5, 15, 52, 203, 877, 4140, 21147, 115975, 678570, 4213597, 27644437, 190899322].slice(0, N));
  })
  it('the sequences with just one class', () => {
    expect([...equivalencyClasses(4, 1, 1)]).eql([[1, ['a', 'a', 'a', 'a']]])
    expect([...equivalencyClasses(4, 10, 1)]).eql([[1, ['a', 'a', 'a', 'a']]])
  })
  describe('the distribution of y', () => {
    for(let c = 1; c < 5; ++c){
      for(let n = 0; n < 4; ++n){
        it(`n=${n}, c=${c}, k=${c+1}, ${Math.pow(c+1, n)} elements`, () => {
          expect([...equivalencyClasses(n, c, c+1)].length).eql(Math.pow(c+1, n));
        })
      }
    }
  })
  describe('saves a few checks :)', () => {
    for(let n1 = 0; n1 < 5; ++n1){
      for(let n2 = 0; n2 < 5; ++n2){
        it(`${n1}, ${n2}`, () => {
          expect([...allPairs(n2, n1)].length-1).lessThan([...equivalencyClasses(n1 + n2)].length);
        })
      }
    }
  })
  describe('inputs x and y are symmetric', () => {
    for(let n1 = 0; n1 < 5; ++n1){
      for(let n2 = 0; n2 < 5; ++n2){
        it(`${n1}, ${n2} vs ${n2}, ${n1}`, () => {
          expect([...allPairs(n2, n1)].length-1).lessThan([...allPairsCore(n1, n2)].length);
        })
      }
    }
  })
})

function accessWatchDog<T extends object>(max: number, arrays: T[]): T[]{
  let counter = 0;
  const handler = {
    get: function(target: object, prop: PropertyKey, receiver: any): any {
      if(++counter >= max){
        throw new Error('Too many operations');
      }
      return Reflect.get(target, prop, receiver);
    }
  };
  return arrays.map(x => {
    return new Proxy<T>(x, handler)
  });
}

function edit<T>(xs: T[], ys: T[], es: Iterable<[number, number, number, number]>) {
  let i = 0;
  const result: T[] = [];
  for (const [sx, ex, sy, ey] of es) {
    while (i < sx) result.push(xs[i++]);
    if (sx < ex) // delete
      i = ex;
    if (sy < ey) // insert
      result.push(...ys.slice(sy, ey));
  }
  result.push(...xs.slice(i));
  return result;
}

describe("Exhaustive patch tests", () => {
  for(let N = 1; N < 5; ++N){
    for(let M = 0; M < 5; ++M) {
      describe(`all sequences of sizes N=${N}, M=${M}`, () => {
        // It can be made tight
        const complexityBound = (N+M+1)*(N+M+1)*1000;
        for (const [xs, ys] of allPairs(N, M)) {
          const [xsw, ysw] =  accessWatchDog(complexityBound, [xs, ys]);
          it(`patch '${xs.join('')}' -> '${ys.join('')}'`, () => {
            const es = diff(xsw, ysw);
            const edited = edit(xs, ys, es).join('');
            expect(edited).eqls(ys.join(''));

            const patched = [...applyPatch(xs, calcPatch(xs, ys))].map(x=>x.join('')).join('');
            expect(patched).eqls(ys.join(''))
          });
        }
      });
    }
  }
});