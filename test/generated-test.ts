import 'mocha';
import {expect} from 'chai';
import {applyPatch, calcPatch, diff} from '../src';
// @ts-ignore
import * as Randomize from "./randomize";
import seedRandom from 'seedrandom'

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
      if (j < k) {
        yield* work(i + 1, j + 1);
      }
    }
  };
  yield* work(0, Math.min(c, k));
}


function checkDiffComputation(xs: Randomize.CharArray, ys: Randomize.CharArray, B: number): number[][] {
  const [xsw, ysw] = accessWatchDog(B, [xs.array(), ys.array()]);
  let es = []
  try {
    es = [...diff(xsw, ysw)];
  } catch {
    throw new Error(JSON.stringify({message: 'Too many operations', x: [...xs], y: [...ys]}, null, 2))
  }
  const edited = edit(xs.array(), ys.array(), es).join('');
  expect(edited).eqls(ys.toString());
  return es;
}

function diffSize(diffs: number[][]): number {
  let s = 0;
  for (const [xs, xe, ys, ye] of diffs) {
    s += (xe - xs) + (ye - ys);
  }
  return s;
}

function* allPairsCore(n1: number, n2: number): Generator<[string[], string[]], void, any> {
  for (const [c, v1] of equivalencyClasses(n1)) {
    for (const [, v2] of equivalencyClasses(n2, c, c + 1)) {
      yield [v1, v2];
    }
  }
}

function* allPairs(n1: number, n2: number): Generator<[string[], string[]], void, any> {
  // promote less redundancy
  if (n1 > n2) {
    for (const [v2, v1] of allPairsCore(n2, n1)) {
      yield [v1, v2]
    }
  } else {
    yield* allPairsCore(n1, n2);
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
    for (let c = 1; c < 5; ++c) {
      for (let n = 0; n < 4; ++n) {
        it(`n=${n}, c=${c}, k=${c + 1}, ${Math.pow(c + 1, n)} elements`, () => {
          expect([...equivalencyClasses(n, c, c + 1)].length).eql(Math.pow(c + 1, n));
        })
      }
    }
  })
  describe('saves a few checks :)', () => {
    for (let n1 = 0; n1 < 5; ++n1) {
      for (let n2 = 0; n2 < 5; ++n2) {
        it(`${n1}, ${n2}`, () => {
          expect([...allPairs(n2, n1)].length - 1).lessThan([...equivalencyClasses(n1 + n2)].length);
        })
      }
    }
  })
  describe('inputs x and y are symmetric', () => {
    for (let n1 = 0; n1 < 5; ++n1) {
      for (let n2 = 0; n2 < 5; ++n2) {
        it(`${n1}, ${n2} vs ${n2}, ${n1}`, () => {
          expect([...allPairs(n2, n1)].length - 1).lessThan([...allPairsCore(n1, n2)].length);
        })
      }
    }
  })
})

