import { CodeExample } from '@/types';

export const codeExamples: CodeExample[] = [
  {
    id: 'array-demo',
    title: 'Array Visualization',
    category: 'Data Structures',
    description: 'Visualize an array with multiple elements',
    code: `#include <stdio.h>

int main() {
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
    id: 'variables',
    title: 'Variables and Arithmetic',
    category: 'Basic',
    description: 'Basic variable declarations and arithmetic operations',
    code: `#include <stdio.h>

int main() {
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
    id: 'hello-world',
    title: 'Hello World',
    category: 'Basic',
    description: 'A simple hello world program',
    code: `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`,
  },
  {
    id: 'loops',
    title: 'For Loop',
    category: 'Control Flow',
    description: 'Demonstrates a simple for loop',
    code: `#include <stdio.h>

int main() {
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
    id: 'array',
    title: 'Array Basics',
    category: 'Arrays',
    description: 'Working with arrays',
    code: `#include <stdio.h>

int main() {
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
    id: 'pointers',
    title: 'Pointer Basics',
    category: 'Pointers',
    description: 'Introduction to pointers',
    code: `#include <stdio.h>

int main() {
    int x = 42;
    int *ptr = &x;
    
    printf("Value of x: %d\\n", x);
    printf("Address of x: %p\\n", (void*)&x);
    printf("Value of ptr: %p\\n", (void*)ptr);
    printf("Value pointed by ptr: %d\\n", *ptr);
    
    *ptr = 100;
    printf("New value of x: %d\\n", x);
    
    return 0;
}`,
  },
  {
    id: 'bubble-sort',
    title: 'Bubble Sort',
    category: 'Sorting',
    description: 'Bubble sort algorithm visualization',
    code: `#include <stdio.h>

int main() {
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
    id: 'binary-search',
    title: 'Binary Search',
    category: 'Searching',
    description: 'Binary search algorithm',
    code: `#include <stdio.h>

int main() {
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

int main() {
    int num = 5;
    int result = factorial(num);
    printf("Factorial of %d is %d\\n", num, result);
    return 0;
}`,
  },
  {
    id: 'string-reverse',
    title: 'String Reversal',
    category: 'Strings',
    description: 'Reverse a string using pointers',
    code: `#include <stdio.h>
#include <string.h>

int main() {
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
    id: 'fibonacci',
    title: 'Fibonacci Sequence',
    category: 'Basic',
    description: 'Generate Fibonacci numbers',
    code: `#include <stdio.h>

int main() {
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
