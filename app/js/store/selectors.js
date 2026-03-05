// ============================================
// SELECTORS - Computed Data from State
// ============================================
const Selectors = {
    // Submittal weight helpers
    getSubmittalDetailedLbs(sub) {
        return (sub.scopeWeights || []).reduce((sum, sw) => sum + (sw.detailedLbs || 0), 0);
    },

    getSubmittalEstimatedLbs(sub) {
        return (sub.scopeWeights || []).reduce((sum, sw) => sum + (sw.estimatedLbs || 0), 0);
    },

    // Flatten all submittals across projects/scopes into queue items
    _flattenSubmittals(state) {
        const items = [];
        (state.projects || []).forEach(p => {
            (p.scopes || []).forEach(s => {
                (s.submittals || []).forEach(sub => {
                    items.push({
                        projectId: p.id,
                        projectName: p.name,
                        jobNumber: p.number,
                        scopeId: s.id,
                        scopeName: s.name,
                        submittalId: sub.id,
                        title: sub.title,
                        label: sub.label || '',
                        status: sub.status,
                        reviewOutcome: sub.reviewOutcome,
                        rev: sub.rev || 0,
                        targetSubmitDate: sub.targetSubmitDate || '',
                        targetReleaseDate: sub.targetReleaseDate || '',
                        submittedAt: sub.submittedAt || '',
                        returnedAt: sub.returnedAt || '',
                        releasedAt: sub.releasedAt || '',
                        detailedLbs: this.getSubmittalDetailedLbs(sub)
                    });
                });
            });
        });
        return items;
    },

    // Execution Queue: Drafting — status is Drafting, sorted by targetSubmitDate ASC (missing last)
    getDraftingQueue(state) {
        return this._flattenSubmittals(state)
            .filter(item => item.status === SubmittalRules.STATUSES.DRAFTING)
            .sort((a, b) => {
                if (!a.targetSubmitDate && !b.targetSubmitDate) return 0;
                if (!a.targetSubmitDate) return 1;
                if (!b.targetSubmitDate) return -1;
                return a.targetSubmitDate.localeCompare(b.targetSubmitDate);
            });
    },

    // Execution Queue: Awaiting Return — submitted or resubmitted, sorted by submittedAt ASC
    getAwaitingReturnQueue(state) {
        const waitingStatuses = [
            SubmittalRules.STATUSES.SUBMITTED_WAITING_RETURN,
            SubmittalRules.STATUSES.RESUBMITTED_WAITING_RETURN
        ];
        return this._flattenSubmittals(state)
            .filter(item => waitingStatuses.includes(item.status))
            .sort((a, b) => {
                if (!a.submittedAt && !b.submittedAt) return 0;
                if (!a.submittedAt) return 1;
                if (!b.submittedAt) return -1;
                return a.submittedAt.localeCompare(b.submittedAt);
            });
    },

    // Execution Queue: Release Ready — approved but not yet released
    getReleaseReadyQueue(state) {
        const releasableOutcomes = [
            SubmittalRules.REVIEW_OUTCOMES.APPROVED,
            SubmittalRules.REVIEW_OUTCOMES.APPROVED_AS_NOTED
        ];
        return this._flattenSubmittals(state)
            .filter(item =>
                releasableOutcomes.includes(item.reviewOutcome) &&
                item.status !== SubmittalRules.STATUSES.RELEASED
            )
            .sort((a, b) => {
                if (!a.returnedAt && !b.returnedAt) return 0;
                if (!a.returnedAt) return 1;
                if (!b.returnedAt) return -1;
                return a.returnedAt.localeCompare(b.returnedAt);
            });
    },

    // Get all at-risk material requests with urgency info
    getAtRiskMaterialRequests(state) {
        return UrgencyRules.getAtRiskRequests(state);
    },

    // Get material requests for a specific project with evaluation
    getProjectMaterialRequests(state, projectId) {
        return (state.materialRequests || [])
            .filter(mr => mr.projectId === projectId)
            .map(mr => ({
                ...mr,
                evaluation: UrgencyRules.evaluate(mr, state)
            }));
    },

    // Get all material requests enriched with evaluation data
    getMaterialRequests(state) {
        return (state.materialRequests || []).map(mr => {
            const project = (state.projects || []).find(p => p.id === mr.projectId);
            return {
                ...mr,
                projectName: project ? project.name : 'Unknown',
                evaluation: UrgencyRules.evaluate(mr, state)
            };
        });
    },

    // Get OPEN AUTO urgent tasks, sorted by urgency severity then dueDate
    getAutoUrgentTasks(state) {
        const urgencyOrder = { OVERDUE: 0, CRITICAL: 1, HIGH: 2, MED: 3, LOW: 4 };
        return (state.tasks || [])
            .filter(t => t.type === 'AUTO' && t.status === 'OPEN')
            .sort((a, b) => {
                const ua = urgencyOrder[a.urgency] !== undefined ? urgencyOrder[a.urgency] : 5;
                const ub = urgencyOrder[b.urgency] !== undefined ? urgencyOrder[b.urgency] : 5;
                if (ua !== ub) return ua - ub;
                return (a.dueDate || '').localeCompare(b.dueDate || '');
            });
    },

    // Get upcoming MRDs across all projects (next N days)
    getUpcomingMRDs(state, days) {
        days = days || 14;
        const today = new Date();
        const cutoff = new Date(today);
        cutoff.setDate(cutoff.getDate() + days);
        const todayStr = today.toISOString().split('T')[0];
        const cutoffStr = cutoff.toISOString().split('T')[0];

        return (state.materialRequests || [])
            .filter(mr => mr.dateRequested >= todayStr && mr.dateRequested <= cutoffStr)
            .map(mr => {
                const project = (state.projects || []).find(p => p.id === mr.projectId);
                return {
                    ...mr,
                    projectName: project ? project.name : 'Unknown',
                    evaluation: UrgencyRules.evaluate(mr, state)
                };
            })
            .sort((a, b) => a.dateRequested.localeCompare(b.dateRequested));
    }
};
