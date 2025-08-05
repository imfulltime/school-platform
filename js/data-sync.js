/**
 * Data Synchronization Module for School Platform
 * Handles syncing between localStorage and Supabase backend
 */

class DataSync {
    constructor() {
        this.supabaseClient = null;
        this.schoolAPI = null;
        this.syncEnabled = false;
        this.init();
    }

    async init() {
        try {
            const { supabase, schoolAPI } = await import('./supabase-client.js');
            this.supabaseClient = supabase;
            this.schoolAPI = schoolAPI;
            this.syncEnabled = true;
            console.log('✅ Data sync initialized with Supabase');
        } catch (error) {
            console.log('⚠️ Data sync disabled - Supabase not configured');
            this.syncEnabled = false;
        }
    }

    // Sync all local data to backend
    async syncAllData() {
        if (!this.syncEnabled) return;

        const currentUser = sessionStorage.getItem('currentUser');
        if (!currentUser) return;

        try {
            const user = JSON.parse(currentUser);
            
            // Collect all localStorage data
            const allData = {
                classRecords: this.getLocalData('schoolPlatform_classRecords'),
                studentProfiles: this.getLocalData('schoolPlatform_studentProfiles'),
                teacherProfile: this.getLocalData('schoolPlatform_teacherProfile'),
                attendance: this.getLocalData('schoolPlatform_attendance'),
                grades: this.getLocalData('schoolPlatform_grades'),
                lastSync: new Date().toISOString()
            };

            // Store in user_data table
            const { error } = await this.supabaseClient
                .from('user_data')
                .upsert({
                    user_id: user.id,
                    data: allData,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            
            console.log('✅ All data synced to backend');
            return true;
        } catch (error) {
            console.error('❌ Error syncing data:', error);
            return false;
        }
    }

    // Load data from backend and merge with local
    async loadDataFromBackend() {
        if (!this.syncEnabled) return;

        const currentUser = sessionStorage.getItem('currentUser');
        if (!currentUser) return;

        try {
            const user = JSON.parse(currentUser);
            
            const { data, error } = await this.supabaseClient
                .from('user_data')
                .select('data')
                .eq('user_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" errors
            
            if (data?.data) {
                // Merge backend data with local data
                this.mergeData(data.data);
                console.log('✅ Data loaded from backend');
                return true;
            }
        } catch (error) {
            console.error('❌ Error loading data from backend:', error);
        }
        
        return false;
    }

    // Auto-sync data when changes occur
    async autoSync(dataType, newData) {
        if (!this.syncEnabled) return;

        // Update localStorage first
        localStorage.setItem(dataType, JSON.stringify(newData));
        
        // Debounce sync to avoid too many requests
        clearTimeout(this.syncTimeout);
        this.syncTimeout = setTimeout(() => {
            this.syncAllData();
        }, 2000); // Sync after 2 seconds of inactivity
    }

    // Get data from localStorage with error handling
    getLocalData(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error(`Error parsing ${key}:`, error);
            return {};
        }
    }

    // Merge backend data with local data
    mergeData(backendData) {
        const dataTypes = [
            'classRecords',
            'studentProfiles', 
            'teacherProfile',
            'attendance',
            'grades'
        ];

        dataTypes.forEach(type => {
            if (backendData[type]) {
                const localKey = `schoolPlatform_${type}`;
                const existingData = this.getLocalData(localKey);
                
                // Simple merge strategy - backend data takes precedence for conflicts
                const mergedData = { ...existingData, ...backendData[type] };
                localStorage.setItem(localKey, JSON.stringify(mergedData));
            }
        });
    }

    // Sync specific data type
    async syncDataType(dataType) {
        if (!this.syncEnabled) return;

        const currentUser = sessionStorage.getItem('currentUser');
        if (!currentUser) return;

        try {
            const user = JSON.parse(currentUser);
            const localData = this.getLocalData(`schoolPlatform_${dataType}`);
            
            // Get existing backend data
            const { data: existingData } = await this.supabaseClient
                .from('user_data')
                .select('data')
                .eq('user_id', user.id)
                .single();

            // Update the specific data type
            const updatedData = existingData?.data || {};
            updatedData[dataType] = localData;
            updatedData.lastSync = new Date().toISOString();

            const { error } = await this.supabaseClient
                .from('user_data')
                .upsert({
                    user_id: user.id,
                    data: updatedData,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            
            console.log(`✅ ${dataType} synced to backend`);
        } catch (error) {
            console.error(`❌ Error syncing ${dataType}:`, error);
        }
    }

    // Check if sync is available
    isSyncEnabled() {
        return this.syncEnabled && sessionStorage.getItem('currentUser');
    }

    // Get sync status
    async getSyncStatus() {
        if (!this.syncEnabled) return { status: 'disabled' };

        const currentUser = sessionStorage.getItem('currentUser');
        if (!currentUser) return { status: 'not_authenticated' };

        try {
            const user = JSON.parse(currentUser);
            const { data } = await this.supabaseClient
                .from('user_data')
                .select('updated_at')
                .eq('user_id', user.id)
                .single();

            return {
                status: 'enabled',
                lastSync: data?.updated_at || 'never',
                user: user.email
            };
        } catch (error) {
            return { status: 'error', error: error.message };
        }
    }
}

// Create and export singleton instance
const dataSync = new DataSync();
export default dataSync;

// Auto-initialize and setup periodic sync
window.addEventListener('load', () => {
    // Sync data every 5 minutes if user is authenticated
    setInterval(() => {
        if (dataSync.isSyncEnabled()) {
            dataSync.syncAllData();
        }
    }, 5 * 60 * 1000);
});

// Sync data before page unload
window.addEventListener('beforeunload', () => {
    if (dataSync.isSyncEnabled()) {
        // Use sendBeacon for reliable sync on page unload
        navigator.sendBeacon && dataSync.syncAllData();
    }
});