from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import re
from .algorithm_parser import CAlgorithmParser
from .visualization_engine import VisualizationEngine


def home(request):
    """Home page view."""
    return render(request, 'visualizer/home.html')


def visualize(request):
    """Visualization page view."""
    return render(request, 'visualizer/visualize.html')


def about(request):
    """About page view."""
    return render(request, 'visualizer/about.html')


@csrf_exempt
@require_http_methods(["POST"])
def parse_and_visualize(request):
    """API endpoint to parse C code and return visualization data."""
    try:
        data = json.loads(request.body)
        c_code = data.get('code', '')
        
        if not c_code.strip():
            return JsonResponse({
                'success': False,
                'error': 'No code provided'
            })
        
        # Parse the C code
        parser = CAlgorithmParser()
        parsed_data = parser.parse_code(c_code)
        
        if not parsed_data['success']:
            return JsonResponse(parsed_data)
        
        # Generate visualization data
        engine = VisualizationEngine()
        visualization_data = engine.generate_visualization(parsed_data['data'])
        
        return JsonResponse({
            'success': True,
            'visualization': visualization_data,
            'parsed_data': parsed_data['data']
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON data'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Server error: {str(e)}'
        })


@csrf_exempt
@require_http_methods(["POST"])
def get_algorithm_examples(request):
    """API endpoint to get example algorithms."""
    try:
        data = json.loads(request.body)
        algorithm_type = data.get('type', 'all')
        
        examples = {
            'sorting': {
                'bubble_sort': {
                    'name': 'Bubble Sort',
                    'description': 'Simple sorting algorithm that repeatedly steps through the list',
                    'code': '''#include <stdio.h>

void bubbleSort(int arr[], int n) {
    int i, j, temp;
    for (i = 0; i < n-1; i++) {
        for (j = 0; j < n-i-1; j++) {
            if (arr[j] > arr[j+1]) {
                temp = arr[j];
                arr[j] = arr[j+1];
                arr[j+1] = temp;
            }
        }
    }
}

int main() {
    int arr[] = {64, 34, 25, 12, 22, 11, 90};
    int n = sizeof(arr)/sizeof(arr[0]);
    bubbleSort(arr, n);
    return 0;
}'''
                },
                'quick_sort': {
                    'name': 'Quick Sort',
                    'description': 'Efficient, comparison-based sorting algorithm',
                    'code': '''#include <stdio.h>

void swap(int* a, int* b) {
    int t = *a;
    *a = *b;
    *b = t;
}

int partition(int arr[], int low, int high) {
    int pivot = arr[high];
    int i = (low - 1);
    
    for (int j = low; j <= high - 1; j++) {
        if (arr[j] < pivot) {
            i++;
            swap(&arr[i], &arr[j]);
        }
    }
    swap(&arr[i + 1], &arr[high]);
    return (i + 1);
}

void quickSort(int arr[], int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}

int main() {
    int arr[] = {10, 7, 8, 9, 1, 5};
    int n = sizeof(arr)/sizeof(arr[0]);
    quickSort(arr, 0, n-1);
    return 0;
}'''
                }
            },
            'searching': {
                'binary_search': {
                    'name': 'Binary Search',
                    'description': 'Efficient search algorithm for sorted arrays',
                    'code': '''#include <stdio.h>

int binarySearch(int arr[], int l, int r, int x) {
    while (l <= r) {
        int m = l + (r - l) / 2;
        
        if (arr[m] == x)
            return m;
        
        if (arr[m] < x)
            l = m + 1;
        else
            r = m - 1;
    }
    return -1;
}

int main() {
    int arr[] = {2, 3, 4, 10, 40};
    int n = sizeof(arr) / sizeof(arr[0]);
    int x = 10;
    int result = binarySearch(arr, 0, n-1, x);
    return 0;
}'''
                },
                'linear_search': {
                    'name': 'Linear Search',
                    'description': 'Simple search algorithm that checks each element',
                    'code': '''#include <stdio.h>

int linearSearch(int arr[], int n, int x) {
    for (int i = 0; i < n; i++) {
        if (arr[i] == x)
            return i;
    }
    return -1;
}

int main() {
    int arr[] = {2, 3, 4, 10, 40};
    int n = sizeof(arr) / sizeof(arr[0]);
    int x = 10;
    int result = linearSearch(arr, n, x);
    return 0;
}'''
                }
            },
            'data_structures': {
                'linked_list': {
                    'name': 'Linked List',
                    'description': 'Linear data structure with nodes containing data and references',
                    'code': '''#include <stdio.h>
#include <stdlib.h>

struct Node {
    int data;
    struct Node* next;
};

struct Node* newNode(int data) {
    struct Node* new_node = (struct Node*)malloc(sizeof(struct Node));
    new_node->data = data;
    new_node->next = NULL;
    return new_node;
}

void insertAtEnd(struct Node** head_ref, int new_data) {
    struct Node* new_node = newNode(new_data);
    
    if (*head_ref == NULL) {
        *head_ref = new_node;
        return;
    }
    
    struct Node* last = *head_ref;
    while (last->next != NULL)
        last = last->next;
    
    last->next = new_node;
}

void printList(struct Node* node) {
    while (node != NULL) {
        printf("%d ", node->data);
        node = node->next;
    }
}

int main() {
    struct Node* head = NULL;
    insertAtEnd(&head, 6);
    insertAtEnd(&head, 7);
    insertAtEnd(&head, 1);
    insertAtEnd(&head, 4);
    printList(head);
    return 0;
}'''
                },
                'stack': {
                    'name': 'Stack',
                    'description': 'LIFO data structure for push and pop operations',
                    'code': '''#include <stdio.h>
#include <stdlib.h>
#include <limits.h>

struct Stack {
    int top;
    unsigned capacity;
    int* array;
};

struct Stack* createStack(unsigned capacity) {
    struct Stack* stack = (struct Stack*)malloc(sizeof(struct Stack));
    stack->capacity = capacity;
    stack->top = -1;
    stack->array = (int*)malloc(stack->capacity * sizeof(int));
    return stack;
}

int isFull(struct Stack* stack) {
    return stack->top == stack->capacity - 1;
}

int isEmpty(struct Stack* stack) {
    return stack->top == -1;
}

void push(struct Stack* stack, int item) {
    if (isFull(stack))
        return;
    stack->array[++stack->top] = item;
}

int pop(struct Stack* stack) {
    if (isEmpty(stack))
        return INT_MIN;
    return stack->array[stack->top--];
}

int main() {
    struct Stack* stack = createStack(100);
    push(stack, 10);
    push(stack, 20);
    push(stack, 30);
    printf("%d popped from stack\\n", pop(stack));
    return 0;
}'''
                }
            }
        }
        
        if algorithm_type == 'all':
            return JsonResponse({'examples': examples})
        elif algorithm_type in examples:
            return JsonResponse({'examples': {algorithm_type: examples[algorithm_type]}})
        else:
            return JsonResponse({'examples': {}})
            
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Server error: {str(e)}'
        }) 