const Benchtable = require('benchtable')
suite = new Benchtable('diffs', {isTransposed : true});
const fastMyersDiff = require('../bin');
const myersDiff = require('myers-diff');
const prev_version = require('fast-myers-diff');
const fastDiff = require('fast-diff');
const seedRandom = require('seedrandom')
seedRandom('benchmark', {global: true});


function repeat(s1, n) {
  let ans = '';
  let ss = s1;
  while(n >= 1){
    if(n % 2 === 1){
      ans += ss;
    }
    n >>= 1;
    if(n >= 1) ss = ss + ss;
  }
  return ans;
}

function insertions(insertion, into){
  let ans = into;
  for(let i = 0; i < insertion.length; ++i){
    const pos = Math.random() * ans.length;
    ans = ans.slice(0, pos) + insertion[i] + ans.slice(pos);
  }
  return ans;
}

suite.addFunction('myers-diff-2.0.1', (x, y, lcs) => {
  let n = x.length + y.length
  for(const t of myersDiff.diff(x, y, {compare: 'chars'})){
    n -= t.lhs.del + t.rhs.add;
  }
  if(typeof lcs === 'number' && n !== 2*lcs) throw 'Wrong result';
})

suite.addFunction('fast-myers-diff', (x, y) => {
  let n = x.length + y.length;
  for(const [xs,xe,ys,ye] of fastMyersDiff.diff(x, y)){
    n -= (xe - xs) + (ye - ys);
  }
  if(typeof lcs === 'number' && n !== 2*lcs) throw 'Wrong result';
})
suite.addFunction('fast-diff-1.2.0', (x, y) => {
  let n = 0;
  for(const [side, ] of fastDiff(x, y)){
    n += side;
  }
  if(typeof lcs === 'number' && n !== lcs) throw 'Wrong result';
})
suite.addFunction('fast-myers-diff-2.0.0', (x, y) => {
  let n = x.length + y.length;
  if(n >= 256){
    throw 'Lengths above 256 not supported'
  }
  for(const [xs,xe,ys,ye] of prev_version.diff(x, y)){
    n -= (xe - xs) + (ye - ys);
  }
  if(typeof lcs === 'number' && n !== 2*lcs) throw 'Wrong result';
})

for(const [n, c1, c2] of [
  [10, 100, 100],
  [10, 4, 200],
  [100, 10, 10],
  [100, 20, 0],
  [100, 0, 20],
  [10, 1000, 1000],
  [10000, 100, 100],
  [10000, 200, 0],
  [10000, 0, 200],
  [10000, 10, 10],
  [10000, 20, 0],
  [10000, 0, 20]

]){
  const lcs = repeat('a', n);
  const x = insertions(repeat('d', c1), lcs);
  const y = insertions(repeat('i', c2), lcs);
  suite.addInput(`n=${n}, +${c1}, delete=${c2}`, [x, y, n]);
}

suite.on("cycle", function (evt) {
  console.log(" - " + evt.target);
});

suite.on("complete",  () => {
  console.log('Fastest is ' + suite.filter('fastest').map('name'));
  console.log(suite.table.toString());
});

console.log("Is it really fast?");
console.log(new Array(30).join("-"));
suite.run();