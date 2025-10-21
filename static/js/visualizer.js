/**
 * C-IT Algorithm Visualizer - Refactored & Secure
 * 
 * This file contains the complete refactored JavaScript for the visualizer
 * with improved error handling, security, and modern best practices.
 */

// ===== GLOBAL STATE =====
let currentVisualization = null;
let currentStep = 0;
let totalSteps = 0;
let isPlaying = false;
let animationSpeed = 1;
let animationInterval = null;

// ===== DOM REFERENCES (Initialized after DOM ready) =====
let DOM = {};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('[Visualizer] Initializing application...');
    
    try {
        // Cache all DOM references
        DOM = {
            codeEditor: document.getElementById('codeEditor'),
            visualizeBtn: document.getElementById('visualizeBtn'),
            stepBtn: document.getElementById('stepBtn'),
            loadExampleBtn: document.getElementById('loadExampleBtn'),
            clearBtn: document.getElementById('clearBtn'),
            visualizationCanvas: document.getElementById('visualizationCanvas'),
            controlPanel: document.getElementById('controlPanel'),
            stepIndicators: document.getElementById('stepIndicators'),
            stepList: document.getElementById('stepList'),
            currentStepSpan: document.getElementById('currentStep'),
            totalStepsSpan: document.getElementById('totalSteps'),
            progressBar: document.getElementById('progressBar'),
            stepDescription: document.getElementById('stepDescription'),
            speedSlider: document.getElementById('speedSlider'),
            speedValue: document.getElementById('speedValue'),
            pauseBtn: document.getElementById('pauseBtn'),
            prevStepBtn: document.getElementById('prevStepBtn'),
            nextStepBtn: document.getElementById('nextStepBtn'),
            exampleModal: document.getElementById('exampleModal'),
            closeModalBtn: document.getElementById('closeModalBtn'),
            algorithmType: document.getElementById('algorithmType'),
            timeComplexity: document.getElementById('timeComplexity'),
            spaceComplexity: document.getElementById('spaceComplexity'),
            functionsFound: document.getElementById('functionsFound')
        };

        // Validate critical elements exist
        const requiredElements = ['codeEditor', 'visualizeBtn', 'visualizationCanvas'];
        const missingElements = requiredElements.filter(key => !DOM[key]);
        
        if (missingElements.length > 0) {
            console.error('[Visualizer] Missing required DOM elements:', missingElements);
            showNotification('Application initialization failed. Please refresh the page.', 'error');
            return;
        }

        // Attach event listeners
        attachEventListeners();
        
        // Initialize UI
        initializeUI();
        
        console.log('[Visualizer] Initialization complete!');
    } catch (error) {
        console.error('[Visualizer] Initialization error:', error);
        showNotification('Failed to initialize application. Please refresh the page.', 'error');
    }
});

