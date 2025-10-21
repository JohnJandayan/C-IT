// Global variables
let currentVisualization = null;
let currentStep = 0;
let totalSteps = 0;
let isPlaying = false;
let animationSpeed = 1;
let animationInterval = null;

// DOM elements
const codeEditor = document.getElementById('codeEditor');
const visualizeBtn = document.getElementById('visualizeBtn');
const stepBtn = document.getElementById('stepBtn');
const loadExampleBtn = document.getElementById('loadExampleBtn');
const clearBtn = document.getElementById('clearBtn');
const visualizationCanvas = document.getElementById('visualizationCanvas');
const controlPanel = document.getElementById('controlPanel');
const stepIndicators = document.getElementById('stepIndicators');
const stepList = document.getElementById('stepList');
const currentStepSpan = document.getElementById('currentStep');
const totalStepsSpan = document.getElementById('totalSteps');
const progressBar = document.getElementById('progressBar');
const stepDescription = document.getElementById('stepDescription');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const pauseBtn = document.getElementById('pauseBtn');
const prevStepBtn = document.getElementById('prevStepBtn');
const nextStepBtn = document.getElementById('nextStepBtn');
const exampleModal = document.getElementById('exampleModal');
const closeModalBtn = document.getElementById('closeModalBtn');

// Event listeners
visualizeBtn.addEventListener('click', startVisualization);
stepBtn.addEventListener('click', stepThroughVisualization);
loadExampleBtn.addEventListener('click', showExampleModal);
clearBtn.addEventListener('click', clearCode);
closeModalBtn.addEventListener('click', hideExampleModal);
speedSlider.addEventListener('input', updateSpeed);
pauseBtn.addEventListener('click', togglePause);
prevStepBtn.addEventListener('click', previousStep);
nextStepBtn.addEventListener('click', nextStep);

// Example buttons
document.addEventListener('click', function(e) {
    if (e.target.closest('.example-btn')) {
        loadExample(e.target.closest('.example-btn').dataset.type);
    }
});

// Functions
function startVisualization() {
    const code = codeEditor.value.trim();
    if (!code) {
        showNotification('Please enter some C code to visualize', 'error');
        return;
    }
    
    visualizeBtn.disabled = true;
    visualizeBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
    
    // Send code to backend
    fetch('/visualize/parse_and_visualize/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ code: code })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            currentVisualization = data.visualization;
            displayVisualization(data.visualization);
            updateAlgorithmInfo(data.parsed_data);
            showNotification('Visualization generated successfully!', 'success');
        } else {
            showNotification(data.error || 'Failed to generate visualization', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('An error occurred while processing your code', 'error');
    })
    .finally(() => {
        visualizeBtn.disabled = false;
        visualizeBtn.innerHTML = '<i class="fas fa-play mr-2"></i>Visualize Algorithm';
    });
}

function displayVisualization(visualization) {
    currentStep = 0;
    totalSteps = visualization.steps.length;
    isPlaying = false;
    
    // Update UI
    currentStepSpan.textContent = currentStep;
    totalStepsSpan.textContent = totalSteps;
    progressBar.style.width = '0%';
    
    // Show control panel
    controlPanel.classList.remove('hidden');
    stepIndicators.classList.remove('hidden');
    
    // Generate step indicators
    generateStepIndicators();
    
    // Display first step
    displayStep(visualization.steps[0]);
    
    // Start animation
    startAnimation();
}

function displayStep(step) {
    if (!step) return;
    
    // Update step description
    stepDescription.innerHTML = `
        <div class="font-semibold text-blue-900">${step.title}</div>
        <div class="text-sm text-blue-700 mt-1">${step.description}</div>
    `;
    
    // Clear canvas
    visualizationCanvas.innerHTML = '';
    
    // Create visualization based on step type
    if (step.array) {
        createArrayVisualization(step);
    } else if (step.nodes) {
        createLinkedListVisualization(step);
    } else if (step.stack) {
        createStackVisualization(step);
    } else if (step.queue) {
        createQueueVisualization(step);
    } else if (step.hash_map) {
        createHashMapVisualization(step);
    } else {
        createGeneralVisualization(step);
    }
}

function createArrayVisualization(step) {
    const container = document.createElement('div');
    container.className = 'flex flex-wrap justify-center items-center gap-4 p-8';
    
    step.array.forEach((value, index) => {
        const element = document.createElement('div');
        element.className = 'array-element bg-white border-2 border-gray-300 rounded-lg px-4 py-3 text-center min-w-[60px] font-bold text-lg';
        element.textContent = value;
        
        // Add highlighting based on step
        if (step.highlighted && step.highlighted.includes(index)) {
            element.classList.add('highlighted');
        }
        
        if (step.elements && step.elements[0]) {
            const elementData = step.elements[0];
            if (elementData.type === 'comparison' && elementData.indices.includes(index)) {
                element.classList.add('comparing');
            } else if (elementData.type === 'swap' && elementData.indices.includes(index)) {
                element.classList.add('swapping');
            }
        }
        
        container.appendChild(element);
    });
    
    visualizationCanvas.appendChild(container);
}

