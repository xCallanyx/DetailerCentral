// ============================================
// SELECTORS - Computed Data from State
// ============================================
const Selectors = {
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
