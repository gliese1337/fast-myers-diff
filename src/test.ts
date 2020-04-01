//import { lcs, Indexable, Vec4 } from './hirschberg';
import { diff } from './meyers';

//function extract(xs: Indexable, indices: Vec4[]) {
//  return indices.map(([s, e]) => xs.slice(s, e)).join('');
//}

const tests = [
  ['preabmcdpost', 'prezxmywpost', 'prempost'],
  /*['abcfboopqxyz', 'abcgbooprxyz', 'abcboopxyz'],
  ['', '', ''],
  ['a', '', ''],
  ['', 'b', ''],
  ['abc', 'abc', 'abc'],
  ['abcd', 'obce', 'bc'],
  ['abc', 'ab', 'ab'],
  ['abc', 'bc', 'bc'],
  ['abcde', 'zbodf', 'bd'],
  ['aa','aaaa', 'aa'],
  ['GTCGTTCGGAATGCCGTTGCTCTGTAAA', 'ACCGGTCGAGTGCGCGGAAGCCGGCCGAA', 'GTCGTCGGAAGCCGGCCGAA'],*/
];

for (const [xs, ys, ans] of tests) {
  /*const arr = [...lcs(xs, ys)];
  //console.log(arr);
  const res = extract(xs, arr);
  if (res !== ans) console.error('error:', xs, ys, res, ans, res.length === ans.length);
  else console.log('success:', xs, ys, res);
  */
  console.log(xs, ys, ans, [...diff(xs, ys)]);
}