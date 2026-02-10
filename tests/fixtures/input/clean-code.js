// Test file with clean code (no violations)

const greeting = 'Hello, World!';

function add(a, b) {
  return a + b;
}

function multiply(x, y) {
  return x * y;
}

class Calculator {
  constructor() {
    this.result = 0;
  }

  add(value) {
    this.result += value;
    return this;
  }

  subtract(value) {
    this.result -= value;
    return this;
  }

  getResult() {
    return this.result;
  }
}

const calculator = new Calculator();
calculator.add(10).subtract(5);

export { greeting, add, multiply, Calculator };
