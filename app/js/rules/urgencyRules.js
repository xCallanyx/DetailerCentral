// ============================================
// URGENCY RULES - Deadline Awareness (Phase 2)
// ============================================
const UrgencyRules = {
    URGENCY: {
        LOW: 'LOW',
        MED: 'MED',
        HIGH: 'HIGH',
        CRITICAL: 'CRITICAL'
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
    getUrgencyLevel(daysUntilFabStart) {
        if (daysUntilFabStart <= 0) return this.URGENCY.CRITICAL;
        if (daysUntilFabStart <= 2) return this.URGENCY.HIGH;
        if (daysUntilFabStart <= 5) return this.URGENCY.MED;
        return this.URGENCY.LOW;
    },

    // Evaluate a single material request for urgency
    // Returns { atRisk, urgency, daysUntilFabStart, blockingSubmittals[] } or null if clear
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

        const atRisk = blockingSubmittals.length > 0 && daysUntilFabStart <= 5;

        return {
            materialRequestId: mr.id,
            projectId: mr.projectId,
            dateRequested: mr.dateRequested,
            fabStartDate,
            daysUntilFabStart,
            atRisk,
            urgency: atRisk ? this.getUrgencyLevel(daysUntilFabStart) : this.URGENCY.LOW,
            blockingSubmittals
        };
    },

    // Evaluate all material requests and return at-risk ones
    getAtRiskRequests(state) {
        return (state.materialRequests || [])
            .map(mr => this.evaluate(mr, state))
            .filter(result => result && result.atRisk)
            .sort((a, b) => a.daysUntilFabStart - b.daysUntilFabStart);
    }
};
