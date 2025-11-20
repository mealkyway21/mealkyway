// Admin Login JavaScript
const API_URL = window.location.origin;

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginMessage = document.getElementById('loginMessage');

    // Check if already logged in
    checkAuth();

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            showMessage('Please enter both username and password', 'error');
            return;
        }

        // Disable submit button
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Logging in...</span>';

        try {
            const response = await fetch(`${API_URL}/api/admin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showMessage('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = '/admin-panel.html';
                }, 1000);
            } else {
                showMessage(data.error || 'Invalid credentials', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage('Network error. Please try again.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });

    async function checkAuth() {
        try {
            const response = await fetch(`${API_URL}/api/admin/check`, {
                credentials: 'include'
            });
            const data = await response.json();

            if (data.authenticated) {
                window.location.href = '/admin-panel.html';
            }
        } catch (error) {
            console.error('Auth check error:', error);
        }
    }

    function showMessage(message, type) {
        loginMessage.textContent = message;
        loginMessage.className = `form-message ${type}`;
        loginMessage.style.display = 'block';
    }
});
