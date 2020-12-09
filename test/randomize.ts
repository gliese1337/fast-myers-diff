export class CharArray extends Uint16Array {
  constructor(v: any) {
    super(typeof v === 'string' ? v.split('').map(x => x.charCodeAt(0)) : v)
    Object.defineProperties(this, {length: {writable: false, value: super.length}})
  }

  fillCounter() {
    for (let i = 0; i < this.length; ++i) {
      this[i] = i + 1;
    }
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
      diffs.push([t - 1, t, t + (i2 - i1), t + (i2 - i1)])
      x[t-1] = v1;
    } else {
      const t = (s2[i2++] += offset + 1);
      diffs.push([t - (i2 - i1), t - (i2 - i1), t - 1, t])
      y[t-1] = v2;
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
  if ((c1 + c2) * 2 > n ) {
    throw new Error('More changes than the vector length')
  }
  const v1 = 1, v2 = 2;
  return direcDiffPrediction(n, c1, c2, 1, v1, v2);
}