// ===== EVENT LISTENER SETUP =====
function attachEventListeners() {
    // Attach listeners only to elements that exist
    if (DOM.visualizeBtn) DOM.visualizeBtn.addEventListener('click', startVisualization);
    if (DOM.stepBtn) DOM.stepBtn.addEventListener('click', stepThroughVisualization);
    if (DOM.loadExampleBtn) DOM.loadExampleBtn.addEventListener('click', showExampleModal);
    if (DOM.clearBtn) DOM.clearBtn.addEventListener('click', clearCode);
    if (DOM.closeModalBtn) DOM.closeModalBtn.addEventListener('click', hideExampleModal);
    if (DOM.speedSlider) DOM.speedSlider.addEventListener('input', updateSpeed);
    if (DOM.pauseBtn) DOM.pauseBtn.addEventListener('click', togglePause);
    if (DOM.prevStepBtn) DOM.prevStepBtn.addEventListener('click', previousStep);
    if (DOM.nextStepBtn) DOM.nextStepBtn.addEventListener('click', nextStep);
    
    // Run Code button for compiler integration
    const runCodeBtn = document.getElementById('runCodeBtn');
    if (runCodeBtn) runCodeBtn.addEventListener('click', executeCode);
    
    // Close output panel button
    const closeOutputBtn = document.getElementById('closeOutputBtn');
    if (closeOutputBtn) closeOutputBtn.addEventListener('click', closeExecutionOutput);

    // Example buttons - event delegation
    document.addEventListener('click', function(e) {
        if (e.target.closest('.example-btn')) {
            loadExample(e.target.closest('.example-btn').dataset.type);
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Tab key handling for code editor indentation
        if (e.key === 'Tab' && document.activeElement === DOM.codeEditor) {
            e.preventDefault();
            const start = DOM.codeEditor.selectionStart;
            const end = DOM.codeEditor.selectionEnd;
            const value = DOM.codeEditor.value;
            
            // Insert 4 spaces at cursor position
            DOM.codeEditor.value = value.substring(0, start) + '    ' + value.substring(end);
            
            // Move cursor after the inserted spaces
            DOM.codeEditor.selectionStart = DOM.codeEditor.selectionEnd = start + 4;
        }
        
        // Ctrl/Cmd + Enter to visualize
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            if (document.activeElement === DOM.codeEditor) {
                e.preventDefault();
                startVisualization();
            }
        }
        
        // Arrow keys for step navigation (when visualization is active)
        if (currentVisualization && !DOM.codeEditor.contains(document.activeElement)) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                previousStep();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                nextStep();
            } else if (e.key === ' ') {
                e.preventDefault();
                togglePause();
            }
        }
    });
}

// ===== UI INITIALIZATION =====
function initializeUI() {
    // Set initial speed value
    if (DOM.speedValue) {
        DOM.speedValue.textContent = animationSpeed + 'x';
    }
}

// ===== MAIN VISUALIZATION LOGIC =====
function startVisualization() {
    const code = DOM.codeEditor.value.trim();
    
    if (!code) {
        showNotification('Please enter some C code to visualize', 'error');
        return;
    }
    
    // Validate code length
    const MAX_CODE_LENGTH = 10000;
    if (code.length > MAX_CODE_LENGTH) {
        showNotification(`Code exceeds maximum length of ${MAX_CODE_LENGTH} characters`, 'error');
        return;
    }
    
    setLoadingState(true);
    
    // Send code to backend
    fetch('/visualize/parse_and_visualize/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ code: code })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
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
        console.error('[Visualizer] Error:', error);
        
        let errorMessage = 'An error occurred while processing your code';
        
        if (error instanceof TypeError && error.message.includes('fetch')) {
            errorMessage = 'Network error: Unable to connect to server. Please check your connection.';
        } else if (error.message) {
            errorMessage = `Error: ${error.message}`;
        }
        
        showNotification(errorMessage, 'error');
    })
    .finally(() => {
        setLoadingState(false);
    });
}

