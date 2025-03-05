// ===== UTILITY FUNCTIONS =====

// Show a message in an element
function showMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<div class="${type}-message">${message}</div>`;
    }
}

// Set button loading state
function setButtonLoading(buttonId, isLoading, originalText = 'Submit') {
    const button = document.getElementById(buttonId);
    if (button) {
        if (isLoading) {
            button.innerHTML = '<span class="spinner"></span> Loading...';
            button.disabled = true;
        } else {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }
}

// Make an API call with fallbacks
async function callApi(endpoint, method, data) {
    console.log(`API call to ${endpoint} with method ${method}`);
    
    // Try using fetch API first
    try {
        const response = await fetch(endpoint, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            return await response.json();
        }
        
        throw new Error(`Server returned ${response.status}`);
    } catch (fetchError) {
        console.warn("Fetch API failed, trying XMLHttpRequest as fallback");
        
        // XMLHttpRequest fallback
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open(method, endpoint, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.timeout = 15000; // 15 seconds timeout
            
            xhr.onload = function() {
                if (this.status >= 200 && this.status < 300) {
                    try {
                        const data = JSON.parse(this.responseText);
                        resolve(data);
                    } catch (e) {
                        reject(new Error("Invalid JSON response"));
                    }
                } else {
                    reject(new Error(`Server returned ${this.status}`));
                }
            };
            
            xhr.onerror = function() {
                reject(new Error("Network request failed"));
            };
            
            xhr.ontimeout = function() {
                reject(new Error("Request timed out"));
            };
            
            xhr.send(JSON.stringify(data));
        });
    }
}

// ===== COOKIE HANDLING FOR REMEMBER ME =====

// Set a cookie with expiry
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Strict";
}

// Get a cookie by name
function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// Delete a cookie
function eraseCookie(name) {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

// ===== LOGIN FUNCTION =====

// Handle login form submission
function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe')?.checked || false;
    
    // Basic validation
    if (!email || !password) {
        showMessage('loginMessage', 'Please enter both email and password', 'error');
        return;
    }
    
    loginUser(email, password, rememberMe);
}

// Main login function
async function loginUser(email, password, rememberMe = false) {
    console.log(`Attempting login for: ${email}, Remember Me: ${rememberMe}`);
    
    // Show loading state
    setButtonLoading('loginButton', true, 'Login');
    showMessage('loginMessage', '', '');
    
    try {
        // Define API endpoints (primary and backup)
        const endpoints = [
            'https://ylwynk6l46.execute-api.us-east-2.amazonaws.com/default/login',
            'https://ylwynk6l46.execute-api.us-east-2.amazonaws.com/default/AdvancedAgentBackend/login'
        ];
        
        let userData = null;
        let lastError = null;
        
        // Try each endpoint until one succeeds
        for (const endpoint of endpoints) {
            try {
                userData = await callApi(endpoint, 'POST', { email, password });
                break; // Exit the loop if successful
            } catch (err) {
                console.warn(`Login failed on endpoint ${endpoint}:`, err);
                lastError = err;
            }
        }
        
        // If all endpoints failed
        if (!userData) {
            throw lastError || new Error("Failed to connect to any server");
        }
        
        // Login successful, store token
        console.log("Login successful");
        localStorage.setItem('authToken', userData.token);
        localStorage.setItem('userEmail', email);
        localStorage.setItem('loginTimestamp', Date.now().toString());
        
        // If Remember Me is checked, set a cookie for 30 days
        if (rememberMe) {
            console.log("Setting remember me for 30 days");
            // Store encrypted credentials in a cookie (better than plaintext)
            const encryptedCreds = btoa(`${email}:${userData.token}`); // Simple Base64 encoding
            setCookie('rememberAuth', encryptedCreds, 30);
        }
        
        // Show success message and redirect
        showMessage('loginMessage', 'Login successful! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = 'app.html';
        }, 1500);
        
    } catch (error) {
        console.error("Login error:", error);
        
        // Show user-friendly error message
        let errorMessage = 'Login failed. Please check your credentials and try again.';
        if (error.message.includes('network') || error.message.includes('connect')) {
            errorMessage = 'Network error. Please check your internet connection and try again.';
        }
        
        showMessage('loginMessage', errorMessage, 'error');
    } finally {
        // Reset button state
        setButtonLoading('loginButton', false, 'Login');
    }
}

// ===== PASSWORD RESET FUNCTIONS =====

// Handle password reset request
function handleResetRequest() {
    const email = document.getElementById('resetEmail').value;
    
    if (!email) {
        showMessage('resetMessage', 'Please enter your email address', 'error');
        return;
    }
    
    requestPasswordReset(email);
}

// Request password reset code
async function requestPasswordReset(email) {
    console.log("Requesting password reset for:", email);
    
    // Show loading state
    setButtonLoading('resetRequestButton', true, 'Send Reset Code');
    showMessage('resetMessage', '', '');
    
    try {
        const endpoints = [
            'https://ylwynk6l46.execute-api.us-east-2.amazonaws.com/default/requestReset',
            'https://ylwynk6l46.execute-api.us-east-2.amazonaws.com/default/AdvancedAgentBackend/requestReset'
        ];
        
        let result = null;
        let lastError = null;
        
        // Try each endpoint
        for (const endpoint of endpoints) {
            try {
                result = await callApi(endpoint, 'POST', { email });
                break;
            } catch (err) {
                console.warn(`Reset request failed on endpoint ${endpoint}:`, err);
                lastError = err;
            }
        }
        
        if (!result) {
            throw lastError || new Error("Failed to connect to any server");
        }
        
        // Store email for verification step
        localStorage.setItem('resetEmail', email);
        
        // Show success and reveal verification form
        showMessage('resetMessage', 'Reset code sent! Check your email.', 'success');
        document.getElementById('resetRequestForm').style.display = 'none';
        document.getElementById('resetVerificationForm').style.display = 'block';
        
    } catch (error) {
        console.error("Reset request error:", error);
        
        let errorMessage = 'Unable to send reset code. Please try again later.';
        if (error.message.includes('network') || error.message.includes('connect')) {
            errorMessage = 'Network error. Please check your internet connection.';
        }
        
        showMessage('resetMessage', errorMessage, 'error');
    } finally {
        setButtonLoading('resetRequestButton', false, 'Send Reset Code');
    }
}

// Handle password reset completion
function handleResetCompletion() {
    const code = document.getElementById('resetCode').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation
    if (!code || !newPassword || !confirmPassword) {
        showMessage('resetVerificationMessage', 'Please fill in all fields', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showMessage('resetVerificationMessage', 'Passwords do not match', 'error');
        return;
    }
    
    completePasswordReset(code, newPassword);
}

// Complete password reset
async function completePasswordReset(code, newPassword) {
    console.log("Completing password reset");
    
    // Show loading state
    setButtonLoading('resetCompleteButton', true, 'Reset Password');
    showMessage('resetVerificationMessage', '', '');
    
    // Get stored email
    const email = localStorage.getItem('resetEmail');
    if (!email) {
        showMessage('resetVerificationMessage', 'Session expired. Please restart the password reset process.', 'error');
        setButtonLoading('resetCompleteButton', false, 'Reset Password');
        return;
    }
    
    try {
        const endpoints = [
            'https://ylwynk6l46.execute-api.us-east-2.amazonaws.com/default/resetPassword',
            'https://ylwynk6l46.execute-api.us-east-2.amazonaws.com/default/AdvancedAgentBackend/resetPassword'
        ];
        
        let result = null;
        let lastError = null;
        
        // Try each endpoint
        for (const endpoint of endpoints) {
            try {
                result = await callApi(endpoint, 'POST', { email, code, newPassword });
                break;
            } catch (err) {
                console.warn(`Password reset failed on endpoint ${endpoint}:`, err);
                lastError = err;
            }
        }
        
        if (!result) {
            throw lastError || new Error("Failed to connect to any server");
        }
        
        // Clear stored email
        localStorage.removeItem('resetEmail');
        
        // Show success message
        showMessage('resetVerificationMessage', 'Password reset successful! Redirecting to login...', 'success');
        
        // Redirect to login
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        
    } catch (error) {
        console.error("Password reset error:", error);
        
        let errorMessage = 'Password reset failed. Please check your code and try again.';
        if (error.message.includes('network') || error.message.includes('connect')) {
            errorMessage = 'Network error. Please check your internet connection.';
        }
        
        showMessage('resetVerificationMessage', errorMessage, 'error');
    } finally {
        setButtonLoading('resetCompleteButton', false, 'Reset Password');
    }
}

// ===== SESSION MANAGEMENT =====

// Check if user is logged in
function checkAuthState() {
    const token = localStorage.getItem('authToken');
    const loginTimestamp = localStorage.getItem('loginTimestamp');
    
    // Not logged in
    if (!token) {
        // Check for Remember Me cookie
        const rememberAuth = getCookie('rememberAuth');
        
        if (rememberAuth) {
            try {
                // Attempt auto-login with stored credentials
                console.log("Found remember me cookie, attempting auto-login");
                
                // Decode the stored credentials
                const decoded = atob(rememberAuth);
                const [email, savedToken] = decoded.split(':');
                
                if (email && savedToken) {
                    // Auto-login using the token
                    localStorage.setItem('authToken', savedToken);
                    localStorage.setItem('userEmail', email);
                    localStorage.setItem('loginTimestamp', Date.now().toString());
                    localStorage.setItem('autoLogin', 'true');
                    
                    // Return true to indicate successful auto-login
                    return true;
                }
            } catch (e) {
                console.error("Auto-login failed:", e);
                // Delete invalid cookie
                eraseCookie('rememberAuth');
            }
        }
        
        return false;
    }
    
    // Check token expiry (24 hours for regular login, 30 days for remember me)
    if (loginTimestamp) {
        const tokenAge = Date.now() - parseInt(loginTimestamp);
        
        // 30 days for remember me, 24 hours for regular login
        const hasRememberMeCookie = getCookie('rememberAuth') !== null;
        const tokenExpiryTime = hasRememberMeCookie ? 
            30 * 24 * 60 * 60 * 1000 : // 30 days
            24 * 60 * 60 * 1000;       // 24 hours
        
        if (tokenAge > tokenExpiryTime) {
            // Clear expired token
            localStorage.removeItem('authToken');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('loginTimestamp');
            localStorage.removeItem('autoLogin');
            
            // Also clear the cookie if it exists
            if (hasRememberMeCookie) {
                eraseCookie('rememberAuth');
            }
            
            return false;
        }
    }
    
    return true;
}

// Helper function to check authentication state on protected pages
function requireAuth() {
    if (!checkAuthState()) {
        window.location.href = 'login.html?expired=true';
        return false;
    }
    return true;
}

// Run on page load
document.addEventListener('DOMContentLoaded', function() {
    // Handle expired session message on login page
    if (window.location.pathname.includes('login.html')) {
        if (window.location.search.includes('expired=true')) {
            showMessage('loginMessage', 'Your session has expired. Please log in again.', 'info');
        }
        
        // Check if we have stored credentials
        const email = localStorage.getItem('userEmail');
        if (email) {
            document.getElementById('email').value = email;
            document.getElementById('password').focus();
        }
    }
    
    // Protected pages (adjust paths as needed)
    const currentPath = window.location.pathname;
    if (currentPath.includes('app.html')) {
        requireAuth();
        
        // Check if this was an auto-login
        if (localStorage.getItem('autoLogin') === 'true') {
            // Log the auto-login event (optional)
            console.log("Auto-login successful");
            localStorage.removeItem('autoLogin');
        }
    }
});
