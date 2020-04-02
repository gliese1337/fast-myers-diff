import { calcPatch, applyPatch, lcs, Sliceable } from '.';

function extract(ys: Sliceable, indices: [number, number, number][]) {
  return indices.map(([, s, l]) => ys.slice(s, s + l)).join('');
}

const tests = [
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

for (const [xs, ys, ans] of tests) {
  const seq = [...lcs(xs, ys)];
  const common = extract(ys, seq);
  //const es1 = [...diff(xs, ys)];
  const es2 = [...calcPatch(xs, ys)];
  const edit = [...applyPatch(xs, es2)].join('');

  if (ans === common) console.log('+ LCS', xs, ys, ans, JSON.stringify(seq));
  else console.log('! LCS', xs, ys, ans, common, JSON.stringify(seq));
  if (edit === ys) console.error('+ Dif', xs, ys, edit, JSON.stringify(es2));
  else console.error('! Dif', xs, ys, edit, JSON.stringify(es2));
}