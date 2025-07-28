// Simple C Interpreter for Browser-based Execution
// Handles basic C constructs for visualization purposes

export class CInterpreter {
  private variables: Map<string, { name: string; value: any; type: string; address: number }> = new Map();
  private arrays: Map<string, number[]> = new Map();
  private output: string = '';
  private steps: Array<{ line: number; action: string; variables: Record<string, any>; arrays: Record<string, number[]> }> = [];
  private currentLine: number = 0;
  private memoryAddress: number = 1000;

  constructor() {
    console.log('DEBUG: CInterpreter initialized');
  }

  private allocateMemory(size: number): number {
    const address = this.memoryAddress;
    this.memoryAddress += size;
    return address;
  }

  private addStep(line: number, action: string) {
    const step = {
      line,
      action,
      variables: Object.fromEntries(this.variables),
      arrays: Object.fromEntries(this.arrays)
    };
    this.steps.push(step);
    console.log(`DEBUG: Step ${this.steps.length} - Line ${line}: ${action}`);
  }

  // Simplified expression evaluation - only handle basic cases
  private evaluateExpression(expr: string): number {
    expr = expr.trim();
    console.log(`DEBUG: Evaluating expression: "${expr}"`);

    // Handle array access: arr[index]
    const arrayMatch = expr.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\[([^\]]+)\]$/);
    if (arrayMatch) {
      const arrayName = arrayMatch[1];
      const indexExpr = arrayMatch[2];
      const index = this.evaluateExpression(indexExpr);
      
      if (this.arrays.has(arrayName)) {
        const array = this.arrays.get(arrayName)!;
        if (index >= 0 && index < array.length) {
          console.log(`DEBUG: Array access ${arrayName}[${index}] = ${array[index]}`);
          return array[index];
        } else {
          console.warn(`DEBUG: Array index out of bounds: ${arrayName}[${index}]`);
          return 0;
        }
      } else {
        console.warn(`DEBUG: Array not found: ${arrayName}`);
        return 0;
      }
    }

    // Handle simple arithmetic: a + b, a - b, a * b, a / b
    if (expr.includes('+')) {
      const parts = expr.split('+').map(p => p.trim());
      if (parts.length === 2) {
        const left = this.evaluateExpression(parts[0]);
        const right = this.evaluateExpression(parts[1]);
        console.log(`DEBUG: Arithmetic ${left} + ${right} = ${left + right}`);
        return left + right;
      }
    }
    if (expr.includes('-')) {
      const parts = expr.split('-').map(p => p.trim());
      if (parts.length === 2) {
        const left = this.evaluateExpression(parts[0]);
        const right = this.evaluateExpression(parts[1]);
        console.log(`DEBUG: Arithmetic ${left} - ${right} = ${left - right}`);
        return left - right;
      }
    }
    if (expr.includes('*')) {
      const parts = expr.split('*').map(p => p.trim());
      if (parts.length === 2) {
        const left = this.evaluateExpression(parts[0]);
        const right = this.evaluateExpression(parts[1]);
        console.log(`DEBUG: Arithmetic ${left} * ${right} = ${left * right}`);
        return left * right;
      }
    }
    if (expr.includes('/')) {
      const parts = expr.split('/').map(p => p.trim());
      if (parts.length === 2) {
        const left = this.evaluateExpression(parts[0]);
        const right = this.evaluateExpression(parts[1]);
        console.log(`DEBUG: Arithmetic ${left} / ${right} = ${left / right}`);
        return left / right;
      }
    }

    // Handle sizeof
    const sizeofMatch = expr.match(/sizeof\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)\s*\/\s*sizeof\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\[\s*0\s*\]\s*\)/);
    if (sizeofMatch) {
      const arrayName = sizeofMatch[1];
      if (this.arrays.has(arrayName)) {
        const length = this.arrays.get(arrayName)!.length;
        console.log(`DEBUG: sizeof(${arrayName})/sizeof(${arrayName}[0]) = ${length}`);
        return length;
      }
    }

    // Variable lookup
    if (this.variables.has(expr)) {
      const value = this.variables.get(expr)!.value;
      console.log(`DEBUG: Variable lookup ${expr} = ${value}`);
      return value;
    }

    // Literal values
    if (!isNaN(Number(expr))) {
      console.log(`DEBUG: Literal value ${expr} = ${Number(expr)}`);
      return Number(expr);
    }

    console.log(`DEBUG: Expression "${expr}" not recognized, returning 0`);
    return 0;
  }

  // Simplified comparison evaluation
  private evaluateCondition(condition: string): boolean {
    console.log(`DEBUG: Evaluating condition: "${condition}"`);
    
    // Handle simple comparisons: a > b, a < b, a >= b, a <= b, a == b, a != b
    const operators = ['>=', '<=', '==', '!=', '>', '<'];
    for (const op of operators) {
      if (condition.includes(op)) {
        const parts = condition.split(op).map(p => p.trim());
        if (parts.length === 2) {
          const left = this.evaluateExpression(parts[0]);
          const right = this.evaluateExpression(parts[1]);
          let result = false;
          
          switch (op) {
            case '>': result = left > right; break;
            case '<': result = left < right; break;
            case '>=': result = left >= right; break;
            case '<=': result = left <= right; break;
            case '==': result = left === right; break;
            case '!=': result = left !== right; break;
          }
          
          console.log(`DEBUG: Condition ${left} ${op} ${right} = ${result}`);
          return result;
        }
      }
    }
    
    // If no comparison operator found, evaluate as boolean
    const value = this.evaluateExpression(condition);
    console.log(`DEBUG: Boolean condition "${condition}" = ${value !== 0}`);
    return value !== 0;
  }

  private parseVariableDeclaration(line: string): { name: string; type: string; value?: any } | null {
    // Match: int x = expr; or int arr[5] = {1,2,3,4,5}; or int arr[] = {1,2,3,4,5};
    const intMatch = line.match(/int\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^;]+);/);
    if (intMatch) {
      // Evaluate the right-hand side as an expression, not just parseInt
      return { name: intMatch[1], type: 'int', value: this.evaluateExpression(intMatch[2]) };
    }

    // Match: int a =3, b =5; (multiple declarations on one line)
    const multiDeclMatch = line.match(/int\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^,]+),\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^;]+);/);
    if (multiDeclMatch) {
      // Handle the first declaration
      const firstValue = this.evaluateExpression(multiDeclMatch[2]);
      this.variables.set(multiDeclMatch[1], {
        name: multiDeclMatch[1],
        value: firstValue,
        type: 'int',
        address: this.allocateMemory(4)
      });
      
      // Handle the second declaration
      const secondValue = this.evaluateExpression(multiDeclMatch[4]);
      this.variables.set(multiDeclMatch[3], {
        name: multiDeclMatch[3],
        value: secondValue,
        type: 'int',
        address: this.allocateMemory(4)
      });
      
      this.addStep(this.currentLine, `Declared int ${multiDeclMatch[1]} = ${firstValue}, ${multiDeclMatch[3]} = ${secondValue}`);
      return { name: multiDeclMatch[1], type: 'int', value: firstValue };
    }

    // Match array with size: int arr[5] = {1,2,3,4,5};
    const arrayMatch = line.match(/int\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\[(\d+)\]\s*=\s*\{([^}]+)\};/);
    if (arrayMatch) {
      const values = arrayMatch[3].split(',').map(v => parseInt(v.trim()));
      return { name: arrayMatch[1], type: 'array', value: values };
    }

    // Match array without size: int arr[] = {1,2,3,4,5};
    const arrayNoSizeMatch = line.match(/int\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\[\]\s*=\s*\{([^}]+)\};/);
    if (arrayNoSizeMatch) {
      const values = arrayNoSizeMatch[2].split(',').map(v => parseInt(v.trim()));
      return { name: arrayNoSizeMatch[1], type: 'array', value: values };
    }

    return null;
  }

  private parseAssignment(line: string): { name: string; value: any } | null {
    // Match array assignment first: arr[i] = expr;
    const arrayMatch = line.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\[([^\]]+)\]\s*=\s*([^;]+);/);
    if (arrayMatch) {
      const arrayName = arrayMatch[1];
      const index = this.evaluateExpression(arrayMatch[2]);
      const value = this.evaluateExpression(arrayMatch[3]);
      return { name: `${arrayName}[${index}]`, value };
    }

    // Match simple assignment: x = expr;
    const simpleMatch = line.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^;]+);/);
    if (simpleMatch) {
      return { name: simpleMatch[1], value: this.evaluateExpression(simpleMatch[2]) };
    }

    return null;
  }

  private parseForLoop(line: string): { init: string; condition: string; increment: string } | null {
    console.log(`DEBUG: parseForLoop checking line: "${line}"`);
    const forMatch = line.match(/for\s*\(\s*([^;]+);\s*([^;]+);\s*([^)]+)\s*\)/);
    if (forMatch) {
      console.log(`DEBUG: parseForLoop MATCH: init=${forMatch[1].trim()}, condition=${forMatch[2].trim()}, increment=${forMatch[3].trim()}`);
      return {
        init: forMatch[1].trim(),
        condition: forMatch[2].trim(),
        increment: forMatch[3].trim()
      };
    } else {
      console.log(`DEBUG: parseForLoop NO MATCH for line: "${line}"`);
    }
    return null;
  }

  private parsePrintf(line: string): string | null {
    const printfMatch = line.match(/printf\s*\(\s*"([^"]*)"\s*(?:,\s*([^)]*))?\s*\);/);
    if (printfMatch) {
      let format = printfMatch[1];
      const args = printfMatch[2] ? printfMatch[2].split(',').map(a => a.trim()) : [];
      
      console.log(`DEBUG: printf format: "${format}", args: [${args.join(', ')}]`);
      
      // Replace format specifiers with values
      let argIndex = 0;
      format = format.replace(/%d/g, () => {
        if (argIndex < args.length) {
          const value = this.evaluateExpression(args[argIndex]);
          console.log(`DEBUG: printf arg ${argIndex}: ${args[argIndex]} = ${value}`);
          argIndex++;
          return value.toString();
        }
        return '%d';
      });

      // Handle \n escape sequences
      format = format.replace(/\\n/g, '\n');
      
      console.log(`DEBUG: printf result: "${format}"`);
      return format;
    }
    return null;
  }

  execute(code: string): { output: string; steps: Array<{ line: number; action: string; variables: Record<string, any>; arrays: Record<string, number[]> }> } {
    this.reset();
    
    console.log('DEBUG: Starting execution of C code');
    console.log('DEBUG: Input code:', code);
    
    const lines = code.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    let totalLinesProcessed = 0;
    const maxTotalLines = 10000;
    
    try {
      for (let i = 0; i < lines.length && totalLinesProcessed < maxTotalLines; i++) {
        totalLinesProcessed++;
        const line = lines[i];
        this.currentLine = i + 1;
        
        console.log(`DEBUG: Processing line ${this.currentLine}: "${line}"`);
        
        if (line.length === 0 || line.startsWith('//') || line.startsWith('#include')) {
          continue;
        }
        
        // Handle variable declarations first
        const varDecl = this.parseVariableDeclaration(line);
        if (varDecl) {
          console.log(`DEBUG: Variable declaration: ${varDecl.type} ${varDecl.name} = ${JSON.stringify(varDecl.value)}`);
          if (varDecl.type === 'array') {
            this.arrays.set(varDecl.name, varDecl.value);
            this.addStep(this.currentLine, `Declared array ${varDecl.name} = [${varDecl.value.join(', ')}]`);
          } else {
            this.variables.set(varDecl.name, {
              name: varDecl.name,
              value: varDecl.value,
              type: 'int',
              address: this.allocateMemory(4)
            });
            this.addStep(this.currentLine, `Declared int ${varDecl.name} = ${varDecl.value}`);
          }
          continue;
        }
        
        // Handle printf statements
        const printfResult = this.parsePrintf(line);
        if (printfResult) {
          this.output += printfResult;
          this.addStep(this.currentLine, `Printed: ${printfResult}`);
          continue;
        }
        
        // Handle scanf statements
        const scanfMatch = line.match(/scanf\s*\(\s*"([^"]*)"\s*(?:,\s*([^)]*))?\s*\);/);
        if (scanfMatch) {
          const format = scanfMatch[1];
          const args = scanfMatch[2] ? scanfMatch[2].split(',').map(a => a.trim()) : [];
          
          console.log(`DEBUG: scanf format: "${format}", args: [${args.join(', ')}]`);
          
          // For now, we'll simulate scanf by setting default values
          // In a real implementation, this would read from user input
          args.forEach((arg, index) => {
            if (arg.startsWith('&')) {
              const varName = arg.substring(1);
              const variable = this.variables.get(varName);
              if (variable) {
                // Simulate user input (for demo purposes)
                const simulatedInput = [10, 20, 30, 40, 50][index] || 0;
                variable.value = simulatedInput;
                console.log(`DEBUG: scanf set ${varName} = ${simulatedInput}`);
                this.addStep(this.currentLine, `scanf: ${varName} = ${simulatedInput}`);
              }
            }
          });
          continue;
        }
        
        // Handle sizeof
        const sizeofMatch = line.match(/sizeof\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)\s*\/\s*sizeof\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\[\s*0\s*\]\s*\)/);
        if (sizeofMatch) {
          const arrayName = sizeofMatch[1];
          const array = this.arrays.get(arrayName);
          if (array) {
            const size = array.length;
            console.log(`DEBUG: sizeof(${arrayName}) = ${size}`);
            this.addStep(this.currentLine, `sizeof(${arrayName}) = ${size}`);
            
            // Store the result in a variable (usually 'n')
            const resultVar = 'n';
            this.variables.set(resultVar, {
              name: resultVar,
              value: size,
              type: 'int',
              address: this.allocateMemory(4)
            });
            this.addStep(this.currentLine, `Calculated array size: ${resultVar} = ${size}`);
          }
          continue;
        }
        
        // Handle for loops with simplified execution
        const forLoop = this.parseForLoop(line);
        if (forLoop) {
          console.log(`DEBUG: For loop: init=${forLoop.init}, condition=${forLoop.condition}, increment=${forLoop.increment}`);
          
          // Execute initialization
          this.executeLine(forLoop.init);
          
          // Find loop body
          let loopStart = -1;
          let loopEnd = -1;
          let braceCount = 0;
          
          for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].includes('{')) {
              if (braceCount === 0) loopStart = j + 1;
              braceCount++;
            }
            if (lines[j].includes('}')) {
              braceCount--;
              if (braceCount === 0) {
                loopEnd = j;
                break;
              }
            }
          }
          
          if (loopStart === -1 || loopEnd === -1) {
            console.error('Could not find loop body');
            continue;
          }
          
          console.log(`DEBUG: Loop body: lines ${loopStart} to ${loopEnd}`);
          
          // Execute loop with simplified logic
          let iterationCount = 0;
          const maxIterations = 100; // Reduced for safety
          
          while (this.evaluateCondition(forLoop.condition) && iterationCount < maxIterations) {
            console.log(`DEBUG: Loop iteration ${iterationCount + 1}, condition: ${forLoop.condition}`);
            console.log(`DEBUG: Current variables:`, {
              i: this.variables.get('i')?.value,
              j: this.variables.get('j')?.value,
              n: this.variables.get('n')?.value,
              arr: this.arrays.get('arr')
            });
            console.log(`DEBUG: Condition evaluation: ${forLoop.condition} = ${this.evaluateCondition(forLoop.condition)}`);
            
            // Execute loop body line by line with safety check
            for (let j = loopStart; j < loopEnd && totalLinesProcessed < maxTotalLines; j++) {
              totalLinesProcessed++;
              const bodyLine = lines[j];
              this.currentLine = j + 1;
              
              if (bodyLine.length === 0 || bodyLine.startsWith('//')) {
                continue;
              }
              
              console.log(`DEBUG: Executing loop body line: "${bodyLine}"`);
              this.executeLine(bodyLine);
            }
            
            // Execute increment
            console.log(`DEBUG: Executing increment: ${forLoop.increment}`);
            this.executeLine(forLoop.increment);
            
            iterationCount++;
          }
          
          console.log(`DEBUG: Loop completed after ${iterationCount} iterations`);
          
          // Skip the loop body since we've already executed it
          i = loopEnd;
          continue;
        }
        
        // Handle other statements
        this.executeLine(line);
      }
      
      console.log(`DEBUG: Execution completed. Total lines processed: ${totalLinesProcessed}`);
      console.log(`DEBUG: Final output: ${this.output}`);
      console.log(`DEBUG: Final variables:`, Object.fromEntries(this.variables));
      console.log(`DEBUG: Final arrays:`, Object.fromEntries(this.arrays));
      
    } catch (error) {
      console.error('DEBUG: Error during execution:', error);
      this.addStep(this.currentLine, `Error: ${error}`);
    }
    
    return {
      output: this.output,
      steps: this.steps
    };
  }

  private executeLine(line: string) {
    // Execute a single line (helper for loops and conditionals)
    this.currentLine++;
    
    console.log(`DEBUG: executeLine: "${line}"`);
    
    // Handle printf statements first
    const printfResult = this.parsePrintf(line);
    if (printfResult) {
      this.output += printfResult;
      this.addStep(this.currentLine, `Printed: ${printfResult}`);
      return;
    }
    
    // Handle variable declarations within loops
    const varDecl = this.parseVariableDeclaration(line);
    if (varDecl) {
      console.log(`DEBUG: Variable declaration in loop: ${varDecl.type} ${varDecl.name} = ${JSON.stringify(varDecl.value)}`);
      if (varDecl.type === 'array') {
        this.arrays.set(varDecl.name, varDecl.value);
      } else {
        this.variables.set(varDecl.name, {
          name: varDecl.name,
          value: varDecl.value || 0,
          type: 'int',
          address: this.allocateMemory(4)
        });
      }
      this.addStep(this.currentLine, `Declared ${varDecl.type} ${varDecl.name}`);
      return;
    }
    
    const assignment = this.parseAssignment(line);
    if (assignment) {
      if (assignment.name.includes('[')) {
        // Handle array assignment - the index is already evaluated in parseAssignment
        const arrayMatch = assignment.name.match(/([a-zA-Z_][a-zA-Z0-9_]*)\[(\d+)\]/);
        if (arrayMatch) {
          const arrayName = arrayMatch[1];
          const index = parseInt(arrayMatch[2]);
          const array = this.arrays.get(arrayName);
          if (array) {
            // Only allow assignment within the original array bounds
            if (index >= 0 && index < array.length) {
              console.log(`DEBUG: Array assignment in loop: ${arrayName}[${index}] = ${assignment.value}`);
              array[index] = assignment.value;
            } else {
              console.warn(`DEBUG: Array index out of bounds: ${arrayName}[${index}] (array size: ${array.length})`);
            }
          } else {
            console.error(`DEBUG: Array not found: ${arrayName}`);
          }
        }
      } else {
        // Handle regular variable assignment
        const variable = this.variables.get(assignment.name);
        if (variable) {
          variable.value = assignment.value;
        } else {
          // Create new variable if it doesn't exist
          this.variables.set(assignment.name, {
            name: assignment.name,
            value: assignment.value,
            type: 'int',
            address: this.allocateMemory(4)
          });
        }
      }
      console.log(`DEBUG: Assignment in loop: ${assignment.name} = ${assignment.value}`);
      this.addStep(this.currentLine, `Assigned ${assignment.name} = ${assignment.value}`);
      return;
    }

    // Handle increment expressions like j++ or i++
    const incrementMatch = line.match(/([a-zA-Z_][a-zA-Z0-9_]*)\+\+/);
    if (incrementMatch) {
      const varName = incrementMatch[1];
      const variable = this.variables.get(varName);
      if (variable) {
        const oldValue = variable.value;
        variable.value = oldValue + 1;
        console.log(`DEBUG: Increment ${varName}++: ${oldValue} -> ${variable.value}`);
        this.addStep(this.currentLine, `Incremented ${varName}++: ${oldValue} -> ${variable.value}`);
        return;
      } else {
        console.error(`DEBUG: Variable ${varName} not found for increment`);
      }
    }
    
    // Handle decrement expressions like j-- or i--
    const decrementMatch = line.match(/([a-zA-Z_][a-zA-Z0-9_]*)\-\-/);
    if (decrementMatch) {
      const varName = decrementMatch[1];
      const variable = this.variables.get(varName);
      if (variable) {
        const oldValue = variable.value;
        variable.value = oldValue - 1;
        console.log(`DEBUG: Decrement ${varName}--: ${oldValue} -> ${variable.value}`);
        this.addStep(this.currentLine, `Decremented ${varName}--: ${oldValue} -> ${variable.value}`);
        return;
      } else {
        console.error(`DEBUG: Variable ${varName} not found for decrement`);
      }
    }
    
    // Handle if statements within loops
    if (line.startsWith('if')) {
      const conditionMatch = line.match(/if\s*\(\s*([^)]+)\s*\)/);
      if (conditionMatch) {
        const condition = this.evaluateCondition(conditionMatch[1]);
        this.addStep(this.currentLine, `If condition: ${conditionMatch[1]} = ${condition}`);
        console.log(`DEBUG: If condition in loop: ${conditionMatch[1]} = ${condition}`);
        return;
      }
    }
    
    // Handle empty lines and comments
    if (line.length === 0 || line.startsWith('//')) {
      return;
    }
    
    // If we reach here, we couldn't parse the line
    console.warn(`DEBUG: Could not parse line: "${line}"`);
  }

  reset() {
    this.variables.clear();
    this.arrays.clear();
    this.output = '';
    this.steps = [];
    this.currentLine = 0;
    this.memoryAddress = 1000;
  }
}

export function runCCodeInterpreter(code: string): { output: string; steps: Array<{ line: number; action: string; variables: Record<string, any>; arrays: Record<string, number[]> }> } {
  const interpreter = new CInterpreter();
  const result = interpreter.execute(code);
  
  // Convert steps to the format expected by the UI
  const steps = result.steps.map(step => ({
    line: step.line,
    action: step.action,
    variables: step.variables,
    arrays: step.arrays
  }));
  
  return {
    output: result.output,
    steps
  };
} 