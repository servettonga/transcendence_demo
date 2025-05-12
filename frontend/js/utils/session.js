import { getUserData } from './get_user_data.js';
import { showMessage } from "../components/show_message.js";

let refreshTokenTimer = null;
const DEBUG = false;

setInterval(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expirationTime = payload.exp * 1000;
            const now = Date.now();
            // If less than 10 minutes remaining, refresh token
            if ((expirationTime - now) < 600000)
                refreshToken();
        } catch (error) {
            console.error("Error in periodic token check:", error);
        }
    }
}, 1800000); // 30 minutes

export async function refreshToken() {
    console.log('Attempting to refresh token...');
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
        console.log('No refresh token available');
        logout();
        return false;
    }

    try {
        const response = await fetch('/api/token/refresh/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh: refreshToken }),
        });

        const data = await response.json();
        if (response.ok) {
            console.log('Token refresh successful');
            localStorage.setItem('accessToken', data.access);
            // Store the new refresh token if it's provided
            if (data.refresh)
                localStorage.setItem('refreshToken', data.refresh);
            return true;
        } else {
            console.log('Token refresh failed:', data);
            if (data.code === 'token_not_valid')
                logout();
            return false;
        }
    } catch (error) {
        console.error('Error refreshing token:', error);
        logout();
        return false;
    }
}

export function logout() {
    const token = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    fetch('/api/logout', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            refresh: refreshToken
        })
    })

    localStorage.clear();
    checkLogin();
    window.location.href = '#/';
    const main = document.getElementById('mainContent');
    if (window.location.hash === '#/profile')
        main.innerHTML = '';
}

export function isLoggedIn(warn = true) {
    let token = localStorage.getItem('accessToken')
    if (!token && warn) {
        showMessage('you need to log in', 'error');
        return false;
    }
    return token;
}

export async function checkLogin() {
    const userLogged = document.getElementById('userLogged');
    const userDropdown = document.getElementById('userDropdown');
    const userNameSpan = document.getElementById('userName');
    const avatarSpan = document.getElementById('avatarSpan');
    const token = localStorage.getItem('accessToken');

    if (token) {
        try {
            // For mock tokens, don't try to decode JWT
            if (token.startsWith('mock_')) {
                const mockUser = JSON.parse(localStorage.getItem('mock_currentUser'));
                if (mockUser) {
                    userLogged.style.display = 'none';
                    userDropdown.style.display = 'inline-block';
                    userNameSpan.textContent = mockUser.display_name || mockUser.username;
                    avatarSpan.innerHTML = `<img src="${mockUser.avatar}" alt="User Avatar" class="rounded-circle" height="50">`;
                    return;
                }
            } else {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const expirationTime = payload.exp * 1000;
                const now = Date.now();

                if ((expirationTime - now) < 15000) {
                    const refreshSuccess = await refreshToken();
                    if (!refreshSuccess) {
                        localStorage.clear();
                        userLogged.style.display = 'inline-block';
                        userDropdown.style.display = 'none';
                        if (userNameSpan) userNameSpan.textContent = '';
                        if (avatarSpan) avatarSpan.innerHTML = '';
                        return;
                    }
                }

                const userData = await getUserData(token);
            }
        } catch (error) {
            console.error("Error checking login status:", error);
            localStorage.clear();
            userLogged.style.display = 'inline-block';
            userDropdown.style.display = 'none';
            if (userNameSpan) userNameSpan.textContent = '';
            if (avatarSpan) avatarSpan.innerHTML = '';
        }
    } else {
        userLogged.style.display = 'inline-block';
        userDropdown.style.display = 'none';
        if (userNameSpan) userNameSpan.textContent = '';
        if (avatarSpan) avatarSpan.innerHTML = '';
    }
}

window.logout = logout;