function createLinkedListVisualization(step) {
    const container = document.createElement('div');
    container.className = 'flex flex-wrap justify-center items-center gap-2 p-8';
    
    step.nodes.forEach((node, index) => {
        const nodeElement = document.createElement('div');
        nodeElement.className = 'bg-white border-2 border-gray-300 rounded-lg px-4 py-3 text-center min-w-[80px] font-bold text-lg';
        nodeElement.textContent = node.value;
        
        if (index === step.highlighted) {
            nodeElement.classList.add('highlighted');
        }
        
        container.appendChild(nodeElement);
        
        // Add arrow if not last node
        if (index < step.nodes.length - 1) {
            const arrow = document.createElement('div');
            arrow.className = 'text-gray-400 text-2xl';
            arrow.innerHTML = '→';
            container.appendChild(arrow);
        }
    });
    
    visualizationCanvas.appendChild(container);
}

function createStackVisualization(step) {
    const container = document.createElement('div');
    container.className = 'flex flex-col items-center p-8';
    
    const stackContainer = document.createElement('div');
    stackContainer.className = 'border-2 border-gray-300 rounded-lg p-4 min-h-[200px] flex flex-col-reverse justify-end';
    
    step.stack.forEach((value, index) => {
        const element = document.createElement('div');
        element.className = 'bg-white border border-gray-300 rounded px-3 py-2 text-center mb-1 font-medium';
        element.textContent = value;
        
        if (index === step.highlighted) {
            element.classList.add('highlighted');
        }
        
        stackContainer.appendChild(element);
    });
    
    container.appendChild(stackContainer);
    
    const label = document.createElement('div');
    label.className = 'text-gray-600 font-medium mt-2';
    label.textContent = 'Stack (LIFO)';
    container.appendChild(label);
    
    visualizationCanvas.appendChild(container);
}

function createQueueVisualization(step) {
    const container = document.createElement('div');
    container.className = 'flex flex-col items-center p-8';
    
    const queueContainer = document.createElement('div');
    queueContainer.className = 'border-2 border-gray-300 rounded-lg p-4 min-h-[200px] flex flex-col justify-end';
    
    step.queue.forEach((value, index) => {
        const element = document.createElement('div');
        element.className = 'bg-white border border-gray-300 rounded px-3 py-2 text-center mb-1 font-medium';
        element.textContent = value;
        
        if (index === step.highlighted) {
            element.classList.add('highlighted');
        }
        
        queueContainer.appendChild(element);
    });
    
    container.appendChild(queueContainer);
    
    const label = document.createElement('div');
    label.className = 'text-gray-600 font-medium mt-2';
    label.textContent = 'Queue (FIFO)';
    container.appendChild(label);
    
    visualizationCanvas.appendChild(container);
}

function createHashMapVisualization(step) {
    const container = document.createElement('div');
    container.className = 'grid grid-cols-2 gap-4 p-8';
    
    Object.entries(step.hash_map).forEach(([key, value]) => {
        const entry = document.createElement('div');
        entry.className = 'bg-white border border-gray-300 rounded-lg p-3 text-center';
        
        const keyElement = document.createElement('div');
        keyElement.className = 'font-bold text-blue-600';
        keyElement.textContent = key;
        
        const valueElement = document.createElement('div');
        valueElement.className = 'text-gray-700';
        valueElement.textContent = value;
        
        entry.appendChild(keyElement);
        entry.appendChild(valueElement);
        container.appendChild(entry);
    });
    
    visualizationCanvas.appendChild(container);
}

function createGeneralVisualization(step) {
    const container = document.createElement('div');
    container.className = 'flex flex-col items-center justify-center p-8 text-center';
    
    step.elements.forEach(element => {
        const elementDiv = document.createElement('div');
        elementDiv.className = 'bg-white border border-gray-300 rounded-lg p-4 mb-4 max-w-md';
        
        if (element.type === 'text') {
            elementDiv.innerHTML = `<div class="font-medium" style="color: ${element.color}">${element.content}</div>`;
        } else if (element.type === 'complexity') {
            elementDiv.innerHTML = `
                <div class="font-bold text-lg mb-2">Complexity Analysis</div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="text-center">
                        <div class="text-sm text-gray-600">Time Complexity</div>
                        <div class="font-bold text-blue-600">${element.time}</div>
                    </div>
                    <div class="text-center">
                        <div class="text-sm text-gray-600">Space Complexity</div>
                        <div class="font-bold text-green-600">${element.space}</div>
                    </div>
                </div>
            `;
        }
        
        container.appendChild(elementDiv);
    });
    
    visualizationCanvas.appendChild(container);
}

