const {Randomize} = require("./test-utils");
const Benchmark = require('benchmark')
const MyersDiff = require('myers-diff');
const FastMyersDiff = require('../bin/index')
const suite = new Benchmark.Suite;



// add tests
suite.add('randomize(n=100)', function() {
  Randomize.string(100);
})
suite.add('subsequences(1000, 10, 50)', function() {
  Randomize.subsequences(1000, 10, 50);
})

for(const [n1, n2] of [[100, 100], [50, 100], [100, 50]]){
  suite.add(`myers-diff (unrelated ${n1} x ${n2})`, function() {
    const x = Randomize.string(n1);
    const y = Randomize.string(n2);
    MyersDiff.diff(x, y, {compare: 'chars'})
  })
  suite.add(`fast-myers-diff (unrelated ${n1} x ${n2})`, function() {
    const x = Randomize.string(100);
    const y = Randomize.string(100);
    for(const _ of FastMyersDiff.diff(x.toString(), y.toString())){}
  })
}
// add listeners
suite.on('cycle', function(event) {
  console.log(String(event.target));
})
// run async
suite.run({ 'async': true });