// Simple C Interpreter for Browser-based Execution
// Handles basic C constructs for visualization purposes

interface Variable {
  name: string;
  value: any;
  type: 'int' | 'float' | 'char' | 'array' | 'pointer';
  address?: number;
}

interface ExecutionStep {
  line: number;
  variables: Record<string, any>;
  output: string;
  description: string;
}

class CInterpreter {
  private variables: Map<string, Variable> = new Map();
  private output: string = '';
  private steps: ExecutionStep[] = [];
  private currentLine: number = 0;
  private memory: Map<number, any> = new Map();
  private nextAddress: number = 1000;

  constructor() {
    this.reset();
  }

  reset() {
    this.variables.clear();
    this.output = '';
    this.steps = [];
    this.currentLine = 0;
    this.memory.clear();
    this.nextAddress = 1000;
  }

  private addStep(line: number, description: string) {
    const variables: Record<string, any> = {};
    this.variables.forEach((var_, name) => {
      if (var_.type === 'array') {
        // Add array elements individually for better visualization
        if (Array.isArray(var_.value)) {
          var_.value.forEach((val: any, index: number) => {
            variables[`${name}[${index}]`] = val;
          });
        }
      } else {
        variables[name] = var_.value;
      }
    });

    // Add step information for visualization
    const stepData = { ...variables };
    
    // Add current line
    stepData.line = line;
    
    // Add loop variables for visualization
    if (this.variables.has('i')) stepData.i = this.variables.get('i')!.value;
    if (this.variables.has('j')) stepData.j = this.variables.get('j')!.value;
    
    // Add target for search algorithms
    if (this.variables.has('target')) stepData.target = this.variables.get('target')!.value;
    if (this.variables.has('found')) stepData.found = this.variables.get('found')!.value;
    
    // Add current position for traversal
    if (this.variables.has('current')) stepData.current = this.variables.get('current')!.value;

    // Debug logging
    console.log(`Step ${line}: ${description}`, { variables: stepData });

    this.steps.push({
      line,
      variables: stepData,
      output: this.output,
      description
    });
  }

  private allocateMemory(size: number): number {
    const address = this.nextAddress;
    this.nextAddress += size;
    return address;
  }

