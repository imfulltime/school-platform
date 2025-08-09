// Progressive Web App (PWA) functionality
// Handles service worker registration, install prompts, and offline detection

class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.isOnline = navigator.onLine;
        this.serviceWorker = null;
        
        this.init();
    }
    
    async init() {
        console.log('🚀 PWA Manager: Initializing...');
        
        // Register service worker
        await this.registerServiceWorker();
        
        // Setup install prompt
        this.setupInstallPrompt();
        
        // Setup online/offline detection
        this.setupConnectivityDetection();
        
        // Setup UI updates
        this.setupUIUpdates();
        
        console.log('✅ PWA Manager: Initialized successfully');
    }
    
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                console.log('📦 PWA: Registering service worker...');
                
                const registration = await navigator.serviceWorker.register('/service-worker.js', {
                    scope: '/'
                });
                
                this.serviceWorker = registration;
                
                console.log('✅ PWA: Service Worker registered successfully');
                
                // Handle updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateAvailable();
                        }
                    });
                });
                
                // Listen for messages from service worker
                navigator.serviceWorker.addEventListener('message', event => {
                    this.handleServiceWorkerMessage(event.data);
                });
                
            } catch (error) {
                console.error('❌ PWA: Service Worker registration failed:', error);
            }
        } else {
            console.log('⚠️ PWA: Service Workers not supported');
        }
    }
    
    setupInstallPrompt() {
        // Capture the install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('💾 PWA: Install prompt available');
            
            // Prevent the automatic prompt
            e.preventDefault();
            
            // Store the event for later use
            this.deferredPrompt = e;
            
            // Show custom install button
            this.showInstallButton();
        });
        
        // Handle successful installation
        window.addEventListener('appinstalled', () => {
            console.log('🎉 PWA: App installed successfully');
            this.hideInstallButton();
            this.showNotification('App installed successfully! 🎉', 'success');
        });
    }
    
    setupConnectivityDetection() {
        window.addEventListener('online', () => {
            console.log('🌐 PWA: Connection restored');
            this.isOnline = true;
            this.updateConnectivityUI();
            this.syncDataWhenOnline();
        });
        
        window.addEventListener('offline', () => {
            console.log('📱 PWA: App is now offline');
            this.isOnline = false;
            this.updateConnectivityUI();
        });
        
        // Initial connectivity check
        this.updateConnectivityUI();
    }
    
    setupUIUpdates() {
        // Add PWA status to the page
        this.addPWAStatus();
        
        // Check if running as installed app
        if (window.matchMedia('(display-mode: standalone)').matches || 
            window.navigator.standalone === true) {
            console.log('📱 PWA: Running as installed app');
            document.body.classList.add('pwa-standalone');
        }
    }
    
    addPWAStatus() {
        // Add connectivity indicator
        const connectivityIndicator = document.createElement('div');
        connectivityIndicator.id = 'connectivity-indicator';
        connectivityIndicator.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 10000;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            color: white;
            transition: all 0.3s ease;
            display: none;
        `;
        document.body.appendChild(connectivityIndicator);
        
        // Add install button
        const installButton = document.createElement('button');
        installButton.id = 'pwa-install-btn';
        installButton.innerHTML = '📱 Install App';
        installButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            padding: 12px 20px;
            background: #4285f4;
            color: white;
            border: none;
            border-radius: 25px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
            transition: all 0.3s ease;
            display: none;
        `;
        installButton.onclick = () => this.promptInstall();
        document.body.appendChild(installButton);
    }
    
    showInstallButton() {
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) {
            installBtn.style.display = 'block';
            setTimeout(() => {
                installBtn.style.transform = 'translateY(0)';
                installBtn.style.opacity = '1';
            }, 100);
        }
    }
    
    hideInstallButton() {
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) {
            installBtn.style.display = 'none';
        }
    }
    
    async promptInstall() {
        if (!this.deferredPrompt) {
            this.showNotification('Install prompt not available', 'info');
            return;
        }
        
        try {
            // Show the install prompt
            this.deferredPrompt.prompt();
            
            // Wait for user response
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('👍 PWA: User accepted install prompt');
            } else {
                console.log('👎 PWA: User declined install prompt');
            }
            
            // Clear the prompt
            this.deferredPrompt = null;
            this.hideInstallButton();
            
        } catch (error) {
            console.error('❌ PWA: Install prompt failed:', error);
        }
    }
    
    updateConnectivityUI() {
        const indicator = document.getElementById('connectivity-indicator');
        if (!indicator) return;
        
        if (this.isOnline) {
            indicator.style.background = '#28a745';
            indicator.textContent = '🌐 Online';
            indicator.style.display = 'none'; // Only show when offline
        } else {
            indicator.style.background = '#dc3545';
            indicator.textContent = '📱 Offline Mode';
            indicator.style.display = 'block';
        }
    }
    
    async syncDataWhenOnline() {
        if (this.isOnline && this.serviceWorker) {
            try {
                // Trigger background sync
                await this.serviceWorker.sync.register('sync-school-data');
                console.log('🔄 PWA: Background sync registered');
            } catch (error) {
                console.log('⚠️ PWA: Background sync not supported, using fallback');
                // Fallback: manually trigger sync
                this.triggerManualSync();
            }
        }
    }
    
    triggerManualSync() {
        // Trigger manual sync through the main app
        if (typeof window.syncService !== 'undefined' && window.syncService.isEnabled) {
            window.syncService.loadFromSupabase()
                .then(() => {
                    console.log('✅ PWA: Manual sync completed');
                    this.showNotification('Data synchronized! 🔄', 'success');
                })
                .catch(error => {
                    console.error('❌ PWA: Manual sync failed:', error);
                });
        }
    }
    
    handleServiceWorkerMessage(data) {
        console.log('💬 PWA: Message from Service Worker:', data);
        
        switch (data.type) {
            case 'SYNC_DATA':
                this.triggerManualSync();
                break;
            default:
                console.log('🔔 PWA: Unknown message type:', data.type);
        }
    }
    
    showUpdateAvailable() {
        const updateBanner = document.createElement('div');
        updateBanner.id = 'update-banner';
        updateBanner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 10000;
            background: #4285f4;
            color: white;
            padding: 12px;
            text-align: center;
            font-weight: bold;
        `;
        updateBanner.innerHTML = `
            📱 App update available! 
            <button onclick="pwaManager.applyUpdate()" style="margin-left: 10px; background: white; color: #4285f4; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                Update Now
            </button>
            <button onclick="pwaManager.dismissUpdate()" style="margin-left: 5px; background: transparent; color: white; border: 1px solid white; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                Later
            </button>
        `;
        
        document.body.appendChild(updateBanner);
    }
    
    applyUpdate() {
        if (this.serviceWorker && this.serviceWorker.waiting) {
            this.serviceWorker.waiting.postMessage({ type: 'SKIP_WAITING' });
            
            // Reload the page to apply update
            window.location.reload();
        }
    }
    
    dismissUpdate() {
        const banner = document.getElementById('update-banner');
        if (banner) {
            banner.remove();
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10001;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            max-width: 300px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        
        notification.style.background = colors[type] || colors.info;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
    
    // Utility methods
    isInstalled() {
        return window.matchMedia('(display-mode: standalone)').matches || 
               window.navigator.standalone === true;
    }
    
    isOnlineMode() {
        return this.isOnline;
    }
    
    async clearCache() {
        if (this.serviceWorker) {
            const messageChannel = new MessageChannel();
            
            return new Promise((resolve) => {
                messageChannel.port1.onmessage = (event) => {
                    resolve(event.data.success);
                };
                
                this.serviceWorker.active.postMessage(
                    { type: 'CLEAR_CACHE' }, 
                    [messageChannel.port2]
                );
            });
        }
    }
}

// Initialize PWA Manager when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.pwaManager = new PWAManager();
    });
} else {
    window.pwaManager = new PWAManager();
}

// Export for use in other modules
window.PWAManager = PWAManager;
