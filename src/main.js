import { supabase } from './supabaseClient.js'

/**
 * Kanban State Management with Supabase
 */

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
  inputDesc: document.getElementById('task-desc'),
  inputPriority: document.getElementById('task-priority'),
  inputDueDate: document.getElementById('task-due-date'),
  cancelBtn: document.getElementById('cancel-btn'),
  closeBtn: document.getElementById('close-modal'),
};

const addTaskBtn = document.getElementById('add-task-btn');

let currentEditingId = null;

// --- Supabase Functions ---
async function fetchTasks() {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    state.tasks = data.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      dueDate: task.due_date || '',
      createdAt: task.created_at,
    }));

    render();
  } catch (error) {
    console.error('Error fetching tasks:', error);
    alert('Erro ao carregar tarefas. Verifique sua conexão com o Supabase.');
  }
}

async function createTask(title, description, priority = 'medium', dueDate = '', status = 'todo') {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          title,
          description: description || null,
          status,
          priority,
          due_date: dueDate || null,
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Add to local state
    state.tasks.unshift({
      id: data.id,
      title: data.title,
      description: data.description || '',
      status: data.status,
      priority: data.priority,
      dueDate: data.due_date || '',
      createdAt: data.created_at,
    });

    render();
  } catch (error) {
    console.error('Error creating task:', error);
    alert('Erro ao criar tarefa.');
  }
}

async function updateTask(id, updates) {
  try {
    // Map frontend field names to database column names
    const dbUpdates = {};
    if ('title' in updates) dbUpdates.title = updates.title;
    if ('description' in updates) dbUpdates.description = updates.description || null;
    if ('status' in updates) dbUpdates.status = updates.status;
    if ('priority' in updates) dbUpdates.priority = updates.priority;
    if ('dueDate' in updates) dbUpdates.due_date = updates.dueDate || null;

    const { error } = await supabase
      .from('tasks')
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;

    // Update local state
    const task = state.tasks.find((t) => t.id === id);
    if (task) {
      Object.assign(task, updates);
      render();
    }
  } catch (error) {
    console.error('Error updating task:', error);
    alert('Erro ao atualizar tarefa.');
  }
}

async function deleteTask(id) {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Remove from local state
    state.tasks = state.tasks.filter((t) => t.id !== id);
    render();
  } catch (error) {
    console.error('Error deleting task:', error);
    alert('Erro ao excluir tarefa.');
  }
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
    const [y, m, d] = task.dueDate.split('-');
    const due = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
  deleteBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
      await deleteTask(task.id);
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
  setTimeout(() => (this.style.display = 'none'), 0);
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  this.style.display = 'block';
  draggedItem = null;
}

document.querySelectorAll('.column-content').forEach((col) => {
  col.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  col.addEventListener('dragenter', (e) => {
    e.preventDefault();
  });

  col.addEventListener('drop', handleDrop);
});

async function handleDrop(e) {
  e.preventDefault();
  if (!draggedItem) return;

  const newStatus = this.parentElement.dataset.status;
  const taskId = draggedItem.dataset.id;

  await updateTask(taskId, { status: newStatus });
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

modal.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = modal.inputTitle.value.trim();
  const description = modal.inputDesc.value.trim();
  const priority = modal.inputPriority.value;
  const dueDate = modal.inputDueDate.value;

  if (!title) return;

  if (currentEditingId) {
    await updateTask(currentEditingId, { title, description, priority, dueDate });
  } else {
    await createTask(title, description, priority, dueDate);
  }
  closeModal();
});

addTaskBtn.addEventListener('click', () => openModal());

// --- Init ---
fetchTasks();

// Optional: Subscribe to realtime changes
supabase
  .channel('tasks-channel')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
    fetchTasks(); // Refresh when data changes
  })
  .subscribe();
