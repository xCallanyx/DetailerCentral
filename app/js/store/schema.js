// ============================================
// SCHEMA - Default State Structure
// ============================================
const SCHEMA_VERSION = 4;

const DEFAULT_STATE = {
    app: 'DetailerCentral',
    schemaVersion: SCHEMA_VERSION,
    lastSavedAt: null,
    deviceId: null,
    projects: [],
    materialRequests: [],
    tasks: [],
    notes: [],
    weeklyReflections: {},
    settings: {
        fabLeadDaysDefault: 5
    }
};
