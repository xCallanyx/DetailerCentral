/**
 * Utility Functions for Rebar Tracker
 */

const Utils = {
    // Generate a secure random ID
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Format date for display (e.g., "Jan 22, 2026")
    formatDate: (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },

    // Format date for input fields (YYYY-MM-DD)
    formatDateForInput: (date) => {
        if (!date) return '';
        return new Date(date).toISOString().split('T')[0];
    },

    // Format large numbers with commas
    formatNumber: (num) => {
        if (num === null || num === undefined || isNaN(num)) return '0';
        return Number(num).toLocaleString('en-US');
    },

    // Calculate Variance Percentage
    calcVariance: (estimated, actual) => {
        if (!estimated || estimated === 0) return 0;
        return ((actual - estimated) / estimated) * 100;
    },

    // Status Color Mappers
    getStatusColor: (status) => {
        const colors = {
            'Drafting': 'text-blue-400',
            'Submitted': 'text-yellow-400',
            'Approved': 'text-green-400',
            'Approved as Noted': 'text-green-300',
            'Revise & Resubmit': 'text-red-400',
            'Released': 'text-purple-400',
            'Released for Delivery': 'text-purple-300',
            'Pending': 'text-gray-400'
        };
        return colors[status] || 'text-gray-400';
    }
};
