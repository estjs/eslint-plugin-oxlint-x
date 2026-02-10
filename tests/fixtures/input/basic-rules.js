// Test basic JavaScript linting rules

// no-debugger
debugger;

// no-console (if enabled)
console.log('test');

// no-unused-vars
const unusedVariable = 42;

// no-undef
undefinedVariable = 10;

// eqeqeq
if (x == null) {
  // should use ===
}

// no-var
var oldStyle = 'should use let or const';

// prefer-const
let shouldBeConst = 'never reassigned';

// no-empty
if (true) {
}

// no-unreachable
function test() {
  return true;
  console.log('unreachable');
}

export default {};
