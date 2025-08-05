// Alternative Supabase Client using CDN (fallback option)
// This version loads Supabase from CDN instead of npm package

// Load Supabase from CDN
const SUPABASE_URL = 'https://dbztnbqtkhenfjhaughw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRienRuYnF0a2hlbmZqaGF1Z2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzODc1NzMsImV4cCI6MjA2OTk2MzU3M30.trRjc2khddlb1RXR1CXeONhlEIYlJBlZ0lncvH5RJFs';

// Initialize Supabase (this will be available after CDN loads)
let supabase = null;
let schoolAPI = null;

// Wait for Supabase CDN to load
function waitForSupabase() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // Wait up to 5 seconds
        
        const checkSupabase = () => {
            attempts++;
            
            if (window.supabase && window.supabase.createClient) {
                // Supabase CDN loaded
                supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
                    auth: {
                        autoRefreshToken: true,
                        persistSession: true,
                        detectSessionInUrl: true
                    }
                });
                
                // Initialize SchoolAPI
                schoolAPI = new SchoolPlatformAPI(supabase);
                
                resolve({ supabase, schoolAPI });
            } else if (attempts >= maxAttempts) {
                reject(new Error('Supabase CDN failed to load'));
            } else {
                setTimeout(checkSupabase, 100);
            }
        };
        
        checkSupabase();
    });
}

// SchoolPlatformAPI class (same as the ES6 module version)
class SchoolPlatformAPI {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }
    
    // Authentication
    async signUp(email, password, fullName) {
        const { data, error } = await this.supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName
                }
            }
        });
        
        if (error) throw error;
        return data;
    }
    
    async signIn(email, password) {
        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        return data;
    }
    
    async signOut() {
        const { error } = await this.supabase.auth.signOut();
        if (error) throw error;
    }
    
    async getCurrentUser() {
        const { data: { user } } = await this.supabase.auth.getUser();
        return user;
    }
    
    // Class Management
    async createClass(name, section) {
        const user = await this.getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        
        const { data, error } = await this.supabase
            .from('classes')
            .insert({
                name,
                section,
                teacher_id: user.id
            })
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }
    
    async getClasses() {
        const user = await this.getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        
        const { data, error } = await this.supabase
            .from('classes')
            .select('*')
            .eq('teacher_id', user.id);
        
        if (error) throw error;
        return data;
    }
    
    // Enhanced data migration
    async migrateLocalData() {
        try {
            const user = await this.getCurrentUser();
            if (!user) throw new Error('User not authenticated');

            console.log('🔄 Starting data migration...');
            
            // Get all localStorage data
            const allLocalData = {
                classRecords: JSON.parse(localStorage.getItem('schoolPlatform_classRecords') || '{}'),
                studentProfiles: JSON.parse(localStorage.getItem('schoolPlatform_studentProfiles') || '{}'),
                teacherProfile: JSON.parse(localStorage.getItem('schoolPlatform_teacherProfile') || '{}'),
                attendanceData: JSON.parse(localStorage.getItem('schoolPlatform_attendance') || '{}'),
                grades: JSON.parse(localStorage.getItem('schoolPlatform_grades') || '{}')
            };

            // Store complete data in user_data table for backup
            const { error: backupError } = await this.supabase
                .from('user_data')
                .upsert({
                    user_id: user.id,
                    data: {
                        ...allLocalData,
                        migrated_at: new Date().toISOString(),
                        migration_source: 'localStorage'
                    },
                    updated_at: new Date().toISOString()
                });

            if (backupError) {
                console.warn('⚠️ Could not backup data:', backupError);
            } else {
                console.log('✅ Data backed up to user_data table');
            }

            console.log('✅ Data migration completed successfully!');
            return true;
        } catch (error) {
            console.error('❌ Data migration failed:', error);
            throw error;
        }
    }
}

// Export for global use
window.initSupabaseCDN = waitForSupabase;