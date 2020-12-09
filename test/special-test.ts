import 'mocha';
import { expect } from 'chai';
import { calcPatch, applyPatch, lcs, Sliceable } from '../src';

function extract<T>(ys: Sliceable<T>, indices: [number, number, number][]) {
  return indices.map(([, s, l]) => ys.slice(s, s + l)).join('');
}

const tests: [string, string, string[]][] = [
  ['', '', ['']],
  ['a', '', ['']],
  ['', 'b', ['']],
  ['a',  'b',   ['']],
  ['a',  'bb',  ['']],
  ['a', 'bc', ['']],
  ['a', 'bac', ['a']],
  ['a', 'baa', ['a']],
  ['a',  'bab', ['a']],
  ['a',  'bbb', [''] ],
  ['aa', 'ba', ['a']],
  ['aa', 'bba', ['a']],
  ['aa','aaaa', ['aa']],
  ['ab', 'bb',  ['b']],
  ['ab', 'cb',  ['b']],
  ['ab', 'baa', ['b', 'a']],
  ['ab', 'bbb', ['b']],
  ['ab', 'bbc', ['b']],
  ['ab', 'bcb', ['b']],
  ['ab', 'caa', ['a']],
  ['ab', 'cbb', ['b']],
  ['ab', 'ccb', ['b']],
  ['bab', 'a',  ['a']],
  ['bbb', 'a', ['']],
  ['bab', 'aa', ['a']],
  ['bba', 'aa', ['a']],
  ['abb', 'b', ['b']],
  ['bb', 'a',   [''] ],
  ['abc', 'abc', ['abc']],
  ['abcd', 'obce', ['bc']],
  ['abc', 'ab', ['ab']],
  ['abc', 'bc', ['bc']],
  ['abcde', 'zbodf', ['bd']],
  ['preabmcdpost', 'prezxmywpost', ['prempost']],
  ['abcfboopqxyz', 'abcgbooprxyz', ['abcboopxyz']],
  ['GTCGTTCGGAATGCCGTTGCTCTGTAAA', 'ACCGGTCGAGTGCGCGGAAGCCGGCCGAA', ['GTCGTCGGAAGCCGGCCGAA']],
];

describe('Special tests', () => {
  it('should detect a cyclic rotation', () => {
    for (let l = 2; l < 1024; l += l) {
      let x = new Uint8Array(l);
      let y = new Uint8Array(l);
      x.fill(0, 1, l);
      y.fill(0, 0, l - 1);
      x[0] = y[l - 1] = 1;
      const es = [...diff(x, y)];
      expect(es).eqls([[0, 1, 0, 0], [l, l, l - 1, l]]);
    }
  })

  it('binary sparse vector', () => {
    const s1 = [59, 495, 567];
    const s2 = [176, 746, 861];
    const diffs = [
      [59, 60, 59, 59],
      [177, 177, 176, 177],
      [495, 496, 495, 495],
      [567, 568, 566, 566],
      [748, 748, 746, 747],
      [862, 862, 861, 862]
    ];
    const x = new Int8Array(1000);
    const y = new Int8Array(1000);
    for (const i of s1) x[i] = 1;
    for (const i of s2) y[i] = 1;
    const seen = [...diff(x, y)];
    expect(seen).eqls(diffs);
  })
})
describe('handcrafted examples', () => {
  for (const {n, s1, s2, diffs} of [
    {
      n: 8,
      s1: [0],
      s2: [2, 5],
      diffs: [[0, 1, 0, 0], [3, 3, 2, 3], [5, 5, 5, 6]]
    },
    {
      n: 12,
      s1: [0, 5, 8],
      s2: [2, 6],
      diffs: [
        [0, 1, 0, 0],
        [3, 3, 2, 3],
        [5, 6, 5, 5],
        [7, 7, 6, 7],
        [8, 9, 8, 8]
      ]
    }
  ]) {
    const x = new Array(n);
    const y = new Array(n);
    x.fill('a', 0, n);
    y.fill('a', 0, n);
    for (const i of s1) x[i] = 'b';
    for (const i of s2) y[i] = 'c';
    const yt = y.join('');
    const xt = x.join('')
    it(`Diff for ${xt} ${yt}`, () => {
      const seen = [...diff(x, y)];
      console.log(x.join(''))
      console.log(y.join(''))
      expect(seen).eqls(diffs);
    })
  }
})


describe("LCS", () => {
  for (const [xs, ys, ans] of tests) {
    it(`should calculate lcs for '${xs}', '${ys}'`, () => {
      const seq = [...lcs(xs, ys)];
      const common = extract(ys, seq);
      expect(ans).to.include(common);
    });
  }
});

describe('patch', () => {
  for (const [xs, ys] of tests) {
    it(`should calculate patch for ${ xs }, ${ ys }`, () => {
      const edit = [...applyPatch(xs, calcPatch(xs, ys))].join('');
      expect(edit).to.eql(ys);
    });
  }
});

