// ============================================
// STORE - Data Model with LocalStorage
// ============================================
const Store = {
    STORAGE_KEY: 'rebar_tracker_data',
    DEVICE_ID_KEY: 'detailercentral_device_id',

    getDeviceId() {
        let id = localStorage.getItem(this.DEVICE_ID_KEY);
        if (!id) {
            id = crypto.randomUUID ? crypto.randomUUID() : 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem(this.DEVICE_ID_KEY, id);
        }
        return id;
    },

    migrate(state) {
        if (!state.app) state.app = 'DetailerCentral';
        if (!state.schemaVersion) state.schemaVersion = 1;
        if (!state.lastSavedAt) state.lastSavedAt = new Date().toISOString();
        if (!state.deviceId) state.deviceId = this.getDeviceId();
        if (!state.tasks) state.tasks = [];
        if (!state.notes) state.notes = [];
        if (!state.weeklyReflections) state.weeklyReflections = {};

        // Schema v1→v2: tons to lbs, submittal weights
        if (state.schemaVersion < 2) {
            (state.projects || []).forEach(p => {
                (p.scopes || []).forEach(s => {
                    // Convert estimatedTons → estimatedLbs
                    if (s.estimatedTons !== undefined && s.estimatedLbs === undefined) {
                        s.estimatedLbs = Math.round(s.estimatedTons * 2000);
                    }
                    if (s.estimatedLbs === undefined) s.estimatedLbs = 0;
                    // Add weight to submittals
                    (s.submittals || []).forEach(sub => {
                        if (sub.weight === undefined) sub.weight = 0;
                    });
                    // Map old statuses
                    (s.submittals || []).forEach(sub => {
                        if (sub.status === 'Returned Approved') sub.status = 'Approved';
                        if (sub.status === 'Revise & Resubmit') sub.status = 'Drafting';
                        if (sub.status === 'Sent') sub.status = 'Submitted';
                        if (sub.status === 'Pending') sub.status = 'Submitted';
                    });
                });
            });
            state.schemaVersion = 2;
        }

        // Schema v2→v3: Submittal lifecycle fields
        if (state.schemaVersion < 3) {
            (state.projects || []).forEach(p => {
                (p.scopes || []).forEach(s => {
                    (s.submittals || []).forEach(sub => {
                        // Map old status strings to new lifecycle statuses
                        const oldStatus = sub.status;
                        if (oldStatus === 'Drafting') {
                            sub.status = 'Drafting';
                            sub.reviewOutcome = 'None';
                        } else if (oldStatus === 'Submitted') {
                            sub.status = 'Submitted (Waiting Return)';
                            sub.reviewOutcome = 'None';
                        } else if (oldStatus === 'Approved') {
                            sub.status = 'Submitted (Waiting Return)';
                            sub.reviewOutcome = 'Approved';
                        } else if (oldStatus === 'Released') {
                            sub.status = 'Released';
                            sub.reviewOutcome = sub.reviewOutcome || 'Approved';
                        } else {
                            sub.reviewOutcome = sub.reviewOutcome || 'None';
                        }

                        // Map old field names to new
                        if (sub.currentRev !== undefined) {
                            sub.rev = parseInt(sub.currentRev) || 0;
                            delete sub.currentRev;
                        }
                        if (sub.rev === undefined) sub.rev = 0;

                        if (sub.targetDate !== undefined) {
                            sub.targetSubmitDate = sub.targetDate;
                            delete sub.targetDate;
                        }
                        if (sub.targetSubmitDate === undefined) sub.targetSubmitDate = '';
                        if (sub.targetReleaseDate === undefined) sub.targetReleaseDate = '';

                        if (sub.sentDate !== undefined) {
                            sub.submittedAt = sub.sentDate || null;
                            delete sub.sentDate;
                        }
                        if (sub.submittedAt === undefined) sub.submittedAt = null;
                        if (sub.returnedAt === undefined) sub.returnedAt = null;

                        if (sub.releaseDate !== undefined) {
                            sub.releasedAt = sub.releaseDate || null;
                            delete sub.releaseDate;
                        }
                        if (sub.releasedAt === undefined) sub.releasedAt = null;

                        // Initialize release entries from existing released weight
                        if (!sub.releaseEntries) {
                            sub.releaseEntries = [];
                            if (sub.status === 'Released' && sub.weight > 0) {
                                sub.releaseEntries.push({
                                    id: 'rel_migrated_' + (sub.id || Date.now()),
                                    date: sub.releasedAt || new Date().toISOString().split('T')[0],
                                    addedLbs: sub.weight,
                                    description: 'Migrated from v2'
                                });
                            }
                        }

                        // Ensure history array exists
                        if (!sub.history) sub.history = [];

                        // Migrate old history format { date, action } to new { id, timestamp, type, message }
                        sub.history = sub.history.map(h => {
                            if (h.timestamp) return h; // already new format
                            return {
                                id: 'hist_migrated_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                                timestamp: h.date || new Date().toISOString(),
                                type: 'MIGRATED',
                                message: h.action || 'Legacy event'
                            };
                        });
                    });
                });
            });
            state.schemaVersion = 3;
        }

        // Schema v3→v4: Material requests + settings
        if (state.schemaVersion < 4) {
            if (!state.materialRequests) state.materialRequests = [];
            if (!state.settings) state.settings = {};
            if (state.settings.fabLeadDaysDefault === undefined) {
                state.settings.fabLeadDaysDefault = 5;
            }
            state.schemaVersion = 4;
        }

        // Schema v4→v5: Submittal scopeWeights model
        if (state.schemaVersion < 5) {
            (state.projects || []).forEach(p => {
                (p.scopes || []).forEach(s => {
                    (s.submittals || []).forEach(sub => {
                        if (!sub.scopeWeights) {
                            sub.scopeWeights = [{
                                scopeId: s.id,
                                detailedLbs: sub.weight || 0
                            }];
                        }
                        delete sub.weight;
                    });
                });
            });
            state.schemaVersion = 5;
        }

        state.schemaVersion = SCHEMA_VERSION;
        return state;
    },

    getState() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (data) {
            const state = JSON.parse(data);
            return this.migrate(state);
        }
        return JSON.parse(JSON.stringify(DEFAULT_STATE));
    },

    saveState(state) {
        state.app = 'DetailerCentral';
        state.schemaVersion = SCHEMA_VERSION;
        state.lastSavedAt = new Date().toISOString();
        state.deviceId = this.getDeviceId();

        const json = JSON.stringify(state);
        localStorage.setItem(this.STORAGE_KEY, json);

        // Trigger backup layers (non-blocking)
        if (typeof BackupManager !== 'undefined') {
            BackupManager.onStateSaved(json);
        }
    },

    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    // Projects
    getProjects() {
        return this.getState().projects;
    },

    getProject(id) {
        return this.getProjects().find(p => p.id === id);
    },

    saveProject(project) {
        const state = this.getState();
        const index = state.projects.findIndex(p => p.id === project.id);
        if (index >= 0) {
            // Preserve existing data when editing
            const existing = state.projects[index];
            state.projects[index] = {
                ...existing,
                name: project.name,
                number: project.number,
                client: project.client
            };
        } else {
            project.id = this.generateId();
            project.rfis = [];
            project.changeOrders = [];
            project.scopes = [];
            state.projects.push(project);
        }
        this.saveState(state);
        return state.projects[index >= 0 ? index : state.projects.length - 1];
    },

    deleteProject(id) {
        const state = this.getState();
        state.projects = state.projects.filter(p => p.id !== id);
        this.saveState(state);
    },

    // Scopes
    saveScope(projectId, scope) {
        const state = this.getState();
        const project = state.projects.find(p => p.id === projectId);
        if (!project) return;

        const index = project.scopes.findIndex(s => s.id === scope.id);
        if (index >= 0) {
            // Preserve existing data when editing
            const existing = project.scopes[index];
            project.scopes[index] = {
                ...existing,
                name: scope.name,
                estimatedLbs: scope.estimatedLbs,
                hoursBudget: scope.hoursBudget
            };
        } else {
            scope.id = this.generateId();
            scope.hoursSpent = 0;
            scope.submittals = [];
            project.scopes.push(scope);
        }
        this.saveState(state);
        return project.scopes[index >= 0 ? index : project.scopes.length - 1];
    },

    updateScopeMetric(projectId, scopeId, field, value) {
        const state = this.getState();
        const project = state.projects.find(p => p.id === projectId);
        if (!project) return;

        const scope = project.scopes.find(s => s.id === scopeId);
        if (!scope) return;

        scope[field] = parseFloat(value) || 0;
        this.saveState(state);
    },

    // Submittals
    saveSubmittal(projectId, scopeId, submittal) {
        const state = this.getState();
        const project = state.projects.find(p => p.id === projectId);
        if (!project) return;

        const scope = project.scopes.find(s => s.id === scopeId);
        if (!scope) return;

        const index = scope.submittals.findIndex(s => s.id === submittal.id);
        if (index >= 0) {
            // Preserve history from existing if not already on the incoming object
            if (!submittal.history || submittal.history.length === 0) {
                submittal.history = scope.submittals[index].history || [];
            }
            // Track status change in history
            if (scope.submittals[index].status !== submittal.status) {
                SubmittalRules.addHistory(submittal, 'STATUS_CHANGED',
                    `Status changed to ${SubmittalRules.getDisplayStatus(submittal)}`);
            }
            scope.submittals[index] = submittal;
        } else {
            submittal.id = this.generateId();
            if (!submittal.history) submittal.history = [];
            SubmittalRules.addHistory(submittal, 'CREATED', 'Submittal created');
            // Apply defaults for new submittals
            submittal.reviewOutcome = submittal.reviewOutcome || 'None';
            submittal.rev = submittal.rev || 0;
            submittal.releaseEntries = submittal.releaseEntries || [];
            if (!submittal.scopeWeights) {
                submittal.scopeWeights = [{ scopeId: scope.id, detailedLbs: 0 }];
            }
            scope.submittals.push(submittal);
        }
        this.saveState(state);
        return submittal;
    },

    // RFIs
    saveRFI(projectId, rfi) {
        const state = this.getState();
        const project = state.projects.find(p => p.id === projectId);
        if (!project) return;

        const index = project.rfis.findIndex(r => r.id === rfi.id);
        if (index >= 0) {
            project.rfis[index] = rfi;
        } else {
            rfi.id = this.generateId();
            rfi.changeOrderId = null;
            project.rfis.push(rfi);
        }
        this.saveState(state);
        return rfi;
    },

    // Change Orders
    createChangeOrderFromRFI(projectId, rfiId, coData) {
        const state = this.getState();
        const project = state.projects.find(p => p.id === projectId);
        if (!project) return;

        const rfi = project.rfis.find(r => r.id === rfiId);
        if (!rfi) return;

        const co = {
            id: this.generateId(),
            rfiId: rfiId,
            description: coData.description,
            weightImpact: parseFloat(coData.weightImpact) || 0,
            hoursImpact: parseFloat(coData.hoursImpact) || 0,
            status: coData.status || 'Pending'
        };

        project.changeOrders.push(co);
        rfi.changeOrderId = co.id;
        rfi.status = 'Closed (CO Created)';

        this.saveState(state);
        return co;
    },

    // Delete Scope (and all its submittals)
    deleteScope(projectId, scopeId) {
        const state = this.getState();
        const project = state.projects.find(p => p.id === projectId);
        if (!project) return;

        project.scopes = project.scopes.filter(s => s.id !== scopeId);
        this.saveState(state);
    },

    // Delete Submittal
    deleteSubmittal(projectId, scopeId, submittalId) {
        const state = this.getState();
        const project = state.projects.find(p => p.id === projectId);
        if (!project) return;

        const scope = project.scopes.find(s => s.id === scopeId);
        if (!scope) return;

        scope.submittals = scope.submittals.filter(s => s.id !== submittalId);
        this.saveState(state);
    },

    // Delete RFI (and unlink any associated CO)
    deleteRFI(projectId, rfiId) {
        const state = this.getState();
        const project = state.projects.find(p => p.id === projectId);
        if (!project) return;

        // Remove associated change order if exists
        const rfi = project.rfis.find(r => r.id === rfiId);
        if (rfi && rfi.changeOrderId) {
            project.changeOrders = project.changeOrders.filter(co => co.id !== rfi.changeOrderId);
        }

        project.rfis = project.rfis.filter(r => r.id !== rfiId);
        this.saveState(state);
    },

    // Delete Change Order (and update linked RFI status)
    deleteChangeOrder(projectId, coId) {
        const state = this.getState();
        const project = state.projects.find(p => p.id === projectId);
        if (!project) return;

        const co = project.changeOrders.find(c => c.id === coId);
        if (co && co.rfiId) {
            const rfi = project.rfis.find(r => r.id === co.rfiId);
            if (rfi) {
                rfi.changeOrderId = null;
                rfi.status = 'Answered'; // Revert to Answered status
            }
        }

        project.changeOrders = project.changeOrders.filter(c => c.id !== coId);
        this.saveState(state);
    },

    // ============================================
    // MATERIAL REQUESTS
    // ============================================
    getMaterialRequests() {
        return this.getState().materialRequests;
    },

    getMaterialRequest(id) {
        return this.getMaterialRequests().find(mr => mr.id === id);
    },

    getMaterialRequestsByProject(projectId) {
        return this.getMaterialRequests().filter(mr => mr.projectId === projectId);
    },

    saveMaterialRequest(mr) {
        const state = this.getState();
        const index = state.materialRequests.findIndex(m => m.id === mr.id);
        if (index >= 0) {
            state.materialRequests[index] = { ...state.materialRequests[index], ...mr };
        } else {
            mr.id = this.generateId();
            mr.createdAt = new Date().toISOString();
            state.materialRequests.push(mr);
        }
        this.saveState(state);
        return mr;
    },

    deleteMaterialRequest(id) {
        const state = this.getState();
        state.materialRequests = state.materialRequests.filter(mr => mr.id !== id);
        this.saveState(state);
    },

    // Get all submittals across all projects (for calendar)
    getAllSubmittals() {
        const submittals = [];
        this.getProjects().forEach(project => {
            project.scopes.forEach(scope => {
                scope.submittals.forEach(sub => {
                    submittals.push({
                        ...sub,
                        projectId: project.id,
                        projectName: project.name,
                        scopeName: scope.name
                    });
                });
            });
        });
        return submittals;
    },

    // ============================================
    // TASKS
    // ============================================
    getTasks() {
        return this.getState().tasks;
    },

    getTask(id) {
        return this.getTasks().find(t => t.id === id);
    },

    saveTask(task) {
        const state = this.getState();
        const index = state.tasks.findIndex(t => t.id === task.id);
        if (index >= 0) {
            state.tasks[index] = { ...state.tasks[index], ...task };
        } else {
            task.id = this.generateId();
            task.timeSpent = 0;
            task.isFocus = false;
            task.status = task.status || 'Active';
            task.sortOrder = state.tasks.length;
            task.createdAt = new Date().toISOString();
            state.tasks.push(task);
        }
        this.saveState(state);
        return task;
    },

    deleteTask(id) {
        const state = this.getState();
        state.tasks = state.tasks.filter(t => t.id !== id);
        this.saveState(state);
    },

    updateTaskOrder(taskIds) {
        const state = this.getState();
        taskIds.forEach((id, index) => {
            const task = state.tasks.find(t => t.id === id);
            if (task) task.sortOrder = index;
        });
        this.saveState(state);
    },

    toggleTaskFocus(id) {
        const state = this.getState();
        // Clear other focus first
        state.tasks.forEach(t => t.isFocus = false);
        const task = state.tasks.find(t => t.id === id);
        if (task) task.isFocus = true;
        this.saveState(state);
    },

    clearFocus() {
        const state = this.getState();
        state.tasks.forEach(t => t.isFocus = false);
        this.saveState(state);
    },

    completeTask(id) {
        const state = this.getState();
        const task = state.tasks.find(t => t.id === id);
        if (task) {
            task.status = task.status === 'Done' ? 'Active' : 'Done';
            task.completedAt = task.status === 'Done' ? new Date().toISOString() : null;
            task.isFocus = false;
        }
        this.saveState(state);
    },

    archiveCompletedTasks() {
        const state = this.getState();
        state.tasks.forEach(t => {
            if (t.status === 'Done') t.status = 'Archived';
        });
        this.saveState(state);
    },

    addTimeToTask(id, seconds) {
        const state = this.getState();
        const task = state.tasks.find(t => t.id === id);
        if (task) {
            task.timeSpent = (task.timeSpent || 0) + seconds;
            // If linked to a project scope, add time there too
            if (task.projectId && task.scopeId) {
                const project = state.projects.find(p => p.id === task.projectId);
                if (project) {
                    const scope = project.scopes.find(s => s.id === task.scopeId);
                    if (scope) {
                        scope.hoursSpent = (scope.hoursSpent || 0) + (seconds / 3600);
                    }
                }
            }
        }
        this.saveState(state);
    },

    getWeeklyCompletedTasks() {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return this.getTasks().filter(t =>
            (t.status === 'Done' || t.status === 'Archived') &&
            t.completedAt &&
            new Date(t.completedAt) >= oneWeekAgo
        );
    },

    // ============================================
    // NOTES
    // ============================================
    getNotes() {
        return this.getState().notes;
    },

    getNote(id) {
        return this.getNotes().find(n => n.id === id);
    },

    saveNote(note) {
        const state = this.getState();
        const index = state.notes.findIndex(n => n.id === note.id);
        if (index >= 0) {
            state.notes[index] = { ...state.notes[index], ...note, updatedAt: new Date().toISOString() };
        } else {
            note.id = this.generateId();
            note.createdAt = new Date().toISOString();
            note.updatedAt = note.createdAt;
            state.notes.push(note);
        }
        this.saveState(state);
        return note;
    },

    deleteNote(id) {
        const state = this.getState();
        state.notes = state.notes.filter(n => n.id !== id);
        this.saveState(state);
    },

    // ============================================
    // WEEKLY REFLECTIONS
    // ============================================
    saveWeeklyReflection(weekKey, content) {
        const state = this.getState();
        state.weeklyReflections[weekKey] = content;
        this.saveState(state);
    },

    getWeeklyReflection(weekKey) {
        return this.getState().weeklyReflections[weekKey] || '';
    },

    // ============================================
    // GLOBAL SEARCH
    // ============================================
    search(query) {
        const results = [];
        const q = query.toLowerCase();

        // Search projects
        this.getProjects().forEach(p => {
            if (p.name.toLowerCase().includes(q) || p.number.toLowerCase().includes(q)) {
                results.push({ type: 'Project', title: p.name, id: p.id, subtitle: p.number });
            }
            // Search RFIs
            p.rfis.forEach(r => {
                if (r.subject.toLowerCase().includes(q) || r.number.toLowerCase().includes(q)) {
                    results.push({ type: 'RFI', title: `RFI #${r.number}: ${r.subject}`, id: r.id, projectId: p.id });
                }
            });
            // Search Scopes & Submittals
            p.scopes.forEach(s => {
                if (s.name.toLowerCase().includes(q)) {
                    results.push({ type: 'Scope', title: s.name, id: s.id, projectId: p.id });
                }
                s.submittals.forEach(sub => {
                    if (sub.title.toLowerCase().includes(q)) {
                        results.push({ type: 'Submittal', title: sub.title, id: sub.id, projectId: p.id });
                    }
                });
            });
        });

        // Search tasks
        this.getTasks().forEach(t => {
            if (t.title.toLowerCase().includes(q)) {
                results.push({ type: 'Task', title: t.title, id: t.id });
            }
        });

        // Search notes
        this.getNotes().forEach(n => {
            if (n.title.toLowerCase().includes(q) || (n.content && n.content.toLowerCase().includes(q))) {
                results.push({ type: 'Note', title: n.title, id: n.id });
            }
        });

        return results.slice(0, 10);
    },

    // ============================================
    // TIMESHEET
    // ============================================
    getTimesheetData(weekStart) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const tasks = this.getTasks().filter(t => {
            if (!t.completedAt || t.timeSpent <= 0) return false;
            const completed = new Date(t.completedAt);
            return completed >= weekStart && completed <= weekEnd;
        });

        // Group by project and day
        const data = {};
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        tasks.forEach(task => {
            const projectId = task.projectId || 'unassigned';
            const project = task.projectId ? this.getProject(task.projectId) : null;
            const projectName = project ? project.name : 'Unassigned Tasks';

            if (!data[projectId]) {
                data[projectId] = {
                    name: projectName,
                    days: { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 },
                    total: 0,
                    tasks: []
                };
            }

            const completedDate = new Date(task.completedAt);
            const dayName = days[completedDate.getDay()];
            const hours = task.timeSpent / 3600;

            data[projectId].days[dayName] += hours;
            data[projectId].total += hours;
            data[projectId].tasks.push(task);
        });

        return data;
    },

    // ============================================
    // DATA EXPORT/IMPORT
    // ============================================
    exportData() {
        const state = this.getState();
        const dataStr = JSON.stringify(state, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const date = new Date().toISOString().split('T')[0];
        const filename = `rebar-tracker-backup-${date}.json`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return filename;
    },

    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            // Validate basic structure
            if (!data.projects || !Array.isArray(data.projects)) {
                throw new Error('Invalid data format: missing projects array');
            }
            // Run migrations to fill missing fields
            this.migrate(data);

            this.saveState(data);
            return true;
        } catch (e) {
            console.error('Import failed:', e);
            return false;
        }
    },

    clearAllData() {
        localStorage.removeItem(this.STORAGE_KEY);
    },

    getDataStats() {
        const state = this.getState();
        let totalSubmittals = 0;
        let totalRFIs = 0;
        let totalCOs = 0;
        let totalScopes = 0;

        state.projects.forEach(p => {
            totalRFIs += p.rfis ? p.rfis.length : 0;
            totalCOs += p.changeOrders ? p.changeOrders.length : 0;
            totalScopes += p.scopes ? p.scopes.length : 0;
            if (p.scopes) {
                p.scopes.forEach(s => {
                    totalSubmittals += s.submittals ? s.submittals.length : 0;
                });
            }
        });

        return {
            projects: state.projects.length,
            scopes: totalScopes,
            submittals: totalSubmittals,
            rfis: totalRFIs,
            changeOrders: totalCOs,
            tasks: state.tasks ? state.tasks.length : 0,
            notes: state.notes ? state.notes.length : 0
        };
    }
};