function setLoadingState(isLoading) {
    DOM.visualizeBtn.disabled = isLoading;
    DOM.codeEditor.disabled = isLoading;
    
    if (isLoading) {
        DOM.visualizeBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
        DOM.visualizeBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        DOM.visualizeBtn.innerHTML = '<i class="fas fa-play mr-2"></i>Visualize Algorithm';
        DOM.visualizeBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

function displayVisualization(visualization) {
    if (!visualization || !visualization.steps || visualization.steps.length === 0) {
        showNotification('No visualization steps generated', 'error');
        return;
    }
    
    currentStep = 0;
    totalSteps = visualization.steps.length;
    isPlaying = false;
    
    // Update UI (only if elements exist)
    if (DOM.currentStepSpan) DOM.currentStepSpan.textContent = currentStep + 1;
    if (DOM.totalStepsSpan) DOM.totalStepsSpan.textContent = totalSteps;
    if (DOM.progressBar) DOM.progressBar.style.width = '0%';
    
    // Show control panel (only if it exists)
    if (DOM.controlPanel) DOM.controlPanel.classList.remove('hidden');
    if (DOM.stepIndicators) {
        DOM.stepIndicators.classList.remove('hidden');
    }
    
    // Generate step indicators
    generateStepIndicators();
    
    // Display first step
    displayStep(visualization.steps[0]);
    
    // Start animation
    startAnimation();
}

function displayStep(step) {
    if (!step) return;
    
    // Update step description (XSS-safe)
    setStepDescription(step.title || 'Processing...', step.description || '');
    
    // Clear canvas
    DOM.visualizationCanvas.innerHTML = '';
    
    // Create visualization based on step type
    try {
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
        } else if (step.elements) {
            createGeneralVisualization(step);
        } else {
            // Default fallback
            createDefaultVisualization(step);
        }
    } catch (error) {
        console.error('[Visualizer] Error displaying step:', error);
        showNotification('Error displaying visualization step', 'error');
    }
}

function setStepDescription(title, description) {
    if (!DOM.stepDescription) return; // Skip if element doesn't exist
    
    DOM.stepDescription.innerHTML = '';
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'font-semibold text-blue-900';
    titleDiv.textContent = title; // textContent escapes HTML automatically
    
    const descDiv = document.createElement('div');
    descDiv.className = 'text-sm text-blue-700 mt-1';
    descDiv.textContent = description;
    
    DOM.stepDescription.appendChild(titleDiv);
    DOM.stepDescription.appendChild(descDiv);
}

// ===== VISUALIZATION CREATORS =====
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
            if (elementData.type === 'comparison' && elementData.indices && elementData.indices.includes(index)) {
                element.classList.add('comparing');
            } else if (elementData.type === 'swap' && elementData.indices && elementData.indices.includes(index)) {
                element.classList.add('swapping');
            }
        }
        
        container.appendChild(element);
    });
    
    DOM.visualizationCanvas.appendChild(container);
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
            arrow.textContent = '→';
            container.appendChild(arrow);
        }
    });
    
    DOM.visualizationCanvas.appendChild(container);
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
    
    DOM.visualizationCanvas.appendChild(container);
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
    
    DOM.visualizationCanvas.appendChild(container);
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
    
    DOM.visualizationCanvas.appendChild(container);
}

function createGeneralVisualization(step) {
    const container = document.createElement('div');
    container.className = 'flex flex-col items-center justify-center p-8 text-center';
    
    step.elements.forEach(element => {
        const elementDiv = document.createElement('div');
        elementDiv.className = 'bg-white border border-gray-300 rounded-lg p-4 mb-4 max-w-md';
        
        if (element.type === 'text') {
            const textDiv = document.createElement('div');
            textDiv.className = 'font-medium';
            if (element.color) {
                textDiv.style.color = element.color;
            }
            textDiv.textContent = element.content;
            elementDiv.appendChild(textDiv);
        } else if (element.type === 'complexity') {
            const titleDiv = document.createElement('div');
            titleDiv.className = 'font-bold text-lg mb-2';
            titleDiv.textContent = 'Complexity Analysis';
            elementDiv.appendChild(titleDiv);
            
            const gridDiv = document.createElement('div');
            gridDiv.className = 'grid grid-cols-2 gap-4';
            
            const timeDiv = document.createElement('div');
            timeDiv.className = 'text-center';
            timeDiv.innerHTML = `
                <div class="text-sm text-gray-600">Time Complexity</div>
                <div class="font-bold text-blue-600">${escapeHtml(element.time || 'N/A')}</div>
            `;
            
            const spaceDiv = document.createElement('div');
            spaceDiv.className = 'text-center';
            spaceDiv.innerHTML = `
                <div class="text-sm text-gray-600">Space Complexity</div>
                <div class="font-bold text-green-600">${escapeHtml(element.space || 'N/A')}</div>
            `;
            
            gridDiv.appendChild(timeDiv);
            gridDiv.appendChild(spaceDiv);
            elementDiv.appendChild(gridDiv);
        }
        
        container.appendChild(elementDiv);
    });
    
    DOM.visualizationCanvas.appendChild(container);
}

