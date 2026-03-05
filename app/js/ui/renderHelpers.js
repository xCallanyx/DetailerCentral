// ============================================
// RENDER HELPERS - Formatting & Display Utilities
// ============================================
const RenderHelpers = {
    formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    },

    getStatusClass(status) {
        const map = {
            'Drafting': 'drafting',
            'Submitted': 'submitted',
            'Submitted (Waiting Return)': 'submitted',
            'Resubmitted': 'submitted',
            'Resubmitted (Waiting Return)': 'submitted',
            'Approved': 'approved',
            'Approved as Noted': 'approved',
            'Released': 'released',
            'Revise & Resubmit': 'revise',
            // Legacy / RFI statuses
            'Sent': 'sent',
            'Pending': 'pending',
            'Returned Approved': 'approved',
            'Answered': 'answered',
            'Closed (CO Created)': 'approved',
            'Rejected': 'revise'
        };
        return map[status] || 'drafting';
    }
};
