// ============================================
// SUBMITTAL RULES - Business Logic (Phase 1)
// ============================================
const SubmittalRules = {

    // Valid statuses
    STATUSES: {
        DRAFTING: 'Drafting',
        SUBMITTED_WAITING_RETURN: 'Submitted (Waiting Return)',
        RESUBMITTED_WAITING_RETURN: 'Resubmitted (Waiting Return)',
        RELEASED: 'Released'
    },

    // Review outcomes (set when submittal is returned)
    REVIEW_OUTCOMES: {
        NONE: 'None',
        APPROVED: 'Approved',
        APPROVED_AS_NOTED: 'Approved as Noted',
        REVISE_AND_RESUBMIT: 'Revise & Resubmit'
    },

    // Allowed status transitions
    // Key = current status, Value = array of allowed next statuses
    TRANSITIONS: {
        'Drafting': ['Submitted (Waiting Return)'],
        'Submitted (Waiting Return)': ['Drafting'],  // returned submittals use setReviewOutcome
        'Resubmitted (Waiting Return)': ['Drafting'], // same — outcome triggers next state
        'Released': []  // terminal for status; release entries are still additive
    },

    // Can this submittal transition to the given status?
    canTransition(submittal, newStatus) {
        const allowed = this.TRANSITIONS[submittal.status] || [];
        return allowed.includes(newStatus);
    },

    // Submit a drafting submittal
    submit(submittal) {
        if (submittal.status !== this.STATUSES.DRAFTING) {
            return { ok: false, error: 'Only Drafting submittals can be submitted.' };
        }

        submittal.status = this.STATUSES.SUBMITTED_WAITING_RETURN;
        submittal.submittedAt = new Date().toISOString().split('T')[0];
        this.addHistory(submittal, 'STATUS_CHANGED', `Submitted (Rev ${submittal.rev})`);
        return { ok: true };
    },

    // Set review outcome when a submittal is returned
    setReviewOutcome(submittal, outcome) {
        const waitingStatuses = [
            this.STATUSES.SUBMITTED_WAITING_RETURN,
            this.STATUSES.RESUBMITTED_WAITING_RETURN
        ];
        if (!waitingStatuses.includes(submittal.status)) {
            return { ok: false, error: 'Submittal must be waiting for return.' };
        }

        const validOutcomes = [
            this.REVIEW_OUTCOMES.APPROVED,
            this.REVIEW_OUTCOMES.APPROVED_AS_NOTED,
            this.REVIEW_OUTCOMES.REVISE_AND_RESUBMIT
        ];
        if (!validOutcomes.includes(outcome)) {
            return { ok: false, error: 'Invalid review outcome.' };
        }

        submittal.reviewOutcome = outcome;
        submittal.returnedAt = new Date().toISOString().split('T')[0];
        this.addHistory(submittal, 'OUTCOME_SET', `Returned: ${outcome}`);

        // If Revise & Resubmit, bump rev and go back to drafting
        if (outcome === this.REVIEW_OUTCOMES.REVISE_AND_RESUBMIT) {
            submittal.rev = (submittal.rev || 0) + 1;
            submittal.status = this.STATUSES.DRAFTING;
            submittal.submittedAt = null;
            submittal.returnedAt = null;
            submittal.reviewOutcome = this.REVIEW_OUTCOMES.NONE;
            this.addHistory(submittal, 'REV_BUMPED', `Revision bumped to ${submittal.rev} — needs resubmittal`);
        }

        return { ok: true };
    },

    // Resubmit after a Revise & Resubmit
    resubmit(submittal) {
        if (submittal.status !== this.STATUSES.DRAFTING || (submittal.rev || 0) < 1) {
            return { ok: false, error: 'Only revised Drafting submittals can be resubmitted.' };
        }

        submittal.status = this.STATUSES.RESUBMITTED_WAITING_RETURN;
        submittal.submittedAt = new Date().toISOString().split('T')[0];
        this.addHistory(submittal, 'STATUS_CHANGED', `Resubmitted (Rev ${submittal.rev})`);
        return { ok: true };
    },

    // Can this submittal be released?
    canRelease(submittal) {
        const releasableOutcomes = [
            this.REVIEW_OUTCOMES.APPROVED,
            this.REVIEW_OUTCOMES.APPROVED_AS_NOTED
        ];
        return releasableOutcomes.includes(submittal.reviewOutcome);
    },

    // Add a release entry
    addReleaseEntry(submittal, entry) {
        if (!this.canRelease(submittal)) {
            return { ok: false, error: 'Only Approved or Approved as Noted submittals can be released.' };
        }

        if (!entry.addedLbs || entry.addedLbs <= 0) {
            return { ok: false, error: 'Release weight must be greater than 0.' };
        }

        const releaseEntry = {
            id: 'rel_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            date: entry.date || new Date().toISOString().split('T')[0],
            addedLbs: entry.addedLbs,
            description: entry.description || '',
            relatedChangeOrderId: entry.relatedChangeOrderId || null
        };

        if (!submittal.releaseEntries) submittal.releaseEntries = [];
        submittal.releaseEntries.push(releaseEntry);
        submittal.status = this.STATUSES.RELEASED;
        submittal.releasedAt = submittal.releasedAt || releaseEntry.date;
        this.addHistory(submittal, 'RELEASE_ADDED', `Released ${releaseEntry.addedLbs} lbs: ${releaseEntry.description || 'Release'}`);
        return { ok: true, entry: releaseEntry };
    },

    // Get total released weight
    getReleasedLbs(submittal) {
        return (submittal.releaseEntries || []).reduce((sum, e) => sum + (e.addedLbs || 0), 0);
    },

    // Add a history event
    addHistory(submittal, type, message) {
        if (!submittal.history) submittal.history = [];
        submittal.history.push({
            id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            type: type,
            message: message
        });
    },

    // Create a new submittal with defaults
    createDefaults(overrides) {
        return {
            id: null,
            label: overrides.label || '',
            title: overrides.title || '',
            status: this.STATUSES.DRAFTING,
            reviewOutcome: this.REVIEW_OUTCOMES.NONE,
            rev: 0,
            scopeWeights: [],
            targetSubmitDate: overrides.targetSubmitDate || '',
            targetReleaseDate: '',
            submittedAt: null,
            returnedAt: null,
            releasedAt: null,
            releaseEntries: [],
            history: [],
            ...overrides
        };
    },

    // Get a display-friendly status that accounts for review outcome
    getDisplayStatus(submittal) {
        if (submittal.status === this.STATUSES.RELEASED) return 'Released';
        if (submittal.reviewOutcome === this.REVIEW_OUTCOMES.APPROVED) return 'Approved';
        if (submittal.reviewOutcome === this.REVIEW_OUTCOMES.APPROVED_AS_NOTED) return 'Approved as Noted';
        if (submittal.status === this.STATUSES.SUBMITTED_WAITING_RETURN) return 'Submitted';
        if (submittal.status === this.STATUSES.RESUBMITTED_WAITING_RETURN) return 'Resubmitted';
        return 'Drafting';
    }
};