function accessWatchDog<T extends object>(max: number, arrays: T[]): T[] {
  let counter = 0;
  const handler = {
    get: function (target: object, prop: PropertyKey, receiver: any): any {
      if (/^\d+$/.test(prop.toString())) {
        if (++counter >= max) {
          throw new Error('Too many operations');
        }
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
  for (let N = 1; N < 5; ++N) {
    for (let M = 0; M < 5; ++M) {
      describe(`all sequences of sizes N=${N}, M=${M}`, () => {
        // It can be made tight
        const complexityBound = (N + M + 1) * (N + M + 1) * 1000;
        for (const [xs, ys] of allPairs(N, M)) {
          const [xsw, ysw] = accessWatchDog(complexityBound, [xs, ys]);
          it(`patch '${xs.join('')}' -> '${ys.join('')}'`, () => {
            const es = diff(xsw, ysw);
            const edited = edit(xs, ys, es).join('');
            expect(edited).eqls(ys.join(''))
            const patched = [...applyPatch(xs, calcPatch(xs, ys))].map(x => x.join('')).join('');
            expect(patched).eqls(ys.join(''))
          });
        }
      });
    }
  }
});

// seedRandom('diff', {global: true});

describe('Meta testing: CharArray', () => {
  it('must be an UInt16Array', () => {
    expect(new Randomize.CharArray([]) instanceof Uint16Array)
      .eqls(true, 'CharArray must be instance of Uint16Array');
  })
  it('must be mutable', () => {
    const v = new Randomize.CharArray([48, 49, 50, 51]);
    expect(v.toString())
      .eqls('0123', 'Must be initialized accordingly to constructor argument');
    v[1] += 5;
    expect(v.toString()).eqls('0623', 'Must be changed after mutation')
    expect(v.array().join('')).eqls('0623', 'Must provide an array of single char strings')
  })
})

describe("Meta testing: Randomized tests", () => {
  it('expect consistent sizes and types', () => {
    const [x, y] = Randomize.subsequences(100, 14, 20);
    expect(x.length).eqls(86, 'incorrect size for x');
    expect(y.length).eqls(80, 'incorrect size for y');
    expect(typeof x.toString()).eqls('string');
    expect(typeof y.toString()).eqls('string');
    expect(Array.isArray(x.array())).eqls(true);
  })
  it('size of substrings', () => {
    const z = new Randomize.CharArray(10);
    z.fill('0'.charCodeAt(0), 0, 10);
    expect(z.length).eql(10);
    expect(Randomize.substring(z, 5).toString()).eqls('00000')
  })
})
seedRandom('diff', {global: true});

describe("Randomized editions in small strings", () => {
  for (let n = 15; n < 25; ++n) {
    for (let d1 = 0; d1 < 10; ++d1) {
      for (let d2 = 0; d2 < 10; ++d2) {
        // It can be made tight
        const complexityBound = 2 * n * (d1 + d2);
        const [xs, ys] = Randomize.subsequences(n, d1, d2);
        const [xst, yst] = [xs.toString(), ys.toString()]
        const [xsw, ysw] = accessWatchDog(complexityBound, [xs.array(), ys.array()]);
        it(`patch (${n}, ${d1}, ${d2}) '${xst}' -> '${yst}'`, () => {
          // this will throw an error if the number of access exceeds
          // complexity bound
          expect(xs.length).eqls(n - d1);
          expect(ys.length).eqls(n - d2);
          let es = []
          try {
            es = [...diff(xsw, ysw)];
            expect(diffSize(es)).lessThan(d1 + d2 + 1);
          } catch {
            expect.fail({xst, yst}.toString() + '\nToo many operations')
          }
          const edited = edit(xs.array(), ys.array(), es).join('');
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
          const [xsw, ysw] = accessWatchDog(complexityBound, [r1, r2]);
          es = [...diff(xsw, ysw)];
        } catch {
          throw new Error(JSON.stringify({message: 'Too many operations', i1, i2}, null, 2))
        }
        expect(diffSize(es)).eqls(i1 === i2 ? 0 : 2, JSON.stringify({es, i1, i2, n}));
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
          const [xsw, ysw] = accessWatchDog(complexityBound, [r1, r2]);
          es = [...diff(xsw, ysw)];
          expect(diffSize(es)).eqls(i1 === i2 ? 0 : 2, JSON.stringify({es, i1, i2, n, r1, r2}));
        }
      }
    }
  })

  describe('sparse inputs with predictable results', () => {
    for (let c1 = 2; c1 <= 3; c1 += 1) {
      for (let c2 = 2; c2 <= 3; c2 += 1) {
        for (let n = 500; n <= 1000; n += 100) {
          it(JSON.stringify({c1, c2, n}), () => {
            console.log('starting')
            const {x, y, s1, s2, diffs} = Randomize.sparseBinaryPredictable(n, c1, c2);
            console.log({s1: [...s1], s2: [...s2], diffs})
            let seen = [];
            try {
              seen = checkDiffComputation(x, y, 400 * n * (c1 + c2));
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
            const {x, y, s1, s2, diffs} = Randomize.densePredictable(n, c1, c2);
            let seen = [];
            console.log({s1:[...s1], s2:[...s2], diffs})
            try {
              seen = checkDiffComputation(x, y, 4 * n * (c1 + c2));
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
            const [xs, ys] = Randomize.subsequences(n, d1, d2);
            checkDiffComputation(xs, ys, complexityBound);
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
          const [xs, ys] = Randomize.subsequences(n, d1, d2);
          checkDiffComputation(xs, ys, complexityBound);
        });
      }
    }
  }
});
