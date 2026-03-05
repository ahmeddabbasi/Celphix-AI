// Configuration for API endpoints
class Config {
    constructor() {
        // Check if we're in development or production
        this.isDevelopment = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1';
        
        // Force clear any old backend URLs from cache
        this.clearOldBackendUrls();
        
        // Default URLs
        if (this.isDevelopment) {
            this.apiUrl = 'http://localhost:8000';
            this.wsUrl = 'ws://localhost:8000';
            this.isConfigured = true;
        } else {
            // In production, prefer same-origin (works great behind ALB/CloudFront/Nginx).
            // If you need a different API host, set it at deploy-time (VITE_API_URL/VITE_WS_URL)
            // and/or adjust this static config.
            this.apiUrl = window.location.origin;
            this.wsUrl = window.location.origin.replace('https://', 'wss://').replace('http://', 'ws://');
            this.isConfigured = true;
        }
        
        console.log('Config initialized:', {
            isDevelopment: this.isDevelopment,
            apiUrl: this.apiUrl,
            wsUrl: this.wsUrl,
            isConfigured: this.isConfigured
        });
    }
    
    clearOldBackendUrls() {
        // Clear any old tunnel URLs and cached data
        const keysToCheck = ['backend_url', 'api_url', 'websocket_url', 'config_cache'];
        keysToCheck.forEach(key => {
            const value = localStorage.getItem(key);
            if (value && (value.includes('serveo.net') || 
                         value.includes('ngrok') || 
                         value.includes('tunnel') ||
                         value.includes('localtunnel'))) {
                localStorage.removeItem(key);
                console.log('Cleared old backend URL from localStorage:', key, value);
            }
        });
        
        // Force clear all potentially cached URLs
        localStorage.removeItem('backend_url');
        localStorage.removeItem('api_url');
        localStorage.removeItem('websocket_url');
        console.log('Cleared all cached backend URLs');
    }
    
    async verifyConnection() {
        try {
            const response = await fetch(`${this.apiUrl}/config`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                timeout: 10000
            });
            
            if (response.ok) {
                console.log('Backend connection verified');
                this.isConfigured = true;
                
                // Cache the working URL
                localStorage.setItem('backend_url', this.apiUrl);
                
                return true;
            } else {
                console.error('Backend responded with error:', response.status);
                return false;
            }
        } catch (error) {
            console.error('Failed to connect to backend:', error);
            return false;
        }
    }
    
    async promptForUrl() {
        if (this.isDevelopment) {
            return; // Don't prompt in development
        }
        
        const userUrl = prompt(
            'Backend connection failed. Please enter the backend URL (e.g., https://your-tunnel.serveo.net):',
            this.apiUrl
        );
        
        if (userUrl && userUrl.trim()) {
            this.apiUrl = userUrl.trim();
            this.wsUrl = this.apiUrl.replace('http', 'ws');
            
            // Test the new URL
            const isWorking = await this.verifyConnection();
            if (isWorking) {
                console.log('New backend URL is working');
                return true;
            } else {
                console.log('New backend URL is not working');
                return false;
            }
        }
        
        return false;
    }
    
    getApiUrl() {
        return this.apiUrl;
    }
    
    getWsUrl() {
        return this.wsUrl;
    }
}

// Create global config instance
window.appConfig = new Config();

// Initialize global config
window.config = new Config();
