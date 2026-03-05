// ============================================
// PROJECTS MODULE - Project Views & Interactions
// ============================================
const ProjectsModule = {
    app: null,

    init(app) {
        this.app = app;
    },

    renderProjectList() {
        const container = document.getElementById('project-list');
        const projects = Store.getProjects();

        if (projects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">&#128193;</div>
                    <p>No projects yet. Click "New Project" to get started.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = projects.map(project => {
            const totalEstLbs = project.scopes.reduce((sum, s) => sum + (s.estimatedLbs || 0), 0);
            const totalSubmittals = project.scopes.reduce((sum, s) => sum + s.submittals.length, 0);

            return `
                <li class="project-item" data-project-id="${project.id}">
                    <div class="project-info">
                        <div class="project-name">${project.name}</div>
                        <div class="project-meta">${project.number} | ${project.client}</div>
                    </div>
                    <div class="project-stats">
                        <div>
                            <div class="stat-value">${totalEstLbs.toLocaleString()}</div>
                            <div class="stat-label">Est. lbs</div>
                        </div>
                        <div>
                            <div class="stat-value">${project.scopes.length}</div>
                            <div class="stat-label">Scopes</div>
                        </div>
                        <div>
                            <div class="stat-value">${totalSubmittals}</div>
                            <div class="stat-label">Submittals</div>
                        </div>
                    </div>
                    <div class="actions-cell" style="margin-left: 1rem;">
                        <button class="btn btn-sm btn-secondary edit-project-btn" data-project-id="${project.id}">Edit</button>
                        <button class="btn btn-sm btn-danger delete-project-btn" data-project-id="${project.id}">Delete</button>
                    </div>
                </li>
            `;
        }).join('');

        // Bind click events for opening project
        container.querySelectorAll('.project-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't open if clicking on action buttons
                if (e.target.closest('.actions-cell')) return;
                const projectId = item.dataset.projectId;
                this.renderProjectDetail(projectId);
                this.app.showView('project-detail');
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            });
        });

        // Bind edit project buttons
        container.querySelectorAll('.edit-project-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const projectId = btn.dataset.projectId;
                const project = Store.getProject(projectId);
                if (project) {
                    document.getElementById('project-id').value = project.id;
                    document.getElementById('project-name').value = project.name;
                    document.getElementById('project-number').value = project.number;
                    document.getElementById('project-client').value = project.client;
                    document.getElementById('project-modal-title').textContent = 'Edit Project';
                    document.getElementById('project-modal').classList.add('active');
                }
            });
        });

        // Bind delete project buttons
        container.querySelectorAll('.delete-project-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const projectId = btn.dataset.projectId;
                const project = Store.getProject(projectId);
                if (project && confirm(`Delete project "${project.name}" and all its scopes, submittals, RFIs, and change orders? This cannot be undone.`)) {
                    Store.deleteProject(projectId);
                    this.renderProjectList();
                    this.app.renderDashboard();
                }
            });
        });
    },

    // Project Detail
    renderProjectDetail(projectId) {
        this.app.currentProjectId = projectId;
        const project = Store.getProject(projectId);
        if (!project) return;

        // Header
        const totalEstLbs = project.scopes.reduce((sum, s) => sum + (s.estimatedLbs || 0), 0);
        const totalDetailedLbs = project.scopes.reduce((sum, s) => {
            return sum + (s.submittals || []).reduce((ss, sub) => ss + Selectors.getSubmittalDetailedLbs(sub), 0);
        }, 0);
        const totalEstHours = project.scopes.reduce((sum, s) => sum + (s.hoursBudget || 0), 0);
        const totalActHours = project.scopes.reduce((sum, s) => sum + (s.hoursSpent || 0), 0);

        const weightVariance = totalEstLbs > 0 ? ((totalDetailedLbs - totalEstLbs) / totalEstLbs * 100) : 0;
        const hoursVariance = totalEstHours > 0 ? ((totalActHours - totalEstHours) / totalEstHours * 100) : 0;

        document.getElementById('project-header').innerHTML = `
            <div class="project-header-top">
                <div>
                    <h1 class="project-title">${project.name}</h1>
                    <p class="project-subtitle">${project.number} | ${project.client}</p>
                    <div style="margin-top: 0.75rem;" class="actions-cell">
                        <button class="btn btn-sm btn-secondary" id="edit-current-project-btn">Edit Project</button>
                        <button class="btn btn-sm btn-danger" id="delete-current-project-btn">Delete Project</button>
                    </div>
                </div>
                <div class="project-aggregate-stats">
                    <div class="aggregate-stat">
                        <div class="aggregate-value">${totalEstLbs.toLocaleString()}</div>
                        <div class="aggregate-label">Est. lbs</div>
                    </div>
                    <div class="aggregate-stat">
                        <div class="aggregate-value ${weightVariance > 0 ? 'variance-positive' : 'variance-negative'}">${totalDetailedLbs.toLocaleString()}</div>
                        <div class="aggregate-label">Detailed lbs (${weightVariance >= 0 ? '+' : ''}${weightVariance.toFixed(1)}%)</div>
                    </div>
                    <div class="aggregate-stat">
                        <div class="aggregate-value">${totalEstHours.toFixed(1)}</div>
                        <div class="aggregate-label">Est. Hours</div>
                    </div>
                    <div class="aggregate-stat">
                        <div class="aggregate-value ${hoursVariance > 0 ? 'variance-positive' : 'variance-negative'}">${totalActHours.toFixed(1)}</div>
                        <div class="aggregate-label">Actual Hours (${hoursVariance >= 0 ? '+' : ''}${hoursVariance.toFixed(1)}%)</div>
                    </div>
                </div>
            </div>
        `;

        // Bind edit/delete project buttons in header
        document.getElementById('edit-current-project-btn').addEventListener('click', () => {
            document.getElementById('project-id').value = project.id;
            document.getElementById('project-name').value = project.name;
            document.getElementById('project-number').value = project.number;
            document.getElementById('project-client').value = project.client;
            document.getElementById('project-modal-title').textContent = 'Edit Project';
            document.getElementById('project-modal').classList.add('active');
        });

        document.getElementById('delete-current-project-btn').addEventListener('click', () => {
            if (confirm(`Delete project "${project.name}" and all its scopes, submittals, RFIs, and change orders? This cannot be undone.`)) {
                Store.deleteProject(project.id);
                this.app.showView('projects');
                this.renderProjectList();
                this.app.renderDashboard();
                document.querySelectorAll('.nav-btn').forEach(b => {
                    b.classList.toggle('active', b.dataset.view === 'projects');
                });
            }
        });

        // Scopes
        this.renderScopes(project);

        // Material Requests
        this.renderMaterialRequests(project);

        // RFIs
        this.renderRFIs(project);

        // Change Orders
        this.renderChangeOrders(project);
    },

    renderScopes(project) {
        const container = document.getElementById('scopes-list');

        if (project.scopes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">&#128196;</div>
                    <p>No scopes yet. Click "Add Scope" to create one.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = project.scopes.map(scope => {
            const detailedLbs = (scope.submittals || []).reduce((sum, sub) => sum + Selectors.getSubmittalDetailedLbs(sub), 0);
            const estLbs = scope.estimatedLbs || 0;
            const weightVariance = estLbs > 0
                ? ((detailedLbs - estLbs) / estLbs * 100)
                : 0;
            const hoursVariance = scope.hoursBudget > 0
                ? ((scope.hoursSpent - scope.hoursBudget) / scope.hoursBudget * 100)
                : 0;

            return `
                <div class="scope-item" data-scope-id="${scope.id}">
                    <div class="scope-header">
                        <span class="scope-toggle">&#9654;</span>
                        <span class="scope-name">${scope.name}</span>
                        <button class="btn btn-sm btn-secondary edit-scope-btn" data-scope-id="${scope.id}" style="margin-right: 0.5rem;">Edit</button>
                        <button class="btn btn-sm btn-danger delete-scope-btn" data-scope-id="${scope.id}" style="margin-right: 1rem;">Delete</button>
                        <div class="scope-metrics">
                            <div class="scope-metric">
                                <div class="metric-label">Est. lbs</div>
                                <div class="metric-value">${estLbs.toLocaleString()}</div>
                            </div>
                            <div class="scope-metric">
                                <div class="metric-label">Detailed lbs</div>
                                <div class="metric-value">${detailedLbs.toLocaleString()}</div>
                            </div>
                            <div class="scope-metric">
                                <div class="metric-label">Variance</div>
                                <div class="metric-value ${weightVariance > 0 ? 'variance-positive' : 'variance-negative'}">
                                    ${weightVariance >= 0 ? '+' : ''}${weightVariance.toFixed(1)}%
                                </div>
                            </div>
                            <div class="scope-metric">
                                <div class="metric-label">Hours Budget</div>
                                <div class="metric-value">${scope.hoursBudget}</div>
                            </div>
                            <div class="scope-metric">
                                <div class="metric-label">Hours Spent</div>
                                <div class="metric-value">
                                    <input type="number" step="0.5" class="form-input-inline hours-spent-input"
                                           value="${scope.hoursSpent}" data-scope-id="${scope.id}">
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="scope-body">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin: 1rem 0 0.5rem;">
                            <strong>Submittals</strong>
                            <button class="btn btn-sm btn-primary add-submittal-btn" data-scope-id="${scope.id}">+ Add Submittal</button>
                        </div>
                        ${SubmittalsPlannerModule.renderSubmittalsTable(scope)}
                    </div>
                </div>
            `;
        }).join('');

        // Bind scope expand/collapse
        container.querySelectorAll('.scope-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.closest('.delete-scope-btn') || e.target.closest('.edit-scope-btn')) return;
                const scopeItem = header.closest('.scope-item');
                scopeItem.classList.toggle('expanded');
            });
        });

        // Bind edit scope buttons
        container.querySelectorAll('.edit-scope-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const scopeId = btn.dataset.scopeId;
                const scope = project.scopes.find(s => s.id === scopeId);
                if (scope) {
                    document.getElementById('scope-id').value = scope.id;
                    document.getElementById('scope-name').value = scope.name;
                    document.getElementById('scope-est-lbs').value = scope.estimatedLbs || 0;
                    document.getElementById('scope-hours-budget').value = scope.hoursBudget;
                    document.getElementById('scope-modal').classList.add('active');
                }
            });
        });

        // Bind delete scope buttons
        container.querySelectorAll('.delete-scope-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const scopeId = btn.dataset.scopeId;
                const scope = project.scopes.find(s => s.id === scopeId);
                if (scope && confirm(`Delete scope "${scope.name}" and all its submittals? This cannot be undone.`)) {
                    Store.deleteScope(this.app.currentProjectId, scopeId);
                    this.renderProjectDetail(this.app.currentProjectId);
                    this.app.renderDashboard();
                }
            });
        });

        container.querySelectorAll('.hours-spent-input').forEach(input => {
            input.addEventListener('change', (e) => {
                Store.updateScopeMetric(this.app.currentProjectId, e.target.dataset.scopeId, 'hoursSpent', e.target.value);
                this.renderProjectDetail(this.app.currentProjectId);
            });
            input.addEventListener('click', (e) => e.stopPropagation());
        });

        // Delegate submittal events to SubmittalsPlannerModule
        SubmittalsPlannerModule.bindScopeSubmittalEvents(container, project);
    },

    renderMaterialRequests(project) {
        const container = document.getElementById('material-requests-list');
        const state = Store.getState();
        const mrs = Selectors.getProjectMaterialRequests(state, project.id);

        if (mrs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">&#128666;</div>
                    <p>No material requests yet. Click "+ Add Material Request" to create one.</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>MRD</th>
                            <th>Description</th>
                            <th>Linked Submittals</th>
                            <th>Fab Start</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${mrs.map(mr => {
                            const ev = mr.evaluation;
                            const urgencyClass = ev && ev.atRisk
                                ? (ev.urgency === 'CRITICAL' ? 'badge-revise' : 'badge-submitted')
                                : 'badge-approved';
                            const urgencyLabel = ev && ev.atRisk
                                ? `${ev.urgency} (${ev.daysUntilFabStart}d)`
                                : 'OK';

                            // Resolve linked submittal names
                            const linkedNames = (mr.linkedSubmittalIds || []).map(subId => {
                                for (const scope of (project.scopes || [])) {
                                    const sub = scope.submittals.find(s => s.id === subId);
                                    if (sub) return sub.title;
                                }
                                return '?';
                            }).join(', ') || '-';

                            return `
                                <tr>
                                    <td>${mr.dateRequested}</td>
                                    <td>${mr.description || '-'}</td>
                                    <td>${linkedNames}</td>
                                    <td>${ev ? ev.fabStartDate : '-'}</td>
                                    <td><span class="badge ${urgencyClass}">${urgencyLabel}</span></td>
                                    <td class="actions-cell">
                                        <button class="btn btn-sm btn-secondary edit-mr-btn" data-mr-id="${mr.id}">Edit</button>
                                        <button class="btn btn-sm btn-danger delete-mr-btn" data-mr-id="${mr.id}">Delete</button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        }

        // Bind Add MR button
        document.getElementById('add-mr-btn').addEventListener('click', () => {
            this.openMRModal(project, null);
        });

        // Bind Edit MR buttons
        container.querySelectorAll('.edit-mr-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mr = Store.getMaterialRequest(btn.dataset.mrId);
                if (mr) this.openMRModal(project, mr);
            });
        });

        // Bind Delete MR buttons
        container.querySelectorAll('.delete-mr-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('Delete this material request?')) {
                    Store.deleteMaterialRequest(btn.dataset.mrId);
                    this.renderProjectDetail(this.app.currentProjectId);
                    this.app.renderDashboard();
                }
            });
        });
    },

    openMRModal(project, existingMR) {
        const modal = document.getElementById('mr-modal');
        const form = document.getElementById('mr-form');
        form.reset();

        document.getElementById('mr-id').value = existingMR ? existingMR.id : '';
        document.getElementById('mr-date-requested').value = existingMR ? existingMR.dateRequested : '';
        document.getElementById('mr-description').value = existingMR ? (existingMR.description || '') : '';
        document.getElementById('mr-modal-title').textContent = existingMR ? 'Edit Material Request' : 'New Material Request';
        document.getElementById('delete-mr-btn').style.display = existingMR ? 'block' : 'none';

        // Build submittal checkboxes
        const checkboxContainer = document.getElementById('mr-submittal-checkboxes');
        const linkedIds = existingMR ? (existingMR.linkedSubmittalIds || []) : [];
        let checkboxHTML = '';
        (project.scopes || []).forEach(scope => {
            (scope.submittals || []).forEach(sub => {
                const checked = linkedIds.includes(sub.id) ? 'checked' : '';
                checkboxHTML += `
                    <label style="display: block; padding: 0.25rem 0; cursor: pointer;">
                        <input type="checkbox" class="mr-sub-checkbox" value="${sub.id}" ${checked}>
                        ${scope.name} — ${sub.title}
                    </label>
                `;
            });
        });
        checkboxContainer.innerHTML = checkboxHTML || '<p style="color: var(--text-muted); font-size: 0.85rem;">No submittals in this project.</p>';

        modal.classList.add('active');

        // Bind form submit (remove old listener by cloning)
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        // Re-populate checkboxes after clone
        document.getElementById('mr-submittal-checkboxes').innerHTML = checkboxHTML || '<p style="color: var(--text-muted); font-size: 0.85rem;">No submittals in this project.</p>';

        newForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const linkedSubmittalIds = [];
            newForm.querySelectorAll('.mr-sub-checkbox:checked').forEach(cb => {
                linkedSubmittalIds.push(cb.value);
            });

            const mr = {
                id: document.getElementById('mr-id').value || null,
                dateRequested: document.getElementById('mr-date-requested').value,
                projectId: project.id,
                linkedSubmittalIds,
                description: document.getElementById('mr-description').value
            };

            Store.saveMaterialRequest(mr);
            modal.classList.remove('active');
            this.renderProjectDetail(this.app.currentProjectId);
            this.app.renderDashboard();
        });

        // Bind delete button inside modal
        document.getElementById('delete-mr-btn').addEventListener('click', () => {
            if (existingMR && confirm('Delete this material request?')) {
                Store.deleteMaterialRequest(existingMR.id);
                modal.classList.remove('active');
                this.renderProjectDetail(this.app.currentProjectId);
                this.app.renderDashboard();
            }
        });
    },

    renderRFIs(project) {
        const tbody = document.getElementById('rfis-table-body');

        if (project.rfis.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                        No RFIs yet. Click "Add RFI" to create one.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = project.rfis.map(rfi => {
            const linkedCO = project.changeOrders.find(co => co.rfiId === rfi.id);
            const canCreateCO = rfi.status === 'Answered' && !linkedCO;

            return `
                <tr>
                    <td>${rfi.number}</td>
                    <td>${rfi.subject}</td>
                    <td><span class="badge badge-${RenderHelpers.getStatusClass(rfi.status)}">${rfi.status}</span></td>
                    <td>${linkedCO ? 'CO Created' : '-'}</td>
                    <td class="actions-cell">
                        ${canCreateCO ? `
                            <button class="btn btn-sm btn-success create-co-btn" data-rfi-id="${rfi.id}" data-rfi-subject="${rfi.subject}">
                                Create CO
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-danger delete-rfi-btn" data-rfi-id="${rfi.id}">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Bind create CO buttons
        tbody.querySelectorAll('.create-co-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('co-rfi-id').value = btn.dataset.rfiId;
                document.getElementById('co-description').value = btn.dataset.rfiSubject;
                document.getElementById('co-weight-impact').value = '0';
                document.getElementById('co-hours-impact').value = '0';
                document.getElementById('co-status').value = 'Pending';
                document.getElementById('co-modal').classList.add('active');
            });
        });

        // Bind delete RFI buttons
        tbody.querySelectorAll('.delete-rfi-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const rfiId = btn.dataset.rfiId;
                const rfi = project.rfis.find(r => r.id === rfiId);
                const hasLinkedCO = rfi && rfi.changeOrderId;
                const message = hasLinkedCO
                    ? `Delete RFI #${rfi.number} and its linked Change Order? This cannot be undone.`
                    : `Delete RFI #${rfi.number}? This cannot be undone.`;
                if (rfi && confirm(message)) {
                    Store.deleteRFI(this.app.currentProjectId, rfiId);
                    this.renderProjectDetail(this.app.currentProjectId);
                }
            });
        });
    },

    renderChangeOrders(project) {
        const tbody = document.getElementById('cos-table-body');

        if (project.changeOrders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                        No change orders yet. Create one from an Answered RFI.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = project.changeOrders.map(co => {
            const rfi = project.rfis.find(r => r.id === co.rfiId);
            return `
                <tr>
                    <td>${rfi ? `RFI #${rfi.number}` : '-'}</td>
                    <td>${co.description}</td>
                    <td>${co.weightImpact} lbs</td>
                    <td>${co.hoursImpact} hrs</td>
                    <td><span class="badge badge-${RenderHelpers.getStatusClass(co.status)}">${co.status}</span></td>
                    <td class="actions-cell">
                        <button class="btn btn-sm btn-danger delete-co-btn" data-co-id="${co.id}">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Bind delete CO buttons
        tbody.querySelectorAll('.delete-co-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const coId = btn.dataset.coId;
                const co = project.changeOrders.find(c => c.id === coId);
                if (co && confirm(`Delete this Change Order? The linked RFI will revert to "Answered" status.`)) {
                    Store.deleteChangeOrder(this.app.currentProjectId, coId);
                    this.renderProjectDetail(this.app.currentProjectId);
                }
            });
        });
    }
};
