export interface CExample {
  name: string;
  description: string;
  code: string;
  input?: string;
}

export const cExamples: CExample[] = [
  {
    name: 'Array Sum',
    description: 'Sum all elements of an array with visualization.',
    code: `#include <stdio.h>\nint main() {\n  int arr[5] = {1, 2, 3, 4, 5};\n  int sum = 0;\n  printf("Array: ");\n  for (int i = 0; i < 5; i++) {\n    printf("%d ", arr[i]);\n  }\n  printf("\\n");\n  \n  for (int i = 0; i < 5; i++) {\n    printf("Adding arr[%d] = %d to sum\\n", i, arr[i]);\n    sum += arr[i];\n    printf("Current sum: %d\\n", sum);\n  }\n  printf("Final sum: %d\\n", sum);\n  return 0;\n}`
  },
  {
    name: 'Pointer Demo',
    description: 'Show pointer assignment and dereferencing.',
    code: `#include <stdio.h>\nint main() {\n  int x = 10;\n  int *p = &x;\n  printf("x: %d, *p: %d\\n", x, *p);\n  *p = 20;\n  printf("x: %d, *p: %d\\n", x, *p);\n  return 0;\n}`
  },
  {
    name: 'Bubble Sort',
    description: 'Sort an array using bubble sort with animated visualization.',
    code: `#include <stdio.h>\nint main() {\n  int arr[] = {64, 34, 25, 12, 22, 11, 90};\n  int n = sizeof(arr) / sizeof(arr[0]);\n  printf("Original array: ");\n  for (int i = 0; i < n; i++) printf("%d ", arr[i]);\n  printf("\\n");\n  \n  for (int i = 0; i < n-1; i++) {\n    for (int j = 0; j < n-i-1; j++) {\n      if (arr[j] > arr[j+1]) {\n        int temp = arr[j];\n        arr[j] = arr[j+1];\n        arr[j+1] = temp;\n      }\n    }\n    printf("After pass %d: ", i+1);\n    for (int k = 0; k < n; k++) printf("%d ", arr[k]);\n    printf("\\n");\n  }\n  \n  printf("Sorted array: ");\n  for (int i = 0; i < n; i++) printf("%d ", arr[i]);\n  printf("\\n");\n  return 0;\n}`
  },
  {
    name: 'Linear Search',
    description: 'Search for a value in an array with animated visualization.',
    code: `#include <stdio.h>\nint main() {\n  int arr[5] = {3, 7, 2, 9, 5};\n  int target = 7;\n  int found = 0;\n  int foundIndex = -1;\n  \n  printf("Searching for: %d\\n", target);\n  printf("Array: ");\n  for (int i = 0; i < 5; i++) printf("%d ", arr[i]);\n  printf("\\n");\n  \n  for (int i = 0; i < 5; i++) {\n    printf("Checking index %d: %d\\n", i, arr[i]);\n    if (arr[i] == target) {\n      found = 1;\n      foundIndex = i;\n      break;\n    }\n  }\n  \n  if (found) {\n    printf("Found %d at index %d\\n", target, foundIndex);\n  } else {\n    printf("Not found\\n");\n  }\n  return 0;\n}`
  },
  {
    name: 'Linked List Insert',
    description: 'Insert a node at the beginning of a linked list.',
    code: `#include <stdio.h>\n#include <stdlib.h>\nstruct Node { int data; struct Node* next; };\nint main() {\n  struct Node* head = NULL;\n  for (int i = 1; i <= 3; i++) {\n    struct Node* newNode = (struct Node*)malloc(sizeof(struct Node));\n    newNode->data = i;\n    newNode->next = head;\n    head = newNode;\n  }\n  struct Node* curr = head;\n  while (curr) {\n    printf("%d ", curr->data);\n    curr = curr->next;\n  }\n  printf("\\n");\n  return 0;\n}`
  }
]; 