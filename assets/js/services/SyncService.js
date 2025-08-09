/**
 * Data Synchronization Service
 * Handles syncing between localStorage and Supabase backend
 */

class SyncService {
    constructor() {
        this.supabase = null;
        this.isEnabled = false;
        this.isInitialized = false;
        this.syncInProgress = false;
        this.lastSyncTime = null;
        this.storageKeys = [
            'schoolPlatform_classRecords',
            'schoolPlatform_studentProfiles', 
            'schoolPlatform_teacherProfile',
            'schoolPlatform_attendance'
        ];
    }

    /**
     * Initialize Supabase connection
     */
    async initialize() {
        if (this.isInitialized) return this.isEnabled;

        try {
            // Check if Supabase is available
            if (typeof window !== 'undefined' && window.supabase) {
                const supabaseUrl = 'https://dbztnbqtkhenfjhaughw.supabase.co';
                const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRienRuYnF0a2hlbmZqaGF1Z2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzODc1NzMsImV4cCI6MjA2OTk2MzU3M30.trRjc2khddlb1RXR1CXeONhlEIYlJBlZ0lncvH5RJFs';
                
                this.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
                
                // Test connection
                const { data: { user } } = await this.supabase.auth.getUser();
                this.isEnabled = !!user;
                
                if (this.isEnabled) {
                    console.log('✅ Sync Service: Connected to Supabase');
                    await this.setupRealtimeSync();
                } else {
                    console.log('ℹ️ Sync Service: No authenticated user, using localStorage only');
                }
            } else {
                console.log('ℹ️ Sync Service: Supabase not available, using localStorage only');
            }
        } catch (error) {
            console.warn('⚠️ Sync Service: Failed to initialize Supabase:', error);
            this.isEnabled = false;
        }

        this.isInitialized = true;
        return this.isEnabled;
    }

