import { CodeExample } from '@/types';

export const codeExamples: CodeExample[] = [
  // ------------------------------------------------------------------ Basic
  {
    id: 'hello-world',
    title: 'Hello World',
    category: 'Basic',
    description: 'A simple hello world program',
    code: `#include <stdio.h>

int main(void) {
    printf("Hello, World!\\n");
    return 0;
}`,
  },
  {
    id: 'variables',
    title: 'Variables and Arithmetic',
    category: 'Basic',
    description: 'Basic variable declarations and arithmetic operations',
    code: `#include <stdio.h>

int main(void) {
    int x = 10;
    int y = 20;
    int sum = x + y;
    int product = x * y;
    float average = (x + y) / 2.0;

    printf("x = %d, y = %d\\n", x, y);
    printf("Sum: %d\\n", sum);
    printf("Product: %d\\n", product);
    printf("Average: %.1f\\n", average);

    return 0;
}`,
  },
  {
    id: 'fibonacci',
    title: 'Fibonacci Sequence',
    category: 'Basic',
    description: 'Generate Fibonacci numbers with a loop',
    code: `#include <stdio.h>

int main(void) {
    int n = 8;
    int a = 0, b = 1;
    int next, i;

    printf("Fibonacci sequence:\\n");
    printf("%d %d ", a, b);

    for (i = 2; i < n; i++) {
        next = a + b;
        printf("%d ", next);
        a = b;
        b = next;
    }

    printf("\\n");
    return 0;
}`,
  },

  // ------------------------------------------------------------------ Control flow
  {
    id: 'loops',
    title: 'For Loop',
    category: 'Control Flow',
    description: 'Demonstrates a simple for loop',
    code: `#include <stdio.h>

int main(void) {
    int i;
    int sum = 0;

    for (i = 1; i <= 5; i++) {
        sum += i;
        printf("i = %d, sum = %d\\n", i, sum);
    }

    return 0;
}`,
  },
  {
    id: 'switch-grades',
    title: 'Switch Statement',
    category: 'Control Flow',
    description: 'Convert scores to letter grades with switch and fall-through',
    code: `#include <stdio.h>

int main(void) {
    int scores[] = {95, 82, 71, 64, 40};

    for (int i = 0; i < 5; i++) {
        char grade;
        switch (scores[i] / 10) {
            case 10:
            case 9: grade = 'A'; break;
            case 8: grade = 'B'; break;
            case 7: grade = 'C'; break;
            case 6: grade = 'D'; break;
            default: grade = 'F';
        }
        printf("%d -> %c\\n", scores[i], grade);
    }
    return 0;
}`,
  },

  // ------------------------------------------------------------------ Arrays
  {
    id: 'array-demo',
    title: 'Array Visualization',
    category: 'Arrays',
    description: 'Visualize an array with multiple elements',
    code: `#include <stdio.h>

int main(void) {
    int numbers[] = {10, 20, 30, 40, 50};
    int sum = 0;

    for (int i = 0; i < 5; i++) {
        sum += numbers[i];
        printf("numbers[%d] = %d\\n", i, numbers[i]);
    }

    printf("Sum: %d\\n", sum);
    return 0;
}`,
  },
  {
    id: 'array',
    title: 'Array Basics',
    category: 'Arrays',
    description: 'Working with arrays',
    code: `#include <stdio.h>

int main(void) {
    int arr[5] = {10, 20, 30, 40, 50};
    int i;
    int sum = 0;

    for (i = 0; i < 5; i++) {
        sum += arr[i];
        printf("arr[%d] = %d\\n", i, arr[i]);
    }

    printf("Sum: %d\\n", sum);
    return 0;
}`,
  },
  {
    id: 'matrix-multiply',
    title: 'Matrix Multiplication',
    category: 'Arrays',
    description: 'Multiply two 2x3 and 3x2 matrices (2D arrays)',
    code: `#include <stdio.h>

int main(void) {
    int a[2][3] = {{1, 2, 3}, {4, 5, 6}};
    int b[3][2] = {{7, 8}, {9, 10}, {11, 12}};
    int c[2][2] = {0};

    for (int i = 0; i < 2; i++)
        for (int j = 0; j < 2; j++)
            for (int k = 0; k < 3; k++)
                c[i][j] += a[i][k] * b[k][j];

    for (int i = 0; i < 2; i++)
        printf("%d %d\\n", c[i][0], c[i][1]);
    return 0;
}`,
  },

  // ------------------------------------------------------------------ Strings
  {
    id: 'string-reverse',
    title: 'String Reversal',
    category: 'Strings',
    description: 'Reverse a string in place',
    code: `#include <stdio.h>
#include <string.h>

int main(void) {
    char str[] = "Hello";
    int length = strlen(str);
    int i;
    char temp;

    printf("Original: %s\\n", str);

    for (i = 0; i < length / 2; i++) {
        temp = str[i];
        str[i] = str[length - 1 - i];
        str[length - 1 - i] = temp;
    }

    printf("Reversed: %s\\n", str);

    return 0;
}`,
  },
  {
    id: 'palindrome',
    title: 'Palindrome (Two Pointers)',
    category: 'Strings',
    description: 'Check a word with two pointers moving toward each other',
    code: `#include <stdio.h>
#include <string.h>

int is_palindrome(const char *s) {
    const char *left = s;
    const char *right = s + strlen(s) - 1;
    while (left < right) {
        if (*left != *right)
            return 0;
        left++;
        right--;
    }
    return 1;
}

int main(void) {
    char word[] = "racecar";
    printf("%s: %s\\n", word, is_palindrome(word) ? "palindrome" : "not a palindrome");
    return 0;
}`,
  },

  // ------------------------------------------------------------------ Pointers
  {
    id: 'pointers',
    title: 'Pointer Basics',
    category: 'Pointers',
    description: 'Introduction to pointers',
    code: `#include <stdio.h>

int main(void) {
    int x = 42;
    int *ptr = &x;

    printf("Value of x: %d\\n", x);
    printf("Address of x: %p\\n", (void *)&x);
    printf("Value of ptr: %p\\n", (void *)ptr);
    printf("Value pointed by ptr: %d\\n", *ptr);

    *ptr = 100;
    printf("New value of x: %d\\n", x);

    return 0;
}`,
  },
  {
    id: 'swap-pointers',
    title: 'Swap with Pointers',
    category: 'Pointers',
    description: 'Pass addresses so a function can change the caller\'s variables',
    code: `#include <stdio.h>

void swap(int *a, int *b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

int main(void) {
    int x = 3, y = 7;
    printf("before: x = %d, y = %d\\n", x, y);
    swap(&x, &y);
    printf("after:  x = %d, y = %d\\n", x, y);
    return 0;
}`,
  },
  {
    id: 'pointer-arithmetic',
    title: 'Pointer Arithmetic',
    category: 'Pointers',
    description: 'Walk an array with a pointer instead of an index',
    code: `#include <stdio.h>

int main(void) {
    int data[] = {3, 1, 4, 1, 5};
    int *p = data;
    int *end = data + 5;
    int total = 0;

    while (p < end) {
        total += *p;
        p++;
    }
    printf("total = %d, elements visited = %ld\\n", total, p - data);
    return 0;
}`,
  },

  // ------------------------------------------------------------------ Functions
  {
    id: 'factorial',
    title: 'Factorial (Recursive)',
    category: 'Functions',
    description: 'Recursive factorial calculation',
    code: `#include <stdio.h>

int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

int main(void) {
    int num = 5;
    int result = factorial(num);
    printf("Factorial of %d is %d\\n", num, result);
    return 0;
}`,
  },
  {
    id: 'fib-recursive',
    title: 'Fibonacci (Recursive)',
    category: 'Functions',
    description: 'Watch the call stack grow and shrink',
    code: `#include <stdio.h>

int fib(int n) {
    if (n < 2)
        return n;
    return fib(n - 1) + fib(n - 2);
}

int main(void) {
    printf("fib(5) = %d\\n", fib(5));
    return 0;
}`,
  },
  {
    id: 'function-pointers',
    title: 'Function Pointers',
    category: 'Functions',
    description: 'Choose an operation at runtime through a table of function pointers',
    code: `#include <stdio.h>

int add(int a, int b) { return a + b; }
int sub(int a, int b) { return a - b; }
int mul(int a, int b) { return a * b; }

int main(void) {
    int (*ops[])(int, int) = {add, sub, mul};
    const char *names[] = {"add", "sub", "mul"};

    for (int i = 0; i < 3; i++)
        printf("%s(6, 3) = %d\\n", names[i], ops[i](6, 3));
    return 0;
}`,
  },

  // ------------------------------------------------------------------ Structs
  {
    id: 'structs',
    title: 'Struct Records',
    category: 'Structs',
    description: 'An array of structs and a function that finds the best record',
    code: `#include <stdio.h>

struct Student {
    char name[12];
    int score;
};

struct Student best(struct Student s[], int n) {
    struct Student top = s[0];
    for (int i = 1; i < n; i++)
        if (s[i].score > top.score)
            top = s[i];
    return top;
}

int main(void) {
    struct Student class[3] = {{"Ada", 91}, {"Linus", 78}, {"Grace", 96}};
    struct Student b = best(class, 3);
    printf("Top student: %s (%d)\\n", b.name, b.score);
    return 0;
}`,
  },

  // ------------------------------------------------------------------ Sorting
  {
    id: 'bubble-sort',
    title: 'Bubble Sort',
    category: 'Sorting',
    description: 'Bubble sort algorithm visualization',
    code: `#include <stdio.h>

int main(void) {
    int arr[5] = {64, 34, 25, 12, 22};
    int n = 5;
    int i, j, temp;

    printf("Original array:\\n");
    for (i = 0; i < n; i++) {
        printf("%d ", arr[i]);
    }
    printf("\\n");

    for (i = 0; i < n - 1; i++) {
        for (j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }

    printf("Sorted array:\\n");
    for (i = 0; i < n; i++) {
        printf("%d ", arr[i]);
    }
    printf("\\n");

    return 0;
}`,
  },
  {
    id: 'selection-sort',
    title: 'Selection Sort',
    category: 'Sorting',
    description: 'Repeatedly select the minimum of the unsorted part',
    code: `#include <stdio.h>

int main(void) {
    int a[6] = {29, 10, 14, 37, 13, 5};
    int n = 6;

    for (int i = 0; i < n - 1; i++) {
        int min = i;
        for (int j = i + 1; j < n; j++)
            if (a[j] < a[min])
                min = j;
        int t = a[i];
        a[i] = a[min];
        a[min] = t;
    }

    for (int i = 0; i < n; i++) printf("%d ", a[i]);
    printf("\\n");
    return 0;
}`,
  },
  {
    id: 'insertion-sort',
    title: 'Insertion Sort',
    category: 'Sorting',
    description: 'Shift larger elements right and insert the key',
    code: `#include <stdio.h>

int main(void) {
    int a[6] = {12, 11, 13, 5, 6, 7};
    int n = 6;

    for (int i = 1; i < n; i++) {
        int key = a[i];
        int j = i - 1;
        while (j >= 0 && a[j] > key) {
            a[j + 1] = a[j];
            j--;
        }
        a[j + 1] = key;
    }

    for (int i = 0; i < n; i++) printf("%d ", a[i]);
    printf("\\n");
    return 0;
}`,
  },
  {
    id: 'merge-sort',
    title: 'Merge Sort',
    category: 'Sorting',
    description: 'Divide and conquer with recursion and a temporary array',
    code: `#include <stdio.h>

void merge(int a[], int lo, int mid, int hi) {
    int tmp[8];
    int i = lo, j = mid + 1, k = 0;
    while (i <= mid && j <= hi)
        tmp[k++] = a[i] <= a[j] ? a[i++] : a[j++];
    while (i <= mid) tmp[k++] = a[i++];
    while (j <= hi) tmp[k++] = a[j++];
    for (k = 0; k < hi - lo + 1; k++)
        a[lo + k] = tmp[k];
}

void merge_sort(int a[], int lo, int hi) {
    if (lo >= hi) return;
    int mid = (lo + hi) / 2;
    merge_sort(a, lo, mid);
    merge_sort(a, mid + 1, hi);
    merge(a, lo, mid, hi);
}

int main(void) {
    int a[8] = {38, 27, 43, 3, 9, 82, 10, 1};
    merge_sort(a, 0, 7);
    for (int i = 0; i < 8; i++) printf("%d ", a[i]);
    printf("\\n");
    return 0;
}`,
  },
  {
    id: 'quick-sort',
    title: 'Quick Sort',
    category: 'Sorting',
    description: 'Lomuto partition around a pivot, then recurse',
    code: `#include <stdio.h>

void swap(int *x, int *y) { int t = *x; *x = *y; *y = t; }

int partition(int a[], int lo, int hi) {
    int pivot = a[hi];
    int i = lo - 1;
    for (int j = lo; j < hi; j++) {
        if (a[j] < pivot) {
            i++;
            swap(&a[i], &a[j]);
        }
    }
    swap(&a[i + 1], &a[hi]);
    return i + 1;
}

void quick_sort(int a[], int lo, int hi) {
    if (lo < hi) {
        int p = partition(a, lo, hi);
        quick_sort(a, lo, p - 1);
        quick_sort(a, p + 1, hi);
    }
}

int main(void) {
    int a[7] = {10, 80, 30, 90, 40, 50, 70};
    quick_sort(a, 0, 6);
    for (int i = 0; i < 7; i++) printf("%d ", a[i]);
    printf("\\n");
    return 0;
}`,
  },

  // ------------------------------------------------------------------ Searching
  {
    id: 'binary-search',
    title: 'Binary Search',
    category: 'Searching',
    description: 'Binary search algorithm',
    code: `#include <stdio.h>

int main(void) {
    int arr[7] = {2, 5, 8, 12, 16, 23, 38};
    int n = 7;
    int target = 23;
    int left = 0;
    int right = n - 1;
    int mid;
    int found = -1;

    while (left <= right) {
        mid = left + (right - left) / 2;

        printf("Checking position %d (value: %d)\\n", mid, arr[mid]);

        if (arr[mid] == target) {
            found = mid;
            break;
        }

        if (arr[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    if (found != -1) {
        printf("Found %d at index %d\\n", target, found);
    } else {
        printf("Element not found\\n");
    }

    return 0;
}`,
  },

  // ------------------------------------------------------------------ Data structures
  {
    id: 'linked-list',
    title: 'Linked List: Insert, Delete, Reverse',
    category: 'Data Structures',
    description: 'Build a list on the heap, remove a node, reverse the links, free it',
    code: `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int data;
    struct Node *next;
} Node;

Node *push_front(Node *head, int value) {
    Node *n = malloc(sizeof(Node));
    n->data = value;
    n->next = head;
    return n;
}

Node *remove_value(Node *head, int value) {
    Node *prev = NULL, *cur = head;
    while (cur && cur->data != value) {
        prev = cur;
        cur = cur->next;
    }
    if (!cur) return head;
    if (prev) prev->next = cur->next;
    else head = cur->next;
    free(cur);
    return head;
}

Node *reverse(Node *head) {
    Node *prev = NULL;
    while (head) {
        Node *next = head->next;
        head->next = prev;
        prev = head;
        head = next;
    }
    return prev;
}

int main(void) {
    Node *head = NULL;
    for (int i = 1; i <= 4; i++)
        head = push_front(head, i * 10);
    head = remove_value(head, 20);
    head = reverse(head);

    for (Node *p = head; p; p = p->next)
        printf("%d ", p->data);
    printf("\\n");

    while (head) {
        Node *next = head->next;
        free(head);
        head = next;
    }
    return 0;
}`,
  },
  {
    id: 'doubly-linked-list',
    title: 'Doubly Linked List',
    category: 'Data Structures',
    description: 'Nodes with prev and next pointers',
    code: `#include <stdio.h>
#include <stdlib.h>

struct DNode {
    int value;
    struct DNode *prev, *next;
};

int main(void) {
    struct DNode *head = NULL, *tail = NULL;
    for (int i = 1; i <= 3; i++) {
        struct DNode *n = malloc(sizeof *n);
        n->value = i;
        n->prev = tail;
        n->next = NULL;
        if (tail) tail->next = n;
        else head = n;
        tail = n;
    }
    for (struct DNode *p = tail; p; p = p->prev)
        printf("%d ", p->value);
    printf("\\n");
    while (head) {
        struct DNode *next = head->next;
        free(head);
        head = next;
    }
    return 0;
}`,
  },
  {
    id: 'bst',
    title: 'Binary Search Tree',
    category: 'Data Structures',
    description: 'Insert keys recursively, then print them in order',
    code: `#include <stdio.h>
#include <stdlib.h>

struct Node {
    int key;
    struct Node *left, *right;
};

struct Node *insert(struct Node *root, int key) {
    if (root == NULL) {
        struct Node *n = malloc(sizeof *n);
        n->key = key;
        n->left = n->right = NULL;
        return n;
    }
    if (key < root->key)
        root->left = insert(root->left, key);
    else
        root->right = insert(root->right, key);
    return root;
}

void inorder(struct Node *root) {
    if (!root) return;
    inorder(root->left);
    printf("%d ", root->key);
    inorder(root->right);
}

void destroy(struct Node *root) {
    if (!root) return;
    destroy(root->left);
    destroy(root->right);
    free(root);
}

int main(void) {
    int keys[] = {50, 30, 70, 20, 40, 60, 80};
    struct Node *root = NULL;
    for (int i = 0; i < 7; i++)
        root = insert(root, keys[i]);
    inorder(root);
    printf("\\n");
    destroy(root);
    return 0;
}`,
  },
  {
    id: 'stack-array',
    title: 'Stack (Array)',
    category: 'Data Structures',
    description: 'Push and pop on an array-based stack',
    code: `#include <stdio.h>
#define MAX 5

typedef struct {
    int items[MAX];
    int top;
} Stack;

int push(Stack *s, int v) {
    if (s->top == MAX - 1) return 0;
    s->items[++s->top] = v;
    return 1;
}

int pop(Stack *s) {
    return s->items[s->top--];
}

int main(void) {
    Stack s = { .top = -1 };
    for (int i = 1; i <= 4; i++)
        push(&s, i * 11);
    printf("popped %d\\n", pop(&s));
    printf("popped %d\\n", pop(&s));
    push(&s, 99);
    printf("top is now %d\\n", s.items[s.top]);
    return 0;
}`,
  },
  {
    id: 'circular-queue',
    title: 'Circular Queue',
    category: 'Data Structures',
    description: 'Enqueue and dequeue with wrap-around indexes',
    code: `#include <stdio.h>
#define SIZE 4

typedef struct {
    int data[SIZE];
    int front, rear, count;
} Queue;

void enqueue(Queue *q, int v) {
    if (q->count == SIZE) return;
    q->rear = (q->rear + 1) % SIZE;
    q->data[q->rear] = v;
    q->count++;
}

int dequeue(Queue *q) {
    int v = q->data[q->front];
    q->front = (q->front + 1) % SIZE;
    q->count--;
    return v;
}

int main(void) {
    Queue q = { .front = 0, .rear = -1, .count = 0 };
    enqueue(&q, 1);
    enqueue(&q, 2);
    enqueue(&q, 3);
    printf("%d ", dequeue(&q));
    printf("%d ", dequeue(&q));
    enqueue(&q, 4);
    enqueue(&q, 5);
    enqueue(&q, 6);
    while (q.count > 0)
        printf("%d ", dequeue(&q));
    printf("\\n");
    return 0;
}`,
  },
  {
    id: 'dynamic-array',
    title: 'Dynamic Array (realloc)',
    category: 'Data Structures',
    description: 'Grow a heap array by doubling its capacity',
    code: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int capacity = 2, size = 0;
    int *items = malloc(capacity * sizeof(int));

    for (int v = 1; v <= 5; v++) {
        if (size == capacity) {
            capacity *= 2;
            items = realloc(items, capacity * sizeof(int));
        }
        items[size++] = v * v;
    }

    for (int i = 0; i < size; i++) printf("%d ", items[i]);
    printf("(capacity %d)\\n", capacity);
    free(items);
    return 0;
}`,
  },

  // ------------------------------------------------------------------ Input
  {
    id: 'scanf-calculator',
    title: 'Calculator (scanf)',
    category: 'Input',
    description: 'Reads two numbers and an operator; you type them in the console',
    input: ['12 * 3'],
    code: `#include <stdio.h>

int main(void) {
    double a, b;
    char op;

    printf("Enter an expression like 12 * 3: ");
    if (scanf("%lf %c %lf", &a, &op, &b) != 3) {
        printf("Could not read the expression.\\n");
        return 1;
    }

    switch (op) {
        case '+': printf("%g\\n", a + b); break;
        case '-': printf("%g\\n", a - b); break;
        case '*': printf("%g\\n", a * b); break;
        case '/':
            if (b == 0) printf("Division by zero!\\n");
            else printf("%g\\n", a / b);
            break;
        default: printf("Unknown operator '%c'\\n", op);
    }
    return 0;
}`,
  },
  {
    id: 'scanf-average',
    title: 'Average of N Numbers',
    category: 'Input',
    description: 'Reads a count, then that many numbers into a variable-length array',
    input: ['4', '10 20 30 45'],
    code: `#include <stdio.h>

int main(void) {
    int n;
    printf("How many numbers? ");
    scanf("%d", &n);

    int values[n];
    int sum = 0;
    for (int i = 0; i < n; i++) {
        printf("Number %d: ", i + 1);
        scanf("%d", &values[i]);
        sum += values[i];
    }

    printf("Average: %.2f\\n", (double)sum / n);
    return 0;
}`,
  },

  // ------------------------------------------------------------------ Memory bugs
  {
    id: 'bug-off-by-one',
    title: 'Bug: Off-by-One Overflow',
    category: 'Memory Bugs',
    description: 'Writes one element past the end of a heap array (caught at runtime)',
    code: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n = 5;
    int *a = malloc(n * sizeof(int));
    for (int i = 0; i <= n; i++) {   /* should be i < n */
        a[i] = i * i;
    }
    printf("%d\\n", a[2]);
    free(a);
    return 0;
}`,
  },
  {
    id: 'bug-use-after-free',
    title: 'Bug: Use After Free',
    category: 'Memory Bugs',
    description: 'Reads memory that was already returned to the heap',
    code: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int *p = malloc(sizeof(int));
    *p = 42;
    free(p);
    printf("%d\\n", *p);   /* p is dangling */
    return 0;
}`,
  },
  {
    id: 'bug-leak',
    title: 'Bug: Memory Leak',
    category: 'Memory Bugs',
    description: 'Loses the only pointer to a heap block',
    code: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
    char *name = malloc(16);
    strcpy(name, "first");
    name = malloc(16);          /* the first block is now unreachable */
    strcpy(name, "second");
    printf("%s\\n", name);
    free(name);
    return 0;
}`,
  },
  {
    id: 'bug-uninitialized',
    title: 'Bug: Uninitialized Variable',
    category: 'Memory Bugs',
    description: 'Adds to a sum that was never set to zero',
    code: `#include <stdio.h>

int main(void) {
    int values[] = {4, 8, 15};
    int sum;                    /* missing = 0 */
    for (int i = 0; i < 3; i++)
        sum += values[i];
    printf("sum = %d\\n", sum);
    return 0;
}`,
  },
  {
    id: 'bug-stack-overflow',
    title: 'Bug: Infinite Recursion',
    category: 'Memory Bugs',
    description: 'A recursive function without a base case overflows the stack',
    code: `#include <stdio.h>

int depth(int n) {
    return depth(n + 1) + 1;    /* no base case */
}

int main(void) {
    printf("%d\\n", depth(0));
    return 0;
}`,
  },
];

export const getExamplesByCategory = () => {
  const categories: Record<string, CodeExample[]> = {};

  codeExamples.forEach((example) => {
    if (!categories[example.category]) {
      categories[example.category] = [];
    }
    categories[example.category].push(example);
  });

  return categories;
};

export const getExampleById = (id: string): CodeExample | undefined => {
  return codeExamples.find((example) => example.id === id);
};
