/**
 * Sync Loader - Include this in all pages for automatic data synchronization
 * This script handles loading the sync service and initializing it
 */

(async function() {
    'use strict';
    
    // Check if Supabase is available
    if (typeof window === 'undefined' || !window.supabase) {
        console.log('ℹ️ Supabase not available, using localStorage only');
        return;
    }

    try {
        // Initialize Supabase client
        const supabaseUrl = 'https://dbztnbqtkhenfjhaughw.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRienRuYnF0a2hlbmZqaGF1Z2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzODc1NzMsImV4cCI6MjA2OTk2MzU3M30.trRjc2khddlb1RXR1CXeONhlEIYlJBlZ0lncvH5RJFs';
        
        const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
        
        // Create simple sync service
        const SyncService = {
            supabase: supabase,
            isEnabled: false,
            isInitialized: false,
            
            async initialize() {
                if (this.isInitialized) return this.isEnabled;
                
                try {
                    const { data: { user } } = await this.supabase.auth.getUser();
                    this.isEnabled = !!user;
                    
                    if (this.isEnabled) {
                        console.log('✅ Sync enabled for user:', user.email);
                        await this.loadFromSupabase();
                        this.enableAutoSync();
                    } else {
                        console.log('ℹ️ No authenticated user, using localStorage only');
                    }
                } catch (error) {
                    console.warn('⚠️ Sync initialization failed:', error);
                    this.isEnabled = false;
                }
                
                this.isInitialized = true;
                return this.isEnabled;
            },
            
            async loadFromSupabase() {
                if (!this.isEnabled) return false;
                
                try {
                    const { data: { user } } = await this.supabase.auth.getUser();
                    if (!user) return false;
                    
                    const { data, error } = await this.supabase
                        .from('user_data')
                        .select('data_key, data_value')
                        .eq('user_id', user.id);
                    
                    if (error) throw error;
                    
                    let loadCount = 0;
                    if (data && data.length > 0) {
                        for (const item of data) {
                            if (item.data_key && item.data_value) {
                                localStorage.setItem(item.data_key, item.data_value);
                                loadCount++;
                            }
                        }
                    }
                    
                    if (loadCount > 0) {
                        console.log(`📥 Loaded ${loadCount} items from server`);
                        // Trigger page refresh to show synced data
                        window.dispatchEvent(new Event('dataLoaded'));
                    }
                    
                    return true;
                } catch (error) {
                    console.warn('⚠️ Failed to load data from server:', error);
                    return false;
                }
            },
            
            async syncToSupabase(key, data) {
                if (!this.isEnabled) return false;
                
                try {
                    const { data: { user } } = await this.supabase.auth.getUser();
                    if (!user) return false;
                    
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
                    
                    console.log(`📤 Synced to server: ${key}`);
                    return true;
                } catch (error) {
                    console.warn(`⚠️ Failed to sync ${key} to server:`, error);
                    return false;
                }
            },
            
            enableAutoSync() {
                if (!this.isEnabled) return;
                
                const storageKeys = [
                    'schoolPlatform_classRecords',
                    'schoolPlatform_studentProfiles',
                    'schoolPlatform_teacherProfile',
                    'schoolPlatform_attendance'
                ];
                
                // Monitor localStorage changes
                const originalSetItem = localStorage.setItem;
                localStorage.setItem = (key, value) => {
                    originalSetItem.call(localStorage, key, value);
                    
                    // Only sync school platform data
                    if (storageKeys.includes(key)) {
                        // Debounce sync to avoid too many requests
                        clearTimeout(this.syncTimeout);
                        this.syncTimeout = setTimeout(() => {
                            this.syncToSupabase(key, value);
                        }, 1000);
                    }
                };
                
                console.log('🔄 Auto-sync enabled');
            }
        };
        
        // Make available globally
        window.syncService = SyncService;
        
        // Initialize sync service
        try {
            await SyncService.initialize();
        } catch (error) {
            console.warn('⚠️ Failed to initialize sync service:', error);
        }
        
        // Listen for data loaded events to refresh pages
        window.addEventListener('dataLoaded', () => {
            // Refresh any statistics or data displays
            if (typeof updateStats === 'function') {
                updateStats();
            }
            if (typeof loadRealData === 'function') {
                loadRealData();
            }
            if (typeof refreshData === 'function') {
                refreshData();
            }
        });
        
        // Listen for auth state changes
        window.addEventListener('authStateChanged', async () => {
            await SyncService.initialize();
        });
        
    } catch (error) {
        console.warn('⚠️ Sync loader failed:', error);
    }
})();