    /**
     * Setup real-time synchronization
     */
    async setupRealtimeSync() {
        if (!this.isEnabled) return;

        try {
            // Subscribe to user_data changes
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) return;

            this.supabase
                .channel('user_data_changes')
                .on('postgres_changes', 
                    { 
                        event: '*', 
                        schema: 'public', 
                        table: 'user_data',
                        filter: `user_id=eq.${user.id}`
                    }, 
                    (payload) => {
                        console.log('📡 Real-time update received:', payload);
                        this.handleRealtimeUpdate(payload);
                    }
                )
                .subscribe();

            console.log('📡 Real-time sync enabled');
        } catch (error) {
            console.warn('⚠️ Failed to setup real-time sync:', error);
        }
    }

    /**
     * Handle real-time updates
     */
    handleRealtimeUpdate(payload) {
        if (this.syncInProgress) return; // Avoid sync loops

        try {
            const { new: newData, old: oldData } = payload;
            
            if (newData && newData.data_key && newData.data_value) {
                // Update localStorage with new data from server
                localStorage.setItem(newData.data_key, newData.data_value);
                
                // Trigger storage event for other components
                window.dispatchEvent(new StorageEvent('storage', {
                    key: newData.data_key,
                    newValue: newData.data_value,
                    oldValue: localStorage.getItem(newData.data_key)
                }));

                console.log(`📡 Synced from server: ${newData.data_key}`);
            }
        } catch (error) {
            console.warn('⚠️ Error handling real-time update:', error);
        }
    }

    /**
     * Sync data to Supabase
     */
    async syncToSupabase(key, data) {
        if (!this.isEnabled || this.syncInProgress) return false;

        try {
            this.syncInProgress = true;
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('No authenticated user');

            const dataValue = typeof data === 'string' ? data : JSON.stringify(data);
            
            const { error } = await this.supabase
                .from('user_data')
                .upsert({
                    user_id: user.id,
                    data_key: key,
                    data_value: dataValue,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            this.lastSyncTime = new Date();
            console.log(`📤 Synced to server: ${key}`);
            return true;
        } catch (error) {
            console.warn(`⚠️ Failed to sync ${key} to server:`, error);
            return false;
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Sync data from Supabase
     */
    async syncFromSupabase(key) {
        if (!this.isEnabled) return null;

        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('No authenticated user');

            const { data, error } = await this.supabase
                .from('user_data')
                .select('data_value')
                .eq('user_id', user.id)
                .eq('data_key', key)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error

            if (data && data.data_value) {
                console.log(`📥 Synced from server: ${key}`);
                return data.data_value;
            }

            return null;
        } catch (error) {
            console.warn(`⚠️ Failed to sync ${key} from server:`, error);
            return null;
        }
    }

    /**
     * Full data sync - upload all localStorage to Supabase
     */
    async fullSync() {
        if (!this.isEnabled) {
            console.log('ℹ️ Sync Service: Not enabled, skipping full sync');
            return false;
        }

        try {
            console.log('🔄 Starting full data sync...');
            let syncCount = 0;

            for (const key of this.storageKeys) {
                const data = localStorage.getItem(key);
                if (data) {
                    const success = await this.syncToSupabase(key, data);
                    if (success) syncCount++;
                }
            }

            console.log(`✅ Full sync completed: ${syncCount} items synced`);
            return true;
        } catch (error) {
            console.warn('⚠️ Full sync failed:', error);
            return false;
        }
    }

    /**
     * Load all data from Supabase to localStorage
     */
    async loadFromSupabase() {
        if (!this.isEnabled) return false;

        try {
            console.log('📥 Loading data from server...');
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('No authenticated user');

            const { data, error } = await this.supabase
                .from('user_data')
                .select('data_key, data_value')
                .eq('user_id', user.id);

            if (error) throw error;

            // SMART MERGE: Don't overwrite local data if server is empty
            let loadCount = 0;
            const hasServerData = data && data.length > 0;
            const localDataExists = this.storageKeys.some(key => {
                const localData = localStorage.getItem(key);
                return localData && localData !== '{}' && localData !== '[]' && localData !== 'null';
            });

            if (hasServerData) {
                // Check if we need to merge or replace
                if (localDataExists) {
                    console.log('🔄 Both local and server data exist, merging...');
                    
                    // Create a map of server data
                    const serverDataMap = {};
                    for (const item of data) {
                        if (item.data_key && item.data_value) {
                            serverDataMap[item.data_key] = item.data_value;
                        }
                    }
                    
                    // For each storage key, decide whether to use local or server data
                    for (const key of this.storageKeys) {
                        const localData = localStorage.getItem(key);
                        const serverData = serverDataMap[key];
                        
                        if (serverData && (!localData || localData === '{}' || localData === '[]')) {
                            // No local data, use server data
                            localStorage.setItem(key, serverData);
                            loadCount++;
                        } else if (localData && (!serverData || serverData === '{}' || serverData === '[]')) {
                            // No server data but have local data, upload local to server
                            console.log(`📤 Uploading local data for ${key} to server...`);
                            await this.syncToSupabase(key, localData);
                        } else if (serverData && localData) {
                            // Both exist, use server data (assuming it's more recent)
                            localStorage.setItem(key, serverData);
                            loadCount++;
                        }
                    }
                } else {
                    // No local data, safe to load everything from server
                    for (const item of data) {
                        if (item.data_key && item.data_value) {
                            localStorage.setItem(item.data_key, item.data_value);
                            loadCount++;
                        }
                    }
                }
            } else if (localDataExists) {
                // No server data but have local data, upload it
                console.log('📤 No server data found, uploading local data...');
                await this.saveToSupabase();
            }

            console.log(`✅ Loaded ${loadCount} items from server`);
            
            // Trigger page refresh to show synced data
            if (loadCount > 0 || hasServerData) {
                window.dispatchEvent(new Event('dataLoaded'));
            }
            
            return true;
        } catch (error) {
            console.warn('⚠️ Failed to load data from server:', error);
            return false;
        }
    }

    /**
     * Auto-sync on data changes
     */
    enableAutoSync() {
        if (!this.isEnabled) return;

        // Monitor localStorage changes
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = (key, value) => {
            originalSetItem.call(localStorage, key, value);
            
            // Only sync school platform data
            if (this.storageKeys.includes(key)) {
                // Debounce sync to avoid too many requests
                clearTimeout(this.syncTimeout);
                this.syncTimeout = setTimeout(() => {
                    this.syncToSupabase(key, value);
                }, 1000);
            }
        };

        console.log('🔄 Auto-sync enabled');
    }

    /**
     * Get sync status
     */
    getStatus() {
        return {
            isEnabled: this.isEnabled,
            isInitialized: this.isInitialized,
            lastSyncTime: this.lastSyncTime,
            syncInProgress: this.syncInProgress
        };
    }

    /**
     * Enhanced data getter with sync
     */
    async getData(key, defaultValue = null) {
        // Try localStorage first
        let data = localStorage.getItem(key);
        
        // If not found and sync is enabled, try server
        if (!data && this.isEnabled) {
            const serverData = await this.syncFromSupabase(key);
            if (serverData) {
                localStorage.setItem(key, serverData);
                data = serverData;
            }
        }

        if (!data) return defaultValue;

        try {
            return JSON.parse(data);
        } catch (e) {
            return data;
        }
    }

    /**
     * Enhanced data setter with sync
     */
    async setData(key, value) {
        const dataValue = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, dataValue);
        
        // Sync to server if enabled
        if (this.isEnabled) {
            await this.syncToSupabase(key, dataValue);
        }
    }
}

// Create singleton instance
const syncService = new SyncService();

// Initialize on page load
if (typeof window !== 'undefined') {
    window.addEventListener('load', async () => {
        await syncService.initialize();
        
        // Check if user is authenticated and load data
        if (syncService.isEnabled) {
            await syncService.loadFromSupabase();
            syncService.enableAutoSync();
        }
    });

    // Also initialize on auth state changes
    window.addEventListener('authStateChanged', async () => {
        await syncService.initialize();
        if (syncService.isEnabled) {
            await syncService.loadFromSupabase();
        }
    });
}

export default syncService;
