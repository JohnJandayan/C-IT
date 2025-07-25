import { AlgorithmStep, Algorithm } from '@/types';

export class AlgorithmVisualizer {
  private steps: AlgorithmStep[] = [];
  private currentArray: number[] = [];

  constructor(private algorithm: Algorithm, private initialArray: number[]) {
    this.currentArray = [...initialArray];
  }

  generateSteps(): AlgorithmStep[] {
    this.steps = [];
    this.currentArray = [...this.initialArray];

    switch (this.algorithm.id) {
      case 'bubble-sort':
        return this.generateBubbleSortSteps();
      case 'quick-sort':
        return this.generateQuickSortSteps();
      case 'merge-sort':
        return this.generateMergeSortSteps();
      case 'insertion-sort':
        return this.generateInsertionSortSteps();
      case 'selection-sort':
        return this.generateSelectionSortSteps();
      case 'linear-search':
        return this.generateLinearSearchSteps();
      case 'binary-search':
        return this.generateBinarySearchSteps();
      default:
        return [];
    }
  }

  private generateBubbleSortSteps(): AlgorithmStep[] {
    const n = this.currentArray.length;
    
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        // Compare step
        this.steps.push({
          id: `step-${this.steps.length}`,
          type: 'compare',
          indices: [j, j + 1],
          description: `Comparing elements at positions ${j} and ${j + 1}`,
          array: [...this.currentArray]
        });

        if (this.currentArray[j] > this.currentArray[j + 1]) {
          // Swap step
          const temp = this.currentArray[j];
          this.currentArray[j] = this.currentArray[j + 1];
          this.currentArray[j + 1] = temp;

          this.steps.push({
            id: `step-${this.steps.length}`,
            type: 'swap',
            indices: [j, j + 1],
            description: `Swapping elements at positions ${j} and ${j + 1}`,
            array: [...this.currentArray]
          });
        }
      }
    }

    return this.steps;
  }

  private generateQuickSortSteps(): AlgorithmStep[] {
    this.quickSortHelper(0, this.currentArray.length - 1);
    return this.steps;
  }

  private quickSortHelper(low: number, high: number): void {
    if (low < high) {
      const pi = this.partition(low, high);
      this.quickSortHelper(low, pi - 1);
      this.quickSortHelper(pi + 1, high);
    }
  }

  private partition(low: number, high: number): number {
    const pivot = this.currentArray[high];
    let i = low - 1;

    this.steps.push({
      id: `step-${this.steps.length}`,
      type: 'highlight',
      indices: [high],
      description: `Selecting pivot element: ${pivot}`,
      array: [...this.currentArray]
    });

    for (let j = low; j <= high - 1; j++) {
      this.steps.push({
        id: `step-${this.steps.length}`,
        type: 'compare',
        indices: [j, high],
        description: `Comparing element ${this.currentArray[j]} with pivot ${pivot}`,
        array: [...this.currentArray]
      });

      if (this.currentArray[j] < pivot) {
        i++;
        if (i !== j) {
          const temp = this.currentArray[i];
          this.currentArray[i] = this.currentArray[j];
          this.currentArray[j] = temp;

          this.steps.push({
            id: `step-${this.steps.length}`,
            type: 'swap',
            indices: [i, j],
            description: `Swapping elements at positions ${i} and ${j}`,
            array: [...this.currentArray]
          });
        }
      }
    }

    const temp = this.currentArray[i + 1];
    this.currentArray[i + 1] = this.currentArray[high];
    this.currentArray[high] = temp;

    this.steps.push({
      id: `step-${this.steps.length}`,
      type: 'swap',
      indices: [i + 1, high],
      description: `Placing pivot in correct position`,
      array: [...this.currentArray]
    });

    return i + 1;
  }

  private generateMergeSortSteps(): AlgorithmStep[] {
    this.mergeSortHelper(0, this.currentArray.length - 1);
    return this.steps;
  }

  private mergeSortHelper(l: number, r: number): void {
    if (l < r) {
      const m = Math.floor(l + (r - l) / 2);
      
      this.steps.push({
        id: `step-${this.steps.length}`,
        type: 'partition',
        indices: [l, m, r],
        description: `Dividing array from index ${l} to ${r} at midpoint ${m}`,
        array: [...this.currentArray]
      });

      this.mergeSortHelper(l, m);
      this.mergeSortHelper(m + 1, r);
      this.merge(l, m, r);
    }
  }

  private merge(l: number, m: number, r: number): void {
    const n1 = m - l + 1;
    const n2 = r - m;
    const L = new Array(n1);
    const R = new Array(n2);

    for (let i = 0; i < n1; i++) {
      L[i] = this.currentArray[l + i];
    }
    for (let j = 0; j < n2; j++) {
      R[j] = this.currentArray[m + 1 + j];
    }

    let i = 0, j = 0, k = l;

    while (i < n1 && j < n2) {
      this.steps.push({
        id: `step-${this.steps.length}`,
        type: 'compare',
        indices: [l + i, m + 1 + j],
        description: `Comparing ${L[i]} and ${R[j]}`,
        array: [...this.currentArray]
      });

      if (L[i] <= R[j]) {
        this.currentArray[k] = L[i];
        i++;
      } else {
        this.currentArray[k] = R[j];
        j++;
      }
      k++;
    }

    while (i < n1) {
      this.currentArray[k] = L[i];
      i++;
      k++;
    }

    while (j < n2) {
      this.currentArray[k] = R[j];
      j++;
      k++;
    }

    this.steps.push({
      id: `step-${this.steps.length}`,
      type: 'merge',
      indices: [l, r],
      description: `Merging sorted subarrays from ${l} to ${r}`,
      array: [...this.currentArray]
    });
  }

  private generateInsertionSortSteps(): AlgorithmStep[] {
    const n = this.currentArray.length;

    for (let i = 1; i < n; i++) {
      const key = this.currentArray[i];
      let j = i - 1;

      this.steps.push({
        id: `step-${this.steps.length}`,
        type: 'highlight',
        indices: [i],
        description: `Selecting key element: ${key}`,
        array: [...this.currentArray]
      });

      while (j >= 0 && this.currentArray[j] > key) {
        this.steps.push({
          id: `step-${this.steps.length}`,
          type: 'compare',
          indices: [j, j + 1],
          description: `Comparing ${this.currentArray[j]} with key ${key}`,
          array: [...this.currentArray]
        });

        this.currentArray[j + 1] = this.currentArray[j];
        j = j - 1;

        this.steps.push({
          id: `step-${this.steps.length}`,
          type: 'move',
          indices: [j + 1],
          description: `Shifting element to the right`,
          array: [...this.currentArray]
        });
      }

      this.currentArray[j + 1] = key;

      this.steps.push({
        id: `step-${this.steps.length}`,
        type: 'insert',
        indices: [j + 1],
        description: `Inserting key ${key} at position ${j + 1}`,
        array: [...this.currentArray]
      });
    }

    return this.steps;
  }

  private generateSelectionSortSteps(): AlgorithmStep[] {
    const n = this.currentArray.length;

    for (let i = 0; i < n - 1; i++) {
      let min_idx = i;

      this.steps.push({
        id: `step-${this.steps.length}`,
        type: 'highlight',
        indices: [i],
        description: `Looking for minimum element starting from position ${i}`,
        array: [...this.currentArray]
      });

      for (let j = i + 1; j < n; j++) {
        this.steps.push({
          id: `step-${this.steps.length}`,
          type: 'compare',
          indices: [min_idx, j],
          description: `Comparing elements at positions ${min_idx} and ${j}`,
          array: [...this.currentArray]
        });

        if (this.currentArray[j] < this.currentArray[min_idx]) {
          min_idx = j;
        }
      }

      if (min_idx !== i) {
        const temp = this.currentArray[min_idx];
        this.currentArray[min_idx] = this.currentArray[i];
        this.currentArray[i] = temp;

        this.steps.push({
          id: `step-${this.steps.length}`,
          type: 'swap',
          indices: [i, min_idx],
          description: `Swapping minimum element with element at position ${i}`,
          array: [...this.currentArray]
        });
      }
    }

    return this.steps;
  }

  private generateLinearSearchSteps(): AlgorithmStep[] {
    const target = 50; // Example target value
    const n = this.currentArray.length;

    for (let i = 0; i < n; i++) {
      this.steps.push({
        id: `step-${this.steps.length}`,
        type: 'compare',
        indices: [i],
        description: `Checking element at position ${i}: ${this.currentArray[i]}`,
        array: [...this.currentArray]
      });

      if (this.currentArray[i] === target) {
        this.steps.push({
          id: `step-${this.steps.length}`,
          type: 'highlight',
          indices: [i],
          description: `Found target ${target} at position ${i}!`,
          array: [...this.currentArray]
        });
        break;
      }
    }

    return this.steps;
  }

  private generateBinarySearchSteps(): AlgorithmStep[] {
    const target = 40; // Example target value
    let left = 0;
    let right = this.currentArray.length - 1;

    while (left <= right) {
      const mid = Math.floor(left + (right - left) / 2);

      this.steps.push({
        id: `step-${this.steps.length}`,
        type: 'highlight',
        indices: [mid],
        description: `Checking middle element at position ${mid}: ${this.currentArray[mid]}`,
        array: [...this.currentArray]
      });

      if (this.currentArray[mid] === target) {
        this.steps.push({
          id: `step-${this.steps.length}`,
          type: 'highlight',
          indices: [mid],
          description: `Found target ${target} at position ${mid}!`,
          array: [...this.currentArray]
        });
        break;
      }

      if (this.currentArray[mid] < target) {
        left = mid + 1;
        this.steps.push({
          id: `step-${this.steps.length}`,
          type: 'partition',
          indices: [mid + 1, right],
          description: `Target is greater, searching right half`,
          array: [...this.currentArray]
        });
      } else {
        right = mid - 1;
        this.steps.push({
          id: `step-${this.steps.length}`,
          type: 'partition',
          indices: [left, mid - 1],
          description: `Target is smaller, searching left half`,
          array: [...this.currentArray]
        });
      }
    }

    return this.steps;
  }
}

export const createVisualizer = (algorithm: Algorithm, array: number[]): AlgorithmVisualizer => {
  return new AlgorithmVisualizer(algorithm, array);
}; 