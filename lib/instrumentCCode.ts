// Instrument C code for step-by-step tracing
// Injects printf statements after each statement to output variable values and control flow

export function instrumentCCode(code: string, variables: string[]): string {
  // Split code into lines for simple instrumentation (MVP)
  const lines = code.split('\n');
  const instrumented: string[] = [];
  let insideMain = false;
  let indent = '';

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('int main')) insideMain = true;
    if (insideMain && trimmed === '}') insideMain = false;
    instrumented.push(line);
    // Only instrument inside main
    if (insideMain && trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('return')) {
      indent = line.match(/^\s*/)?.[0] || '';
      // Output all variable values
      if (variables.length > 0) {
        const trace = `${indent}printf(\"TRACE:%d:${variables.map(v => v + '=%d').join(',')}\\n\", __LINE__, ${variables.join(',')});`;
        instrumented.push(trace);
      }
    }
  }
  return instrumented.join('\n');
} 