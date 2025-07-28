// Simple debug test
console.log('Testing C interpreter...');

// Test basic functionality
const testCode = `
int arr[] = {64, 34, 25, 12, 22, 11, 90};
int n = sizeof(arr) / sizeof(arr[0]);
printf("Array size: %d\\n", n);
printf("First element: %d\\n", arr[0]);
`;

try {
  // Import the interpreter
  const { runCCodeInterpreter } = require('./lib/cInterpreter.ts');
  
  console.log('Running test...');
  const result = runCCodeInterpreter(testCode);
  
  console.log('Output:', result.output);
  console.log('Steps:', result.steps.length);
  console.log('Success!');
} catch (error) {
  console.error('Error:', error);
  console.error('Stack:', error.stack);
} 