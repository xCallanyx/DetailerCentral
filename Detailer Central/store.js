/**
 * Data Store for Rebar Tracker
 * Handles LocalStorage persistence and data relationships
 */

const Store = {
    state: {
        projects: [],
        settings: {
            theme: 'dark'
        }
    },

    init() {
        this.load();
    },

    load() {
        const data = localStorage.getItem('rebarTrackerData');
        if (data) {
            this.state = JSON.parse(data);
        }
    },

    save() {
        localStorage.setItem('rebarTrackerData', JSON.stringify(this.state));
    },

    // --- Project Methods ---

    addProject(projectData) {
        const project = {
            id: Utils.generateId(),
            name: projectData.name,
            number: projectData.number,
            client: projectData.client,
            scopes: [],
            rfis: [],
            changeOrders: [],
            logs: [],
            createdAt: new Date().toISOString()
        };
        this.state.projects.push(project);
        this.save();
        return project;
    },

    getProject(id) {
        return this.state.projects.find(p => p.id === id);
    },

    deleteProject(id) {
        this.state.projects = this.state.projects.filter(p => p.id !== id);
        this.save();
    },

    // --- Scope Methods ---

    addScope(projectId, scopeData) {
        const project = this.getProject(projectId);
        if (!project) return;

        const scope = {
            id: Utils.generateId(),
            name: scopeData.name,
            estimatedTons: Number(scopeData.estimatedTons) || 0,
            actualTons: 0,
            notes: '',
            hoursBudget: Number(scopeData.hoursBudget) || 0,
            hoursSpent: 0,
            submittals: [], // List of submittal objects
            createdAt: new Date().toISOString()
        };

        project.scopes.push(scope);
        this.save();
        return scope;
    },

    updateScope(projectId, scopeId, updates) {
        const project = this.getProject(projectId);
        if (!project) return;

        const scope = project.scopes.find(s => s.id === scopeId);
        if (scope) {
            Object.assign(scope, updates);
            this.save();
        }
    },

    // --- Submittal Methods ---

    addSubmittal(projectId, scopeId, submittalData) {
        const project = this.getProject(projectId);
        if (!project) return;
        const scope = project.scopes.find(s => s.id === scopeId);
        if (!scope) return;

        const submittal = {
            id: Utils.generateId(),
            title: submittalData.title || 'New Submittal',
            status: 'Drafting', // Default
            currentRev: '0',
            targetDate: submittalData.targetDate,
            sentDate: null,
            returnDate: null,
            history: [{
                date: new Date().toISOString(),
                action: 'Created',
                note: 'Initialized submittal'
            }]
        };

        scope.submittals.push(submittal);
        this.save();
    },

    updateSubmittalStatus(projectId, scopeId, submittalId, newStatus, note, newRev = null) {
        const project = this.getProject(projectId);
        if (!project) return;
        const scope = project.scopes.find(s => s.id === scopeId);
        if (!scope) return;
        const submittal = scope.submittals.find(s => s.id === submittalId);

        if (submittal) {
            submittal.status = newStatus;

            // Add history entry
            submittal.history.push({
                date: new Date().toISOString(),
                action: `Status Change: ${newStatus}`,
                note: note || ''
            });

            if (newRev) submittal.currentRev = newRev;
            this.save();
        }
    },

    // --- RFI & Change Order Methods ---

    addRFI(projectId, rfiData) {
        const project = this.getProject(projectId);
        if (!project) return;

        const rfi = {
            id: Utils.generateId(),
            number: rfiData.number || (project.rfis.length + 1).toString(),
            subject: rfiData.subject,
            question: rfiData.question,
            status: 'Drafting',
            answer: '',
            linkedScopeId: rfiData.scopeId || null,
            changeOrderId: null, // If converted
            createdAt: new Date().toISOString()
        };

        project.rfis.push(rfi);
        this.save();
    },

    convertRfiToCo(projectId, rfiId, coData) {
        const project = this.getProject(projectId);
        if (!project) return;
        const rfi = project.rfis.find(r => r.id === rfiId);
        if (!rfi) return;

        const co = {
            id: Utils.generateId(),
            rfiId: rfiId,
            description: coData.description || rfi.subject,
            reason: coData.reason,
            weightImpact: Number(coData.weight) || 0,
            hoursImpact: Number(coData.hours) || 0,
            status: 'Pending',
            createdAt: new Date().toISOString()
        };

        project.changeOrders.push(co);
        rfi.changeOrderId = co.id;
        rfi.status = 'Closed (CO Created)';
        this.save();
    },

    // --- Analytics / Dashboard Helpers ---

    getAllSubmittals() {
        // Flattens all submittals across all projects for the calendar
        let all = [];
        this.state.projects.forEach(p => {
            p.scopes.forEach(s => {
                s.submittals.forEach(sub => {
                    all.push({
                        ...sub,
                        projectName: p.name,
                        projectNumber: p.number,
                        scopeName: s.name,
                        projectId: p.id,
                        scopeId: s.id
                    });
                });
            });
        });
        return all;
    }
};

// Auto-init
Store.init();
