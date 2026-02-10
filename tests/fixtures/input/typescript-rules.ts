// Test TypeScript-specific linting rules

// @typescript-eslint/no-explicit-any
function acceptsAny(param: any) {
  return param;
}

// @typescript-eslint/no-unused-vars
const unusedTsVar: string = 'unused';

// @typescript-eslint/no-inferrable-types
const explicitNumber: number = 42;

// @typescript-eslint/ban-ts-comment
// @ts-ignore
const ignored = 'something';

// no-var
var tsOldStyle: string = 'should use let or const';

// prefer-const
let tsShouldBeConst: string = 'never reassigned';

// @typescript-eslint/no-empty-interface
interface EmptyInterface {}

// @typescript-eslint/no-non-null-assertion
const value = null;
const forced = value!;

export {};
