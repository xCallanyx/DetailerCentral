// ============================================
// SUBMITTALS PLANNER MODULE
// ============================================
const SubmittalsPlannerModule = {
    app: null,

    init(app) {
        this.app = app;
        this.bindSubmittalModal();
        this.bindSubmittalForm();
    },

    bindSubmittalModal() {
        // Delete submittal button handler
        document.getElementById('delete-submittal-btn').addEventListener('click', () => {
            const submittalId = document.getElementById('submittal-id').value;
            const scopeId = document.getElementById('submittal-scope-id').value;
            const submittalTitle = document.getElementById('submittal-title').value;

            if (confirm(`Delete submittal "${submittalTitle}"? This cannot be undone.`)) {
                Store.deleteSubmittal(this.app.currentProjectId, scopeId, submittalId);
                document.getElementById('submittal-modal').classList.remove('active');
                this.app.renderProjectDetail(this.app.currentProjectId);
                this.app.renderDashboard();
            }
        });
    },

    bindSubmittalForm() {
        document.getElementById('submittal-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const scopeId = document.getElementById('submittal-scope-id').value;
            const existingId = document.getElementById('submittal-id').value || null;

            // Build submittal object with new field names
            const detailedLbs = parseFloat(document.getElementById('submittal-weight').value) || 0;
            const submittal = {
                id: existingId,
                title: document.getElementById('submittal-title').value,
                scopeWeights: [{ scopeId: scopeId, detailedLbs: detailedLbs }],
                targetSubmitDate: document.getElementById('submittal-target-date').value,
                targetReleaseDate: document.getElementById('submittal-target-release-date').value
            };

            // For existing submittals, preserve lifecycle fields (status, rev, outcome, etc.)
            // These are managed by action buttons, not the form directly
            if (existingId) {
                const state = Store.getState();
                const project = state.projects.find(p => p.id === this.app.currentProjectId);
                const scope = project && project.scopes.find(s => s.id === scopeId);
                const existing = scope && scope.submittals.find(s => s.id === existingId);
                if (existing) {
                    submittal.status = existing.status;
                    submittal.reviewOutcome = existing.reviewOutcome;
                    submittal.rev = existing.rev;
                    submittal.submittedAt = existing.submittedAt;
                    submittal.returnedAt = existing.returnedAt;
                    submittal.releasedAt = existing.releasedAt;
                    submittal.releaseEntries = existing.releaseEntries;
                    submittal.history = existing.history;
                    // Update detailedLbs on existing scopeWeights entry for this scope
                    if (existing.scopeWeights && existing.scopeWeights.length > 0) {
                        submittal.scopeWeights = existing.scopeWeights;
                        submittal.scopeWeights[0].detailedLbs = detailedLbs;
                    }
                }
            } else {
                // New submittal defaults
                submittal.status = SubmittalRules.STATUSES.DRAFTING;
                submittal.reviewOutcome = SubmittalRules.REVIEW_OUTCOMES.NONE;
                submittal.rev = 0;
                submittal.submittedAt = null;
                submittal.returnedAt = null;
                submittal.releasedAt = null;
                submittal.releaseEntries = [];
            }

            Store.saveSubmittal(this.app.currentProjectId, scopeId, submittal);
            document.getElementById('submittal-modal').classList.remove('active');
            this.app.renderProjectDetail(this.app.currentProjectId);
            this.app.renderDashboard();
        });
    },

    // Render the submittals table HTML for a scope
    renderSubmittalsTable(scope) {
        if (scope.submittals.length === 0) {
            return '<p style="color: var(--text-muted); font-size: 0.85rem;">No submittals yet.</p>';
        }

        return `
            <table class="submittals-table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Rev</th>
                        <th>Weight (lbs)</th>
                        <th>Status</th>
                        <th>Outcome</th>
                        <th>Target</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${scope.submittals.map(sub => {
                        const displayStatus = SubmittalRules.getDisplayStatus(sub);
                        const statusClass = RenderHelpers.getStatusClass(displayStatus);
                        return `
                        <tr>
                            <td>${sub.title}</td>
                            <td>${sub.rev}</td>
                            <td>
                                <input type="number" step="1" class="form-input-inline inline-weight-input"
                                       value="${Selectors.getSubmittalDetailedLbs(sub)}" data-scope-id="${scope.id}" data-submittal-id="${sub.id}"
                                       style="width:80px;">
                            </td>
                            <td><span class="badge badge-${statusClass}">${displayStatus}</span></td>
                            <td>${sub.reviewOutcome !== 'None' ? sub.reviewOutcome : '-'}</td>
                            <td>${sub.targetSubmitDate || '-'}</td>
                            <td class="actions-cell">
                                ${this.renderActionButtons(sub, scope.id)}
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    },

    // Render contextual action buttons based on submittal state
    renderActionButtons(sub, scopeId) {
        const buttons = [];

        // Always show edit
        buttons.push(`<button class="btn btn-sm btn-secondary edit-submittal-btn"
                data-scope-id="${scopeId}" data-submittal-id="${sub.id}">Edit</button>`);

        // Lifecycle actions
        if (sub.status === SubmittalRules.STATUSES.DRAFTING) {
            if ((sub.rev || 0) >= 1) {
                buttons.push(`<button class="btn btn-sm btn-primary resubmit-btn"
                        data-scope-id="${scopeId}" data-submittal-id="${sub.id}">Resubmit</button>`);
            } else {
                buttons.push(`<button class="btn btn-sm btn-primary submit-btn"
                        data-scope-id="${scopeId}" data-submittal-id="${sub.id}">Submit</button>`);
            }
        }

        if (sub.status === SubmittalRules.STATUSES.SUBMITTED_WAITING_RETURN ||
            sub.status === SubmittalRules.STATUSES.RESUBMITTED_WAITING_RETURN) {
            buttons.push(`<button class="btn btn-sm btn-success return-btn"
                    data-scope-id="${scopeId}" data-submittal-id="${sub.id}">Return</button>`);
        }

        if (SubmittalRules.canRelease(sub) && sub.status !== SubmittalRules.STATUSES.RELEASED) {
            buttons.push(`<button class="btn btn-sm btn-warning release-btn"
                    data-scope-id="${scopeId}" data-submittal-id="${sub.id}">Release</button>`);
        }

        // Add more release entries even after Released
        if (sub.status === SubmittalRules.STATUSES.RELEASED) {
            buttons.push(`<button class="btn btn-sm btn-warning release-btn"
                    data-scope-id="${scopeId}" data-submittal-id="${sub.id}">+ Release</button>`);
        }

        return buttons.join(' ');
    },

    // Bind submittal inline editing and button events within a scopes container
    bindScopeSubmittalEvents(container, project) {
        // Bind inline weight edits on submittals
        container.querySelectorAll('.inline-weight-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const scopeId = e.target.dataset.scopeId;
                const submittalId = e.target.dataset.submittalId;
                const scope = project.scopes.find(s => s.id === scopeId);
                const sub = scope && scope.submittals.find(s => s.id === submittalId);
                if (sub) {
                    const newLbs = parseFloat(e.target.value) || 0;
                    if (!sub.scopeWeights || sub.scopeWeights.length === 0) {
                        sub.scopeWeights = [{ scopeId: scopeId, detailedLbs: newLbs }];
                    } else {
                        sub.scopeWeights[0].detailedLbs = newLbs;
                    }
                    Store.saveSubmittal(this.app.currentProjectId, scopeId, sub);
                    this.app.renderProjectDetail(this.app.currentProjectId);
                }
            });
            input.addEventListener('click', (e) => e.stopPropagation());
        });

        // Submit button — transition Drafting → Submitted
        container.querySelectorAll('.submit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const scopeId = btn.dataset.scopeId;
                const submittalId = btn.dataset.submittalId;
                const scope = project.scopes.find(s => s.id === scopeId);
                const sub = scope && scope.submittals.find(s => s.id === submittalId);
                if (sub) {
                    const result = SubmittalRules.submit(sub);
                    if (result.ok) {
                        Store.saveSubmittal(this.app.currentProjectId, scopeId, sub);
                        this.app.renderProjectDetail(this.app.currentProjectId);
                        this.app.renderDashboard();
                    } else {
                        alert(result.error);
                    }
                }
            });
        });

        // Resubmit button — transition revised Drafting → Resubmitted
        container.querySelectorAll('.resubmit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const scopeId = btn.dataset.scopeId;
                const submittalId = btn.dataset.submittalId;
                const scope = project.scopes.find(s => s.id === scopeId);
                const sub = scope && scope.submittals.find(s => s.id === submittalId);
                if (sub) {
                    const result = SubmittalRules.resubmit(sub);
                    if (result.ok) {
                        Store.saveSubmittal(this.app.currentProjectId, scopeId, sub);
                        this.app.renderProjectDetail(this.app.currentProjectId);
                        this.app.renderDashboard();
                    } else {
                        alert(result.error);
                    }
                }
            });
        });

        // Return button — show outcome picker
        container.querySelectorAll('.return-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const scopeId = btn.dataset.scopeId;
                const submittalId = btn.dataset.submittalId;
                const scope = project.scopes.find(s => s.id === scopeId);
                const sub = scope && scope.submittals.find(s => s.id === submittalId);
                if (!sub) return;

                const outcome = prompt(
                    'Select return outcome:\n' +
                    '1 = Approved\n' +
                    '2 = Approved as Noted\n' +
                    '3 = Revise & Resubmit\n\n' +
                    'Enter 1, 2, or 3:'
                );

                const outcomeMap = {
                    '1': SubmittalRules.REVIEW_OUTCOMES.APPROVED,
                    '2': SubmittalRules.REVIEW_OUTCOMES.APPROVED_AS_NOTED,
                    '3': SubmittalRules.REVIEW_OUTCOMES.REVISE_AND_RESUBMIT
                };

                const selectedOutcome = outcomeMap[outcome];
                if (!selectedOutcome) return;

                const result = SubmittalRules.setReviewOutcome(sub, selectedOutcome);
                if (result.ok) {
                    Store.saveSubmittal(this.app.currentProjectId, scopeId, sub);
                    this.app.renderProjectDetail(this.app.currentProjectId);
                    this.app.renderDashboard();
                } else {
                    alert(result.error);
                }
            });
        });

        // Release button — prompt for release weight
        container.querySelectorAll('.release-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const scopeId = btn.dataset.scopeId;
                const submittalId = btn.dataset.submittalId;
                const scope = project.scopes.find(s => s.id === scopeId);
                const sub = scope && scope.submittals.find(s => s.id === submittalId);
                if (!sub) return;

                const lbsStr = prompt(`Release weight (lbs) for "${sub.title}":`, Selectors.getSubmittalDetailedLbs(sub));
                if (lbsStr === null) return;
                const addedLbs = parseFloat(lbsStr);
                if (!addedLbs || addedLbs <= 0) {
                    alert('Release weight must be greater than 0.');
                    return;
                }

                const desc = prompt('Release description (optional):', '') || '';

                const result = SubmittalRules.addReleaseEntry(sub, {
                    addedLbs: addedLbs,
                    description: desc
                });

                if (result.ok) {
                    Store.saveSubmittal(this.app.currentProjectId, scopeId, sub);
                    this.app.renderProjectDetail(this.app.currentProjectId);
                    this.app.renderDashboard();
                } else {
                    alert(result.error);
                }
            });
        });

        // Bind add submittal buttons
        container.querySelectorAll('.add-submittal-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                document.getElementById('submittal-form').reset();
                document.getElementById('submittal-id').value = '';
                document.getElementById('submittal-scope-id').value = btn.dataset.scopeId;
                document.getElementById('submittal-modal-title').textContent = 'New Submittal';
                document.getElementById('delete-submittal-btn').style.display = 'none';
                document.getElementById('submittal-modal').classList.add('active');
            });
        });

        // Bind edit submittal buttons
        container.querySelectorAll('.edit-submittal-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const scopeId = btn.dataset.scopeId;
                const submittalId = btn.dataset.submittalId;
                const scope = project.scopes.find(s => s.id === scopeId);
                const submittal = scope.submittals.find(s => s.id === submittalId);

                document.getElementById('submittal-id').value = submittal.id;
                document.getElementById('submittal-scope-id').value = scopeId;
                document.getElementById('submittal-title').value = submittal.title;
                document.getElementById('submittal-weight').value = Selectors.getSubmittalDetailedLbs(submittal);
                document.getElementById('submittal-target-date').value = submittal.targetSubmitDate || '';
                document.getElementById('submittal-target-release-date').value = submittal.targetReleaseDate || '';
                document.getElementById('delete-submittal-btn').style.display = 'block';
                document.getElementById('submittal-modal-title').textContent = 'Edit Submittal';
                document.getElementById('submittal-modal').classList.add('active');
            });
        });
    }
};
