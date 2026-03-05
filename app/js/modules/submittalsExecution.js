// ============================================
// SUBMITTALS EXECUTION MODULE - Live Queues
// ============================================
const SubmittalsExecutionModule = {
    app: null,

    init(app) {
        this.app = app;
    },

    render() {
        const state = Store.getState();
        const drafting = Selectors.getDraftingQueue(state);
        const awaiting = Selectors.getAwaitingReturnQueue(state);
        const releaseReady = Selectors.getReleaseReadyQueue(state);
        const autoTasks = Selectors.getAutoUrgentTasks(state);
        const materialRequests = Selectors.getMaterialRequests(state);

        const container = document.getElementById('execution-content');
        if (!container) return;

        container.innerHTML =
            this.renderUrgentTasks(autoTasks) +
            this.renderMRDSection(materialRequests, state) +
            this.renderQueueSection('Drafting', drafting, 'drafting') +
            this.renderQueueSection('Awaiting Return', awaiting, 'awaiting') +
            this.renderQueueSection('Release Ready', releaseReady, 'release-ready');

        this.bindEvents(container);
    },

    // ============================================
    // URGENT TASKS (AUTO)
    // ============================================
    renderUrgentTasks(tasks) {
        if (tasks.length === 0) return '';

        const urgencyColors = {
            OVERDUE: 'var(--danger)',
            CRITICAL: 'var(--danger)',
            HIGH: '#e67e22',
            MED: '#f1c40f',
            LOW: 'var(--text-muted)'
        };

        const rows = tasks.map(t => {
            const color = urgencyColors[t.urgency] || 'var(--text-muted)';
            return `<tr>
                <td><span class="urgency-badge" style="background:${color}; color:#fff; padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:600;">${t.urgency}</span></td>
                <td>${t.dueDate || '—'}</td>
                <td style="max-width:400px;">${t.title}</td>
                <td>${t.notes || ''}</td>
                <td class="actions-cell">
                    <button class="btn btn-sm btn-secondary open-in-planner-btn" data-project-id="${t.projectId}">Open</button>
                </td>
            </tr>`;
        }).join('');

        return `
            <div class="card" style="margin-bottom: 1rem; border-left: 3px solid var(--danger);">
                <div class="card-header">
                    <h2 class="card-title">Urgent Tasks <span class="badge badge-submitted" style="margin-left:0.5rem;">${tasks.length}</span></h2>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Urgency</th>
                            <th>Fab Start By</th>
                            <th>Issue</th>
                            <th>Details</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    },

    // ============================================
    // MATERIAL REQUESTS (MRD)
    // ============================================
    renderMRDSection(materialRequests, state) {
        const urgencyColors = {
            OVERDUE: 'var(--danger)',
            CRITICAL: 'var(--danger)',
            HIGH: '#e67e22',
            MED: '#f1c40f',
            LOW: 'var(--success)'
        };

        let rows = '';
        if (materialRequests.length > 0) {
            rows = materialRequests.map(mr => {
                const ev = mr.evaluation;
                if (!ev) return '';
                const urgencyLabel = ev.atRisk ? ev.urgency : 'OK';
                const urgencyColor = ev.atRisk ? (urgencyColors[ev.urgency] || 'var(--text-muted)') : 'var(--success)';
                const blockingSummary = ev.atRisk
                    ? `${ev.blockingSubmittals.length} of ${ev.totalLinked} not approved`
                    : `${ev.totalLinked} linked — all clear`;

                return `<tr>
                    <td>${mr.dateRequested}</td>
                    <td>${mr.description || '—'}</td>
                    <td>${mr.projectName}</td>
                    <td>${ev.fabStartDate}</td>
                    <td><span class="urgency-badge" style="background:${urgencyColor}; color:#fff; padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:600;">${urgencyLabel}</span></td>
                    <td>${blockingSummary}</td>
                    <td class="actions-cell">
                        <button class="btn btn-sm btn-danger delete-mrd-btn" data-mrd-id="${mr.id}" title="Delete">&#10005;</button>
                    </td>
                </tr>`;
            }).join('');
        }

        const emptyRow = materialRequests.length === 0
            ? '<tr><td colspan="7" style="color:var(--text-muted); text-align:center; padding:1rem;">No material requests yet.</td></tr>'
            : '';

        // Build project + submittal options for the add form
        const projects = state.projects || [];
        const projectOptions = projects.map(p => `<option value="${p.id}">${p.number} — ${p.name}</option>`).join('');

        return `
            <div class="card" style="margin-bottom: 1rem;">
                <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
                    <h2 class="card-title">Material Requests (MRD) <span class="badge badge-approved" style="margin-left:0.5rem;">${materialRequests.length}</span></h2>
                    <button class="btn btn-sm btn-primary" id="toggle-mrd-form-btn">+ Add MRD</button>
                </div>

                <div id="mrd-add-form" style="display:none; padding:1rem; border-bottom:1px solid var(--border-color);">
                    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.75rem; margin-bottom:0.75rem;">
                        <div>
                            <label style="display:block; font-size:0.8rem; margin-bottom:0.25rem;">MRD Date</label>
                            <input type="date" id="mrd-date-input" class="form-control" />
                        </div>
                        <div>
                            <label style="display:block; font-size:0.8rem; margin-bottom:0.25rem;">Project</label>
                            <select id="mrd-project-input" class="form-control">
                                <option value="">Select project...</option>
                                ${projectOptions}
                            </select>
                        </div>
                        <div>
                            <label style="display:block; font-size:0.8rem; margin-bottom:0.25rem;">Description</label>
                            <input type="text" id="mrd-desc-input" class="form-control" placeholder="e.g. Foundations pour" />
                        </div>
                    </div>
                    <div style="margin-bottom:0.75rem;">
                        <label style="display:block; font-size:0.8rem; margin-bottom:0.25rem;">Link Submittals</label>
                        <div id="mrd-submittal-checkboxes" style="max-height:150px; overflow-y:auto; border:1px solid var(--border-color); border-radius:4px; padding:0.5rem;">
                            <p style="color:var(--text-muted); font-size:0.8rem;">Select a project first.</p>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-primary" id="mrd-save-btn">Add Material Request</button>
                </div>

                <table class="data-table">
                    <thead>
                        <tr>
                            <th>MRD Date</th>
                            <th>Description</th>
                            <th>Project</th>
                            <th>Fab Start Needed</th>
                            <th>Urgency</th>
                            <th>Submittals</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>${rows}${emptyRow}</tbody>
                </table>
            </div>
        `;
    },

    // ============================================
    // EXISTING QUEUE SECTIONS
    // ============================================
    renderQueueSection(title, items, queueType) {
        const countBadge = `<span class="badge badge-${items.length > 0 ? 'submitted' : 'approved'}" style="margin-left: 0.5rem;">${items.length}</span>`;

        const emptyMessages = {
            'drafting': 'Nothing drafting right now.',
            'awaiting': 'No submittals awaiting return.',
            'release-ready': 'No release-ready submittals.'
        };

        if (items.length === 0) {
            return `
                <div class="card" style="margin-bottom: 1rem;">
                    <div class="card-header">
                        <h2 class="card-title">${title}${countBadge}</h2>
                    </div>
                    <p style="color: var(--text-muted); padding: 1rem; font-size: 0.85rem;">${emptyMessages[queueType]}</p>
                </div>
            `;
        }

        let headerRow = '';
        if (queueType === 'drafting') {
            headerRow = `
                <tr>
                    <th>Job</th>
                    <th>Scope</th>
                    <th>Submittal</th>
                    <th>Rev</th>
                    <th>Weight</th>
                    <th>Target Submit</th>
                    <th></th>
                </tr>`;
        } else if (queueType === 'awaiting') {
            headerRow = `
                <tr>
                    <th>Job</th>
                    <th>Scope</th>
                    <th>Submittal</th>
                    <th>Rev</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th></th>
                </tr>`;
        } else {
            headerRow = `
                <tr>
                    <th>Job</th>
                    <th>Scope</th>
                    <th>Submittal</th>
                    <th>Rev</th>
                    <th>Outcome</th>
                    <th>Returned</th>
                    <th>Weight</th>
                    <th></th>
                </tr>`;
        }

        const rows = items.map(item => {
            const jobCell = `${item.jobNumber} — ${item.projectName}`;
            const openBtn = `<button class="btn btn-sm btn-secondary open-in-planner-btn"
                data-project-id="${item.projectId}">Open</button>`;

            if (queueType === 'drafting') {
                return `<tr>
                    <td>${jobCell}</td>
                    <td>${item.scopeName}</td>
                    <td>${item.title}</td>
                    <td>${item.rev}</td>
                    <td>${item.detailedLbs.toLocaleString()}</td>
                    <td>${item.targetSubmitDate || '<span style="color:var(--text-muted)">—</span>'}</td>
                    <td class="actions-cell">${openBtn}</td>
                </tr>`;
            } else if (queueType === 'awaiting') {
                const displayStatus = item.status === SubmittalRules.STATUSES.RESUBMITTED_WAITING_RETURN
                    ? 'Resubmitted' : 'Submitted';
                const statusClass = RenderHelpers.getStatusClass(displayStatus);
                return `<tr>
                    <td>${jobCell}</td>
                    <td>${item.scopeName}</td>
                    <td>${item.title}</td>
                    <td>${item.rev}</td>
                    <td><span class="badge badge-${statusClass}">${displayStatus}</span></td>
                    <td>${item.submittedAt || '—'}</td>
                    <td class="actions-cell">${openBtn}</td>
                </tr>`;
            } else {
                const outcomeClass = RenderHelpers.getStatusClass(item.reviewOutcome);
                return `<tr>
                    <td>${jobCell}</td>
                    <td>${item.scopeName}</td>
                    <td>${item.title}</td>
                    <td>${item.rev}</td>
                    <td><span class="badge badge-${outcomeClass}">${item.reviewOutcome}</span></td>
                    <td>${item.returnedAt || '—'}</td>
                    <td>${item.detailedLbs.toLocaleString()}</td>
                    <td class="actions-cell">${openBtn}</td>
                </tr>`;
            }
        }).join('');

        return `
            <div class="card" style="margin-bottom: 1rem;">
                <div class="card-header">
                    <h2 class="card-title">${title}${countBadge}</h2>
                </div>
                <table class="data-table">
                    <thead>${headerRow}</thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    },

    // ============================================
    // EVENT BINDING
    // ============================================
    bindEvents(container) {
        // Open in planner buttons (queues + urgent tasks)
        container.querySelectorAll('.open-in-planner-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const projectId = btn.dataset.projectId;
                this.app.renderProjectDetail(projectId);
                this.app.showView('project-detail');
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            });
        });

        // Toggle MRD add form
        const toggleBtn = document.getElementById('toggle-mrd-form-btn');
        const form = document.getElementById('mrd-add-form');
        if (toggleBtn && form) {
            toggleBtn.addEventListener('click', () => {
                form.style.display = form.style.display === 'none' ? 'block' : 'none';
            });
        }

        // Project select → populate submittal checkboxes
        const projectSelect = document.getElementById('mrd-project-input');
        if (projectSelect) {
            projectSelect.addEventListener('change', () => {
                this._populateSubmittalCheckboxes(projectSelect.value);
            });
        }

        // Save MRD button
        const saveBtn = document.getElementById('mrd-save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this._saveMRD());
        }

        // Delete MRD buttons
        container.querySelectorAll('.delete-mrd-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('Delete this material request?')) {
                    Store.deleteMaterialRequest(btn.dataset.mrdId);
                    this.app.refreshAutoTasks();
                    this.render();
                }
            });
        });
    },

    _populateSubmittalCheckboxes(projectId) {
        const container = document.getElementById('mrd-submittal-checkboxes');
        if (!container) return;

        if (!projectId) {
            container.innerHTML = '<p style="color:var(--text-muted); font-size:0.8rem;">Select a project first.</p>';
            return;
        }

        const project = Store.getProject(projectId);
        if (!project) return;

        let html = '';
        (project.scopes || []).forEach(scope => {
            (scope.submittals || []).forEach(sub => {
                const displayStatus = SubmittalRules.getDisplayStatus(sub);
                html += `
                    <label style="display:flex; align-items:center; gap:0.5rem; padding:2px 0; font-size:0.85rem; cursor:pointer;">
                        <input type="checkbox" class="mrd-sub-checkbox" value="${sub.id}" />
                        <span>${sub.label || ''} ${sub.title} <span style="color:var(--text-muted);">(${scope.name} — ${displayStatus})</span></span>
                    </label>`;
            });
        });

        container.innerHTML = html || '<p style="color:var(--text-muted); font-size:0.8rem;">No submittals in this project.</p>';
    },

    _saveMRD() {
        const dateInput = document.getElementById('mrd-date-input');
        const projectInput = document.getElementById('mrd-project-input');
        const descInput = document.getElementById('mrd-desc-input');

        const dateRequested = dateInput ? dateInput.value : '';
        const projectId = projectInput ? projectInput.value : '';
        const description = descInput ? descInput.value.trim() : '';

        if (!dateRequested || !projectId) {
            alert('MRD date and project are required.');
            return;
        }

        const linkedSubmittalIds = [];
        document.querySelectorAll('.mrd-sub-checkbox:checked').forEach(cb => {
            linkedSubmittalIds.push(cb.value);
        });

        Store.saveMaterialRequest({
            dateRequested,
            projectId,
            linkedSubmittalIds,
            description
        });

        // Refresh auto tasks and re-render
        this.app.refreshAutoTasks();
        this.render();
    }
};
