{\rtf1\ansi\ansicpg1252\cocoartf2821
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 // ===== UTILITY FUNCTIONS =====\
\
// Show a message in an element\
function showMessage(elementId, message, type) \{\
    const element = document.getElementById(elementId);\
    if (element) \{\
        element.innerHTML = `<div class="$\{type\}-message">$\{message\}</div>`;\
    \}\
\}\
\
// Set button loading state\
function setButtonLoading(buttonId, isLoading, originalText = 'Submit') \{\
    const button = document.getElementById(buttonId);\
    if (button) \{\
        if (isLoading) \{\
            button.innerHTML = '<span class="spinner"></span> Loading...';\
            button.disabled = true;\
        \} else \{\
            button.innerHTML = originalText;\
            button.disabled = false;\
        \}\
    \}\
\}\
\
// Make an API call with fallbacks\
async function callApi(endpoint, method, data) \{\
    console.log(`API call to $\{endpoint\} with method $\{method\}`);\
    \
    // Try using fetch API first\
    try \{\
        const response = await fetch(endpoint, \{\
            method: method,\
            headers: \{ 'Content-Type': 'application/json' \},\
            body: JSON.stringify(data)\
        \});\
        \
        if (response.ok) \{\
            return await response.json();\
        \}\
        \
        throw new Error(`Server returned $\{response.status\}`);\
    \} catch (fetchError) \{\
        console.warn("Fetch API failed, trying XMLHttpRequest as fallback");\
        \
        // XMLHttpRequest fallback\
        return new Promise((resolve, reject) => \{\
            const xhr = new XMLHttpRequest();\
            xhr.open(method, endpoint, true);\
            xhr.setRequestHeader('Content-Type', 'application/json');\
            xhr.timeout = 15000; // 15 seconds timeout\
            \
            xhr.onload = function() \{\
                if (this.status >= 200 && this.status < 300) \{\
                    try \{\
                        const data = JSON.parse(this.responseText);\
                        resolve(data);\
                    \} catch (e) \{\
                        reject(new Error("Invalid JSON response"));\
                    \}\
                \} else \{\
                    reject(new Error(`Server returned $\{this.status\}`));\
                \}\
            \};\
            \
            xhr.onerror = function() \{\
                reject(new Error("Network request failed"));\
            \};\
            \
            xhr.ontimeout = function() \{\
                reject(new Error("Request timed out"));\
            \};\
            \
            xhr.send(JSON.stringify(data));\
        \});\
    \}\
\}\
\
// ===== LOGIN FUNCTION =====\
\
// Handle login form submission\
function handleLogin() \{\
    const email = document.getElementById('email').value;\
    const password = document.getElementById('password').value;\
    \
    // Basic validation\
    if (!email || !password) \{\
        showMessage('loginMessage', 'Please enter both email and password', 'error');\
        return;\
    \}\
    \
    loginUser(email, password);\
\}\
\
// Main login function\
async function loginUser(email, password) \{\
    console.log("Attempting login for:", email);\
    \
    // Show loading state\
    setButtonLoading('loginButton', true, 'Login');\
    showMessage('loginMessage', '', '');\
    \
    try \{\
        // Define API endpoints (primary and backup)\
        const endpoints = [\
            'https://ylwynk6l46.execute-api.us-east-2.amazonaws.com/default/login',\
            'https://ylwynk6l46.execute-api.us-east-2.amazonaws.com/default/AdvancedAgentBackend/login'\
        ];\
        \
        let userData = null;\
        let lastError = null;\
        \
        // Try each endpoint until one succeeds\
        for (const endpoint of endpoints) \{\
            try \{\
                userData = await callApi(endpoint, 'POST', \{ email, password \});\
                break; // Exit the loop if successful\
            \} catch (err) \{\
                console.warn(`Login failed on endpoint $\{endpoint\}:`, err);\
                lastError = err;\
            \}\
        \}\
        \
        // If all endpoints failed\
        if (!userData) \{\
            throw lastError || new Error("Failed to connect to any server");\
        \}\
        \
        // Login successful, store token\
        console.log("Login successful");\
        localStorage.setItem('authToken', userData.token);\
        localStorage.setItem('userEmail', email);\
        localStorage.setItem('loginTimestamp', Date.now().toString());\
        \
        // Show success message and redirect\
        showMessage('loginMessage', 'Login successful! Redirecting...', 'success');\
        setTimeout(() => \{\
            window.location.href = 'app.html';\
        \}, 1500);\
        \
    \} catch (error) \{\
        console.error("Login error:", error);\
        \
        // Show user-friendly error message\
        let errorMessage = 'Login failed. Please check your credentials and try again.';\
        if (error.message.includes('network') || error.message.includes('connect')) \{\
            errorMessage = 'Network error. Please check your internet connection and try again.';\
        \}\
        \
        showMessage('loginMessage', errorMessage, 'error');\
    \} finally \{\
        // Reset button state\
        setButtonLoading('loginButton', false, 'Login');\
    \}\
\}\
\
// ===== PASSWORD RESET FUNCTIONS =====\
\
// Handle password reset request\
function handleResetRequest() \{\
    const email = document.getElementById('resetEmail').value;\
    \
    if (!email) \{\
        showMessage('resetMessage', 'Please enter your email address', 'error');\
        return;\
    \}\
    \
    requestPasswordReset(email);\
\}\
\
// Request password reset code\
async function requestPasswordReset(email) \{\
    console.log("Requesting password reset for:", email);\
    \
    // Show loading state\
    setButtonLoading('resetRequestButton', true, 'Send Reset Code');\
    showMessage('resetMessage', '', '');\
    \
    try \{\
        const endpoints = [\
            'https://ylwynk6l46.execute-api.us-east-2.amazonaws.com/default/requestReset',\
            'https://ylwynk6l46.execute-api.us-east-2.amazonaws.com/default/AdvancedAgentBackend/requestReset'\
        ];\
        \
        let result = null;\
        let lastError = null;\
        \
        // Try each endpoint\
        for (const endpoint of endpoints) \{\
            try \{\
                result = await callApi(endpoint, 'POST', \{ email \});\
                break;\
            \} catch (err) \{\
                console.warn(`Reset request failed on endpoint $\{endpoint\}:`, err);\
                lastError = err;\
            \}\
        \}\
        \
        if (!result) \{\
            throw lastError || new Error("Failed to connect to any server");\
        \}\
        \
        // Store email for verification step\
        localStorage.setItem('resetEmail', email);\
        \
        // Show success and reveal verification form\
        showMessage('resetMessage', 'Reset code sent! Check your email.', 'success');\
        document.getElementById('resetRequestForm').style.display = 'none';\
        document.getElementById('resetVerificationForm').style.display = 'block';\
        \
    \} catch (error) \{\
        console.error("Reset request error:", error);\
        \
        let errorMessage = 'Unable to send reset code. Please try again later.';\
        if (error.message.includes('network') || error.message.includes('connect')) \{\
            errorMessage = 'Network error. Please check your internet connection.';\
        \}\
        \
        showMessage('resetMessage', errorMessage, 'error');\
    \} finally \{\
        setButtonLoading('resetRequestButton', false, 'Send Reset Code');\
    \}\
\}\
\
// Handle password reset completion\
function handleResetCompletion() \{\
    const code = document.getElementById('resetCode').value;\
    const newPassword = document.getElementById('newPassword').value;\
    const confirmPassword = document.getElementById('confirmPassword').value;\
    \
    // Validation\
    if (!code || !newPassword || !confirmPassword) \{\
        showMessage('resetVerificationMessage', 'Please fill in all fields', 'error');\
        return;\
    \}\
    \
    if (newPassword !== confirmPassword) \{\
        showMessage('resetVerificationMessage', 'Passwords do not match', 'error');\
        return;\
    \}\
    \
    completePasswordReset(code, newPassword);\
\}\
\
// Complete password reset\
async function completePasswordReset(code, newPassword) \{\
    console.log("Completing password reset");\
    \
    // Show loading state\
    setButtonLoading('resetCompleteButton', true, 'Reset Password');\
    showMessage('resetVerificationMessage', '', '');\
    \
    // Get stored email\
    const email = localStorage.getItem('resetEmail');\
    if (!email) \{\
        showMessage('resetVerificationMessage', 'Session expired. Please restart the password reset process.', 'error');\
        setButtonLoading('resetCompleteButton', false, 'Reset Password');\
        return;\
    \}\
    \
    try \{\
        const endpoints = [\
            'https://ylwynk6l46.execute-api.us-east-2.amazonaws.com/default/resetPassword',\
            'https://ylwynk6l46.execute-api.us-east-2.amazonaws.com/default/AdvancedAgentBackend/resetPassword'\
        ];\
        \
        let result = null;\
        let lastError = null;\
        \
        // Try each endpoint\
        for (const endpoint of endpoints) \{\
            try \{\
                result = await callApi(endpoint, 'POST', \{ email, code, newPassword \});\
                break;\
            \} catch (err) \{\
                console.warn(`Password reset failed on endpoint $\{endpoint\}:`, err);\
                lastError = err;\
            \}\
        \}\
        \
        if (!result) \{\
            throw lastError || new Error("Failed to connect to any server");\
        \}\
        \
        // Clear stored email\
        localStorage.removeItem('resetEmail');\
        \
        // Show success message\
        showMessage('resetVerificationMessage', 'Password reset successful! Redirecting to login...', 'success');\
        \
        // Redirect to login\
        setTimeout(() => \{\
            window.location.href = 'login.html';\
        \}, 2000);\
        \
    \} catch (error) \{\
        console.error("Password reset error:", error);\
        \
        let errorMessage = 'Password reset failed. Please check your code and try again.';\
        if (error.message.includes('network') || error.message.includes('connect')) \{\
            errorMessage = 'Network error. Please check your internet connection.';\
        \}\
        \
        showMessage('resetVerificationMessage', errorMessage, 'error');\
    \} finally \{\
        setButtonLoading('resetCompleteButton', false, 'Reset Password');\
    \}\
\}\
\
// ===== SESSION MANAGEMENT =====\
\
// Check if user is logged in\
function checkAuthState() \{\
    const token = localStorage.getItem('authToken');\
    const loginTimestamp = localStorage.getItem('loginTimestamp');\
    \
    // Not logged in\
    if (!token) \{\
        return false;\
    \}\
    \
    // Check token expiry (24 hours)\
    if (loginTimestamp) \{\
        const tokenAge = Date.now() - parseInt(loginTimestamp);\
        const tokenExpiryTime = 24 * 60 * 60 * 1000; // 24 hours\
        \
        if (tokenAge > tokenExpiryTime) \{\
            // Clear expired token\
            localStorage.removeItem('authToken');\
            localStorage.removeItem('userEmail');\
            localStorage.removeItem('loginTimestamp');\
            return false;\
        \}\
    \}\
    \
    return true;\
\}\
\
// Helper function to check authentication state on protected pages\
function requireAuth() \{\
    if (!checkAuthState()) \{\
        window.location.href = 'login.html?expired=true';\
        return false;\
    \}\
    return true;\
\}\
\
// Run on page load\
document.addEventListener('DOMContentLoaded', function() \{\
    // Handle expired session message on login page\
    if (window.location.pathname.includes('login.html') && \
        window.location.search.includes('expired=true')) \{\
        showMessage('loginMessage', 'Your session has expired. Please log in again.', 'info');\
    \}\
    \
    // Protected pages (adjust paths as needed)\
    const currentPath = window.location.pathname;\
    if (currentPath.includes('app.html')) \{\
        requireAuth();\
    \}\
\});\
}