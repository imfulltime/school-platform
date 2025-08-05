/**
 * Authentication Guard for School Platform
 * Ensures users are authenticated before accessing protected pages
 */

class AuthGuard {
    constructor() {
        this.supabaseClient = null;
        this.currentUser = null;
        this.init();
    }

    async init() {
        try {
            // Try to load Supabase client
            const { supabase } = await import('./supabase-client.js');
            this.supabaseClient = supabase;
            window.supabaseClient = supabase;
            
            // Set up auth state listener
            this.setupAuthListener();
        } catch (error) {
            console.log('Supabase not configured, using localStorage mode');
        }
        
        // Check authentication status
        this.checkAuth();
    }

    setupAuthListener() {
        if (!this.supabaseClient) return;
        
        this.supabaseClient.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event);
            
            if (event === 'SIGNED_IN' && session) {
                this.currentUser = session.user;
                sessionStorage.setItem('currentUser', JSON.stringify(session.user));
                this.updateUserProfile(session.user);
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                sessionStorage.removeItem('currentUser');
                this.redirectToAuth();
            } else if (event === 'TOKEN_REFRESHED' && session) {
                sessionStorage.setItem('currentUser', JSON.stringify(session.user));
            }
        });
    }

    checkAuth() {
        // Skip auth check for public pages
        const publicPages = ['auth.html', 'index.html', 'login.html'];
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        if (publicPages.includes(currentPage)) {
            return true;
        }

        // Check for stored user data
        const storedUser = sessionStorage.getItem('currentUser');
        if (storedUser) {
            try {
                this.currentUser = JSON.parse(storedUser);
                return true;
            } catch (error) {
                console.error('Invalid user data in session');
                this.redirectToAuth();
                return false;
            }
        } else {
            this.redirectToAuth();
            return false;
        }
    }

    async updateUserProfile(user) {
        if (!this.supabaseClient) return;
        
        try {
            // Update or create profile in the database
            const { error } = await this.supabaseClient
                .from('profiles')
                .upsert({
                    id: user.id,
                    email: user.email,
                    full_name: user.user_metadata?.full_name || user.email.split('@')[0],
                    last_sign_in: new Date().toISOString()
                });
            
            if (error) {
                console.error('Error updating profile:', error);
            }
        } catch (error) {
            console.error('Error in updateUserProfile:', error);
        }
    }

    redirectToAuth() {
        if (window.location.pathname !== '/auth.html' && !window.location.pathname.endsWith('auth.html')) {
            window.location.href = 'auth.html';
        }
    }

    async signOut() {
        try {
            if (this.supabaseClient) {
                const { error } = await this.supabaseClient.auth.signOut();
                if (error) throw error;
            }
        } catch (error) {
            console.error('Error signing out:', error);
        } finally {
            // Always clear local data and redirect
            this.currentUser = null;
            sessionStorage.removeItem('currentUser');
            localStorage.removeItem('userSession');
            this.redirectToAuth();
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getUserName() {
        if (!this.currentUser) return 'User';
        
        return this.currentUser.user_metadata?.full_name || 
               this.currentUser.email?.split('@')[0] || 
               'User';
    }

    getUserEmail() {
        return this.currentUser?.email || '';
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    // Sync user data with backend
    async syncUserData(data) {
        if (!this.supabaseClient || !this.currentUser) return;
        
        try {
            // Store user-specific data in the backend
            const { error } = await this.supabaseClient
                .from('user_data')
                .upsert({
                    user_id: this.currentUser.id,
                    data: data,
                    updated_at: new Date().toISOString()
                });
            
            if (error) throw error;
            console.log('✅ User data synced to backend');
        } catch (error) {
            console.error('❌ Error syncing user data:', error);
        }
    }

    // Retrieve user data from backend
    async getUserData() {
        if (!this.supabaseClient || !this.currentUser) return null;
        
        try {
            const { data, error } = await this.supabaseClient
                .from('user_data')
                .select('data')
                .eq('user_id', this.currentUser.id)
                .single();
            
            if (error) throw error;
            return data?.data || null;
        } catch (error) {
            console.error('Error retrieving user data:', error);
            return null;
        }
    }
}

// Initialize auth guard
const authGuard = new AuthGuard();

// Export for use in other modules
export default authGuard;