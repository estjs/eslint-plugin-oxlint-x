// Test file with multiple rule violations for comprehensive testing

// Debugger statement
debugger;

// Unused variables
const unused1 = 'never used';
let unused2 = 42;

// Using var instead of let/const
var oldStyleVar = 'deprecated';

// Equality without type checking
function checkEquality(a, b) {
  if (a == b) {
    return true;
  }
  return false;
}

// Empty block
if (true) {
}

// Unreachable code
function unreachableCode() {
  return 'early return';
  console.log('this will never execute');
}

// No-undef
undefinedVar = 'not defined';

// Prefer const
let neverReassigned = 'should be const';

// Console statements
console.log('debug message');
console.error('error message');

// Multiple violations in one function
function problematicFunction() {
  var x = 10; // var instead of let/const
  debugger; // debugger statement
  if (x == 10) { // == instead of ===
    console.log(x); // console statement
  }
  const unused = 'never used'; // unused variable
  return x;
}

export { checkEquality, unreachableCode, problematicFunction };
