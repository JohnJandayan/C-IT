// Simple test to debug evaluateExpression
const { runCCodeInterpreter } = require('./lib/cInterpreter.ts');

// Test the bubble sort with minimal code
const testCode = `
int arr[] = {64, 34, 25, 12, 22, 11, 90};
int n = sizeof(arr) / sizeof(arr[0]);
int i = 0;
int j = 0;
printf("n = %d\\n", n);
printf("i = %d\\n", i);
printf("j = %d\\n", j);
printf("n - i - 1 = %d\\n", n - i - 1);
`;

console.log('Testing evaluateExpression...');
const result = runCCodeInterpreter(testCode);
console.log('Output:', result.output);
console.log('Steps:', result.steps.length); 