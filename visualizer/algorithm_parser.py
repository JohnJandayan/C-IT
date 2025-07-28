import re
import json
from typing import Dict, List, Any, Optional


class CAlgorithmParser:
    """Parser for C code to extract algorithm structures for visualization."""
    
    def __init__(self):
        self.keywords = {
            'control': ['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'return'],
            'data_types': ['int', 'float', 'double', 'char', 'void', 'struct', 'union', 'enum'],
            'operators': ['+', '-', '*', '/', '%', '=', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!'],
            'functions': ['printf', 'scanf', 'malloc', 'free', 'sizeof']
        }
        
    def parse_code(self, code: str) -> Dict[str, Any]:
        """Parse C code and extract algorithm structure."""
        try:
            # Clean the code
            code = self._clean_code(code)
            
            # Extract basic structure
            structure = {
                'functions': self._extract_functions(code),
                'variables': self._extract_variables(code),
                'loops': self._extract_loops(code),
                'conditionals': self._extract_conditionals(code),
                'arrays': self._extract_arrays(code),
                'data_structures': self._extract_data_structures(code),
                'algorithm_type': self._identify_algorithm_type(code),
                'complexity': self._analyze_complexity(code)
            }
            
            return {
                'success': True,
                'data': structure
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Parsing error: {str(e)}'
            }
    
    def _clean_code(self, code: str) -> str:
        """Clean and normalize the code."""
        # Remove comments
        code = re.sub(r'//.*$', '', code, flags=re.MULTILINE)
        code = re.sub(r'/\*.*?\*/', '', code, flags=re.DOTALL)
        
        # Remove extra whitespace
        code = re.sub(r'\s+', ' ', code)
        
        return code.strip()
    
    def _extract_functions(self, code: str) -> List[Dict[str, Any]]:
        """Extract function definitions."""
        functions = []
        pattern = r'(\w+)\s+(\w+)\s*\([^)]*\)\s*\{'
        
        for match in re.finditer(pattern, code):
            return_type, func_name = match.groups()
            functions.append({
                'name': func_name,
                'return_type': return_type,
                'start_pos': match.start(),
                'end_pos': self._find_function_end(code, match.end())
            })
        
        return functions
    
    def _find_function_end(self, code: str, start_pos: int) -> int:
        """Find the end of a function."""
        brace_count = 0
        in_string = False
        escape_next = False
        
        for i in range(start_pos, len(code)):
            char = code[i]
            
            if escape_next:
                escape_next = False
                continue
                
            if char == '\\':
                escape_next = True
                continue
                
            if char == '"' and not in_string:
                in_string = True
                continue
            elif char == '"' and in_string:
                in_string = False
                continue
                
            if not in_string:
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        return i + 1
        
        return len(code)
    
    def _extract_variables(self, code: str) -> List[Dict[str, Any]]:
        """Extract variable declarations."""
        variables = []
        pattern = r'(int|float|double|char)\s+(\w+)(?:\[([^\]]+)\])?'
        
        for match in re.finditer(pattern, code):
            var_type, var_name, array_size = match.groups()
            variables.append({
                'name': var_name,
                'type': var_type,
                'is_array': array_size is not None,
                'array_size': array_size if array_size else None
            })
        
        return variables
    
    def _extract_loops(self, code: str) -> List[Dict[str, Any]]:
        """Extract loop structures."""
        loops = []
        
        # For loops
        for_pattern = r'for\s*\([^)]+\)\s*\{'
        for match in re.finditer(for_pattern, code):
            loops.append({
                'type': 'for',
                'start_pos': match.start(),
                'end_pos': self._find_loop_end(code, match.end())
            })
        
        # While loops
        while_pattern = r'while\s*\([^)]+\)\s*\{'
        for match in re.finditer(while_pattern, code):
            loops.append({
                'type': 'while',
                'start_pos': match.start(),
                'end_pos': self._find_loop_end(code, match.end())
            })
        
        # Do-while loops
        do_pattern = r'do\s*\{'
        for match in re.finditer(do_pattern, code):
            loops.append({
                'type': 'do-while',
                'start_pos': match.start(),
                'end_pos': self._find_loop_end(code, match.end())
            })
        
        return loops
    
    def _find_loop_end(self, code: str, start_pos: int) -> int:
        """Find the end of a loop."""
        brace_count = 0
        in_string = False
        escape_next = False
        
        for i in range(start_pos, len(code)):
            char = code[i]
            
            if escape_next:
                escape_next = False
                continue
                
            if char == '\\':
                escape_next = True
                continue
                
            if char == '"' and not in_string:
                in_string = True
                continue
            elif char == '"' and in_string:
                in_string = False
                continue
                
            if not in_string:
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        return i + 1
        
        return len(code)
    
    def _extract_conditionals(self, code: str) -> List[Dict[str, Any]]:
        """Extract conditional statements."""
        conditionals = []
        
        # If statements
        if_pattern = r'if\s*\([^)]+\)\s*\{'
        for match in re.finditer(if_pattern, code):
            conditionals.append({
                'type': 'if',
                'start_pos': match.start(),
                'end_pos': self._find_conditional_end(code, match.end())
            })
        
        # Switch statements
        switch_pattern = r'switch\s*\([^)]+\)\s*\{'
        for match in re.finditer(switch_pattern, code):
            conditionals.append({
                'type': 'switch',
                'start_pos': match.start(),
                'end_pos': self._find_conditional_end(code, match.end())
            })
        
        return conditionals
    
    def _find_conditional_end(self, code: str, start_pos: int) -> int:
        """Find the end of a conditional statement."""
        return self._find_loop_end(code, start_pos)
    
    def _extract_arrays(self, code: str) -> List[Dict[str, Any]]:
        """Extract array declarations and operations."""
        arrays = []
        pattern = r'(\w+)\s+(\w+)\s*\[([^\]]+)\]'
        
        for match in re.finditer(pattern, code):
            array_type, array_name, array_size = match.groups()
            arrays.append({
                'name': array_name,
                'type': array_type,
                'size': array_size
            })
        
        return arrays
    
    def _extract_data_structures(self, code: str) -> List[Dict[str, Any]]:
        """Extract data structure definitions."""
        structures = []
        
        # Struct definitions
        struct_pattern = r'struct\s+(\w+)\s*\{'
        for match in re.finditer(struct_pattern, code):
            struct_name = match.group(1)
            structures.append({
                'type': 'struct',
                'name': struct_name,
                'start_pos': match.start(),
                'end_pos': self._find_loop_end(code, match.end())
            })
        
        return structures
    
    def _identify_algorithm_type(self, code: str) -> str:
        """Identify the type of algorithm."""
        code_lower = code.lower()
        
        # Sorting algorithms
        if 'bubble' in code_lower or 'swap' in code_lower and 'sort' in code_lower:
            return 'bubble_sort'
        elif 'quick' in code_lower and 'sort' in code_lower:
            return 'quick_sort'
        elif 'merge' in code_lower and 'sort' in code_lower:
            return 'merge_sort'
        elif 'insertion' in code_lower and 'sort' in code_lower:
            return 'insertion_sort'
        elif 'selection' in code_lower and 'sort' in code_lower:
            return 'selection_sort'
        
        # Searching algorithms
        elif 'binary' in code_lower and 'search' in code_lower:
            return 'binary_search'
        elif 'linear' in code_lower and 'search' in code_lower:
            return 'linear_search'
        
        # Data structures
        elif 'struct' in code_lower and 'node' in code_lower:
            return 'linked_list'
        elif 'stack' in code_lower:
            return 'stack'
        elif 'queue' in code_lower:
            return 'queue'
        elif 'tree' in code_lower:
            return 'tree'
        elif 'hash' in code_lower:
            return 'hash_map'
        
        # Graph algorithms
        elif 'graph' in code_lower or 'bfs' in code_lower or 'dfs' in code_lower:
            return 'graph_algorithm'
        
        # Dynamic programming
        elif 'dp' in code_lower or 'memo' in code_lower:
            return 'dynamic_programming'
        
        return 'general_algorithm'
    
    def _analyze_complexity(self, code: str) -> Dict[str, str]:
        """Analyze time and space complexity."""
        algorithm_type = self._identify_algorithm_type(code)
        
        complexity_map = {
            'bubble_sort': {'time': 'O(n²)', 'space': 'O(1)'},
            'quick_sort': {'time': 'O(n log n)', 'space': 'O(log n)'},
            'merge_sort': {'time': 'O(n log n)', 'space': 'O(n)'},
            'insertion_sort': {'time': 'O(n²)', 'space': 'O(1)'},
            'selection_sort': {'time': 'O(n²)', 'space': 'O(1)'},
            'binary_search': {'time': 'O(log n)', 'space': 'O(1)'},
            'linear_search': {'time': 'O(n)', 'space': 'O(1)'},
            'linked_list': {'time': 'O(n)', 'space': 'O(n)'},
            'stack': {'time': 'O(1)', 'space': 'O(n)'},
            'queue': {'time': 'O(1)', 'space': 'O(n)'},
            'tree': {'time': 'O(log n)', 'space': 'O(n)'},
            'hash_map': {'time': 'O(1)', 'space': 'O(n)'},
            'graph_algorithm': {'time': 'O(V + E)', 'space': 'O(V)'},
            'dynamic_programming': {'time': 'O(n²)', 'space': 'O(n)'},
            'general_algorithm': {'time': 'O(n)', 'space': 'O(n)'}
        }
        
        return complexity_map.get(algorithm_type, {'time': 'O(n)', 'space': 'O(n)'}) 