import { lcs, Indexable, Vec4 } from './hirschberg';
import { calcPatch, applyPatch, diff } from './meyers';
//import { diff } from './meyers';

function extract(xs: Indexable, indices: Vec4[]) {
  return indices.map(([s, e]) => xs.slice(s, e)).join('');
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
  const common = extract(xs, [...lcs(xs, ys)]);
  const es1 = [...diff(xs, ys)];
  //console.log(xs, ys, JSON.stringify(es1));
  const es2 = [...calcPatch(xs, ys)];
  const edit = [...applyPatch(xs, es2)].join('');
  if (common !== ans) console.error('lcs error:', xs, ys, ans, common);
  if (edit !== ys) console.error('dif error:', xs, ys, edit, es1, es2);
}