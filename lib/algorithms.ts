import { Algorithm } from '@/types';

export const algorithms: Algorithm[] = [
  // Sorting Algorithms
  {
    id: 'bubble-sort',
    name: 'Bubble Sort',
    category: 'sorting',
    description: 'A simple sorting algorithm that repeatedly steps through the list, compares adjacent elements and swaps them if they are in the wrong order.',
    timeComplexity: {
      best: 'O(n)',
      average: 'O(n²)',
      worst: 'O(n²)'
    },
    spaceComplexity: 'O(1)',
    code: `void bubbleSort(int arr[], int n) {
    int i, j;
    for (i = 0; i < n-1; i++) {
        for (j = 0; j < n-i-1; j++) {
            if (arr[j] > arr[j+1]) {
                int temp = arr[j];
                arr[j] = arr[j+1];
                arr[j+1] = temp;
            }
        }
    }
}`,
    example: [64, 34, 25, 12, 22, 11, 90]
  },
  {
    id: 'quick-sort',
    name: 'Quick Sort',
    category: 'sorting',
    description: 'A highly efficient, comparison-based sorting algorithm that uses a divide-and-conquer strategy.',
    timeComplexity: {
      best: 'O(n log n)',
      average: 'O(n log n)',
      worst: 'O(n²)'
    },
    spaceComplexity: 'O(log n)',
    code: `int partition(int arr[], int low, int high) {
    int pivot = arr[high];
    int i = (low - 1);
    
    for (int j = low; j <= high - 1; j++) {
        if (arr[j] < pivot) {
            i++;
            int temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
    }
    int temp = arr[i + 1];
    arr[i + 1] = arr[high];
    arr[high] = temp;
    return (i + 1);
}

void quickSort(int arr[], int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}`,
    example: [10, 7, 8, 9, 1, 5]
  },
  {
    id: 'merge-sort',
    name: 'Merge Sort',
    category: 'sorting',
    description: 'A stable, divide-and-conquer sorting algorithm that produces a sorted array by merging sorted subarrays.',
    timeComplexity: {
      best: 'O(n log n)',
      average: 'O(n log n)',
      worst: 'O(n log n)'
    },
    spaceComplexity: 'O(n)',
    code: `void merge(int arr[], int l, int m, int r) {
    int i, j, k;
    int n1 = m - l + 1;
    int n2 = r - m;
    
    int L[n1], R[n2];
    
    for (i = 0; i < n1; i++)
        L[i] = arr[l + i];
    for (j = 0; j < n2; j++)
        R[j] = arr[m + 1 + j];
    
    i = 0;
    j = 0;
    k = l;
    
    while (i < n1 && j < n2) {
        if (L[i] <= R[j]) {
            arr[k] = L[i];
            i++;
        } else {
            arr[k] = R[j];
            j++;
        }
        k++;
    }
    
    while (i < n1) {
        arr[k] = L[i];
        i++;
        k++;
    }
    
    while (j < n2) {
        arr[k] = R[j];
        j++;
        k++;
    }
}

void mergeSort(int arr[], int l, int r) {
    if (l < r) {
        int m = l + (r - l) / 2;
        mergeSort(arr, l, m);
        mergeSort(arr, m + 1, r);
        merge(arr, l, m, r);
    }
}`,
    example: [12, 11, 13, 5, 6, 7]
  },
  {
    id: 'insertion-sort',
    name: 'Insertion Sort',
    category: 'sorting',
    description: 'A simple sorting algorithm that builds the final sorted array one item at a time.',
    timeComplexity: {
      best: 'O(n)',
      average: 'O(n²)',
      worst: 'O(n²)'
    },
    spaceComplexity: 'O(1)',
    code: `void insertionSort(int arr[], int n) {
    int i, key, j;
    for (i = 1; i < n; i++) {
        key = arr[i];
        j = i - 1;
        
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            j = j - 1;
        }
        arr[j + 1] = key;
    }
}`,
    example: [12, 11, 13, 5, 6]
  },
  {
    id: 'selection-sort',
    name: 'Selection Sort',
    category: 'sorting',
    description: 'A simple sorting algorithm that divides the input into a sorted and unsorted region.',
    timeComplexity: {
      best: 'O(n²)',
      average: 'O(n²)',
      worst: 'O(n²)'
    },
    spaceComplexity: 'O(1)',
    code: `void selectionSort(int arr[], int n) {
    int i, j, min_idx;
    
    for (i = 0; i < n-1; i++) {
        min_idx = i;
        for (j = i+1; j < n; j++)
            if (arr[j] < arr[min_idx])
                min_idx = j;
        
        int temp = arr[min_idx];
        arr[min_idx] = arr[i];
        arr[i] = temp;
    }
}`,
    example: [64, 25, 12, 22, 11]
  },
  
  // Searching Algorithms
  {
    id: 'linear-search',
    name: 'Linear Search',
    category: 'searching',
    description: 'A simple search algorithm that checks each element in the list sequentially.',
    timeComplexity: {
      best: 'O(1)',
      average: 'O(n)',
      worst: 'O(n)'
    },
    spaceComplexity: 'O(1)',
    code: `int linearSearch(int arr[], int n, int x) {
    int i;
    for (i = 0; i < n; i++)
        if (arr[i] == x)
            return i;
    return -1;
}`,
    example: [10, 20, 80, 30, 60, 50, 110, 100, 130, 170]
  },
  {
    id: 'binary-search',
    name: 'Binary Search',
    category: 'searching',
    description: 'An efficient search algorithm that works on sorted arrays by repeatedly dividing the search interval in half.',
    timeComplexity: {
      best: 'O(1)',
      average: 'O(log n)',
      worst: 'O(log n)'
    },
    spaceComplexity: 'O(1)',
    code: `int binarySearch(int arr[], int l, int r, int x) {
    if (r >= l) {
        int mid = l + (r - l) / 2;
        
        if (arr[mid] == x)
            return mid;
        
        if (arr[mid] > x)
            return binarySearch(arr, l, mid - 1, x);
        
        return binarySearch(arr, mid + 1, r, x);
    }
    
    return -1;
}`,
    example: [2, 3, 4, 10, 40, 50, 60, 70, 80, 90]
  },
  
  // Data Structures
  {
    id: 'linked-list',
    name: 'Linked List',
    category: 'data-structures',
    description: 'A linear data structure where elements are stored in nodes, and each node points to the next node.',
    timeComplexity: {
      best: 'O(1)',
      average: 'O(n)',
      worst: 'O(n)'
    },
    spaceComplexity: 'O(n)',
    code: `struct Node {
    int data;
    struct Node* next;
};

struct Node* newNode(int data) {
    struct Node* node = (struct Node*)malloc(sizeof(struct Node));
    node->data = data;
    node->next = NULL;
    return node;
}

void insertAtEnd(struct Node** head, int data) {
    struct Node* new_node = newNode(data);
    
    if (*head == NULL) {
        *head = new_node;
        return;
    }
    
    struct Node* last = *head;
    while (last->next != NULL)
        last = last->next;
    
    last->next = new_node;
}`,
    example: [1, 2, 3, 4, 5]
  },
  {
    id: 'stack',
    name: 'Stack',
    category: 'data-structures',
    description: 'A linear data structure that follows the Last In First Out (LIFO) principle.',
    timeComplexity: {
      best: 'O(1)',
      average: 'O(1)',
      worst: 'O(1)'
    },
    spaceComplexity: 'O(n)',
    code: `#define MAX 1000

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

void push(struct Stack* stack, int item) {
    if (stack->top == stack->capacity - 1)
        return;
    stack->array[++stack->top] = item;
}

int pop(struct Stack* stack) {
    if (stack->top == -1)
        return -1;
    return stack->array[stack->top--];
}`,
    example: [10, 20, 30, 40, 50]
  },
  {
    id: 'queue',
    name: 'Queue',
    category: 'data-structures',
    description: 'A linear data structure that follows the First In First Out (FIFO) principle.',
    timeComplexity: {
      best: 'O(1)',
      average: 'O(1)',
      worst: 'O(1)'
    },
    spaceComplexity: 'O(n)',
    code: `#define MAX 1000

struct Queue {
    int front, rear, size;
    unsigned capacity;
    int* array;
};

struct Queue* createQueue(unsigned capacity) {
    struct Queue* queue = (struct Queue*)malloc(sizeof(struct Queue));
    queue->capacity = capacity;
    queue->front = queue->size = 0;
    queue->rear = capacity - 1;
    queue->array = (int*)malloc(queue->capacity * sizeof(int));
    return queue;
}

void enqueue(struct Queue* queue, int item) {
    if (queue->size == queue->capacity)
        return;
    queue->rear = (queue->rear + 1) % queue->capacity;
    queue->array[queue->rear] = item;
    queue->size = queue->size + 1;
}

int dequeue(struct Queue* queue) {
    if (queue->size == 0)
        return -1;
    int item = queue->array[queue->front];
    queue->front = (queue->front + 1) % queue->capacity;
    queue->size = queue->size - 1;
    return item;
}`,
    example: [10, 20, 30, 40, 50]
  },
  {
    id: 'binary-tree',
    name: 'Binary Tree',
    category: 'data-structures',
    description: 'A hierarchical data structure where each node has at most two children.',
    timeComplexity: {
      best: 'O(1)',
      average: 'O(log n)',
      worst: 'O(n)'
    },
    spaceComplexity: 'O(n)',
    code: `struct Node {
    int data;
    struct Node *left, *right;
};

struct Node* newNode(int data) {
    struct Node* node = (struct Node*)malloc(sizeof(struct Node));
    node->data = data;
    node->left = node->right = NULL;
    return node;
}

void inorderTraversal(struct Node* root) {
    if (root != NULL) {
        inorderTraversal(root->left);
        printf("%d ", root->data);
        inorderTraversal(root->right);
    }
}

void preorderTraversal(struct Node* root) {
    if (root != NULL) {
        printf("%d ", root->data);
        preorderTraversal(root->left);
        preorderTraversal(root->right);
    }
}

void postorderTraversal(struct Node* root) {
    if (root != NULL) {
        postorderTraversal(root->left);
        postorderTraversal(root->right);
        printf("%d ", root->data);
    }
}`,
    example: [1, 2, 3, 4, 5, 6, 7]
  }
];

export const getAlgorithmById = (id: string): Algorithm | undefined => {
  return algorithms.find(alg => alg.id === id);
};

export const getAlgorithmsByCategory = (category: string): Algorithm[] => {
  return algorithms.filter(alg => alg.category === category);
}; 