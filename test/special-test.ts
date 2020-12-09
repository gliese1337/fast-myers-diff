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

