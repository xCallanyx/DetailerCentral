// ============================================
// URGENCY RULES - Deadline Awareness (Phase 2)
// ============================================
const UrgencyRules = {
    URGENCY: {
        LOW: 'LOW',
        MED: 'MED',
        HIGH: 'HIGH',
        CRITICAL: 'CRITICAL',
        OVERDUE: 'OVERDUE'
    },

    // Calculate the date fabrication must start by
    getFabStartDate(mrdDate, fabLeadDays) {
        const d = new Date(mrdDate + 'T00:00:00');
        d.setDate(d.getDate() - (fabLeadDays || 5));
        return d.toISOString().split('T')[0];
    },

    // Check if a submittal is "clear" (approved/released and not blocking)
    isSubmittalClear(sub) {
        if (sub.status === SubmittalRules.STATUSES.RELEASED) return true;
        if (sub.reviewOutcome === SubmittalRules.REVIEW_OUTCOMES.APPROVED) return true;
        if (sub.reviewOutcome === SubmittalRules.REVIEW_OUTCOMES.APPROVED_AS_NOTED) return true;
        return false;
    },

    // Determine urgency level based on days until fab start
    // >= 10 → LOW, 6-9 → MED, 3-5 → HIGH, 0-2 → CRITICAL, < 0 → OVERDUE
    getUrgencyLevel(daysUntilFabStart) {
        if (daysUntilFabStart < 0) return this.URGENCY.OVERDUE;
        if (daysUntilFabStart <= 2) return this.URGENCY.CRITICAL;
        if (daysUntilFabStart <= 5) return this.URGENCY.HIGH;
        if (daysUntilFabStart <= 9) return this.URGENCY.MED;
        return this.URGENCY.LOW;
    },

    // Evaluate a single material request for urgency
    evaluate(mr, state) {
        const fabLeadDays = (state.settings && state.settings.fabLeadDaysDefault) || 5;
        const fabStartDate = this.getFabStartDate(mr.dateRequested, fabLeadDays);
        const today = new Date().toISOString().split('T')[0];
        const todayMs = new Date(today + 'T00:00:00').getTime();
        const fabMs = new Date(fabStartDate + 'T00:00:00').getTime();
        const daysUntilFabStart = Math.ceil((fabMs - todayMs) / (1000 * 60 * 60 * 24));

        // Find linked submittals
        const project = (state.projects || []).find(p => p.id === mr.projectId);
        if (!project) return null;

        const blockingSubmittals = [];
        (mr.linkedSubmittalIds || []).forEach(subId => {
            for (const scope of (project.scopes || [])) {
                const sub = scope.submittals.find(s => s.id === subId);
                if (sub && !this.isSubmittalClear(sub)) {
                    blockingSubmittals.push({
                        id: sub.id,
                        title: sub.title,
                        status: SubmittalRules.getDisplayStatus(sub),
                        scopeName: scope.name
                    });
                }
            }
        });

        const hasBlocking = blockingSubmittals.length > 0;

        return {
            materialRequestId: mr.id,
            projectId: mr.projectId,
            dateRequested: mr.dateRequested,
            fabStartDate,
            daysUntilFabStart,
            atRisk: hasBlocking,
            urgency: hasBlocking ? this.getUrgencyLevel(daysUntilFabStart) : null,
            blockingSubmittals,
            totalLinked: (mr.linkedSubmittalIds || []).length
        };
    },

    // Evaluate all material requests and return at-risk ones
    getAtRiskRequests(state) {
        return (state.materialRequests || [])
            .map(mr => this.evaluate(mr, state))
            .filter(result => result && result.atRisk)
            .sort((a, b) => a.daysUntilFabStart - b.daysUntilFabStart);
    },

    // ============================================
    // AUTO TASK GENERATION
    // ============================================

    // Stable task ID for deduplication
    _autoTaskId(materialRequestId) {
        return 'AUTO_MRD_' + materialRequestId;
    },

    // Build/update AUTO urgency tasks for all material requests.
    // Mutates state.tasks in place. Returns the updated tasks array.
    buildMaterialUrgencyTasks(state) {
        if (!state.tasks) state.tasks = [];

        const evaluations = (state.materialRequests || []).map(mr => ({
            mr,
            eval: this.evaluate(mr, state)
        }));

        evaluations.forEach(({ mr, eval: ev }) => {
            if (!ev) return;

            const taskId = this._autoTaskId(mr.id);
            const existing = state.tasks.find(t => t.id === taskId);

            if (ev.atRisk) {
                // Find project name for the task title
                const project = (state.projects || []).find(p => p.id === mr.projectId);
                const projectName = project ? project.name : 'Unknown';
                const blockingNames = ev.blockingSubmittals.map(b => b.title).join(', ');
                const title = `MRD ${mr.dateRequested} — ${projectName}: ${ev.blockingSubmittals.length} submittal(s) not approved`;

                if (existing) {
                    // Update urgency + metadata on existing task
                    existing.urgency = ev.urgency;
                    existing.dueDate = ev.fabStartDate;
                    existing.title = title;
                    existing.notes = `Blocking: ${blockingNames}. Fab must start by ${ev.fabStartDate}.`;
                    // Re-open if it was auto-closed but condition returned
                    if (existing.status === 'DONE') {
                        existing.status = 'OPEN';
                    }
                    existing.updatedAt = new Date().toISOString();
                } else {
                    // Create new AUTO task
                    state.tasks.push({
                        id: taskId,
                        title,
                        type: 'AUTO',
                        status: 'OPEN',
                        urgency: ev.urgency,
                        dueDate: ev.fabStartDate,
                        projectId: mr.projectId,
                        linkedMaterialRequestId: mr.id,
                        notes: `Blocking: ${blockingNames}. Fab must start by ${ev.fabStartDate}.`,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                }
            } else if (existing && existing.status === 'OPEN') {
                // Condition resolved — auto-close
                existing.status = 'DONE';
                existing.updatedAt = new Date().toISOString();
                existing.notes = (existing.notes || '') + ' [Auto-closed: all linked submittals approved/released]';
            }
        });

        return state.tasks;
    }
};
