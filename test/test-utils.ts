import {diff} from "../src";
import {expect} from "chai";


export class CharArray extends Uint16Array {
  constructor(v: any) {
    super(typeof v === 'string' ? v.split('').map(x => x.charCodeAt(0)) : v)
    Object.defineProperties(this, {length: {writable: false, value: super.length}})
  }

  toString() {
    return String.fromCharCode(...this.codeArray())
  }

  slice(start?: number, end?: number): CharArray {
    return new CharArray(this.subarray(start, end));
  }

  array(): string[] {
    return this.toString().split('');
  }

  codeArray(): number[] {
    return Array.from(this);
  }
}

export function string(n: number) {
  const u = new CharArray(n);
  for (let i = 0; i < n; ++i) {
    u[i] = 65 + 20 * Math.random();
  }
  return u
}

/**
 * Produces an array with nSamples values between 0 <= v[i] < end
 * @param nSamples
 * @param end
 */
export function sample(nSamples: number, end: number): Int32Array {
  const _result = new Int32Array(nSamples);
  if (2 * nSamples > end) {
    const skip = sample(end - nSamples, end);
    let skipped = 0;
    for (let i = 0; i < nSamples; ++i) {
      if (i + skipped === skip[skipped]) {
        ++skipped;
      }
      _result[i] = i + skipped;
    }
  } else {
    for (let i = 0; i < nSamples; ++i) {
      _result[i] = ~~(Math.random() * (end - nSamples));
    }
    _result.sort();
    for (let i = 0; i < nSamples; ++i) {
      _result[i] += i;
    }
  }
  return _result;
}

export function substring(input: CharArray, totalLength: number): CharArray {
  const out = new CharArray(totalLength)
  const pos = sample(totalLength, input.length);
  for (let i = 0; i < totalLength; ++i) {
    out[i] = input[pos[i]];
  }
  return out;
}


/**
 * Starting from a sequence z produces two sequences
 * x and y by removing symbols
 * @param n: length of the initial string
 * @param d1: number of characters deleted to produce x
 * @param d2: number of characters deleted to produce y
 * @returns [number[], number[]
 */
export function subsequences(n: number | CharArray, d1: number, d2: number): [CharArray, CharArray] {
  const z = typeof n === 'number' ? string(n) : n;
  const x = substring(z, z.length - d1);
  const y = substring(z, z.length - d2)
  return [x, y];
}

type DiffPredictionInfo = { x: CharArray, y: CharArray, s1: Int32Array, s2: Int32Array, diffs: number[][] }

function direcDiffPrediction(n: number, c1: number, c2: number, margin: number, v1: number, v2: number) {
  const x = new CharArray(n + c1);
  const y = new CharArray(n + c2);
  const s1 = sample(c1, n + c1 - (c1 + c2) * margin);
  const s2 = sample(c2, n + c2 - (c1 + c2) * margin);
  let offset = 0;
  const diffs = [];
  let i1 = 0;
  let i2 = 0;
  while (i1 < c1 || i2 < c2) {
    if (i1 < c1 && (i2 >= c2 || s1[i1] - i1 <= s2[i2] - i2)) {
      const t = (s1[i1++] += offset + 1);
      diffs.push([t, t + 1, t + 1 + (i2 - i1), t + 1 + (i2 - i1)])
      x[t] = v1;
    } else {
      const t = (s2[i2++] += offset + 1);
      diffs.push([t + 1 - (i2 - i1), t + 1 - (i2 - i1), t, t + 1])
      y[t] = v2;
    }
    offset += margin;
  }
  return {x, y, s1, s2, diffs}
}

/**
 * Generates two sparse sequences with a few ones each separated by a
 * number of zeros that makes only one alignment reasonable.
 * @param n
 * @param c1
 * @param c2
 */
export function sparseBinaryPredictable(n: number, c1: number, c2: number): DiffPredictionInfo {
  if ((c1 + c2) * (c1 + c2 + 1) > n) {
    throw new Error('The changes must be sparser')
  }
  const margin = c1 + c2 + 1;
  const v1 = 1, v2 = 1;
  return direcDiffPrediction(n, c1, c2, margin, v1, v2);
}

/**
 * Generates two sequences with a few values set to distinct values
 * so that there no match except for the common subsequence
 * gives a margin of 1 ensuring that x and y are not changed
 * at the same position, to prevent ambiguity on the order of
 * the operations.
 */
export function densePredictable(n: number, c1: number, c2: number): DiffPredictionInfo {
  if ((c1 + c2) * 2 > n) {
    throw new Error('More changes than the vector length')
  }
  const v1 = 1, v2 = 2;
  return direcDiffPrediction(n, c1, c2, 1, v1, v2);
}


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
export function* equivalencyClasses(n: number, c: number = 0, k: number = Infinity):
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


export function checkDiffComputation(xs: CharArray, ys: CharArray, B: number): number[][] {
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

export function diffSize(diffs: number[][]): number {
  let s = 0;
  for (const [xs, xe, ys, ye] of diffs) {
    s += (xe - xs) + (ye - ys);
  }
  return s;
}

export function* allPairsCore(n1: number, n2: number): Generator<[string[], string[]], void, any> {
  for (const [c, v1] of equivalencyClasses(n1)) {
    for (const [, v2] of equivalencyClasses(n2, c, c + 1)) {
      yield [v1, v2];
    }
  }
}

export function* allPairs(n1: number, n2: number): Generator<[string[], string[]], void, any> {
  // promote less redundancy
  if (n1 > n2) {
    for (const [v2, v1] of allPairsCore(n2, n1)) {
      yield [v1, v2]
    }
  } else {
    yield* allPairsCore(n1, n2);
  }
}

export function accessWatchDog<T extends object>(max: number, arrays: T[]): T[] {
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


export function edit<T>(xs: T[], ys: T[], es: Iterable<[number, number, number, number]>) {
  let i = 0;
  const result: T[] = [];
  for (const [sx, ex, sy, ey] of es) {
    while (i < sx) result.push(xs[i++]);
    if (sx < ex) {
      i = ex; // delete
    }
    if (sy < ey) {
      result.push(...ys.slice(sy, ey)); // insert
    }
  }
  result.push(...xs.slice(i));
  return result;
}

/**
 * Compute the portion of xs and ys that is not marked as different
 * in an actual diff the two returned arrays must be the LCS.
 * @param xs
 * @param ys
 * @param es
 */
export function excludeDiff<T>(xs: T[], ys: T[], es: Iterable<number[]>): [T[], T[]]{
  let ix = 0;
  let iy = 0;
  const rx: T[] = [];
  const ry: T[] = []
  for (const [sx, ex, sy, ey] of es) {
    while (ix < sx) rx.push(xs[ix++]);
    while (iy < sy) ry.push(ys[iy++]);
    [ix, iy] = [ex, ey]
  }
  for(const c of xs.slice(ix))rx.push(c)
  for(const c of ys.slice(iy))ry.push(c)
  return [rx, ry];
}