function createDefaultVisualization(step) {
    const container = document.createElement('div');
    container.className = 'flex flex-col items-center justify-center p-8 text-center text-gray-600';
    
    const icon = document.createElement('i');
    icon.className = 'fas fa-code text-4xl mb-4';
    container.appendChild(icon);
    
    const message = document.createElement('p');
    message.textContent = 'Visualization not available for this step';
    container.appendChild(message);
    
    DOM.visualizationCanvas.appendChild(container);
}

// ===== STEP CONTROL FUNCTIONS =====
function generateStepIndicators() {
    DOM.stepList.innerHTML = '';
    
    for (let i = 0; i < totalSteps; i++) {
        const stepIndicator = document.createElement('button');
        stepIndicator.className = 'step-indicator bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm font-medium hover:bg-gray-300 transition-colors';
        stepIndicator.textContent = i + 1;
        stepIndicator.addEventListener('click', () => goToStep(i));
        DOM.stepList.appendChild(stepIndicator);
    }
}

function startAnimation() {
    if (animationInterval) {
        clearInterval(animationInterval);
    }
    
    isPlaying = true;
    DOM.pauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    
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
    DOM.pauseBtn.innerHTML = '<i class="fas fa-play"></i>';
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
    if (DOM.currentStepSpan) DOM.currentStepSpan.textContent = currentStep + 1;
    if (DOM.progressBar) DOM.progressBar.style.width = `${((currentStep + 1) / totalSteps) * 100}%`;
    
    // Update step indicators (only if element exists)
    if (DOM.stepList) {
        const indicators = DOM.stepList.querySelectorAll('.step-indicator');
        indicators.forEach((indicator, index) => {
            indicator.classList.remove('active');
            if (index === currentStep) {
                indicator.classList.add('active');
            }
        });
    }
}

