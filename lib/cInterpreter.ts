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
        var_.value.forEach((val: any, index: number) => {
          variables[`${name}[${index}]`] = val;
        });
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
    // Match: int x = 5; or int arr[5] = {1,2,3,4,5};
    const intMatch = line.match(/int\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^;]+);/);
    if (intMatch) {
      return { name: intMatch[1], type: 'int', value: parseInt(intMatch[2]) };
    }

    const arrayMatch = line.match(/int\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\[(\d+)\]\s*=\s*\{([^}]+)\};/);
    if (arrayMatch) {
      const values = arrayMatch[3].split(',').map(v => parseInt(v.trim()));
      return { name: arrayMatch[1], type: 'array', value: values };
    }

    const simpleDeclare = line.match(/int\s+([a-zA-Z_][a-zA-Z0-9_]*);/);
    if (simpleDeclare) {
      return { name: simpleDeclare[1], type: 'int', value: 0 };
    }

    return null;
  }

  private parseAssignment(line: string): { name: string; value: any } | null {
    // Match: x = 5; or arr[i] = 10;
    const simpleMatch = line.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^;]+);/);
    if (simpleMatch) {
      return { name: simpleMatch[1], value: this.evaluateExpression(simpleMatch[2]) };
    }

    const arrayMatch = line.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\[([^\]]+)\]\s*=\s*([^;]+);/);
    if (arrayMatch) {
      const arrayName = arrayMatch[1];
      const index = this.evaluateExpression(arrayMatch[2]);
      const value = this.evaluateExpression(arrayMatch[3]);
      return { name: `${arrayName}[${index}]`, value };
    }

    return null;
  }

  private evaluateExpression(expr: string): any {
    expr = expr.trim();
    
    // Simple arithmetic
    if (expr.includes('+')) {
      const [left, right] = expr.split('+').map(e => e.trim());
      return this.evaluateExpression(left) + this.evaluateExpression(right);
    }
    if (expr.includes('-')) {
      const [left, right] = expr.split('-').map(e => e.trim());
      return this.evaluateExpression(left) - this.evaluateExpression(right);
    }
    if (expr.includes('*')) {
      const [left, right] = expr.split('*').map(e => e.trim());
      return this.evaluateExpression(left) * this.evaluateExpression(right);
    }
    if (expr.includes('/')) {
      const [left, right] = expr.split('/').map(e => e.trim());
      return this.evaluateExpression(left) / this.evaluateExpression(right);
    }

    // Variable lookup
    if (this.variables.has(expr)) {
      return this.variables.get(expr)!.value;
    }

    // Array access
    const arrayMatch = expr.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\[([^\]]+)\]/);
    if (arrayMatch) {
      const arrayName = arrayMatch[1];
      const index = this.evaluateExpression(arrayMatch[2]);
      const array = this.variables.get(arrayName);
      if (array && array.type === 'array') {
        return array.value[index] || 0;
      }
    }

    // Literal values
    if (!isNaN(Number(expr))) {
      return Number(expr);
    }

    return 0;
  }

  private parseForLoop(line: string): { init: string; condition: string; increment: string } | null {
    const forMatch = line.match(/for\s*\(\s*([^;]+);\s*([^;]+);\s*([^)]+)\s*\)/);
    if (forMatch) {
      return {
        init: forMatch[1].trim(),
        condition: forMatch[2].trim(),
        increment: forMatch[3].trim()
      };
    }
    return null;
  }

  private parsePrintf(line: string): string | null {
    const printfMatch = line.match(/printf\s*\(\s*"([^"]*)"\s*(?:,\s*([^)]*))?\s*\);/);
    if (printfMatch) {
      let format = printfMatch[1];
      const args = printfMatch[2] ? printfMatch[2].split(',').map(a => a.trim()) : [];
      
      // Replace format specifiers with values
      let argIndex = 0;
      format = format.replace(/%d/g, () => {
        if (argIndex < args.length) {
          const value = this.evaluateExpression(args[argIndex]);
          argIndex++;
          return value.toString();
        }
        return '%d';
      });

      return format;
    }
    return null;
  }

  execute(code: string): { output: string; steps: ExecutionStep[] } {
    this.reset();
    const lines = code.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      this.currentLine = i + 1;

      // Skip comments and empty lines
      if (line.startsWith('//') || line.startsWith('/*') || line.length === 0) {
        i++;
        continue;
      }

      // Variable declaration
      const varDecl = this.parseVariableDeclaration(line);
      if (varDecl) {
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
        i++;
        continue;
      }

      // Assignment
      const assignment = this.parseAssignment(line);
      if (assignment) {
        if (assignment.name.includes('[')) {
          // Array assignment
          const [arrayName, indexStr] = assignment.name.split('[');
          const index = parseInt(indexStr.replace(']', ''));
          const array = this.variables.get(arrayName);
          if (array && array.type === 'array') {
            array.value[index] = assignment.value;
          }
        } else {
          // Simple assignment
          const variable = this.variables.get(assignment.name);
          if (variable) {
            variable.value = assignment.value;
          }
        }
        this.addStep(this.currentLine, `Assigned ${assignment.name} = ${assignment.value}`);
        i++;
        continue;
      }

      // For loop
      const forLoop = this.parseForLoop(line);
      if (forLoop) {
        // Execute initialization
        this.executeLine(forLoop.init);
        
        // Find the loop body
        let braceCount = 0;
        let loopStart = i + 1;
        let loopEnd = i + 1;
        
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].includes('{')) braceCount++;
          if (lines[j].includes('}')) {
            braceCount--;
            if (braceCount === 0) {
              loopEnd = j;
              break;
            }
          }
        }

        // Execute loop
        while (this.evaluateExpression(forLoop.condition)) {
          // Execute loop body
          for (let j = loopStart; j < loopEnd; j++) {
            this.currentLine = j + 1;
            this.executeLine(lines[j]);
          }
          
          // Execute increment
          this.executeLine(forLoop.increment);
        }
        
        i = loopEnd + 1;
        continue;
      }

      // Printf
      const printfResult = this.parsePrintf(line);
      if (printfResult) {
        this.output += printfResult + '\n';
        this.addStep(this.currentLine, `Printed: ${printfResult}`);
        i++;
        continue;
      }

      // If statement
      if (line.startsWith('if')) {
        const conditionMatch = line.match(/if\s*\(\s*([^)]+)\s*\)/);
        if (conditionMatch) {
          const condition = this.evaluateExpression(conditionMatch[1]);
          this.addStep(this.currentLine, `If condition: ${conditionMatch[1]} = ${condition}`);
          
          // Find the if body
          let braceCount = 0;
          let ifStart = i + 1;
          let ifEnd = i + 1;
          
          for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].includes('{')) braceCount++;
            if (lines[j].includes('}')) {
              braceCount--;
              if (braceCount === 0) {
                ifEnd = j;
                break;
              }
            }
          }

          if (condition) {
            // Execute if body
            for (let j = ifStart; j < ifEnd; j++) {
              this.currentLine = j + 1;
              this.executeLine(lines[j]);
            }
          }
          
          i = ifEnd + 1;
          continue;
        }
      }

      // Return statement
      if (line.startsWith('return')) {
        this.addStep(this.currentLine, 'Return statement');
        break;
      }

      i++;
    }

    return {
      output: this.output,
      steps: this.steps
    };
  }

  private executeLine(line: string) {
    // Execute a single line (helper for loops and conditionals)
    this.currentLine++;
    
    const assignment = this.parseAssignment(line);
    if (assignment) {
      if (assignment.name.includes('[')) {
        const [arrayName, indexStr] = assignment.name.split('[');
        const index = parseInt(indexStr.replace(']', ''));
        const array = this.variables.get(arrayName);
        if (array && array.type === 'array') {
          array.value[index] = assignment.value;
        }
      } else {
        const variable = this.variables.get(assignment.name);
        if (variable) {
          variable.value = assignment.value;
        }
      }
      this.addStep(this.currentLine, `Assigned ${assignment.name} = ${assignment.value}`);
      return;
    }

    const printfResult = this.parsePrintf(line);
    if (printfResult) {
      this.output += printfResult + '\n';
      this.addStep(this.currentLine, `Printed: ${printfResult}`);
      return;
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