import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

interface ExecutionStep {
  stepNumber: number;
  lineNumber: number;
  code: string;
  variables: any[];
  pointers: any[];
  arrays: any[];
  linkedLists: Record<string, any[]>;
  trees: Record<string, any[]>;
  stacks: Record<string, any[]>;
  queues: Record<string, any[]>;
  hashmaps: Record<string, any>;
  callStack: any[];
  output: string[];
  memoryAllocations: any[];
  explanation?: string;
}

interface ExecutionTrace {
  steps: ExecutionStep[];
  error?: string;
  compilationError?: string;
}

// Instrument C code with state tracking
function instrumentCode(code: string): string {
  // This is a simplified instrumentation approach
  // In a production system, you'd use a proper C parser (like libclang or tree-sitter)
  
  const lines = code.split('\n');
  const instrumentedLines: string[] = [];
  let stepCounter = 0;
  let inMainFunction = false;
  let braceCount = 0;
  
  // Add JSON output helper at the top
  instrumentedLines.push('#include <stdio.h>');
  instrumentedLines.push('#include <string.h>');
  instrumentedLines.push('');
  instrumentedLines.push('// Instrumentation helper');
  instrumentedLines.push('#define TRACE_STEP(line, vars) printf("__TRACE__{\\\"step\\\":%d,\\\"line\\\":%d,\\\"vars\\\":\\\"%s\\\"}__END__\\n", step_counter++, line, vars)');
  instrumentedLines.push('int step_counter = 0;');
  instrumentedLines.push('');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;
    
    // Skip includes and defines we already added
    if (line.startsWith('#include <stdio.h>') || 
        line.startsWith('#include <string.h>')) {
      continue;
    }
    
    instrumentedLines.push(lines[i]);
    
    // Track when we enter main function
    if (line.includes('int main(') || line.includes('void main(')) {
      inMainFunction = true;
      continue;
    }
    
    if (inMainFunction) {
      // Count braces to know when we're inside main
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }
      
      // Exit main when braces return to 0
      if (braceCount === 0 && line.includes('}')) {
        inMainFunction = false;
        continue;
      }
      
      // Instrument variable declarations and assignments
      if (braceCount > 0 && 
          (line.includes('int ') || line.includes('char ') || 
           line.includes('float ') || line.includes('double ') ||
           line.includes('=')) && 
          !line.startsWith('//') && 
          !line.startsWith('/*') &&
          !line.includes('for (') &&
          line.includes(';')) {
        
        instrumentedLines.push(`  TRACE_STEP(${lineNum}, "trace");`);
      }
    }
  }
  
  return instrumentedLines.join('\n');
}

// Parse trace output from instrumented code
function parseTrace(stdout: string, originalCode: string): ExecutionStep[] {
  const steps: ExecutionStep[] = [];
  const lines = stdout.split('\n');
  const codeLines = originalCode.split('\n');
  
  let currentOutput: string[] = [];
  
  for (const line of lines) {
    if (line.includes('__TRACE__') && line.includes('__END__')) {
      try {
        const jsonStr = line.substring(
          line.indexOf('__TRACE__') + 9,
          line.indexOf('__END__')
        );
        const traceData = JSON.parse(jsonStr);
        
        const step: ExecutionStep = {
          stepNumber: traceData.step,
          lineNumber: traceData.line,
          code: codeLines[traceData.line - 1] || '',
          variables: [],
          pointers: [],
          arrays: [],
          linkedLists: {},
          trees: {},
          stacks: {},
          queues: {},
          hashmaps: {},
          callStack: [{
            functionName: 'main',
            lineNumber: traceData.line,
            variables: [],
          }],
          output: [...currentOutput],
          memoryAllocations: [],
        };
        
        steps.push(step);
      } catch (e) {
        console.error('Failed to parse trace:', e);
      }
    } else if (line.trim() && !line.includes('step_counter')) {
      // Regular output
      currentOutput.push(line);
    }
  }
  
  // If no trace steps were generated, create a basic step for the final output
  if (steps.length === 0 && currentOutput.length > 0) {
    steps.push({
      stepNumber: 0,
      lineNumber: 1,
      code: codeLines[0] || '',
      variables: [],
      pointers: [],
      arrays: [],
      linkedLists: {},
      trees: {},
      stacks: {},
      queues: {},
      hashmaps: {},
      callStack: [],
      output: currentOutput,
      memoryAllocations: [],
    });
  }
  
  return steps;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { code } = req.body;
  
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Code is required' });
  }
  
  try {
    // Instrument the code
    const instrumentedCode = instrumentCode(code);
    
    // Execute with Piston API
    const pistonUrl = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston';
    
    const response = await axios.post(`${pistonUrl}/execute`, {
      language: 'c',
      version: '*',
      files: [{
        name: 'main.c',
        content: instrumentedCode,
      }],
    }, {
      timeout: 10000, // 10 second timeout
    });
    
    const { run } = response.data;
    
    // Check for compilation errors
    if (run.code !== 0 && run.stderr) {
      return res.status(200).json({
        steps: [],
        compilationError: run.stderr,
      } as ExecutionTrace);
    }
    
    // Parse the trace from stdout
    const steps = parseTrace(run.stdout || '', code);
    
    // Return execution trace
    const trace: ExecutionTrace = {
      steps,
      error: run.stderr || undefined,
    };
    
    return res.status(200).json(trace);
    
  } catch (error: any) {
    console.error('Execution error:', error);
    
    // Handle timeout
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({
        steps: [],
        error: 'Execution timeout - code took too long to run',
      } as ExecutionTrace);
    }
    
    // Handle Piston API errors
    if (error.response) {
      return res.status(200).json({
        steps: [],
        error: `Execution failed: ${error.response.data?.message || error.message}`,
      } as ExecutionTrace);
    }
    
    return res.status(500).json({
      steps: [],
      error: 'Internal server error during code execution',
    } as ExecutionTrace);
  }
}
