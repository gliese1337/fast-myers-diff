import 'mocha';
import { expect } from 'chai';
import { calcPatch, applyPatch, lcs, Sliceable } from '../src';

function extract(ys: Sliceable, indices: [number, number, number][]) {
  return indices.map(([, s, l]) => ys.slice(s, s + l)).join('');
}

const tests = [
  ['a', 'baa', 'a'],
  ['abb', 'b', 'b'],
  ['preabmcdpost', 'prezxmywpost', 'prempost'],
  ['abcfboopqxyz', 'abcgbooprxyz', 'abcboopxyz'],
  ['', '', ''],
  ['a', '', ''],
  ['', 'b', ''],
  ['abc', 'abc', 'abc'],
  ['abcd', 'obce', 'bc'],
  ['abc', 'ab', 'ab'],
  ['abc', 'bc', 'bc'],
  ['abcde', 'zbodf', 'bd'],
  ['aa','aaaa', 'aa'],
  ['GTCGTTCGGAATGCCGTTGCTCTGTAAA', 'ACCGGTCGAGTGCGCGGAAGCCGGCCGAA', 'GTCGTCGGAAGCCGGCCGAA'],
];

describe("Comprehensive Tests", () => {
  for (const [xs, ys, ans] of tests) {
    it(`should calculate lcs & patch for ${ xs }, ${ ys }`, () => {
      const seq = [...lcs(xs, ys)];
      const common = extract(ys, seq);
      // const es1 = [...diff(xs, ys)];
      const es2 = [...calcPatch(xs, ys)];
      const edit = [...applyPatch(xs, es2)].join('');

      expect(ans).to.eql(common);
      expect(edit).to.eql(ys);
    });
  }
});