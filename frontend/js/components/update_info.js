import { showMessage } from './show_message.js';
import { fillupUserData } from '../utils/fillup_user_data.js';
import { checkLogin } from '../utils/session.js';

export async function updateUserData(event) {
    event.preventDefault();

    const token = localStorage.getItem('accessToken');
    try {
        document.getElementById('info').innerHTML = '';

        const form = document.getElementById('userUpdateForm');
        const formData = new FormData();

        // Get all form field values
        const displayName = form.elements['display_name'].value;
        const email = form.elements['email'].value;
        const password = form.elements['password'].value;
        const newPassword = form.elements['new_password'].value;
        const newPasswordRepeat = form.elements['new_password_repeat'].value;

        // Add user data fields if they have values
        if (displayName) formData.append('display_name', displayName);
        if (email) formData.append('email', email);

        // Add password fields - but only if current password is provided
        if (password) {
            formData.append('password', password);
            if (newPassword) formData.append('new_password', newPassword);
            if (newPasswordRepeat) formData.append('new_password_repeat', newPasswordRepeat);
        }

        // Only append avatar if a new file is selected
        const avatarInput = document.getElementById('avatar');
        if (avatarInput && avatarInput.files && avatarInput.files.length > 0)
            formData.append('avatar_upload', avatarInput.files[0]);

        // Log what's being sent (for debugging)
        console.log("Form data entries:", [...formData.entries()]);

        const response = await fetch('/api/users/me/', {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData,
        });

        const data = await response.json();
        console.log("Server response:", data);

        if (!response.ok) {
            showMessage(data.message || "Error updating profile", "error");
            return;
        }

        fillupUserData(token, "profile");
        checkLogin();
        showMessage(data.message || "Profile updated successfully", "success");
    } catch (error) {
        console.error('Error:', error);
        showMessage("An error occurred. Check the console for details.", "error");
    }
}

export async function updateSettings(event) {
    event.preventDefault();

    const token = localStorage.getItem('accessToken');
    try {
        document.getElementById('info').innerHTML = '';

        const form = document.getElementById('userUpdateForm');
        const formData = new FormData();

        // Add settings
        const colorThemeValue = parseInt(document.getElementById('colorTheme').value, 10);
        formData.append('settings', JSON.stringify({ color_theme: colorThemeValue }));
        localStorage.setItem('preferredTheme', colorThemeValue);

        const response = await fetch('/api/users/me/', {
            method: 'PATCH',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            showMessage(data.message || "Error updating profile", "error");
            return;
        }

        showMessage(data.message || "Profile updated successfully", "success");
        fillupUserData(token);
        checkLogin();
    } catch (error) {
        console.error('Error:', error);
        showMessage("An error occurred. Check the console for details.", "error");
    }
}

window.updateUserData = updateUserData;
window.updateSettings = updateSettings;