function generateStepIndicators() {
    stepList.innerHTML = '';
    
    for (let i = 0; i < totalSteps; i++) {
        const stepIndicator = document.createElement('button');
        stepIndicator.className = 'step-indicator bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm font-medium hover:bg-gray-300 transition-colors';
        stepIndicator.textContent = i + 1;
        stepIndicator.addEventListener('click', () => goToStep(i));
        stepList.appendChild(stepIndicator);
    }
}

function startAnimation() {
    if (animationInterval) {
        clearInterval(animationInterval);
    }
    
    isPlaying = true;
    pauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    
    animationInterval = setInterval(() => {
        if (currentStep < totalSteps - 1) {
            nextStep();
        } else {
            stopAnimation();
        }
    }, 1000 / animationSpeed);
}

function stopAnimation() {
    isPlaying = false;
    pauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }
}

function togglePause() {
    if (isPlaying) {
        stopAnimation();
    } else {
        startAnimation();
    }
}

function nextStep() {
    if (currentStep < totalSteps - 1) {
        currentStep++;
        updateStepDisplay();
        displayStep(currentVisualization.steps[currentStep]);
    }
}

function previousStep() {
    if (currentStep > 0) {
        currentStep--;
        updateStepDisplay();
        displayStep(currentVisualization.steps[currentStep]);
    }
}

function goToStep(stepIndex) {
    if (stepIndex >= 0 && stepIndex < totalSteps) {
        currentStep = stepIndex;
        updateStepDisplay();
        displayStep(currentVisualization.steps[currentStep]);
    }
}

function updateStepDisplay() {
    currentStepSpan.textContent = currentStep + 1;
    progressBar.style.width = `${((currentStep + 1) / totalSteps) * 100}%`;
    
    // Update step indicators
    const indicators = stepList.querySelectorAll('.step-indicator');
    indicators.forEach((indicator, index) => {
        indicator.classList.remove('active');
        if (index === currentStep) {
            indicator.classList.add('active');
        }
    });
}

function updateSpeed() {
    animationSpeed = parseFloat(speedSlider.value);
    speedValue.textContent = animationSpeed + 'x';
    
    if (isPlaying) {
        stopAnimation();
        startAnimation();
    }
}

function stepThroughVisualization() {
    if (!currentVisualization) {
        showNotification('Please generate a visualization first', 'error');
        return;
    }
    
    if (currentStep < totalSteps - 1) {
        nextStep();
    } else {
        currentStep = 0;
        updateStepDisplay();
        displayStep(currentVisualization.steps[currentStep]);
    }
}

function showExampleModal() {
    exampleModal.classList.remove('hidden');
}

function hideExampleModal() {
    exampleModal.classList.add('hidden');
}

function loadExample(type) {
    // Load example code based on type
    const examples = {
        'bubble_sort': `#include <stdio.h>

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
}`,
        'quick_sort': `#include <stdio.h>

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
}`,
        'binary_search': `#include <stdio.h>

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
}`,
        'linked_list': `#include <stdio.h>
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

int main() {
    struct Node* head = NULL;
    insertAtEnd(&head, 6);
    insertAtEnd(&head, 7);
    insertAtEnd(&head, 1);
    insertAtEnd(&head, 4);
    return 0;
}`,
        'stack': `#include <stdio.h>
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

void push(struct Stack* stack, int item) {
    stack->array[++stack->top] = item;
}

int pop(struct Stack* stack) {
    return stack->array[stack->top--];
}

int main() {
    struct Stack* stack = createStack(100);
    push(stack, 10);
    push(stack, 20);
    push(stack, 30);
    pop(stack);
    return 0;
}`
    };
    
    if (examples[type]) {
        codeEditor.value = examples[type];
        hideExampleModal();
        showNotification(`Loaded ${type.replace('_', ' ')} example`, 'success');
    }
}

function clearCode() {
    codeEditor.value = '';
    visualizationCanvas.innerHTML = `
        <div class="text-center text-gray-500">
            <i class="fas fa-play-circle text-4xl mb-4"></i>
            <p class="text-lg font-medium">Click "Visualize Algorithm" to start</p>
            <p class="text-sm">Your algorithm animation will appear here</p>
        </div>
    `;
    controlPanel.classList.add('hidden');
    stepIndicators.classList.add('hidden');
    currentVisualization = null;
    showNotification('Code editor cleared', 'info');
}

function updateAlgorithmInfo(parsedData) {
    document.getElementById('algorithmType').textContent = parsedData.algorithm_type.replace('_', ' ').toUpperCase();
    document.getElementById('timeComplexity').textContent = parsedData.complexity.time;
    document.getElementById('spaceComplexity').textContent = parsedData.complexity.space;
    document.getElementById('functionsFound').textContent = parsedData.functions.length;
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}