/**
 * Simple Kanban State Management
 */
const STORAGE_KEY = 'kanban-data';

const state = {
  tasks: [],
};

// --- DOM Elements ---
const columns = {
  todo: document.getElementById('column-todo'),
  inprogress: document.getElementById('column-inprogress'),
  done: document.getElementById('column-done'),
};

const counts = {
  todo: document.getElementById('count-todo'),
  inprogress: document.getElementById('count-inprogress'),
  done: document.getElementById('count-done'),
};

const modal = {
  element: document.getElementById('task-modal'),
  title: document.getElementById('modal-title'),
  form: document.getElementById('task-form'),
  inputTitle: document.getElementById('task-title'),
  inputTitle: document.getElementById('task-title'),
  inputDesc: document.getElementById('task-desc'),
  inputPriority: document.getElementById('task-priority'),
  inputDueDate: document.getElementById('task-due-date'),
  cancelBtn: document.getElementById('cancel-btn'),
  closeBtn: document.getElementById('close-modal'),
};

const addTaskBtn = document.getElementById('add-task-btn');

let currentEditingId = null;

// --- Persistence ---
function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      state.tasks = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse state', e);
      state.tasks = [];
    }
  }
  render();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
  render();
}

// --- Logic ---
function createTask(title, description, priority = 'medium', dueDate = '', status = 'todo') {
  const task = {
    id: crypto.randomUUID(),
    title,
    description,
    priority,
    dueDate,
    status,
    createdAt: new Date().toISOString(),
  };
  state.tasks.push(task);
  saveState();
}

function updateTask(id, updates) {
  const task = state.tasks.find((t) => t.id === id);
  if (task) {
    Object.assign(task, updates);
    saveState();
  }
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((t) => t.id !== id);
  saveState();
}

function getTasksByStatus(status) {
  return state.tasks.filter((t) => t.status === status);
}

// --- Rendering ---
function render() {
  // Clear columns
  Object.values(columns).forEach((col) => (col.innerHTML = ''));

  // Render tasks
  state.tasks.forEach((task) => {
    const card = createTaskElement(task);
    if (columns[task.status]) {
      columns[task.status].appendChild(card);
    }
  });

  // Update counts
  Object.keys(counts).forEach((status) => {
    const count = state.tasks.filter((t) => t.status === status).length;
    counts[status].textContent = count;
  });
}

function createTaskElement(task) {
  const el = document.createElement('div');
  el.className = 'task-card';
  el.draggable = true;
  el.dataset.id = task.id;

  const date = new Date(task.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });

  const priorityClass = `badge-${task.priority || 'medium'}`;
  const priorityLabel = { low: 'Baixa', medium: 'Média', high: 'Alta' }[task.priority || 'medium'];

  let dateHtml = `<div class="task-date">Criado em: ${date}</div>`;
  if (task.dueDate) {
    const dueDateObj = new Date(task.dueDate);
    // Simple comparison for overdue (ignoring time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Be careful with timezone, input date is usually yyyy-mm-dd
    // We treat the input date as local end of day or similar? defaulting to UTC?
    // Let's stick to local date string comparison for simplicity or simple Date object
    // Adding T00:00 to ensure local parsing, or just splitting string
    const [y, m, d] = task.dueDate.split('-');
    const due = new Date(y, m - 1, d);

    const isOverdue = due < today && task.status !== 'done';
    const dueString = due.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

    const overdueClass = isOverdue ? 'task-date-overdue' : '';
    const icon = isOverdue ? '⚠️ ' : '📅 ';

    dateHtml += `
      <div class="task-date-container ${overdueClass}" title="${isOverdue ? 'Atrasado!' : 'Prazo de entrega'}">
        ${icon} ${dueString}
      </div>
    `;
  }

  el.innerHTML = `
    <div class="task-card-header">
      <h3>${escapeHtml(task.title)}</h3>
      <div class="task-actions">
        <button class="btn-icon edit-btn" title="Editar">✎</button>
        <button class="btn-icon delete-btn" title="Excluir">✕</button>
      </div>
    </div>
    ${task.description ? `<p style="font-size: 0.875rem; color: #4b5563; margin-bottom: 0.5rem;">${escapeHtml(task.description)}</p>` : ''}
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 0.5rem;">
      <div style="display:flex; flex-direction:column; align-items:flex-start;">
        <span class="badge ${priorityClass}" style="margin-top:0; margin-bottom: 4px;">${priorityLabel}</span>
      </div>
      <div style="text-align: right;">
        ${dateHtml}
      </div>
    </div>
  `;

  // Events
  el.addEventListener('dragstart', handleDragStart);
  el.addEventListener('dragend', handleDragEnd);

  const editBtn = el.querySelector('.edit-btn');
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openModal(task);
  });

  const deleteBtn = el.querySelector('.delete-btn');
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
      deleteTask(task.id);
    }
  });

  return el;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// --- Drag & Drop ---
let draggedItem = null;

function handleDragStart(e) {
  draggedItem = this;
  this.classList.add('dragging');
  // Hack to hide the element but keep it draggable ghost
  setTimeout(() => (this.style.display = 'none'), 0);
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  this.style.display = 'block';
  draggedItem = null;
  // Save state is redundant if drop didn't happen, but safe here.
  // Actually drop handler handles data update.
}

document.querySelectorAll('.column-content').forEach((col) => {
  col.addEventListener('dragover', (e) => {
    e.preventDefault(); // Allow drop
    // Basic visual cue could go here
  });

  col.addEventListener('dragenter', (e) => {
    e.preventDefault();
  });

  col.addEventListener('drop', handleDrop);
});

function handleDrop(e) {
  e.preventDefault();
  if (!draggedItem) return;

  const newStatus = this.parentElement.dataset.status;
  const taskId = draggedItem.dataset.id;

  // Update state
  updateTask(taskId, { status: newStatus });

  // Re-render handled by updateTask -> saveState -> render
  // No need to manually append child here since render does it full refresh.
  // For production large apps, optimized DOM updates would be better.
}

// --- Modal & Form ---
function openModal(taskValue = null) {
  modal.element.classList.remove('hidden');
  if (taskValue) {
    currentEditingId = taskValue.id;
    modal.title.textContent = 'Editar Tarefa';
    modal.inputTitle.value = taskValue.title;
    modal.inputDesc.value = taskValue.description || '';
    modal.inputPriority.value = taskValue.priority || 'medium';
    modal.inputDueDate.value = taskValue.dueDate || '';
  } else {
    currentEditingId = null;
    modal.title.textContent = 'Nova Tarefa';
    modal.form.reset();
    modal.inputPriority.value = 'medium';
    modal.inputDueDate.value = '';
  }
  modal.inputTitle.focus();
}

function closeModal() {
  modal.element.classList.add('hidden');
  currentEditingId = null;
}

modal.closeBtn.addEventListener('click', closeModal);
modal.cancelBtn.addEventListener('click', closeModal);
modal.element.addEventListener('click', (e) => {
  if (e.target === modal.element) closeModal();
});

modal.form.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = modal.inputTitle.value.trim();
  const description = modal.inputDesc.value.trim();
  const priority = modal.inputPriority.value;
  const dueDate = modal.inputDueDate.value;

  if (!title) return;

  if (currentEditingId) {
    updateTask(currentEditingId, { title, description, priority, dueDate });
  } else {
    createTask(title, description, priority, dueDate);
  }
  closeModal();
});

addTaskBtn.addEventListener('click', () => openModal());

// --- Init ---
loadState();
