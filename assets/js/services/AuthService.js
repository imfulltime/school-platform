/**
 * AuthService - Centralized Authentication Management
 * Handles login, logout, session management, and authentication guards
 */

class AuthService {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.isInitialized = false;
        this.onAuthStateChange = null;
    }

    /**
     * Initialize the authentication service
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // Initialize Supabase client
            if (typeof window !== 'undefined' && window.supabase) {
                const supabaseUrl = 'https://dbztnbqtkhenfjhaughw.supabase.co';
                const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRienRuYnF0a2hlbmZqaGF1Z2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzODc1NzMsImV4cCI6MjA2OTk2MzU3M30.trRjc2khddlb1RXR1CXeONhlEIYlJBlZ0lncvH5RJFs';
                
                this.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
                
                // Set up auth state listener
                this.supabase.auth.onAuthStateChange((event, session) => {
                    this.handleAuthStateChange(event, session);
                });
                
                // Check current session
                const { data: { session } } = await this.supabase.auth.getSession();
                if (session) {
                    this.currentUser = session.user;
                }
                
                this.isInitialized = true;
                console.log('✅ AuthService initialized successfully');
                
            } else {
                throw new Error('Supabase library not available');
            }
        } catch (error) {
            console.error('❌ AuthService initialization failed:', error);
            throw error;
        }
    }

    /**
     * Handle authentication state changes
     */
    handleAuthStateChange(event, session) {
        console.log('🔔 Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session) {
            this.currentUser = session.user;
            console.log('✅ User signed in:', session.user.email);
            
            // Store essential user info (no sensitive data)
            sessionStorage.setItem('currentUser', JSON.stringify({
                id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata?.full_name || session.user.email
            }));
            
        } else if (event === 'SIGNED_OUT') {
            this.currentUser = null;
            console.log('👋 User signed out');
            
            // Clear all session data
            sessionStorage.clear();
            
            // Redirect to auth page if not already there
            if (!window.location.pathname.includes('auth.html') && !window.location.pathname.includes('index.html')) {
                window.location.href = 'auth.html';
            }
        }
        
        // Trigger custom event for other services
        if (this.onAuthStateChange) {
            this.onAuthStateChange(event, session);
        }
        
        window.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: { event, session, user: this.currentUser }
        }));
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.currentUser;
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get current user ID
     */
    getCurrentUserId() {
        return this.currentUser?.id || null;
    }

    /**
     * Sign in with email and password
     */
    async signIn(email, password) {
        if (!this.supabase) {
            throw new Error('AuthService not initialized');
        }

        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            throw error;
        }

        return data;
    }

    /**
     * Sign up with email and password
     */
    async signUp(email, password, metadata = {}) {
        if (!this.supabase) {
            throw new Error('AuthService not initialized');
        }

        const { data, error } = await this.supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata
            }
        });

        if (error) {
            throw error;
        }

        return data;
    }

    /**
     * Sign out
     */
    async signOut() {
        if (!this.supabase) {
            throw new Error('AuthService not initialized');
        }

        console.log('🚪 Signing out user...');
        
        try {
            // Clear all local storage (force online-only mode)
            this.clearAllLocalData();
            
            // Sign out from Supabase
            const { error } = await this.supabase.auth.signOut();
            
            if (error) {
                console.error('Logout error:', error);
            }
            
            // Force redirect to auth page
            window.location.href = 'auth.html?logout=true';
            
        } catch (error) {
            console.error('❌ Error during logout:', error);
            // Force redirect even if logout fails
            this.clearAllLocalData();
            window.location.href = 'auth.html?logout=true';
        }
    }

    /**
     * Clear all local data (localStorage and sessionStorage)
     */
    clearAllLocalData() {
        console.log('🗑️ Clearing all local data...');
        
        // Clear all localStorage items
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('schoolPlatform_') || key.startsWith('supabase.'))) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Clear sessionStorage
        sessionStorage.clear();
        
        console.log(`🗑️ Cleared ${keysToRemove.length} localStorage items and all sessionStorage`);
    }

    /**
     * Auth guard - redirects to login if not authenticated
     */
    async requireAuth() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        // Wait a moment for auth state to settle
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Double-check session from Supabase directly
        if (this.supabase) {
            const { data: { session } } = await this.supabase.auth.getSession();
            if (session && session.user) {
                this.currentUser = session.user;
                console.log('✅ Session verified from Supabase');
                return true;
            }
        }

        if (!this.isAuthenticated()) {
            console.log('🚫 Authentication required - redirecting to login');
            window.location.href = 'auth.html?reason=auth_required';
            return false;
        }

        return true;
    }

    /**
     * Get Supabase client (only if authenticated)
     */
    getSupabaseClient() {
        if (!this.isAuthenticated()) {
            throw new Error('Must be authenticated to access Supabase client');
        }
        return this.supabase;
    }

    /**
     * Reset password
     */
    async resetPassword(email) {
        if (!this.supabase) {
            throw new Error('AuthService not initialized');
        }

        const { data, error } = await this.supabase.auth.resetPasswordForEmail(email);

        if (error) {
            throw error;
        }

        return data;
    }

    /**
     * Update user profile
     */
    async updateProfile(updates) {
        if (!this.supabase || !this.isAuthenticated()) {
            throw new Error('Must be authenticated to update profile');
        }

        const { data, error } = await this.supabase.auth.updateUser({
            data: updates
        });

        if (error) {
            throw error;
        }

        return data;
    }
}

// Create global instance
window.authService = new AuthService();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthService;
}
