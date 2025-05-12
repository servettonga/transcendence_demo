import { showModalMessage } from './show_message.js';
import { switchModal } from '../utils/switch_modal.js';

export async function submitUserRegister() {
    try {
        document.getElementById('info').innerHTML = '';

        const form = document.getElementById('userForm');
        const formData = new FormData(form);

        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: {
                // 'Content-Type': 'application/json'
            },
            // body: JSON.stringify(formData),
            body: formData,
        });

        if (response.ok) {
            const data = await response.json();
            if (data.status == 'pass_error') {
                showModalMessage("Error! " + data.message, "error");
            }
            else {
                showModalMessage("Success! " + data.message, "success");
                setTimeout(function() {
                    switchModal('signup_modal', 'login_modal');
                    document.getElementById('username').value = formData.get('username');
                }, 2000);
            }
        } else {
            try {
                const errorData = JSON.parse(await response.text());
                showModalMessage("Error! " + errorData.message, "error");
            } catch (e) {
                console.error("Error parsing JSON:", e);
                showModalMessage("Error! An unexpected error occurred.", "error");
            }
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Check the console for details.');
    }
}

export function clearSignupForm() {
    document.getElementById('userForm').reset();
    showModalMessage("", "");
}

window.submitUserRegister = submitUserRegister;