  private parseVariableDeclaration(line: string): { name: string; type: string; value?: any } | null {
    // Match: int x = expr; or int arr[5] = {1,2,3,4,5}; or int arr[] = {1,2,3,4,5};
    const intMatch = line.match(/int\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^;]+);/);
    if (intMatch) {
      // Evaluate the right-hand side as an expression, not just parseInt
      return { name: intMatch[1], type: 'int', value: this.evaluateExpression(intMatch[2]) };
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
      console.log(`Array declaration: ${arrayNoSizeMatch[1]} = [${values.join(', ')}]`);
      return { name: arrayNoSizeMatch[1], type: 'array', value: values };
    }

    const simpleDeclare = line.match(/int\s+([a-zA-Z_][a-zA-Z0-9_]*);/);
    if (simpleDeclare) {
      return { name: simpleDeclare[1], type: 'int', value: 0 };
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

  private evaluateExpression(expr: string): any {
    expr = expr.trim();
    console.log(`DEBUG: Evaluating expression: "${expr}"`);
    
    // Handle sizeof operator
    const sizeofMatch = expr.match(/sizeof\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)\s*\/\s*sizeof\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\[\s*0\s*\]\s*\)/);
    if (sizeofMatch) {
      const arrayName = sizeofMatch[1];
      const array = this.variables.get(arrayName);
      if (array && array.type === 'array') {
        return array.value.length;
      }
    }

    // Handle simple sizeof
    const simpleSizeofMatch = expr.match(/sizeof\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/);
    if (simpleSizeofMatch) {
      const varName = simpleSizeofMatch[1];
      const variable = this.variables.get(varName);
      if (variable) {
        if (variable.type === 'array') {
          return variable.value.length * 4; // Assuming int is 4 bytes
        } else {
          return 4; // Assuming int is 4 bytes
        }
      }
    }

    // Handle comparison operators first
    if (expr.includes('>')) {
      const parts = this.splitOnOperator(expr, '>');
      if (parts.length === 2) {
        const leftVal = this.evaluateExpression(parts[0].trim());
        const rightVal = this.evaluateExpression(parts[1].trim());
        console.log(`DEBUG: Comparison ${parts[0].trim()} > ${parts[1].trim()} = ${leftVal} > ${rightVal} = ${leftVal > rightVal}`);
        return leftVal > rightVal;
      }
    }
    if (expr.includes('<')) {
      const parts = this.splitOnOperator(expr, '<');
      if (parts.length === 2) {
        const leftVal = this.evaluateExpression(parts[0].trim());
        const rightVal = this.evaluateExpression(parts[1].trim());
        console.log(`DEBUG: Comparison ${parts[0].trim()} < ${parts[1].trim()} = ${leftVal} < ${rightVal} = ${leftVal < rightVal}`);
        return leftVal < rightVal;
      }
    }
    if (expr.includes('>=')) {
      const parts = this.splitOnOperator(expr, '>=');
      if (parts.length === 2) {
        const leftVal = this.evaluateExpression(parts[0].trim());
        const rightVal = this.evaluateExpression(parts[1].trim());
        console.log(`DEBUG: Comparison ${parts[0].trim()} >= ${parts[1].trim()} = ${leftVal} >= ${rightVal} = ${leftVal >= rightVal}`);
        return leftVal >= rightVal;
      }
    }
    if (expr.includes('<=')) {
      const parts = this.splitOnOperator(expr, '<=');
      if (parts.length === 2) {
        const leftVal = this.evaluateExpression(parts[0].trim());
        const rightVal = this.evaluateExpression(parts[1].trim());
        console.log(`DEBUG: Comparison ${parts[0].trim()} <= ${parts[1].trim()} = ${leftVal} <= ${rightVal} = ${leftVal <= rightVal}`);
        return leftVal <= rightVal;
      }
    }
    if (expr.includes('==')) {
      const parts = this.splitOnOperator(expr, '==');
      if (parts.length === 2) {
        const leftVal = this.evaluateExpression(parts[0].trim());
        const rightVal = this.evaluateExpression(parts[1].trim());
        console.log(`DEBUG: Comparison ${parts[0].trim()} == ${parts[1].trim()} = ${leftVal} == ${rightVal} = ${leftVal === rightVal}`);
        return leftVal === rightVal;
      }
    }
    if (expr.includes('!=')) {
      const parts = this.splitOnOperator(expr, '!=');
      if (parts.length === 2) {
        const leftVal = this.evaluateExpression(parts[0].trim());
        const rightVal = this.evaluateExpression(parts[1].trim());
        console.log(`DEBUG: Comparison ${parts[0].trim()} != ${parts[1].trim()} = ${leftVal} != ${rightVal} = ${leftVal !== rightVal}`);
        return leftVal !== rightVal;
      }
    }

    // Array access - handle this after comparison operators
    const arrayMatch = expr.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\[([^\]]+)\]/);
    if (arrayMatch) {
      const arrayName = arrayMatch[1];
      const indexExpr = arrayMatch[2];
      const index = this.evaluateExpression(indexExpr);
      const array = this.variables.get(arrayName);
      if (array && array.type === 'array') {
        // Check bounds before accessing
        if (index >= 0 && index < array.value.length) {
          const value = array.value[index];
          console.log(`DEBUG: Array access ${arrayName}[${indexExpr}] = ${arrayName}[${index}] = ${value}`);
          return value;
        } else {
          console.warn(`DEBUG: Array index out of bounds: ${arrayName}[${index}] (array size: ${array.value.length})`);
          return undefined;
        }
      } else {
        console.error(`DEBUG: Array not found: ${arrayName}`);
        return undefined;
      }
    }

    // Arithmetic operations - handle with better precedence
    if (expr.includes('+')) {
      // Split on + but be careful not to split within parentheses or brackets
      const parts = this.splitOnOperator(expr, '+');
      if (parts.length > 1) {
        let result = this.evaluateExpression(parts[0]);
        for (let i = 1; i < parts.length; i++) {
          const rightVal = this.evaluateExpression(parts[i]);
          console.log(`DEBUG: Arithmetic ${result} + ${rightVal} = ${result + rightVal}`);
          result += rightVal;
        }
        return result;
      }
    }
    if (expr.includes('-')) {
      const parts = this.splitOnOperator(expr, '-');
      if (parts.length > 1) {
        let result = this.evaluateExpression(parts[0]);
        for (let i = 1; i < parts.length; i++) {
          const rightVal = this.evaluateExpression(parts[i]);
          console.log(`DEBUG: Arithmetic ${result} - ${rightVal} = ${result - rightVal}`);
          result -= rightVal;
        }
        return result;
      }
    }
    if (expr.includes('*')) {
      const parts = this.splitOnOperator(expr, '*');
      if (parts.length > 1) {
        let result = this.evaluateExpression(parts[0]);
        for (let i = 1; i < parts.length; i++) {
          const rightVal = this.evaluateExpression(parts[i]);
          console.log(`DEBUG: Arithmetic ${result} * ${rightVal} = ${result * rightVal}`);
          result *= rightVal;
        }
        return result;
      }
    }
    if (expr.includes('/')) {
      const parts = this.splitOnOperator(expr, '/');
      if (parts.length > 1) {
        let result = this.evaluateExpression(parts[0]);
        for (let i = 1; i < parts.length; i++) {
          const rightVal = this.evaluateExpression(parts[i]);
          console.log(`DEBUG: Arithmetic ${result} / ${rightVal} = ${result / rightVal}`);
          result /= rightVal;
        }
        return result;
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

  private splitOnOperator(expr: string, operator: string): string[] {
    const parts: string[] = [];
    let current = '';
    let parenCount = 0;
    let bracketCount = 0;
    
    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];
      
      if (char === '(') parenCount++;
      else if (char === ')') parenCount--;
      else if (char === '[') bracketCount++;
      else if (char === ']') bracketCount--;
      else if (parenCount === 0 && bracketCount === 0) {
        // Check for multi-character operators first
        if (operator.length === 2 && i < expr.length - 1) {
          const twoCharOp = expr.substring(i, i + 2);
          if (twoCharOp === operator) {
            parts.push(current.trim());
            current = '';
            i++; // Skip the next character
            continue;
          }
        }
        // Check for single-character operators
        else if (char === operator) {
          parts.push(current.trim());
          current = '';
          continue;
        }
      }
      
      current += char;
    }
    
    if (current.trim()) {
      parts.push(current.trim());
    }
    
    return parts;
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

  execute(code: string): { output: string; steps: ExecutionStep[] } {
    this.reset();
    const lines = code.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    console.log('DEBUG: Starting execution with simplified approach');
    
    // Step 1: Process all variable declarations and initializations
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      this.currentLine = i + 1;
      
      // Skip comments and empty lines
      if (line.startsWith('//') || line.startsWith('/*') || line.length === 0) {
        continue;
      }
      
      // Handle variable declarations
      const varDecl = this.parseVariableDeclaration(line);
      if (varDecl) {
        console.log(`DEBUG: Variable declaration: ${varDecl.type} ${varDecl.name} = ${JSON.stringify(varDecl.value)}`);
        if (varDecl.type === 'array') {
          this.variables.set(varDecl.name, {
            name: varDecl.name,
            value: varDecl.value,
            type: 'array',
            address: this.allocateMemory(varDecl.value.length * 4)
          });
        } else {
          this.variables.set(varDecl.name, {
            name: varDecl.name,
            value: varDecl.value || 0,
            type: 'int',
            address: this.allocateMemory(4)
          });
        }
        this.addStep(this.currentLine, `Declared ${varDecl.type} ${varDecl.name}`);
        continue;
      }
      
      // Handle printf statements
      const printfResult = this.parsePrintf(line);
      if (printfResult) {
        this.output += printfResult;
        this.addStep(this.currentLine, `Printed: ${printfResult}`);
        continue;
      }
      
      // Handle sizeof expressions
      const sizeofMatch = line.match(/sizeof\s*\(\s*([^)]+)\s*\)/);
      if (sizeofMatch) {
        const arrayName = sizeofMatch[1];
        const array = this.variables.get(arrayName);
        if (array && array.type === 'array') {
          const size = array.value.length;
          console.log(`DEBUG: sizeof(${arrayName}) = ${size}`);
          this.addStep(this.currentLine, `sizeof(${arrayName}) = ${size}`);
        }
        continue;
      }
      
      // Handle for loops - simplified approach
      const forLoop = this.parseForLoop(line);
      if (forLoop) {
        console.log(`DEBUG: For loop detected: init=${forLoop.init}, condition=${forLoop.condition}, increment=${forLoop.increment}`);
        
        // Execute initialization
        this.executeLine(forLoop.init);
        
        // Find the loop body
        let braceCount = 0;
        let loopStart = -1;
        let loopEnd = -1;
        
        // Find opening brace
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].includes('{')) {
            loopStart = j + 1;
            braceCount = 1;
            break;
          }
        }
        
        if (loopStart === -1) {
          console.error('No opening brace found for for loop');
          i++;
          continue;
        }
        
        // Find closing brace
        for (let j = loopStart; j < lines.length; j++) {
          if (lines[j].includes('{')) braceCount++;
          if (lines[j].includes('}')) {
            braceCount--;
            if (braceCount === 0) {
              loopEnd = j;
              break;
            }
          }
        }
        
        if (loopEnd === -1) {
          console.error('No closing brace found for for loop');
          i = loopStart;
          continue;
        }

        console.log(`DEBUG: Loop body: lines ${loopStart} to ${loopEnd}`);
        
        // Execute the loop
        let iterationCount = 0;
        const maxIterations = 1000;
        
        while (this.evaluateExpression(forLoop.condition) && iterationCount < maxIterations) {
          console.log(`DEBUG: Loop iteration ${iterationCount + 1}, condition: ${forLoop.condition}`);
          
          // Execute loop body
          for (let j = loopStart; j < loopEnd; j++) {
            const bodyLine = lines[j];
            this.currentLine = j + 1;
            
            if (bodyLine.length === 0 || bodyLine.startsWith('//')) {
              continue;
            }
            
            console.log(`DEBUG: Executing loop body line: "${bodyLine}"`);
            
            // Handle nested for loops
            const nestedForLoop = this.parseForLoop(bodyLine);
            if (nestedForLoop) {
              console.log(`DEBUG: Nested for loop: init=${nestedForLoop.init}, condition=${nestedForLoop.condition}, increment=${nestedForLoop.increment}`);
              
              // Execute nested initialization
              this.executeLine(nestedForLoop.init);
              
              // Find nested loop body
              let nestedBraceCount = 0;
              let nestedStart = -1;
              let nestedEnd = -1;
              
              for (let k = j + 1; k < loopEnd; k++) {
                if (lines[k].includes('{')) {
                  nestedStart = k + 1;
                  nestedBraceCount = 1;
                  break;
                }
              }
              
              if (nestedStart === -1) {
                console.error('No opening brace found for nested for loop');
                continue;
              }
              
              for (let k = nestedStart; k < loopEnd; k++) {
                if (lines[k].includes('{')) nestedBraceCount++;
                if (lines[k].includes('}')) {
                  nestedBraceCount--;
                  if (nestedBraceCount === 0) {
                    nestedEnd = k;
                    break;
                  }
                }
              }
              
              if (nestedEnd === -1) {
                console.error('No closing brace found for nested for loop');
                continue;
              }

              console.log(`DEBUG: Nested loop body: lines ${nestedStart} to ${nestedEnd}`);
              
              // Execute nested loop
              let nestedIterationCount = 0;
              const maxNestedIterations = 1000;
              
              while (this.evaluateExpression(nestedForLoop.condition) && nestedIterationCount < maxNestedIterations) {
                console.log(`DEBUG: Nested loop iteration ${nestedIterationCount + 1}, condition: ${nestedForLoop.condition}`);
                
                // Execute nested loop body
                for (let k = nestedStart; k < nestedEnd; k++) {
                  const nestedBodyLine = lines[k];
                  this.currentLine = k + 1;
                  
                  if (nestedBodyLine.length === 0 || nestedBodyLine.startsWith('//')) {
                    continue;
                  }
                  
                  console.log(`DEBUG: Executing nested loop body line: "${nestedBodyLine}"`);
                  this.executeLine(nestedBodyLine);
                }
                
                // Execute nested increment
                console.log(`DEBUG: Executing nested increment: ${nestedForLoop.increment}`);
                this.executeLine(nestedForLoop.increment);
                
                nestedIterationCount++;
              }
              
              console.log(`DEBUG: Nested loop completed after ${nestedIterationCount} iterations`);
              
              // Skip the nested loop body since we've already executed it
              j = nestedEnd;
              continue;
            }
            
            // Handle other statements in loop body
            this.executeLine(bodyLine);
          }
          
          // Execute increment
          console.log(`DEBUG: Executing increment: ${forLoop.increment}`);
          this.executeLine(forLoop.increment);
          
          iterationCount++;
        }
        
        console.log(`DEBUG: Loop completed after ${iterationCount} iterations`);
        
        if (iterationCount >= maxIterations) {
          console.warn('Loop reached maximum iterations, stopping');
        }
        
        i = loopEnd + 1;
        continue;
      }
      
      // Handle other statements
      this.executeLine(line);
      i++;
    }
    
    console.log('DEBUG: Execution completed');
    return { output: this.output, steps: this.steps };
  }

  private executeLine(line: string) {
    // Execute a single line (helper for loops and conditionals)
    this.currentLine++;
    
    console.log(`DEBUG: executeLine: "${line}"`);
    
    // Handle variable declarations within loops
    const varDecl = this.parseVariableDeclaration(line);
    if (varDecl) {
      console.log(`DEBUG: Variable declaration in loop: ${varDecl.type} ${varDecl.name} = ${JSON.stringify(varDecl.value)}`);
      if (varDecl.type === 'array') {
        this.variables.set(varDecl.name, {
          name: varDecl.name,
          value: varDecl.value,
          type: 'array',
          address: this.allocateMemory(varDecl.value.length * 4)
        });
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
          const array = this.variables.get(arrayName);
          if (array && array.type === 'array') {
            console.log(`DEBUG: Array assignment in loop: ${arrayName}[${index}] = ${assignment.value}`);
            array.value[index] = assignment.value;
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
            type: 'int'
          });
        }
      }
      this.addStep(this.currentLine, `Assigned ${assignment.name} = ${assignment.value}`);
      return;
    }

    const printfResult = this.parsePrintf(line);
    if (printfResult) {
      this.output += printfResult;
      this.addStep(this.currentLine, `Printed: ${printfResult}`);
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
      }
    }
    
    // Handle if statements within loops
    if (line.startsWith('if')) {
      const conditionMatch = line.match(/if\s*\(\s*([^)]+)\s*\)/);
      if (conditionMatch) {
        const condition = this.evaluateExpression(conditionMatch[1]);
        this.addStep(this.currentLine, `If condition: ${conditionMatch[1]} = ${condition}`);
        console.log(`DEBUG: If condition in loop: ${conditionMatch[1]} = ${condition}`);
        return;
      }
    }
  }
}

export function runCCodeInterpreter(code: string): { output: string; steps: any[] } {
  const interpreter = new CInterpreter();
  const result = interpreter.execute(code);
  
  // Convert steps to the format expected by the UI
  const steps = result.steps.map(step => ({
    line: step.line,
    ...step.variables
  }));
  
  return {
    output: result.output,
    steps
  };
} 