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
        
        // Try to get error message from response
        try {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server returned ${response.status}`);
        } catch (e) {
            throw new Error(`Server returned ${response.status}`);
        }
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
                    // Try to extract error message
                    try {
                        const errorData = JSON.parse(this.responseText);
                        reject(new Error(errorData.error || `Server returned ${this.status}`));
                    } catch (e) {
                        reject(new Error(`Server returned ${this.status}`));
                    }
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

// ===== SIGNUP FUNCTIONS =====

// Handle signup form submission
function handleSignup() {
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Basic validation
    if (!email || !password || !confirmPassword) {
        showMessage('signupMessage', 'Please fill in all fields', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('signupMessage', 'Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 8) {
        showMessage('signupMessage', 'Password must be at least 8 characters long', 'error');
        return;
    }
    
    signupUser(email, password);
}

// Main signup function
async function signupUser(email, password) {
    console.log(`Attempting signup for: ${email}`);
    
    // Show loading state
    setButtonLoading('signupButton', true, 'Creating Account...');
    showMessage('signupMessage', '', '');
    
    try {
        // Define API endpoints (primary and backup)
        const endpoints = [
            'https://ylwynk6l46.execute-api.us-east-2.amazonaws.com/default/register',
            'https://ylwynk6l46.execute-api.us-east-2.amazonaws.com/default/AdvancedAgentBackend/register'
        ];
        
        let userData = null;
        let lastError = null;
        
        // Try each endpoint until one succeeds
        for (const endpoint of endpoints) {
            try {
                userData = await callApi(endpoint, 'POST', { 
                    requestType: 'auth', 
                    authAction: 'register', 
                    email, 
                    password 
                });
                break; // Exit the loop if successful
            } catch (err) {
                console.warn(`Signup failed on endpoint ${endpoint}:`, err);
                lastError = err;
            }
        }
        
        // If all endpoints failed
        if (!userData) {
            throw lastError || new Error("Failed to connect to any server");
        }
        
        // Signup successful
        console.log("Signup successful");
        
        // Show success message
        document.getElementById('signupForm').style.display = 'none';
        document.getElementById('signupSuccessSection').style.display = 'block';
        
    } catch (error) {
        console.error("Signup error:", error);
        
        // Show user-friendly error message
        let errorMessage = 'Signup failed. Please try again.';
        
        if (error.message) {
            if (error.message.includes('already exists')) {
                errorMessage = 'An account with this email already exists.';
            } else if (error.message.includes('password') && error.message.includes('requirement')) {
                errorMessage = 'Password does not meet requirements. Please use at least 8 characters, including uppercase, lowercase, and numbers.';
            } else if (error.message.includes('network') || error.message.includes('connect')) {
                errorMessage = 'Network error. Please check your internet connection and try again.';
            }
        }
        
        showMessage('signupMessage', errorMessage, 'error');
    } finally {
        // Reset button state
        setButtonLoading('signupButton', false, 'Create Account');
    }
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
                userData = await callApi(endpoint, 'POST', { 
                    requestType: 'auth', 
                    authAction: 'login', 
                    email, 
                    password 
                });
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
        localStorage.setItem('authToken', userData.idToken);
        localStorage.setItem('userEmail', email);
        localStorage.setItem('loginTimestamp', Date.now().toString());
        
        // If Remember Me is checked, set a cookie for 30 days
        if (rememberMe) {
            console.log("Setting remember me for 30 days");
            // Store encrypted credentials in a cookie (better than plaintext)
            const encryptedCreds = btoa(`${email}:${userData.idToken}`); // Simple Base64 encoding
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
        
        if (error.message) {
            if (error.message.includes('not confirmed')) {
                errorMessage = 'Account not confirmed. Please check your email for the verification link.';
            } else if (error.message.includes('network') || error.message.includes('connect')) {
                errorMessage = 'Network error. Please check your internet connection and try again.';
            } else if (error.message.includes('disabled') || error.message.includes('locked')) {
                errorMessage = 'Account is locked or disabled. Please contact support.';
            }
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
    
    requestPasswordResetLink(email);
}

// Request password reset link via email
async function requestPasswordResetLink(email) {
    console.log("Requesting password reset link for:", email);
    
    // Show loading state
    setButtonLoading('resetRequestButton', true, 'Send Reset Link');
    showMessage('resetMessage', '', '');
    
    try {
        const endpoints = [
            'https://ylwynk6l46.execute-api.us-east-2.amazonaws.com/default/requestResetLink',
            'https://ylwynk6l46.execute-api.us-east-2.amazonaws.com/default/AdvancedAgentBackend/requestResetLink'
        ];
        
        let result = null;
        let lastError = null;
        
        // Try each endpoint
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, redirectUrl: window.location.origin + '/reset-confirm.html' })
                });
                
                if (!response.ok) {
                    throw new Error(`Server returned ${response.status}`);
                }
                
                result = await response.json();
                break;
            } catch (err) {
                console.warn(`Reset link request failed on endpoint ${endpoint}:`, err);
                lastError = err;
            }
        }
        
        if (!result) {
            throw lastError || new Error("Failed to connect to any server");
        }
        
        // Hide form and show success message
        document.getElementById('resetRequestForm').style.display = 'none';
        document.getElementById('resetSuccessSection').style.display = 'block';
        
    } catch (error) {
        console.error("Reset link request error:", error);
        
        let errorMessage = 'Unable to send reset link. Please try again later or contact support.';
        if (error.message.includes('network') || error.message.includes('connect')) {
            errorMessage = 'Network error. Please check your internet connection.';
        }
        
        showMessage('resetMessage', errorMessage, 'error');
    } finally {
        setButtonLoading('resetRequestButton', false, 'Send Reset Link');
    }
}

// Handle password reset confirmation from the reset-confirm.html page
function handleResetConfirmation() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validate passwords
    if (!newPassword || !confirmPassword) {
        showMessage('resetConfirmMessage', 'Please fill in all fields', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showMessage('resetConfirmMessage', 'Passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 8) {
        showMessage('resetConfirmMessage', 'Password must be at least 8 characters long', 'error');
        return;
    }
    
    // Get token and email from localStorage (stored when page loaded)
    const token = localStorage.getItem('resetToken');
    const email = localStorage.getItem('resetEmail');
    
    if (!token || !email) {
        showMessage('resetConfirmMessage', 'Invalid reset session. Please try again with a new reset link.', 'error');
        return;
    }
    
    completePasswordReset(email, token, newPassword);
}

// Complete the password reset process
async function completePasswordReset(email, token, newPassword) {
    console.log("Completing password reset with token");
    
    // Show loading state
    setButtonLoading('resetConfirmButton', true, 'Setting Password...');
    showMessage('resetConfirmMessage', '', '');
    
    try {
        const endpoints = [
            'https://ylwynk6l46.execute-api.us-east-2.amazonaws.com/default/confirmResetPassword',
            'https://ylwynk6l46.execute-api.us-east-2.amazonaws.com/default/AdvancedAgentBackend/confirmResetPassword'
        ];
        
        let result = null;
        let lastError = null;
        
        // Try each endpoint
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, token, newPassword })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `Server returned ${response.status}`);
                }
                
                result = await response.json();
                break;
            } catch (err) {
                console.warn(`Password reset confirmation failed on endpoint ${endpoint}:`, err);
                lastError = err;
            }
        }
        
        if (!result) {
            throw lastError || new Error("Failed to connect to any server");
        }
        
        // Clear stored token and email
        localStorage.removeItem('resetToken');
        localStorage.removeItem('resetEmail');
        
        // Hide form and show success
        document.getElementById('resetConfirmForm').style.display = 'none';
        document.getElementById('confirmSuccessSection').style.display = 'block';
        
    } catch (error) {
        console.error("Password reset confirmation error:", error);
        
        let errorMessage = 'Password reset failed. ';
        
        if (error.message.includes('expired')) {
            errorMessage += 'The reset link has expired. Please request a new one.';
        } else if (error.message.includes('invalid')) {
            errorMessage += 'Invalid reset token. Please request a new reset link.';
        } else if (error.message.includes('network') || error.message.includes('connect')) {
            errorMessage = 'Network error. Please check your internet connection and try again.';
        } else {
            errorMessage += 'Please try again or contact support.';
        }
        
        showMessage('resetConfirmMessage', errorMessage, 'error');
    } finally {
        setButtonLoading('resetConfirmButton', false, 'Set New Password');
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
