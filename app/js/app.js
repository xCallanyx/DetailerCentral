const App = {
    currentProjectId: null,
    currentCalendarDate: new Date(),
    currentNotesCategory: 'all',
    activeTimerTaskId: null,
    timerInterval: null,
    timerSeconds: 0,
    currentTimesheetWeek: null,

    init() {
        // Set initial timesheet week to current week's Sunday
        const now = new Date();
        this.currentTimesheetWeek = new Date(now);
        this.currentTimesheetWeek.setDate(now.getDate() - now.getDay());
        this.currentTimesheetWeek.setHours(0, 0, 0, 0);

        ProjectsModule.init(this);
        SubmittalsPlannerModule.init(this);
        this.bindNavigation();
        this.bindModals();
        this.bindForms();
        this.bindTabs();
        this.bindTaskEvents();
        this.bindNoteEvents();
        this.bindSearchEvents();
        this.bindQuickCapture();
        this.bindTimesheetEvents();
        this.bindSettingsEvents();
        this.renderDashboard();
        this.renderProjectList();
        this.renderTasks();
        this.renderNotes();
        this.renderTimesheet();
        this.renderSettings();

        // Initialize backup system (non-blocking)
        if (typeof BackupManager !== 'undefined') {
            BackupManager.init();
        }
    },

    // Navigation
    bindNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.showView(view);

                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });

        document.getElementById('back-to-projects').addEventListener('click', () => {
            this.showView('projects');
            document.querySelectorAll('.nav-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.view === 'projects');
            });
        });

    },

    showView(viewName) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`${viewName}-view`).classList.add('active');
    },

    // Tabs
    bindTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;

                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');

                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById(`${tab}-tab`).classList.add('active');
            });
        });
    },

    // Modals
    bindModals() {
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
            });
        });

        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                }
            });
        });

        document.getElementById('add-project-btn').addEventListener('click', () => {
            document.getElementById('project-form').reset();
            document.getElementById('project-id').value = '';
            document.getElementById('project-modal-title').textContent = 'New Project';
            document.getElementById('project-modal').classList.add('active');
        });

        document.getElementById('add-scope-btn').addEventListener('click', () => {
            document.getElementById('scope-form').reset();
            document.getElementById('scope-id').value = '';
            document.getElementById('scope-modal').classList.add('active');
        });

        document.getElementById('add-rfi-btn').addEventListener('click', () => {
            document.getElementById('rfi-form').reset();
            document.getElementById('rfi-id').value = '';
            document.getElementById('rfi-modal').classList.add('active');
        });

    },

    // Forms
    bindForms() {
        // Project Form
        document.getElementById('project-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const project = {
                id: document.getElementById('project-id').value || null,
                name: document.getElementById('project-name').value,
                number: document.getElementById('project-number').value,
                client: document.getElementById('project-client').value
            };
            Store.saveProject(project);
            document.getElementById('project-modal').classList.remove('active');
            this.renderProjectList();
            if (this.currentProjectId) {
                this.renderProjectDetail(this.currentProjectId);
            }
        });

        // Scope Form
        document.getElementById('scope-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const scope = {
                id: document.getElementById('scope-id').value || null,
                name: document.getElementById('scope-name').value,
                estimatedLbs: parseFloat(document.getElementById('scope-est-lbs').value) || 0,
                hoursBudget: parseFloat(document.getElementById('scope-hours-budget').value)
            };
            Store.saveScope(this.currentProjectId, scope);
            document.getElementById('scope-modal').classList.remove('active');
            this.renderProjectDetail(this.currentProjectId);
        });

        // RFI Form
        document.getElementById('rfi-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const rfi = {
                id: document.getElementById('rfi-id').value || null,
                number: document.getElementById('rfi-number').value,
                subject: document.getElementById('rfi-subject').value,
                status: document.getElementById('rfi-status').value
            };
            Store.saveRFI(this.currentProjectId, rfi);
            document.getElementById('rfi-modal').classList.remove('active');
            this.renderProjectDetail(this.currentProjectId);
        });

        // Change Order Form
        document.getElementById('co-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const rfiId = document.getElementById('co-rfi-id').value;
            const coData = {
                description: document.getElementById('co-description').value,
                weightImpact: document.getElementById('co-weight-impact').value,
                hoursImpact: document.getElementById('co-hours-impact').value,
                status: document.getElementById('co-status').value
            };
            Store.createChangeOrderFromRFI(this.currentProjectId, rfiId, coData);
            document.getElementById('co-modal').classList.remove('active');
            this.renderProjectDetail(this.currentProjectId);
        });
    },

    // Dashboard
    renderDashboard() {
        this.renderCalendar();
        this.renderAlerts();
        this.renderTodaysFocus();
    },

    renderCalendar() {
        const grid = document.getElementById('calendar-grid');
        const title = document.getElementById('calendar-title');
        const date = this.currentCalendarDate;

        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
        title.textContent = `${months[date.getMonth()]} ${date.getFullYear()}`;

        // Get submittals with target dates this month
        const submittals = Store.getAllSubmittals();
        const targetDates = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        submittals.forEach(sub => {
            if (sub.targetSubmitDate) {
                const key = sub.targetSubmitDate;
                if (!targetDates[key]) {
                    targetDates[key] = { count: 0, overdue: false, hasMRD: false };
                }
                targetDates[key].count++;
                const targetDate = new Date(sub.targetSubmitDate);
                if (targetDate < today && sub.status !== 'Released' && sub.reviewOutcome !== 'Approved' && sub.reviewOutcome !== 'Approved as Noted') {
                    targetDates[key].overdue = true;
                }
            }
        });

        // Mark MRD dates on calendar
        const state = Store.getState();
        (state.materialRequests || []).forEach(mr => {
            if (mr.dateRequested) {
                const key = mr.dateRequested;
                if (!targetDates[key]) {
                    targetDates[key] = { count: 0, overdue: false, hasMRD: false };
                }
                targetDates[key].hasMRD = true;
                targetDates[key].count++;
            }
        });

        // Build calendar
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        const startDay = firstDay.getDay();
        const daysInMonth = lastDay.getDate();

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        let html = days.map(d => `<div class="calendar-header">${d}</div>`).join('');

        // Previous month days
        const prevMonth = new Date(date.getFullYear(), date.getMonth(), 0);
        for (let i = startDay - 1; i >= 0; i--) {
            html += `<div class="calendar-day other-month">${prevMonth.getDate() - i}</div>`;
        }

        // Current month days
        const todayStr = today.toISOString().split('T')[0];
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const hasEvent = targetDates[dateStr];

            let classes = 'calendar-day';
            if (isToday) classes += ' today';
            if (hasEvent) {
                classes += ' has-event';
                if (hasEvent.overdue) classes += ' has-overdue';
            }

            html += `<div class="${classes}">${day}</div>`;
        }

        // Next month days
        const remaining = 42 - (startDay + daysInMonth);
        for (let i = 1; i <= remaining; i++) {
            html += `<div class="calendar-day other-month">${i}</div>`;
        }

        grid.innerHTML = html;

        // Calendar navigation
        document.getElementById('prev-month').onclick = () => {
            this.currentCalendarDate = new Date(date.getFullYear(), date.getMonth() - 1, 1);
            this.renderCalendar();
        };
        document.getElementById('next-month').onclick = () => {
            this.currentCalendarDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);
            this.renderCalendar();
        };
    },

    renderAlerts() {
        const container = document.getElementById('alerts-list');
        const submittals = Store.getAllSubmittals();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const alerts = [];

        submittals.forEach(sub => {
            // Overdue
            if (sub.targetSubmitDate && sub.status !== 'Released' && sub.reviewOutcome !== 'Approved' && sub.reviewOutcome !== 'Approved as Noted') {
                const targetDate = new Date(sub.targetSubmitDate);
                if (targetDate < today) {
                    alerts.push({
                        type: 'overdue',
                        title: sub.title,
                        subtitle: `${sub.projectName} - ${sub.scopeName}`,
                        message: `Overdue since ${sub.targetSubmitDate}`
                    });
                }
            }

        });

        // MRD urgency alerts
        const state = Store.getState();
        const atRisk = Selectors.getAtRiskMaterialRequests(state);
        atRisk.forEach(risk => {
            const project = (state.projects || []).find(p => p.id === risk.projectId);
            const projectName = project ? project.name : 'Unknown';
            const blocking = risk.blockingSubmittals.map(s => s.title).join(', ');
            alerts.push({
                type: risk.urgency === 'CRITICAL' ? 'overdue' : 'warning',
                title: `MRD ${risk.urgency}: ${risk.dateRequested}`,
                subtitle: projectName,
                message: `Fab must start by ${risk.fabStartDate} (${risk.daysUntilFabStart}d). Blocked by: ${blocking}`
            });
        });

        if (alerts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">&#10003;</div>
                    <p>No alerts at this time</p>
                </div>
            `;
            return;
        }

        container.innerHTML = alerts.map(alert => `
            <div class="alert-item ${alert.type}">
                <span class="alert-icon">${alert.type === 'overdue' ? '&#9888;' : alert.type === 'warning' ? '&#9201;' : '&#10071;'}</span>
                <div class="alert-content">
                    <div class="alert-title">${alert.title}</div>
                    <div class="alert-subtitle">${alert.subtitle} - ${alert.message}</div>
                </div>
            </div>
        `).join('');
    },

    // Project List

    // Project rendering delegated to ProjectsModule
    renderProjectList() { ProjectsModule.renderProjectList(); },
    renderProjectDetail(projectId) { ProjectsModule.renderProjectDetail(projectId); },


    // ============================================
    // TASKS
    // ============================================
    bindTaskEvents() {
        // Add task button
        document.getElementById('add-task-btn').addEventListener('click', () => {
            this.openTaskModal();
        });

        // Task form
        document.getElementById('task-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const task = {
                id: document.getElementById('task-id').value || null,
                title: document.getElementById('task-title').value,
                priority: document.getElementById('task-priority').value,
                targetDate: document.getElementById('task-target-date').value,
                projectId: document.getElementById('task-project').value || null,
                scopeId: document.getElementById('task-scope').value || null
            };
            Store.saveTask(task);
            document.getElementById('task-modal').classList.remove('active');
            this.renderTasks();
            this.renderTodaysFocus();
        });

        // Delete task button
        document.getElementById('delete-task-btn').addEventListener('click', () => {
            const taskId = document.getElementById('task-id').value;
            if (taskId && confirm('Delete this task?')) {
                Store.deleteTask(taskId);
                document.getElementById('task-modal').classList.remove('active');
                this.renderTasks();
                this.renderTodaysFocus();
            }
        });

        // Project dropdown change
        document.getElementById('task-project').addEventListener('change', (e) => {
            const projectId = e.target.value;
            const scopeSelect = document.getElementById('task-scope');
            scopeSelect.innerHTML = '<option value="">-- No Scope --</option>';
            if (projectId) {
                const project = Store.getProject(projectId);
                if (project) {
                    project.scopes.forEach(s => {
                        scopeSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
                    });
                    scopeSelect.disabled = false;
                }
            } else {
                scopeSelect.disabled = true;
            }
        });

        // Cleanup button
        document.getElementById('cleanup-tasks-btn').addEventListener('click', () => {
            Store.archiveCompletedTasks();
            this.renderTasks();
        });

        // Weekly review button
        document.getElementById('weekly-review-btn').addEventListener('click', () => {
            this.showView('weekly-review');
            this.renderWeeklyReview();
        });

        // Back to tasks
        document.getElementById('back-to-tasks').addEventListener('click', () => {
            this.showView('tasks');
            document.querySelectorAll('.nav-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.view === 'tasks');
            });
        });

        // Save reflection
        document.getElementById('save-reflection-btn').addEventListener('click', () => {
            const weekKey = this.getCurrentWeekKey();
            const content = document.getElementById('weekly-reflection').value;
            Store.saveWeeklyReflection(weekKey, content);
            alert('Reflection saved!');
        });
    },

    openTaskModal(task = null) {
        const form = document.getElementById('task-form');
        form.reset();
        document.getElementById('task-id').value = '';
        document.getElementById('delete-task-btn').style.display = 'none';
        document.getElementById('task-modal-title').textContent = 'New Task';

        // Populate projects dropdown
        const projectSelect = document.getElementById('task-project');
        projectSelect.innerHTML = '<option value="">-- No Project --</option>';
        Store.getProjects().forEach(p => {
            projectSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        });
        document.getElementById('task-scope').disabled = true;

        if (task) {
            document.getElementById('task-id').value = task.id;
            document.getElementById('task-title').value = task.title;
            document.getElementById('task-priority').value = task.priority;
            document.getElementById('task-target-date').value = task.targetDate || '';
            document.getElementById('task-project').value = task.projectId || '';
            document.getElementById('delete-task-btn').style.display = 'block';
            document.getElementById('task-modal-title').textContent = 'Edit Task';

            // Trigger scope dropdown population
            if (task.projectId) {
                document.getElementById('task-project').dispatchEvent(new Event('change'));
                setTimeout(() => {
                    document.getElementById('task-scope').value = task.scopeId || '';
                }, 50);
            }
        }

        document.getElementById('task-modal').classList.add('active');
    },

    renderTasks() {
        const tasks = Store.getTasks().filter(t => t.status !== 'Archived');
        const activeTasks = tasks.filter(t => t.status === 'Active').sort((a, b) => a.sortOrder - b.sortOrder);
        const completedTasks = tasks.filter(t => t.status === 'Done');

        this.renderTaskList('active-tasks-list', activeTasks, true);
        this.renderTaskList('completed-tasks-list', completedTasks, false);
    },

    renderTaskList(containerId, tasks, draggable) {
        const container = document.getElementById(containerId);

        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 2rem;">
                    <p style="color: var(--text-muted);">No tasks here</p>
                </div>
            `;
            return;
        }

        container.innerHTML = tasks.map(task => {
            const project = task.projectId ? Store.getProject(task.projectId) : null;
            const timeFormatted = RenderHelpers.formatTime(task.timeSpent || 0);
            const isRunning = this.activeTimerTaskId === task.id;

            return `
                <div class="task-item ${task.status === 'Done' ? 'completed' : ''} ${task.isFocus ? 'focus-active' : ''}"
                     data-task-id="${task.id}" ${draggable ? 'draggable="true"' : ''}>
                    <div class="task-checkbox ${task.status === 'Done' ? 'checked' : ''}" data-task-id="${task.id}"></div>
                    <div class="task-content">
                        <div class="task-title">${task.title}</div>
                        <div class="task-meta">
                            <span class="priority-badge priority-${task.priority.toLowerCase()}">${task.priority}</span>
                            ${task.targetDate ? `<span>Due: ${task.targetDate}</span>` : ''}
                            ${project ? `<span>${project.name}</span>` : ''}
                        </div>
                    </div>
                    <div class="task-actions">
                        <span class="task-timer ${isRunning ? 'running' : ''}">${timeFormatted}</span>
                        <button class="timer-btn ${isRunning ? 'playing' : ''}" data-task-id="${task.id}" title="Start/Stop Timer">
                            ${isRunning ? '&#10074;&#10074;' : '&#9654;'}
                        </button>
                        <button class="timer-btn focus-btn ${task.isFocus ? 'active' : ''}" data-task-id="${task.id}" title="Set Focus">
                            &#9733;
                        </button>
                        <button class="btn btn-sm btn-secondary edit-task-btn" data-task-id="${task.id}">Edit</button>
                    </div>
                </div>
            `;
        }).join('');

        // Bind events
        this.bindTaskItemEvents(container, draggable);
    },

    bindTaskItemEvents(container, draggable) {
        // Checkbox toggle
        container.querySelectorAll('.task-checkbox').forEach(cb => {
            cb.addEventListener('click', (e) => {
                e.stopPropagation();
                Store.completeTask(cb.dataset.taskId);
                this.renderTasks();
                this.renderTodaysFocus();
            });
        });

        // Timer buttons
        container.querySelectorAll('.timer-btn:not(.focus-btn)').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleTimer(btn.dataset.taskId);
            });
        });

        // Focus buttons
        container.querySelectorAll('.focus-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const task = Store.getTask(btn.dataset.taskId);
                if (task.isFocus) {
                    Store.clearFocus();
                } else {
                    Store.toggleTaskFocus(btn.dataset.taskId);
                }
                this.renderTasks();
                this.renderTodaysFocus();
            });
        });

        // Edit buttons
        container.querySelectorAll('.edit-task-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const task = Store.getTask(btn.dataset.taskId);
                this.openTaskModal(task);
            });
        });

        // Drag and drop
        if (draggable) {
            container.querySelectorAll('.task-item').forEach(item => {
                item.addEventListener('dragstart', (e) => {
                    item.classList.add('dragging');
                    e.dataTransfer.setData('text/plain', item.dataset.taskId);
                });

                item.addEventListener('dragend', () => {
                    item.classList.remove('dragging');
                    document.querySelectorAll('.task-item').forEach(i => i.classList.remove('drag-over'));
                });

                item.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    const dragging = container.querySelector('.dragging');
                    if (dragging !== item) {
                        item.classList.add('drag-over');
                    }
                });

                item.addEventListener('dragleave', () => {
                    item.classList.remove('drag-over');
                });

                item.addEventListener('drop', (e) => {
                    e.preventDefault();
                    item.classList.remove('drag-over');
                    const draggedId = e.dataTransfer.getData('text/plain');
                    const targetId = item.dataset.taskId;
                    if (draggedId !== targetId) {
                        this.reorderTasks(draggedId, targetId);
                    }
                });
            });
        }
    },

    reorderTasks(draggedId, targetId) {
        const tasks = Store.getTasks().filter(t => t.status === 'Active').sort((a, b) => a.sortOrder - b.sortOrder);
        const draggedIndex = tasks.findIndex(t => t.id === draggedId);
        const targetIndex = tasks.findIndex(t => t.id === targetId);

        const [dragged] = tasks.splice(draggedIndex, 1);
        tasks.splice(targetIndex, 0, dragged);

        Store.updateTaskOrder(tasks.map(t => t.id));
        this.renderTasks();
    },

    toggleTimer(taskId) {
        if (this.activeTimerTaskId === taskId) {
            // Stop timer
            clearInterval(this.timerInterval);
            Store.addTimeToTask(taskId, this.timerSeconds);
            this.activeTimerTaskId = null;
            this.timerSeconds = 0;
            this.timerInterval = null;
        } else {
            // Stop any existing timer first
            if (this.activeTimerTaskId) {
                Store.addTimeToTask(this.activeTimerTaskId, this.timerSeconds);
                clearInterval(this.timerInterval);
            }
            // Start new timer
            this.activeTimerTaskId = taskId;
            this.timerSeconds = 0;
            this.timerInterval = setInterval(() => {
                this.timerSeconds++;
                this.updateTimerDisplay();
            }, 1000);
        }
        this.renderTasks();
    },

    updateTimerDisplay() {
        if (!this.activeTimerTaskId) return;
        const task = Store.getTask(this.activeTimerTaskId);
        if (!task) return;

        const totalSeconds = (task.timeSpent || 0) + this.timerSeconds;
        const display = RenderHelpers.formatTime(totalSeconds);

        document.querySelectorAll(`.task-item[data-task-id="${this.activeTimerTaskId}"] .task-timer`).forEach(el => {
            el.textContent = display;
        });
    },

    getCurrentWeekKey() {
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        return start.toISOString().split('T')[0];
    },

    renderWeeklyReview() {
        const completedTasks = Store.getWeeklyCompletedTasks();
        const totalTime = completedTasks.reduce((sum, t) => sum + (t.timeSpent || 0), 0);

        // Stats
        document.getElementById('weekly-stats').innerHTML = `
            <div class="weekly-stat">
                <div class="weekly-stat-value">${completedTasks.length}</div>
                <div class="weekly-stat-label">Tasks Completed</div>
            </div>
            <div class="weekly-stat">
                <div class="weekly-stat-value">${RenderHelpers.formatTime(totalTime)}</div>
                <div class="weekly-stat-label">Time Tracked</div>
            </div>
            <div class="weekly-stat">
                <div class="weekly-stat-value">${completedTasks.filter(t => t.priority === 'High').length}</div>
                <div class="weekly-stat-label">High Priority</div>
            </div>
            <div class="weekly-stat">
                <div class="weekly-stat-value">${completedTasks.filter(t => t.projectId).length}</div>
                <div class="weekly-stat-label">Project Tasks</div>
            </div>
        `;

        // Completed list
        const container = document.getElementById('weekly-completed-list');
        if (completedTasks.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); padding: 1rem;">No tasks completed this week</p>';
        } else {
            container.innerHTML = completedTasks.map(t => `
                <div style="padding: 0.5rem 0; border-bottom: 1px solid var(--border);">
                    <span class="priority-badge priority-${t.priority.toLowerCase()}" style="margin-right: 0.5rem;">${t.priority}</span>
                    ${t.title}
                    <span style="float: right; color: var(--text-muted);">${RenderHelpers.formatTime(t.timeSpent || 0)}</span>
                </div>
            `).join('');
        }

        // Load reflection
        const weekKey = this.getCurrentWeekKey();
        document.getElementById('weekly-reflection').value = Store.getWeeklyReflection(weekKey);
    },

    // ============================================
    // NOTES
    // ============================================
    bindNoteEvents() {
        // Add note button
        document.getElementById('add-note-btn').addEventListener('click', () => {
            this.openNoteModal();
        });

        // Note form
        document.getElementById('note-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const tagsInput = document.getElementById('note-tags').value;
            const note = {
                id: document.getElementById('note-id').value || null,
                title: document.getElementById('note-title').value,
                type: document.getElementById('note-type').value,
                content: document.getElementById('note-content').value,
                tags: tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [],
                pinned: document.getElementById('note-pinned').checked
            };
            Store.saveNote(note);
            document.getElementById('note-modal').classList.remove('active');
            this.renderNotes();
        });

        // Delete note button
        document.getElementById('delete-note-btn').addEventListener('click', () => {
            const noteId = document.getElementById('note-id').value;
            if (noteId && confirm('Delete this note?')) {
                Store.deleteNote(noteId);
                document.getElementById('note-modal').classList.remove('active');
                this.renderNotes();
            }
        });

        // Category filter
        document.querySelectorAll('.notes-category').forEach(cat => {
            cat.addEventListener('click', () => {
                document.querySelectorAll('.notes-category').forEach(c => c.classList.remove('active'));
                cat.classList.add('active');
                this.currentNotesCategory = cat.dataset.category;
                this.renderNotes();
            });
        });

        // Notes search
        document.getElementById('notes-search-input').addEventListener('input', (e) => {
            this.renderNotes(e.target.value);
        });

        // Quick note save
        document.getElementById('save-quick-note-btn').addEventListener('click', () => {
            const content = document.getElementById('quick-note-input').value.trim();
            if (content) {
                Store.saveNote({
                    title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
                    type: 'QuickNote',
                    content: content,
                    tags: [],
                    pinned: false
                });
                document.getElementById('quick-note-input').value = '';
                this.renderNotes();
            }
        });

        // Expand quick note button
        document.getElementById('expand-quick-note-btn').addEventListener('click', () => {
            const content = document.getElementById('quick-note-input').value;
            document.getElementById('expanded-quick-note-input').value = content;
            document.getElementById('quick-note-modal').classList.add('active');
        });

        // Save expanded quick note
        document.getElementById('save-expanded-quick-note-btn').addEventListener('click', () => {
            const content = document.getElementById('expanded-quick-note-input').value.trim();
            if (content) {
                Store.saveNote({
                    title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
                    type: 'QuickNote',
                    content: content,
                    tags: [],
                    pinned: false
                });
                document.getElementById('expanded-quick-note-input').value = '';
                document.getElementById('quick-note-input').value = '';
                document.getElementById('quick-note-modal').classList.remove('active');
                this.renderNotes();
            }
        });
    },

    openNoteModal(note = null) {
        const form = document.getElementById('note-form');
        form.reset();
        document.getElementById('note-id').value = '';
        document.getElementById('delete-note-btn').style.display = 'none';
        document.getElementById('note-modal-title').textContent = 'New Note';

        if (note) {
            document.getElementById('note-id').value = note.id;
            document.getElementById('note-title').value = note.title;
            document.getElementById('note-type').value = note.type;
            document.getElementById('note-content').value = note.content || '';
            document.getElementById('note-tags').value = (note.tags || []).join(', ');
            document.getElementById('note-pinned').checked = note.pinned;
            document.getElementById('delete-note-btn').style.display = 'block';
            document.getElementById('note-modal-title').textContent = 'Edit Note';
        }

        document.getElementById('note-modal').classList.add('active');
    },

    renderNotes(searchQuery = '') {
        let notes = Store.getNotes();

        // Update counts
        document.getElementById('count-all').textContent = notes.length;
        document.getElementById('count-quicknote').textContent = notes.filter(n => n.type === 'QuickNote').length;
        document.getElementById('count-log').textContent = notes.filter(n => n.type === 'Log').length;
        document.getElementById('count-deepdive').textContent = notes.filter(n => n.type === 'DeepDive').length;
        document.getElementById('count-pinned').textContent = notes.filter(n => n.pinned).length;

        // Filter by category
        if (this.currentNotesCategory !== 'all') {
            if (this.currentNotesCategory === 'pinned') {
                notes = notes.filter(n => n.pinned);
            } else {
                notes = notes.filter(n => n.type === this.currentNotesCategory);
            }
        }

        // Filter by search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            notes = notes.filter(n =>
                n.title.toLowerCase().includes(q) ||
                (n.content && n.content.toLowerCase().includes(q))
            );
        }

        // Sort: pinned first, then by date
        notes.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        const container = document.getElementById('notes-list');
        if (notes.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 2rem;">
                    <p style="color: var(--text-muted);">No notes found</p>
                </div>
            `;
            return;
        }

        container.innerHTML = notes.map(note => `
            <div class="note-card ${note.pinned ? 'pinned' : ''}" data-note-id="${note.id}">
                <div class="note-title">${note.pinned ? '&#9733; ' : ''}${note.title}</div>
                <div class="note-preview">${(note.content || '').substring(0, 100)}</div>
                <div class="note-footer">
                    <span class="note-type-badge ${note.type.toLowerCase()}">${note.type}</span>
                    <div class="note-tags">
                        ${(note.tags || []).slice(0, 3).map(t => `<span class="note-tag">${t}</span>`).join('')}
                    </div>
                    <span>${new Date(note.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');

        // Bind click to edit
        container.querySelectorAll('.note-card').forEach(card => {
            card.addEventListener('click', () => {
                const note = Store.getNote(card.dataset.noteId);
                this.openNoteModal(note);
            });
        });
    },

    // ============================================
    // SEARCH & QUICK CAPTURE
    // ============================================
    bindSearchEvents() {
        const input = document.getElementById('global-search-input');
        const results = document.getElementById('search-results');

        input.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query.length < 2) {
                results.style.display = 'none';
                return;
            }

            const searchResults = Store.search(query);
            if (searchResults.length === 0) {
                results.innerHTML = '<div class="search-result-item"><span style="color: var(--text-muted);">No results found</span></div>';
            } else {
                results.innerHTML = searchResults.map(r => `
                    <div class="search-result-item" data-type="${r.type}" data-id="${r.id}" data-project-id="${r.projectId || ''}">
                        <div class="search-result-type">${r.type}</div>
                        <div class="search-result-title">${r.title}</div>
                    </div>
                `).join('');
            }
            results.style.display = 'block';

            // Bind clicks
            results.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const type = item.dataset.type;
                    const id = item.dataset.id;
                    const projectId = item.dataset.projectId;

                    if (type === 'Project') {
                        this.renderProjectDetail(id);
                        this.showView('project-detail');
                    } else if (type === 'Task') {
                        this.showView('tasks');
                        document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'tasks'));
                    } else if (type === 'Note') {
                        this.showView('notes');
                        document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'notes'));
                    } else if (projectId) {
                        this.renderProjectDetail(projectId);
                        this.showView('project-detail');
                    }

                    results.style.display = 'none';
                    input.value = '';
                });
            });
        });

        input.addEventListener('blur', () => {
            setTimeout(() => results.style.display = 'none', 200);
        });
    },

    bindQuickCapture() {
        const btn = document.getElementById('quick-capture-btn');
        const menu = document.getElementById('quick-capture-menu');

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('active');
        });

        document.addEventListener('click', () => {
            menu.classList.remove('active');
        });

        menu.querySelectorAll('.quick-capture-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                if (action === 'task') {
                    this.openTaskModal();
                } else if (action === 'note') {
                    this.openNoteModal();
                }
                menu.classList.remove('active');
            });
        });
    },

    // ============================================
    // DASHBOARD - TODAY'S FOCUS
    // ============================================
    renderTodaysFocus() {
        const tasks = Store.getTasks()
            .filter(t => t.status === 'Active')
            .sort((a, b) => {
                // Focus first, then by priority, then by sortOrder
                if (a.isFocus && !b.isFocus) return -1;
                if (!a.isFocus && b.isFocus) return 1;
                const priorityOrder = { High: 0, Med: 1, Low: 2 };
                if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                }
                return a.sortOrder - b.sortOrder;
            })
            .slice(0, 3);

        const container = document.getElementById('todays-focus-list');

        if (tasks.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); padding: 0.5rem;">No active tasks. Add some tasks to get started!</p>';
            return;
        }

        container.innerHTML = tasks.map(task => `
            <div class="focus-task-mini ${task.isFocus ? 'focus-active' : ''}" style="${task.isFocus ? 'border: 1px solid var(--warning); background: rgba(245, 158, 11, 0.1);' : ''}">
                <span class="priority-badge priority-${task.priority.toLowerCase()}">${task.priority}</span>
                <span style="flex: 1; font-weight: 500;">${task.isFocus ? '&#9733; ' : ''}${task.title}</span>
                <span style="color: var(--text-muted); font-size: 0.8rem;">${RenderHelpers.formatTime(task.timeSpent || 0)}</span>
            </div>
        `).join('');
    },

    // ============================================
    // TIMESHEET
    // ============================================
    bindTimesheetEvents() {
        document.getElementById('prev-week-btn').addEventListener('click', () => {
            this.currentTimesheetWeek.setDate(this.currentTimesheetWeek.getDate() - 7);
            this.renderTimesheet();
        });

        document.getElementById('next-week-btn').addEventListener('click', () => {
            this.currentTimesheetWeek.setDate(this.currentTimesheetWeek.getDate() + 7);
            this.renderTimesheet();
        });
    },

    renderTimesheet() {
        const weekStart = new Date(this.currentTimesheetWeek);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        // Format week title
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        const title = `Week of ${weekStart.toLocaleDateString('en-US', options)}`;
        document.getElementById('timesheet-week-title').textContent = title;

        // Get timesheet data
        const data = Store.getTimesheetData(weekStart);
        const projects = Object.values(data);

        // Calculate totals
        let totalHours = 0;
        const dayTotals = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };

        projects.forEach(p => {
            totalHours += p.total;
            Object.keys(p.days).forEach(day => {
                dayTotals[day] += p.days[day];
            });
        });

        // Render summary
        document.getElementById('timesheet-summary').innerHTML = `
            <div class="timesheet-summary-card">
                <div class="timesheet-summary-value">${totalHours.toFixed(1)}</div>
                <div class="timesheet-summary-label">Total Hours</div>
            </div>
            <div class="timesheet-summary-card">
                <div class="timesheet-summary-value">${projects.length}</div>
                <div class="timesheet-summary-label">Projects Worked</div>
            </div>
            <div class="timesheet-summary-card">
                <div class="timesheet-summary-value">${projects.reduce((sum, p) => sum + p.tasks.length, 0)}</div>
                <div class="timesheet-summary-label">Tasks Completed</div>
            </div>
        `;

        // Build day headers with dates
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayHeaders = days.map((day, i) => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            return `<th class="day-header">${day}<br><span style="font-weight: 400; font-size: 0.7rem;">${d.getMonth() + 1}/${d.getDate()}</span></th>`;
        }).join('');

        // Render grid
        const grid = document.getElementById('timesheet-grid');

        if (projects.length === 0) {
            grid.innerHTML = `
                <thead>
                    <tr>
                        <th class="project-header">Project</th>
                        ${dayHeaders}
                        <th class="day-header">Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                            No time tracked this week
                        </td>
                    </tr>
                </tbody>
            `;
        } else {
            grid.innerHTML = `
                <thead>
                    <tr>
                        <th class="project-header">Project</th>
                        ${dayHeaders}
                        <th class="day-header">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${projects.map(p => `
                        <tr>
                            <td class="project-name">${p.name}</td>
                            ${days.map(day => `
                                <td class="${p.days[day] > 0 ? 'has-hours' : ''}">${p.days[day] > 0 ? p.days[day].toFixed(1) : '-'}</td>
                            `).join('')}
                            <td class="has-hours">${p.total.toFixed(1)}</td>
                        </tr>
                    `).join('')}
                    <tr class="total-row">
                        <td class="project-name">TOTAL</td>
                        ${days.map(day => `
                            <td>${dayTotals[day] > 0 ? dayTotals[day].toFixed(1) : '-'}</td>
                        `).join('')}
                        <td>${totalHours.toFixed(1)}</td>
                    </tr>
                </tbody>
            `;
        }

        // Render task log
        const allTasks = projects.flatMap(p => p.tasks).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
        const taskLog = document.getElementById('timesheet-task-log');

        if (allTasks.length === 0) {
            taskLog.innerHTML = '<p style="color: var(--text-muted); padding: 1rem;">No tasks completed this week</p>';
        } else {
            taskLog.innerHTML = allTasks.map(task => {
                const project = task.projectId ? Store.getProject(task.projectId) : null;
                const completedDate = new Date(task.completedAt);
                return `
                    <div style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border);">
                        <div>
                            <span class="priority-badge priority-${task.priority.toLowerCase()}" style="margin-right: 0.5rem;">${task.priority}</span>
                            <strong>${task.title}</strong>
                            ${project ? `<span style="color: var(--text-muted); margin-left: 0.5rem;">- ${project.name}</span>` : ''}
                        </div>
                        <div style="text-align: right; color: var(--text-muted); font-size: 0.85rem;">
                            <div>${RenderHelpers.formatTime(task.timeSpent || 0)}</div>
                            <div>${completedDate.toLocaleDateString()}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    },

    // ============================================
    // SETTINGS
    // ============================================
    bindSettingsEvents() {
        // Export
        document.getElementById('export-data-btn').addEventListener('click', () => {
            const filename = Store.exportData();
            alert(`Data exported successfully!\nFile: ${filename}`);
        });

        // Import
        document.getElementById('import-data-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!confirm('This will replace ALL your current data. Are you sure you want to import?')) {
                e.target.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const success = Store.importData(event.target.result);
                if (success) {
                    alert('Data imported successfully! Refreshing...');
                    window.location.reload();
                } else {
                    alert('Import failed! The file may be corrupted or in the wrong format.');
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        });

        // Clear
        document.getElementById('clear-data-btn').addEventListener('click', () => {
            if (confirm('Are you absolutely sure? This will permanently delete ALL data!')) {
                if (confirm('This is your last chance! Type "DELETE" in the next prompt to confirm.')) {
                    const input = prompt('Type DELETE to confirm:');
                    if (input === 'DELETE') {
                        Store.clearAllData();
                        alert('All data cleared. Refreshing...');
                        window.location.reload();
                    } else {
                        alert('Deletion cancelled.');
                    }
                }
            }
        });

        // === Auto Backup Events ===
        if (typeof BackupManager !== 'undefined') {
            const settings = BackupManager.getSettings();

            // Restore UI from saved settings
            document.getElementById('auto-backup-toggle').checked = settings.enabled;
            document.getElementById('backup-frequency').value = String(settings.frequencyMinutes);
            document.getElementById('backup-retention').value = String(settings.maxSnapshots);

            // Choose folder
            document.getElementById('choose-backup-folder-btn').addEventListener('click', async () => {
                const handle = await BackupManager.fileBackup.chooseFolder();
                if (handle) {
                    BackupManager.updateStatusUI();
                }
            });

            // Enable toggle
            document.getElementById('auto-backup-toggle').addEventListener('change', (e) => {
                const s = BackupManager.getSettings();
                s.enabled = e.target.checked;
                BackupManager.saveSettings(s);
                BackupManager.updateStatusUI();
            });

            // Frequency
            document.getElementById('backup-frequency').addEventListener('change', (e) => {
                const s = BackupManager.getSettings();
                s.frequencyMinutes = parseInt(e.target.value, 10);
                BackupManager.saveSettings(s);
            });

            // Retention
            document.getElementById('backup-retention').addEventListener('change', (e) => {
                const s = BackupManager.getSettings();
                s.maxSnapshots = parseInt(e.target.value, 10);
                BackupManager.saveSettings(s);
            });

            // Backup Now
            document.getElementById('backup-now-btn').addEventListener('click', () => {
                BackupManager.forceBackup();
            });

            // Forget Folder
            document.getElementById('clear-backup-folder-btn').addEventListener('click', async () => {
                if (confirm('Remove the backup folder binding? Existing backup files will not be deleted.')) {
                    await BackupManager.fileBackup.clearDirHandle();
                    const s = BackupManager.getSettings();
                    s.enabled = false;
                    BackupManager.saveSettings(s);
                    document.getElementById('auto-backup-toggle').checked = false;
                    BackupManager.updateStatusUI();
                }
            });
        }
    },

    renderSettings() {
        const stats = Store.getDataStats();
        document.getElementById('data-stats').innerHTML = `
            <div class="data-stat">
                <div class="data-stat-value">${stats.projects}</div>
                <div class="data-stat-label">Projects</div>
            </div>
            <div class="data-stat">
                <div class="data-stat-value">${stats.scopes}</div>
                <div class="data-stat-label">Scopes</div>
            </div>
            <div class="data-stat">
                <div class="data-stat-value">${stats.tasks}</div>
                <div class="data-stat-label">Tasks</div>
            </div>
            <div class="data-stat">
                <div class="data-stat-value">${stats.notes}</div>
                <div class="data-stat-label">Notes</div>
            </div>
        `;
    },

};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});