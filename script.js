// --- Task Data Structure ---
class Task {
    constructor(name, description, dueDate, priority, isCompleted = false) {
        this.id = Date.now().toString(); // Unique ID for each task
        this.name = name;
        this.description = description;
        this.dueDate = dueDate; // Stored as a Date object
        this.priority = priority;
        this.isCompleted = isCompleted;
    }
}

// --- Task Manager (Handles data and persistence) ---
class TaskManager {
    constructor() {
        this.tasks = this.loadTasks();
    }

    addTask(name, description, dueDateStr, priority) {
        try {
            const dueDate = new Date(dueDateStr);
            if (isNaN(dueDate.getTime())) {
                throw new Error("Invalid date format.");
            }
            const newTask = new Task(name, description, dueDate, priority);
            this.tasks.push(newTask);
            this.sortTasks();
            this.saveTasks();
            return true;
        } catch (error) {
            console.error("Error adding task:", error);
            // In a real application, you'd show a more user-friendly error message in the UI
            alert("Error: Invalid date/time. Please ensure it's a valid date and time.");
            return false;
        }
    }

    removeTask(taskId) {
        const initialLength = this.tasks.length;
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        if (this.tasks.length < initialLength) {
            this.saveTasks();
            return true;
        }
        return false;
    }

    toggleCompleteTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.isCompleted = !task.isCompleted;
            this.sortTasks();
            this.saveTasks();
            return true;
        }
        return false;
    }

    getTaskById(taskId) {
        return this.tasks.find(t => t.id === taskId);
    }

    sortTasks() {
        const priorityOrder = { "High": 1, "Medium": 2, "Low": 3 };
        this.tasks.sort((a, b) => {
            // Sort by completion status (incomplete first)
            if (a.isCompleted !== b.isCompleted) {
                return a.isCompleted ? 1 : -1;
            }
            // Then by priority
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            // Then by due date
            return a.dueDate.getTime() - b.dueDate.getTime();
        });
    }

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks.map(task => ({
            id: task.id,
            name: task.name,
            description: task.description,
            dueDate: task.dueDate.toISOString(), // Store as ISO string
            priority: task.priority,
            isCompleted: task.isCompleted
        }))));
    }

    loadTasks() {
        const tasksJson = localStorage.getItem('tasks');
        if (tasksJson) {
            try {
                return JSON.parse(tasksJson).map(data => {
                    const task = new Task(
                        data.name,
                        data.description,
                        new Date(data.dueDate), // Convert back to Date object
                        data.priority,
                        data.isCompleted
                    );
                    task.id = data.id || Date.now().toString(); // Ensure ID is loaded, or create new if old data lacks it
                    return task;
                });
            } catch (e) {
                console.error("Error loading tasks from local storage:", e);
                return [];
            }
        }
        return [];
    }
}

// --- UI Elements and Event Handling ---
const taskManager = new TaskManager();

const upcomingTasksList = document.getElementById('upcoming-tasks-list');
const completedTasksList = document.getElementById('completed-tasks-list');
const noUpcomingTasksMsg = document.getElementById('no-upcoming-tasks');
const noCompletedTasksMsg = document.getElementById('no-completed-tasks');
const progressText = document.getElementById('progress-text');

const addTaskBtn = document.getElementById('add-task-btn');
const addTaskModal = document.getElementById('add-task-modal');
const closeAddModalBtn = document.getElementById('close-add-modal');
const addTaskForm = document.getElementById('add-task-form');
const cancelAddBtn = document.getElementById('cancel-add-task');

const confirmModal = document.getElementById('confirm-modal');
const confirmMessage = document.getElementById('confirm-message');
const confirmActionBtn = document.getElementById('confirm-action');
const cancelConfirmBtn = document.getElementById('cancel-confirm');
let currentConfirmCallback = null; // Stores the function to call on confirmation

const detailName = document.getElementById('detail-name');
const detailPriority = document.getElementById('detail-priority');
const detailDue = document.getElementById('detail-due');
const detailDescription = document.getElementById('detail-description');
const toggleCompleteBtn = document.getElementById('toggle-complete-btn');
const deleteTaskBtn = document.getElementById('delete-task-btn');

let selectedTaskId = null; // Track the currently selected task ID

