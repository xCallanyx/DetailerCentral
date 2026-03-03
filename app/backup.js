// ============================================
// BACKUP MANAGER - Ring Buffer + File System Backup
// ============================================
console.log('[backup.js] loading...');

const BackupManager = {
    RING_BUFFER_KEY: 'rebarTrackerBackupHistory',
    SETTINGS_KEY: 'detailercentral_backup_settings',
    MAX_RING_ENTRIES: 20,

    _lastSnapshotHash: null,
    _lastSnapshotTime: 0,
    _snapshotTimer: null,
    _fileBackupTimer: null,

    // ============================================
    // INITIALIZATION
    // ============================================
    async init() {
        this.checkIntegrity();
        await this.fileBackup._initIDB();
        this.updateStatusUI();
        await this.checkForNewerBackup();
    },

    // ============================================
    // SETTINGS
    // ============================================
    getSettings() {
        try {
            const raw = localStorage.getItem(this.SETTINGS_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return { enabled: false, frequencyMinutes: 15, maxSnapshots: 30 };
    },

    saveSettings(settings) {
        localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    },

    // ============================================
    // RING BUFFER (Layer 1)
    // ============================================
    ringBuffer: {
        getSnapshots() {
            try {
                const raw = localStorage.getItem(BackupManager.RING_BUFFER_KEY);
                if (raw) return JSON.parse(raw);
            } catch (e) { /* ignore */ }
            return [];
        },

        saveSnapshot(stateString) {
            const snapshots = this.getSnapshots();
            snapshots.push({
                ts: new Date().toISOString(),
                data: stateString
            });
            // Trim to max
            while (snapshots.length > BackupManager.MAX_RING_ENTRIES) {
                snapshots.shift();
            }
            try {
                localStorage.setItem(BackupManager.RING_BUFFER_KEY, JSON.stringify(snapshots));
            } catch (e) {
                // If localStorage is full, remove oldest entries and retry
                console.warn('Backup ring buffer storage full, trimming...');
                while (snapshots.length > 5) {
                    snapshots.shift();
                }
                try {
                    localStorage.setItem(BackupManager.RING_BUFFER_KEY, JSON.stringify(snapshots));
                } catch (e2) {
                    console.error('Cannot save backup snapshots:', e2);
                }
            }
        },

        getLatestSnapshot() {
            const snapshots = this.getSnapshots();
            return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
        }
    },

    scheduleSnapshot(stateString) {
        // Debounce: only snapshot if data changed and 30+ seconds since last
        if (stateString === this._lastSnapshotHash) return;

        clearTimeout(this._snapshotTimer);
        const elapsed = Date.now() - this._lastSnapshotTime;

        if (elapsed >= 30000) {
            this._writeSnapshot(stateString);
        } else {
            this._snapshotTimer = setTimeout(() => {
                this._writeSnapshot(stateString);
            }, 30000 - elapsed);
        }
    },

    _writeSnapshot(stateString) {
        this._lastSnapshotHash = stateString;
        this._lastSnapshotTime = Date.now();
        this.ringBuffer.saveSnapshot(stateString);
    },

    // ============================================
    // CRASH RECOVERY
    // ============================================
    checkIntegrity() {
        try {
            const raw = localStorage.getItem('rebar_tracker_data');
            if (raw) JSON.parse(raw);
            // Data is valid, nothing to do
        } catch (e) {
            console.error('Main data corrupted:', e);
            const latest = this.ringBuffer.getLatestSnapshot();
            if (latest) {
                const ts = new Date(latest.ts).toLocaleString();
                if (confirm(`Your data appears corrupted. Restore from backup saved at ${ts}?`)) {
                    localStorage.setItem('rebar_tracker_data', latest.data);
                    window.location.reload();
                }
            } else {
                alert('Your data appears corrupted and no backup snapshots are available.');
            }
        }
    },

    // ============================================
    // FILE-BASED BACKUP (Layer 2)
    // ============================================
    fileBackup: {
        IDB_NAME: 'DetailerCentralBackup',
        IDB_STORE: 'handles',
        _db: null,

        _initIDB() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.IDB_NAME, 1);
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(this.IDB_STORE)) {
                        db.createObjectStore(this.IDB_STORE);
                    }
                };
                request.onsuccess = (e) => {
                    this._db = e.target.result;
                    resolve();
                };
                request.onerror = (e) => {
                    console.error('IDB open failed:', e);
                    resolve(); // Don't block app
                };
            });
        },

        saveDirHandle(handle) {
            return new Promise((resolve, reject) => {
                if (!this._db) return resolve();
                const tx = this._db.transaction(this.IDB_STORE, 'readwrite');
                tx.objectStore(this.IDB_STORE).put(handle, 'backupDir');
                tx.oncomplete = () => resolve();
                tx.onerror = (e) => { console.error('IDB save failed:', e); resolve(); };
            });
        },

        getDirHandle() {
            return new Promise((resolve, reject) => {
                if (!this._db) return resolve(null);
                const tx = this._db.transaction(this.IDB_STORE, 'readonly');
                const req = tx.objectStore(this.IDB_STORE).get('backupDir');
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            });
        },

        clearDirHandle() {
            return new Promise((resolve, reject) => {
                if (!this._db) return resolve();
                const tx = this._db.transaction(this.IDB_STORE, 'readwrite');
                tx.objectStore(this.IDB_STORE).delete('backupDir');
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        },

        async requestPermission(handle) {
            try {
                const status = await handle.requestPermission({ mode: 'readwrite' });
                return status;
            } catch (e) {
                console.warn('Permission request failed:', e);
                return 'denied';
            }
        },

        async chooseFolder() {
            try {
                const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
                await this.saveDirHandle(handle);
                return handle;
            } catch (e) {
                if (e.name !== 'AbortError') {
                    console.error('Folder selection failed:', e);
                }
                return null;
            }
        },

        async writeLatest(stateString) {
            const handle = await this.getDirHandle();
            if (!handle) return false;

            const perm = await this.requestPermission(handle);
            if (perm !== 'granted') return false;

            try {
                const fileHandle = await handle.getFileHandle('DetailerCentral.latest.json', { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(stateString);
                await writable.close();
                return true;
            } catch (e) {
                console.error('Write latest failed:', e);
                return false;
            }
        },

        async writeSnapshot(stateString) {
            const handle = await this.getDirHandle();
            if (!handle) return false;

            const perm = await this.requestPermission(handle);
            if (perm !== 'granted') return false;

            try {
                // Ensure backups subdirectory exists
                const backupsDir = await handle.getDirectoryHandle('backups', { create: true });
                const now = new Date();
                const pad = (n) => String(n).padStart(2, '0');
                const filename = `DetailerCentral_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.json`;

                const fileHandle = await backupsDir.getFileHandle(filename, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(stateString);
                await writable.close();

                // Enforce retention
                const settings = BackupManager.getSettings();
                await this.enforceRetention(backupsDir, settings.maxSnapshots || 30);

                return true;
            } catch (e) {
                console.error('Write snapshot failed:', e);
                return false;
            }
        },

        async enforceRetention(backupsDir, maxCount) {
            try {
                const entries = [];
                for await (const [name, handle] of backupsDir.entries()) {
                    if (handle.kind === 'file' && name.startsWith('DetailerCentral_') && name.endsWith('.json')) {
                        entries.push(name);
                    }
                }
                entries.sort(); // Lexicographic = chronological due to naming convention
                while (entries.length > maxCount) {
                    const oldest = entries.shift();
                    await backupsDir.removeEntry(oldest);
                }
            } catch (e) {
                console.error('Retention enforcement failed:', e);
            }
        },

        async runBackup(stateString) {
            try {
                const handle = await this.getDirHandle();
                if (!handle) return false;

                const [latestOk, snapshotOk] = await Promise.all([
                    this.writeLatest(stateString),
                    this.writeSnapshot(stateString)
                ]);

                if (latestOk || snapshotOk) {
                    BackupManager._lastFileBackupTime = Date.now();
                    BackupManager.updateStatusUI();
                }
                return latestOk || snapshotOk;
            } catch (e) {
                console.error('File backup failed:', e);
                return false;
            }
        },

        async readLatestFile() {
            try {
                const handle = await this.getDirHandle();
                if (!handle) return null;

                const perm = await this.requestPermission(handle);
                if (perm !== 'granted') return null;

                const fileHandle = await handle.getFileHandle('DetailerCentral.latest.json');
                const file = await fileHandle.getFile();
                const text = await file.text();
                return JSON.parse(text);
            } catch (e) {
                // File may not exist yet
                return null;
            }
        }
    },

    _lastFileBackupTime: 0,

    // ============================================
    // STATE SAVED HOOK
    // ============================================
    onStateSaved(json) {
        // Layer 1: Ring buffer (debounced)
        this.scheduleSnapshot(json);

        // Layer 2: File backup (based on frequency)
        const settings = this.getSettings();
        if (!settings.enabled) return;

        if (settings.frequencyMinutes === 0) {
            // On every save
            this.fileBackup.runBackup(json);
        } else {
            this._scheduleFileBackup(json, settings.frequencyMinutes);
        }
    },

    _scheduleFileBackup(json, frequencyMinutes) {
        clearTimeout(this._fileBackupTimer);
        const intervalMs = frequencyMinutes * 60 * 1000;
        const elapsed = Date.now() - this._lastFileBackupTime;

        if (elapsed >= intervalMs) {
            this.fileBackup.runBackup(json);
        } else {
            this._fileBackupTimer = setTimeout(() => {
                // Re-read current state for freshest data
                const currentJson = localStorage.getItem('rebar_tracker_data');
                if (currentJson) {
                    this.fileBackup.runBackup(currentJson);
                }
            }, intervalMs - elapsed);
        }
    },

    // ============================================
    // FORCE BACKUP
    // ============================================
    async forceBackup() {
        const json = localStorage.getItem('rebar_tracker_data');
        if (!json) {
            alert('No data to backup.');
            return false;
        }
        const ok = await this.fileBackup.runBackup(json);
        if (ok) {
            alert('Backup saved successfully!');
        } else {
            alert('Backup failed. Make sure a folder is configured and permission is granted.');
        }
        return ok;
    },

    // ============================================
    // CONFLICT DETECTION (Cross-Device)
    // ============================================
    async checkForNewerBackup() {
        try {
            const handle = await this.fileBackup.getDirHandle();
            if (!handle) return;

            const settings = this.getSettings();
            if (!settings.enabled) return;

            const cloudData = await this.fileBackup.readLatestFile();
            if (!cloudData || !cloudData.lastSavedAt) return;

            const localRaw = localStorage.getItem('rebar_tracker_data');
            if (!localRaw) return;

            let localData;
            try { localData = JSON.parse(localRaw); } catch (e) { return; }
            if (!localData.lastSavedAt) return;

            const cloudTime = new Date(cloudData.lastSavedAt).getTime();
            const localTime = new Date(localData.lastSavedAt).getTime();

            // If cloud backup is newer by > 5 minutes
            if (cloudTime - localTime > 5 * 60 * 1000) {
                const cloudDate = new Date(cloudData.lastSavedAt).toLocaleString();
                const deviceInfo = cloudData.deviceId ? ` from device ${cloudData.deviceId.substring(0, 8)}...` : '';
                if (confirm(`A newer backup was found (saved ${cloudDate}${deviceInfo}).\n\nClick OK to use the cloud copy, or Cancel to keep your local copy.`)) {
                    localStorage.setItem('rebar_tracker_data', JSON.stringify(cloudData));
                    window.location.reload();
                }
            }
        } catch (e) {
            // Don't block app startup
            console.warn('Conflict check failed:', e);
        }
    },

    // ============================================
    // STATUS & UI
    // ============================================
    async getStatus() {
        const settings = this.getSettings();
        const handle = await this.fileBackup.getDirHandle();
        let folderName = null;
        let permissionState = null;

        if (handle) {
            folderName = handle.name;
            try {
                permissionState = await handle.queryPermission({ mode: 'readwrite' });
            } catch (e) {
                permissionState = 'unknown';
            }
        }

        return {
            configured: !!handle,
            folderName,
            lastBackupTime: this._lastFileBackupTime > 0 ? new Date(this._lastFileBackupTime).toLocaleString() : null,
            permissionState,
            enabled: settings.enabled
        };
    },

    async updateStatusUI() {
        const statusText = document.getElementById('backup-status-text');
        const statusIndicator = document.getElementById('backup-status-indicator');
        if (!statusText || !statusIndicator) return;

        const status = await this.getStatus();

        if (!status.configured) {
            statusText.textContent = 'No backup folder configured';
            statusIndicator.textContent = 'Off';
            statusIndicator.style.color = 'var(--text-muted)';
        } else if (!status.enabled) {
            statusText.textContent = `Folder: ${status.folderName} (disabled)`;
            statusIndicator.textContent = 'Off';
            statusIndicator.style.color = 'var(--warning)';
        } else {
            const lastTime = status.lastBackupTime || 'never';
            statusText.textContent = `Folder: ${status.folderName} | Last backup: ${lastTime}`;
            statusIndicator.textContent = 'Active';
            statusIndicator.style.color = 'var(--success)';
        }
    }
};

// Attach to window so other scripts and the console can access it
window.BackupManager = BackupManager;
console.log('[backup.js] BackupManager attached:', typeof window.BackupManager);