function updateSpeed() {
    if (DOM.speedSlider) {
        animationSpeed = parseFloat(DOM.speedSlider.value);
    }
    if (DOM.speedValue) {
        DOM.speedValue.textContent = animationSpeed + 'x';
    }
    
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

// ===== EXAMPLE MODAL FUNCTIONS =====
function showExampleModal() {
    DOM.exampleModal.classList.remove('hidden');
}

function hideExampleModal() {
    DOM.exampleModal.classList.add('hidden');
}

function loadExample(type) {
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
}`,
        'merge_sort': `#include <stdio.h>
#include <stdlib.h>

void merge(int arr[], int l, int m, int r) {
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
}

int main() {
    int arr[] = {12, 11, 13, 5, 6, 7};
    int n = sizeof(arr) / sizeof(arr[0]);
    mergeSort(arr, 0, n - 1);
    return 0;
}`,
        'linear_search': `#include <stdio.h>

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
}`
    };
    
    if (examples[type]) {
        DOM.codeEditor.value = examples[type];
        hideExampleModal();
        showNotification(`Loaded ${type.replace(/_/g, ' ')} example`, 'success');
    } else {
        showNotification(`Example "${type}" not found`, 'error');
    }
}

// ===== UTILITY FUNCTIONS =====
function clearCode() {
    DOM.codeEditor.value = '';
    DOM.visualizationCanvas.innerHTML = `
        <div class="text-center text-gray-500">
            <i class="fas fa-play-circle text-4xl mb-4"></i>
            <p class="text-lg font-medium">Click "Visualize Algorithm" to start</p>
            <p class="text-sm">Your algorithm animation will appear here</p>
        </div>
    `;
    DOM.controlPanel.classList.add('hidden');
    if (DOM.stepIndicators) {
        DOM.stepIndicators.classList.add('hidden');
    }
    currentVisualization = null;
    currentStep = 0;
    totalSteps = 0;
    showNotification('Code editor cleared', 'info');
}

function updateAlgorithmInfo(parsedData) {
    if (!parsedData) return;
    
    if (DOM.algorithmType && parsedData.algorithm_type) {
        DOM.algorithmType.textContent = parsedData.algorithm_type.replace(/_/g, ' ').toUpperCase();
    }
    
    if (DOM.timeComplexity && parsedData.complexity && parsedData.complexity.time) {
        DOM.timeComplexity.textContent = parsedData.complexity.time;
    }
    
    if (DOM.spaceComplexity && parsedData.complexity && parsedData.complexity.space) {
        DOM.spaceComplexity.textContent = parsedData.complexity.space;
    }
    
    if (DOM.functionsFound && parsedData.functions) {
        DOM.functionsFound.textContent = parsedData.functions.length;
    }
}

function showNotification(message, type = 'info') {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.app-notification');
    existingNotifications.forEach(n => n.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `app-notification fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm transition-all transform ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        type === 'warning' ? 'bg-yellow-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    
    const iconClass = 
        type === 'success' ? 'fa-check-circle' :
        type === 'error' ? 'fa-exclamation-circle' :
        type === 'warning' ? 'fa-exclamation-triangle' :
        'fa-info-circle';
    
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${iconClass} mr-2"></i>
            <span>${escapeHtml(message)}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.style.opacity = '1', 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function getCSRFToken() {
    // Try cookie first
    let token = getCookie('csrftoken');
    
    // Fallback to meta tag
    if (!token) {
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        token = metaTag ? metaTag.getAttribute('content') : '';
    }
    
    // Fallback to Django form token
    if (!token) {
        const formInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
        token = formInput ? formInput.value : '';
    }
    
    // Note: CSRF not needed for Vercel serverless functions
    if (!token) {
        console.log('[Visualizer] CSRF token not found (not needed for serverless deployment)');
    }
    
    return token;
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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== CODE EXECUTION (PISTON API INTEGRATION) =====
async function executeCode() {
    const code = DOM.codeEditor ? DOM.codeEditor.value : '';
    
    if (!code.trim()) {
        showNotification('Please enter C code to execute', 'warning');
        return;
    }
    
    console.log('[Execute] Compiling and running code...');
    
    // Show loading state
    const runBtn = document.getElementById('runCodeBtn');
    if (runBtn) {
        runBtn.disabled = true;
        runBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Running...';
    }
    
    try {
        const response = await fetch('/api/compile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('[Execute] Result:', result);
        
        displayExecutionResult(result);
        
    } catch (error) {
        console.error('[Execute] Error:', error);
        showNotification('Failed to execute code. Please try again.', 'error');
        displayExecutionError(error.message);
    } finally {
        // Restore button state
        if (runBtn) {
            runBtn.disabled = false;
            runBtn.innerHTML = '<i class="fas fa-terminal mr-2"></i>Run Code';
        }
    }
}

function displayExecutionResult(result) {
    const outputPanel = document.getElementById('executionOutput');
    const outputContent = document.getElementById('outputContent');
    
    if (!outputPanel || !outputContent) {
        console.warn('[Execute] Output elements not found');
        return;
    }
    
    // Show the output panel
    outputPanel.classList.remove('hidden');
    
    // Clear previous content
    outputContent.innerHTML = '';
    
    // Build output HTML
    let html = '';
    
    // Success or error header
    if (result.success) {
        html += `
            <div class="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
                <div class="flex items-center">
                    <i class="fas fa-check-circle text-green-500 text-xl mr-3"></i>
                    <div>
                        <p class="font-bold text-green-800">✅ Compilation & Execution Successful</p>
                        <p class="text-sm text-green-700">Language: ${escapeHtml(result.language)} ${escapeHtml(result.version)}</p>
                    </div>
                </div>
            </div>
        `;
    } else {
        html += `
            <div class="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <div class="flex items-center">
                    <i class="fas fa-times-circle text-red-500 text-xl mr-3"></i>
                    <div>
                        <p class="font-bold text-red-800">❌ Compilation or Execution Failed</p>
                        <p class="text-sm text-red-700">Please check your code for errors</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Compilation output (if any)
    if (result.compile_output && result.compile_output.trim()) {
        html += `
            <div class="mb-4">
                <h3 class="font-semibold text-gray-800 mb-2 flex items-center">
                    <i class="fas fa-cog text-blue-600 mr-2"></i>Compilation Output
                </h3>
                <div class="bg-gray-900 text-red-400 p-4 rounded-lg overflow-x-auto">
                    <pre class="text-sm whitespace-pre-wrap">${escapeHtml(result.compile_output)}</pre>
                </div>
            </div>
        `;
    }
    
    // Standard output
    if (result.stdout) {
        html += `
            <div class="mb-4">
                <h3 class="font-semibold text-gray-800 mb-2 flex items-center">
                    <i class="fas fa-terminal text-green-600 mr-2"></i>Standard Output (stdout)
                </h3>
                <div class="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                    <pre class="text-sm whitespace-pre-wrap">${escapeHtml(result.stdout)}</pre>
                </div>
            </div>
        `;
    } else if (result.success) {
        html += `
            <div class="mb-4">
                <h3 class="font-semibold text-gray-800 mb-2 flex items-center">
                    <i class="fas fa-terminal text-green-600 mr-2"></i>Standard Output (stdout)
                </h3>
                <div class="bg-gray-100 text-gray-500 p-4 rounded-lg italic">
                    (No output)
                </div>
            </div>
        `;
    }
    
    // Standard error
    if (result.stderr && result.stderr.trim()) {
        html += `
            <div class="mb-4">
                <h3 class="font-semibold text-gray-800 mb-2 flex items-center">
                    <i class="fas fa-exclamation-triangle text-yellow-600 mr-2"></i>Standard Error (stderr)
                </h3>
                <div class="bg-gray-900 text-yellow-400 p-4 rounded-lg overflow-x-auto">
                    <pre class="text-sm whitespace-pre-wrap">${escapeHtml(result.stderr)}</pre>
                </div>
            </div>
        `;
    }
    
    // Exit code
    if (result.exit_code !== null && result.exit_code !== undefined) {
        const exitColor = result.exit_code === 0 ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100';
        html += `
            <div class="text-sm text-gray-600">
                <span class="font-semibold">Exit Code:</span> 
                <span class="${exitColor} px-2 py-1 rounded">${result.exit_code}</span>
            </div>
        `;
    }
    
    outputContent.innerHTML = html;
    
    // Scroll to output
    outputPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function displayExecutionError(errorMessage) {
    const outputPanel = document.getElementById('executionOutput');
    const outputContent = document.getElementById('outputContent');
    
    if (!outputPanel || !outputContent) return;
    
    outputPanel.classList.remove('hidden');
    outputContent.innerHTML = `
        <div class="bg-red-50 border-l-4 border-red-500 p-4">
            <div class="flex items-center">
                <i class="fas fa-exclamation-circle text-red-500 text-xl mr-3"></i>
                <div>
                    <p class="font-bold text-red-800">Execution Error</p>
                    <p class="text-sm text-red-700">${escapeHtml(errorMessage)}</p>
                    <p class="text-xs text-red-600 mt-2">This may be a network error or server issue. Please try again.</p>
                </div>
            </div>
        </div>
    `;
    
    outputPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeExecutionOutput() {
    const outputPanel = document.getElementById('executionOutput');
    if (outputPanel) {
        outputPanel.classList.add('hidden');
    }
}

// ===== ERROR HANDLING =====
window.addEventListener('error', function(event) {
    console.error('[Visualizer] Global error:', event.error);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('[Visualizer] Unhandled promise rejection:', event.reason);
});