function updateTaskListUI() {
    upcomingTasksList.innerHTML = '';
    completedTasksList.innerHTML = '';
    let hasUpcoming = false;
    let hasCompleted = false;

    taskManager.sortTasks(); // Ensure tasks are sorted before rendering

    taskManager.tasks.forEach(task => {
        const taskItem = document.createElement('div');
        taskItem.className = 'task-item';
        taskItem.dataset.taskId = task.id; // Store task ID on the DOM element

        // Priority Bar
        const priorityBar = document.createElement('div');
        priorityBar.className = `priority-bar priority-${task.priority.toLowerCase()}`;
        taskItem.appendChild(priorityBar);

        // Checkbox for completion
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'status-checkbox';
        checkbox.checked = task.isCompleted;
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation(); // Prevent item selection when clicking checkbox
            taskManager.toggleCompleteTask(task.id);
            updateTaskListUI(); // Re-render to update status and position
            clearTaskDetails(); // Clear details if the status changes
        });
        taskItem.appendChild(checkbox);

        // Task Name
        const taskNameSpan = document.createElement('span');
        taskNameSpan.className = 'task-name';
        taskNameSpan.textContent = task.name;
        taskItem.appendChild(taskNameSpan);

        // Due Date
        const dueDateSpan = document.createElement('span');
        dueDateSpan.className = 'task-due-date';
        dueDateSpan.textContent = task.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        taskItem.appendChild(dueDateSpan);

        if (task.isCompleted) {
            taskItem.classList.add('completed');
            completedTasksList.appendChild(taskItem);
            hasCompleted = true;
        } else {
            upcomingTasksList.appendChild(taskItem);
            hasUpcoming = true;
        }

        taskItem.addEventListener('click', () => {
            // Remove selected class from previous item
            const currentSelected = document.querySelector('.task-item.selected');
            if (currentSelected) {
                currentSelected.classList.remove('selected');
            }
            taskItem.classList.add('selected');
            selectedTaskId = task.id;
            displayTaskDetails(task);
        });
    });

    noUpcomingTasksMsg.classList.toggle('hidden', hasUpcoming);
    noCompletedTasksMsg.classList.toggle('hidden', hasCompleted);
    updateProgressText();
}

function updateProgressText() {
    const completedCount = taskManager.tasks.filter(task => task.isCompleted).length;
    const totalCount = taskManager.tasks.length;
    progressText.innerHTML = `<b>${completedCount}</b> of <b>${totalCount}</b> tasks completed`;
}

function displayTaskDetails(task) {
    if (!task) {
        clearTaskDetails();
        return;
    }
    detailName.textContent = task.name;
    detailPriority.innerHTML = `<b>Priority:</b> <span class="font-bold">${task.priority}</span>`;
    detailDue.innerHTML = `<b>Due:</b> ${task.dueDate.toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })}`;
    detailDescription.innerHTML = `<i>${task.description || 'No description provided.'}</i>`;

    toggleCompleteBtn.textContent = task.isCompleted ? 'Mark as Incomplete' : 'Mark as Complete';
    toggleCompleteBtn.classList.remove('hidden');
    deleteTaskBtn.classList.remove('hidden');
}

function clearTaskDetails() {
    detailName.textContent = 'Select a task to view details';
    detailPriority.textContent = '';
    detailDue.textContent = '';
    detailDescription.textContent = '';
    toggleCompleteBtn.classList.add('hidden');
    deleteTaskBtn.classList.add('hidden');
    selectedTaskId = null;

    // Deselect any selected item in the lists
    const currentSelected = document.querySelector('.task-item.selected');
    if (currentSelected) {
        currentSelected.classList.remove('selected');
    }
}

// --- Modal Control Functions ---
function showModal(modalElement) {
    modalElement.style.display = 'flex';
}

function hideModal(modalElement) {
    modalElement.style.display = 'none';
}

function showConfirmModal(message, callback) {
    confirmMessage.textContent = message;
    currentConfirmCallback = callback;
    showModal(confirmModal);
}

// --- Event Listeners ---
addTaskBtn.addEventListener('click', () => {
    // Reset form fields before showing
    document.getElementById('task-name-input').value = '';
    document.getElementById('task-description-input').value = '';
    // Set default date to current date/time
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    document.getElementById('task-due-date-input').value = `${year}-${month}-${day}T${hours}:${minutes}`;
    document.getElementById('task-priority-input').value = 'Medium';
    showModal(addTaskModal);
});

closeAddModalBtn.addEventListener('click', () => hideModal(addTaskModal));
cancelAddBtn.addEventListener('click', () => hideModal(addTaskModal));

addTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('task-name-input').value.trim();
    const description = document.getElementById('task-description-input').value.trim();
    const dueDate = document.getElementById('task-due-date-input').value;
    const priority = document.getElementById('task-priority-input').value;

    if (name && dueDate) {
        if (taskManager.addTask(name, description, dueDate, priority)) {
            hideModal(addTaskModal);
            updateTaskListUI();
            clearTaskDetails(); // Clear details after adding new task
        }
    } else {
        alert("Task Name and Due Date are required!");
    }
});

toggleCompleteBtn.addEventListener('click', () => {
    if (selectedTaskId) {
        taskManager.toggleCompleteTask(selectedTaskId);
        updateTaskListUI();
        clearTaskDetails();
    }
});

deleteTaskBtn.addEventListener('click', () => {
    if (selectedTaskId) {
        showConfirmModal(`Are you sure you want to delete this task?`, () => {
            if (taskManager.removeTask(selectedTaskId)) {
                updateTaskListUI();
                clearTaskDetails();
            }
        });
    }
});

confirmActionBtn.addEventListener('click', () => {
    if (currentConfirmCallback) {
        currentConfirmCallback();
    }
    hideModal(confirmModal);
    currentConfirmCallback = null; // Clear callback
});

cancelConfirmBtn.addEventListener('click', () => {
    hideModal(confirmModal);
    currentConfirmCallback = null;
});

// Initial UI render on load
updateTaskListUI();
clearTaskDetails(); // Ensure details section is empty initially
