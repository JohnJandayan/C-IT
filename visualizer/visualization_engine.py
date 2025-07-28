import json
from typing import Dict, List, Any, Optional
import random


class VisualizationEngine:
    """Engine for generating visualization data for C algorithms."""
    
    def __init__(self):
        self.animation_speed = 1000  # milliseconds
        self.colors = {
            'primary': '#3B82F6',
            'secondary': '#10B981',
            'accent': '#F59E0B',
            'danger': '#EF4444',
            'success': '#10B981',
            'warning': '#F59E0B',
            'info': '#3B82F6',
            'light': '#F3F4F6',
            'dark': '#1F2937'
        }
    
    def generate_visualization(self, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate visualization data based on parsed algorithm structure."""
        algorithm_type = parsed_data.get('algorithm_type', 'general_algorithm')
        
        if algorithm_type in ['bubble_sort', 'quick_sort', 'merge_sort', 'insertion_sort', 'selection_sort']:
            return self._generate_sorting_visualization(parsed_data)
        elif algorithm_type in ['binary_search', 'linear_search']:
            return self._generate_search_visualization(parsed_data)
        elif algorithm_type in ['linked_list', 'stack', 'queue', 'tree', 'hash_map']:
            return self._generate_data_structure_visualization(parsed_data)
        else:
            return self._generate_general_visualization(parsed_data)
    
    def _generate_sorting_visualization(self, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate visualization for sorting algorithms."""
        algorithm_type = parsed_data.get('algorithm_type', 'bubble_sort')
        
        # Generate sample array data
        array_data = self._generate_sample_array()
        
        if algorithm_type == 'bubble_sort':
            return self._generate_bubble_sort_animation(array_data)
        elif algorithm_type == 'quick_sort':
            return self._generate_quick_sort_animation(array_data)
        elif algorithm_type == 'merge_sort':
            return self._generate_merge_sort_animation(array_data)
        elif algorithm_type == 'insertion_sort':
            return self._generate_insertion_sort_animation(array_data)
        elif algorithm_type == 'selection_sort':
            return self._generate_selection_sort_animation(array_data)
        
        return self._generate_bubble_sort_animation(array_data)
    
    def _generate_search_visualization(self, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate visualization for search algorithms."""
        algorithm_type = parsed_data.get('algorithm_type', 'linear_search')
        
        # Generate sorted array for search
        array_data = sorted(self._generate_sample_array())
        target = random.choice(array_data)
        
        if algorithm_type == 'binary_search':
            return self._generate_binary_search_animation(array_data, target)
        else:
            return self._generate_linear_search_animation(array_data, target)
    
    def _generate_data_structure_visualization(self, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate visualization for data structures."""
        algorithm_type = parsed_data.get('algorithm_type', 'linked_list')
        
        if algorithm_type == 'linked_list':
            return self._generate_linked_list_animation()
        elif algorithm_type == 'stack':
            return self._generate_stack_animation()
        elif algorithm_type == 'queue':
            return self._generate_queue_animation()
        elif algorithm_type == 'tree':
            return self._generate_tree_animation()
        elif algorithm_type == 'hash_map':
            return self._generate_hash_map_animation()
        
        return self._generate_linked_list_animation()
    
    def _generate_general_visualization(self, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate general visualization for any algorithm."""
        return {
            'type': 'general',
            'title': 'Algorithm Visualization',
            'description': 'Visualizing algorithm execution',
            'steps': [
                {
                    'step': 1,
                    'title': 'Code Analysis',
                    'description': 'Parsing C code structure',
                    'duration': 1000,
                    'elements': [
                        {
                            'type': 'text',
                            'content': f'Found {len(parsed_data.get("functions", []))} functions',
                            'color': self.colors['info']
                        },
                        {
                            'type': 'text',
                            'content': f'Found {len(parsed_data.get("variables", []))} variables',
                            'color': self.colors['success']
                        },
                        {
                            'type': 'text',
                            'content': f'Found {len(parsed_data.get("loops", []))} loops',
                            'color': self.colors['warning']
                        }
                    ]
                },
                {
                    'step': 2,
                    'title': 'Complexity Analysis',
                    'description': 'Analyzing time and space complexity',
                    'duration': 1500,
                    'elements': [
                        {
                            'type': 'complexity',
                            'time': parsed_data.get('complexity', {}).get('time', 'O(n)'),
                            'space': parsed_data.get('complexity', {}).get('space', 'O(n)'),
                            'color': self.colors['primary']
                        }
                    ]
                }
            ],
            'settings': {
                'animation_speed': self.animation_speed,
                'colors': self.colors
            }
        }
    
    def _generate_sample_array(self) -> List[int]:
        """Generate a sample array for visualization."""
        return [64, 34, 25, 12, 22, 11, 90, 45, 78, 33]
    
    def _generate_bubble_sort_animation(self, array_data: List[int]) -> Dict[str, Any]:
        """Generate bubble sort animation steps."""
        steps = []
        array = array_data.copy()
        n = len(array)
        
        for i in range(n):
            for j in range(0, n - i - 1):
                step = {
                    'step': len(steps) + 1,
                    'title': f'Bubble Sort - Pass {i + 1}, Comparison {j + 1}',
                    'description': f'Comparing elements at positions {j} and {j + 1}',
                    'duration': 800,
                    'array': array.copy(),
                    'highlighted': [j, j + 1],
                    'elements': [
                        {
                            'type': 'comparison',
                            'indices': [j, j + 1],
                            'values': [array[j], array[j + 1]],
                            'color': self.colors['warning']
                        }
                    ]
                }
                steps.append(step)
                
                if array[j] > array[j + 1]:
                    # Swap
                    array[j], array[j + 1] = array[j + 1], array[j]
                    
                    swap_step = {
                        'step': len(steps) + 1,
                        'title': f'Bubble Sort - Swap',
                        'description': f'Swapping {array[j + 1]} and {array[j]}',
                        'duration': 600,
                        'array': array.copy(),
                        'highlighted': [j, j + 1],
                        'elements': [
                            {
                                'type': 'swap',
                                'indices': [j, j + 1],
                                'values': [array[j], array[j + 1]],
                                'color': self.colors['danger']
                            }
                        ]
                    }
                    steps.append(swap_step)
        
        return {
            'type': 'sorting',
            'algorithm': 'bubble_sort',
            'title': 'Bubble Sort Visualization',
            'description': 'Visualizing bubble sort algorithm step by step',
            'steps': steps,
            'settings': {
                'animation_speed': self.animation_speed,
                'colors': self.colors
            }
        }
    
    def _generate_quick_sort_animation(self, array_data: List[int]) -> Dict[str, Any]:
        """Generate quick sort animation steps."""
        steps = []
        array = array_data.copy()
        
        def partition(low, high):
            pivot = array[high]
            i = low - 1
            
            for j in range(low, high):
                step = {
                    'step': len(steps) + 1,
                    'title': f'Quick Sort - Partition',
                    'description': f'Comparing element {array[j]} with pivot {pivot}',
                    'duration': 700,
                    'array': array.copy(),
                    'highlighted': [j, high],
                    'pivot': high,
                    'elements': [
                        {
                            'type': 'comparison',
                            'indices': [j, high],
                            'values': [array[j], pivot],
                            'color': self.colors['warning']
                        }
                    ]
                }
                steps.append(step)
                
                if array[j] <= pivot:
                    i += 1
                    array[i], array[j] = array[j], array[i]
                    
                    swap_step = {
                        'step': len(steps) + 1,
                        'title': 'Quick Sort - Swap',
                        'description': f'Swapping elements at positions {i} and {j}',
                        'duration': 500,
                        'array': array.copy(),
                        'highlighted': [i, j],
                        'pivot': high,
                        'elements': [
                            {
                                'type': 'swap',
                                'indices': [i, j],
                                'values': [array[i], array[j]],
                                'color': self.colors['danger']
                            }
                        ]
                    }
                    steps.append(swap_step)
            
            array[i + 1], array[high] = array[high], array[i + 1]
            return i + 1
        
        def quick_sort(low, high):
            if low < high:
                pi = partition(low, high)
                quick_sort(low, pi - 1)
                quick_sort(pi + 1, high)
        
        quick_sort(0, len(array) - 1)
        
        return {
            'type': 'sorting',
            'algorithm': 'quick_sort',
            'title': 'Quick Sort Visualization',
            'description': 'Visualizing quick sort algorithm with partitioning',
            'steps': steps,
            'settings': {
                'animation_speed': self.animation_speed,
                'colors': self.colors
            }
        }
    
    def _generate_binary_search_animation(self, array_data: List[int], target: int) -> Dict[str, Any]:
        """Generate binary search animation steps."""
        steps = []
        array = array_data.copy()
        left, right = 0, len(array) - 1
        
        while left <= right:
            mid = (left + right) // 2
            
            step = {
                'step': len(steps) + 1,
                'title': 'Binary Search',
                'description': f'Checking middle element at position {mid}',
                'duration': 1000,
                'array': array.copy(),
                'highlighted': [mid],
                'search_range': [left, right],
                'target': target,
                'elements': [
                    {
                        'type': 'search',
                        'index': mid,
                        'value': array[mid],
                        'target': target,
                        'color': self.colors['info']
                    }
                ]
            }
            steps.append(step)
            
            if array[mid] == target:
                found_step = {
                    'step': len(steps) + 1,
                    'title': 'Target Found!',
                    'description': f'Found {target} at position {mid}',
                    'duration': 1200,
                    'array': array.copy(),
                    'highlighted': [mid],
                    'search_range': [left, right],
                    'target': target,
                    'elements': [
                        {
                            'type': 'found',
                            'index': mid,
                            'value': array[mid],
                            'color': self.colors['success']
                        }
                    ]
                }
                steps.append(found_step)
                break
            elif array[mid] < target:
                left = mid + 1
            else:
                right = mid - 1
        
        return {
            'type': 'searching',
            'algorithm': 'binary_search',
            'title': 'Binary Search Visualization',
            'description': f'Searching for {target} in sorted array',
            'steps': steps,
            'settings': {
                'animation_speed': self.animation_speed,
                'colors': self.colors
            }
        }
    
    def _generate_linked_list_animation(self) -> Dict[str, Any]:
        """Generate linked list animation steps."""
        steps = []
        nodes = [{'value': 6, 'next': 1}, {'value': 7, 'next': 2}, {'value': 1, 'next': 3}, {'value': 4, 'next': None}]
        
        # Insertion animation
        for i, node in enumerate(nodes):
            step = {
                'step': i + 1,
                'title': f'Linked List - Insert Node {i + 1}',
                'description': f'Inserting node with value {node["value"]}',
                'duration': 800,
                'nodes': nodes[:i+1],
                'highlighted': i,
                'elements': [
                    {
                        'type': 'insert',
                        'index': i,
                        'value': node['value'],
                        'color': self.colors['success']
                    }
                ]
            }
            steps.append(step)
        
        return {
            'type': 'data_structure',
            'algorithm': 'linked_list',
            'title': 'Linked List Visualization',
            'description': 'Visualizing linked list operations',
            'steps': steps,
            'settings': {
                'animation_speed': self.animation_speed,
                'colors': self.colors
            }
        }
    
    def _generate_stack_animation(self) -> Dict[str, Any]:
        """Generate stack animation steps."""
        steps = []
        stack = []
        operations = [
            {'type': 'push', 'value': 10},
            {'type': 'push', 'value': 20},
            {'type': 'push', 'value': 30},
            {'type': 'pop', 'value': 30},
            {'type': 'pop', 'value': 20}
        ]
        
        for i, op in enumerate(operations):
            if op['type'] == 'push':
                stack.append(op['value'])
                step = {
                    'step': i + 1,
                    'title': 'Stack - Push Operation',
                    'description': f'Pushing {op["value"]} onto stack',
                    'duration': 600,
                    'stack': stack.copy(),
                    'highlighted': len(stack) - 1,
                    'elements': [
                        {
                            'type': 'push',
                            'value': op['value'],
                            'color': self.colors['success']
                        }
                    ]
                }
            else:
                popped = stack.pop()
                step = {
                    'step': i + 1,
                    'title': 'Stack - Pop Operation',
                    'description': f'Popping {popped} from stack',
                    'duration': 600,
                    'stack': stack.copy(),
                    'highlighted': -1,
                    'elements': [
                        {
                            'type': 'pop',
                            'value': popped,
                            'color': self.colors['danger']
                        }
                    ]
                }
            steps.append(step)
        
        return {
            'type': 'data_structure',
            'algorithm': 'stack',
            'title': 'Stack Visualization',
            'description': 'Visualizing stack push and pop operations',
            'steps': steps,
            'settings': {
                'animation_speed': self.animation_speed,
                'colors': self.colors
            }
        }
    
    def _generate_merge_sort_animation(self, array_data: List[int]) -> Dict[str, Any]:
        """Generate merge sort animation steps."""
        steps = []
        array = array_data.copy()
        
        def merge_sort(arr, left, right):
            if left < right:
                mid = (left + right) // 2
                
                step = {
                    'step': len(steps) + 1,
                    'title': 'Merge Sort - Divide',
                    'description': f'Dividing array from {left} to {right}',
                    'duration': 800,
                    'array': arr.copy(),
                    'highlighted': list(range(left, right + 1)),
                    'mid': mid,
                    'elements': [
                        {
                            'type': 'divide',
                            'left': left,
                            'right': right,
                            'mid': mid,
                            'color': self.colors['info']
                        }
                    ]
                }
                steps.append(step)
                
                merge_sort(arr, left, mid)
                merge_sort(arr, mid + 1, right)
                merge(arr, left, mid, right)
        
        def merge(arr, left, mid, right):
            # Merge logic would go here
            pass
        
        merge_sort(array, 0, len(array) - 1)
        
        return {
            'type': 'sorting',
            'algorithm': 'merge_sort',
            'title': 'Merge Sort Visualization',
            'description': 'Visualizing merge sort divide and conquer approach',
            'steps': steps,
            'settings': {
                'animation_speed': self.animation_speed,
                'colors': self.colors
            }
        }
    
    def _generate_insertion_sort_animation(self, array_data: List[int]) -> Dict[str, Any]:
        """Generate insertion sort animation steps."""
        steps = []
        array = array_data.copy()
        
        for i in range(1, len(array)):
            key = array[i]
            j = i - 1
            
            step = {
                'step': len(steps) + 1,
                'title': f'Insertion Sort - Pass {i}',
                'description': f'Inserting {key} into sorted portion',
                'duration': 800,
                'array': array.copy(),
                'highlighted': [i],
                'key': key,
                'elements': [
                    {
                        'type': 'insertion',
                        'key': key,
                        'position': i,
                        'color': self.colors['warning']
                    }
                ]
            }
            steps.append(step)
            
            while j >= 0 and array[j] > key:
                array[j + 1] = array[j]
                j -= 1
                
                shift_step = {
                    'step': len(steps) + 1,
                    'title': 'Insertion Sort - Shift',
                    'description': f'Shifting element {array[j + 1]}',
                    'duration': 600,
                    'array': array.copy(),
                    'highlighted': [j + 1],
                    'key': key,
                    'elements': [
                        {
                            'type': 'shift',
                            'from': j + 1,
                            'to': j + 2,
                            'value': array[j + 1],
                            'color': self.colors['danger']
                        }
                    ]
                }
                steps.append(shift_step)
            
            array[j + 1] = key
        
        return {
            'type': 'sorting',
            'algorithm': 'insertion_sort',
            'title': 'Insertion Sort Visualization',
            'description': 'Visualizing insertion sort algorithm',
            'steps': steps,
            'settings': {
                'animation_speed': self.animation_speed,
                'colors': self.colors
            }
        }
    
    def _generate_selection_sort_animation(self, array_data: List[int]) -> Dict[str, Any]:
        """Generate selection sort animation steps."""
        steps = []
        array = array_data.copy()
        
        for i in range(len(array)):
            min_idx = i
            
            for j in range(i + 1, len(array)):
                if array[j] < array[min_idx]:
                    min_idx = j
                
                step = {
                    'step': len(steps) + 1,
                    'title': f'Selection Sort - Pass {i + 1}',
                    'description': f'Finding minimum element from position {i}',
                    'duration': 600,
                    'array': array.copy(),
                    'highlighted': [i, j],
                    'min_idx': min_idx,
                    'elements': [
                        {
                            'type': 'comparison',
                            'indices': [j, min_idx],
                            'values': [array[j], array[min_idx]],
                            'color': self.colors['warning']
                        }
                    ]
                }
                steps.append(step)
            
            if min_idx != i:
                array[i], array[min_idx] = array[min_idx], array[i]
                
                swap_step = {
                    'step': len(steps) + 1,
                    'title': 'Selection Sort - Swap',
                    'description': f'Swapping minimum element to position {i}',
                    'duration': 800,
                    'array': array.copy(),
                    'highlighted': [i, min_idx],
                    'elements': [
                        {
                            'type': 'swap',
                            'indices': [i, min_idx],
                            'values': [array[i], array[min_idx]],
                            'color': self.colors['danger']
                        }
                    ]
                }
                steps.append(swap_step)
        
        return {
            'type': 'sorting',
            'algorithm': 'selection_sort',
            'title': 'Selection Sort Visualization',
            'description': 'Visualizing selection sort algorithm',
            'steps': steps,
            'settings': {
                'animation_speed': self.animation_speed,
                'colors': self.colors
            }
        }
    
    def _generate_linear_search_animation(self, array_data: List[int], target: int) -> Dict[str, Any]:
        """Generate linear search animation steps."""
        steps = []
        array = array_data.copy()
        
        for i, element in enumerate(array):
            step = {
                'step': i + 1,
                'title': 'Linear Search',
                'description': f'Checking element at position {i}',
                'duration': 800,
                'array': array.copy(),
                'highlighted': [i],
                'target': target,
                'checked': list(range(i)),
                'elements': [
                    {
                        'type': 'search',
                        'index': i,
                        'value': element,
                        'target': target,
                        'color': self.colors['info']
                    }
                ]
            }
            steps.append(step)
            
            if element == target:
                found_step = {
                    'step': len(steps) + 1,
                    'title': 'Target Found!',
                    'description': f'Found {target} at position {i}',
                    'duration': 1200,
                    'array': array.copy(),
                    'highlighted': [i],
                    'target': target,
                    'checked': list(range(i + 1)),
                    'elements': [
                        {
                            'type': 'found',
                            'index': i,
                            'value': element,
                            'color': self.colors['success']
                        }
                    ]
                }
                steps.append(found_step)
                break
        
        return {
            'type': 'searching',
            'algorithm': 'linear_search',
            'title': 'Linear Search Visualization',
            'description': f'Searching for {target} in array',
            'steps': steps,
            'settings': {
                'animation_speed': self.animation_speed,
                'colors': self.colors
            }
        }
    
    def _generate_queue_animation(self) -> Dict[str, Any]:
        """Generate queue animation steps."""
        steps = []
        queue = []
        operations = [
            {'type': 'enqueue', 'value': 10},
            {'type': 'enqueue', 'value': 20},
            {'type': 'enqueue', 'value': 30},
            {'type': 'dequeue', 'value': 10},
            {'type': 'dequeue', 'value': 20}
        ]
        
        for i, op in enumerate(operations):
            if op['type'] == 'enqueue':
                queue.append(op['value'])
                step = {
                    'step': i + 1,
                    'title': 'Queue - Enqueue Operation',
                    'description': f'Adding {op["value"]} to queue',
                    'duration': 600,
                    'queue': queue.copy(),
                    'highlighted': len(queue) - 1,
                    'elements': [
                        {
                            'type': 'enqueue',
                            'value': op['value'],
                            'color': self.colors['success']
                        }
                    ]
                }
            else:
                dequeued = queue.pop(0)
                step = {
                    'step': i + 1,
                    'title': 'Queue - Dequeue Operation',
                    'description': f'Removing {dequeued} from queue',
                    'duration': 600,
                    'queue': queue.copy(),
                    'highlighted': -1,
                    'elements': [
                        {
                            'type': 'dequeue',
                            'value': dequeued,
                            'color': self.colors['danger']
                        }
                    ]
                }
            steps.append(step)
        
        return {
            'type': 'data_structure',
            'algorithm': 'queue',
            'title': 'Queue Visualization',
            'description': 'Visualizing queue enqueue and dequeue operations',
            'steps': steps,
            'settings': {
                'animation_speed': self.animation_speed,
                'colors': self.colors
            }
        }
    
    def _generate_tree_animation(self) -> Dict[str, Any]:
        """Generate tree animation steps."""
        steps = []
        tree = []
        nodes = [50, 30, 70, 20, 40, 60, 80]
        
        for i, value in enumerate(nodes):
            step = {
                'step': i + 1,
                'title': f'Binary Tree - Insert Node {i + 1}',
                'description': f'Inserting node with value {value}',
                'duration': 1000,
                'tree': tree.copy(),
                'new_node': value,
                'highlighted': i,
                'elements': [
                    {
                        'type': 'insert',
                        'value': value,
                        'color': self.colors['success']
                    }
                ]
            }
            steps.append(step)
            tree.append(value)
        
        return {
            'type': 'data_structure',
            'algorithm': 'tree',
            'title': 'Binary Tree Visualization',
            'description': 'Visualizing binary tree construction',
            'steps': steps,
            'settings': {
                'animation_speed': self.animation_speed,
                'colors': self.colors
            }
        }
    
    def _generate_hash_map_animation(self) -> Dict[str, Any]:
        """Generate hash map animation steps."""
        steps = []
        hash_map = {}
        operations = [
            {'type': 'insert', 'key': 'apple', 'value': 1},
            {'type': 'insert', 'key': 'banana', 'value': 2},
            {'type': 'insert', 'key': 'cherry', 'value': 3},
            {'type': 'get', 'key': 'banana', 'value': 2},
            {'type': 'delete', 'key': 'apple', 'value': 1}
        ]
        
        for i, op in enumerate(operations):
            if op['type'] == 'insert':
                hash_map[op['key']] = op['value']
                step = {
                    'step': i + 1,
                    'title': 'Hash Map - Insert',
                    'description': f'Inserting {op["key"]}: {op["value"]}',
                    'duration': 800,
                    'hash_map': hash_map.copy(),
                    'highlighted': op['key'],
                    'elements': [
                        {
                            'type': 'insert',
                            'key': op['key'],
                            'value': op['value'],
                            'color': self.colors['success']
                        }
                    ]
                }
            elif op['type'] == 'get':
                step = {
                    'step': i + 1,
                    'title': 'Hash Map - Get',
                    'description': f'Retrieving value for key {op["key"]}',
                    'duration': 600,
                    'hash_map': hash_map.copy(),
                    'highlighted': op['key'],
                    'elements': [
                        {
                            'type': 'get',
                            'key': op['key'],
                            'value': op['value'],
                            'color': self.colors['info']
                        }
                    ]
                }
            else:  # delete
                del hash_map[op['key']]
                step = {
                    'step': i + 1,
                    'title': 'Hash Map - Delete',
                    'description': f'Deleting key {op["key"]}',
                    'duration': 600,
                    'hash_map': hash_map.copy(),
                    'highlighted': op['key'],
                    'elements': [
                        {
                            'type': 'delete',
                            'key': op['key'],
                            'color': self.colors['danger']
                        }
                    ]
                }
            steps.append(step)
        
        return {
            'type': 'data_structure',
            'algorithm': 'hash_map',
            'title': 'Hash Map Visualization',
            'description': 'Visualizing hash map operations',
            'steps': steps,
            'settings': {
                'animation_speed': self.animation_speed,
                'colors': self.colors
            }
        } 