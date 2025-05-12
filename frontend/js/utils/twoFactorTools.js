import { showMessage, showModalMessage } from "../components/show_message.js";
import { clearLoginForm } from "../components/login_form.js";
import { checkLogin, isLoggedIn } from "./session.js";

export function enable2f() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        showMessage('Please log in first', 'error');
        return;
    }

    const isMockMode = token.startsWith('mock_');

    if (isMockMode) {
        // In mock mode, just show a fake QR code and verification section
        document.getElementById('QRcodeDiv').innerHTML = `
            <div class="border p-3 mb-3">
                <p class="text-center">Mock QR Code</p>
                <div style="width:200px; height:200px; background-color:#eee; display:flex;
                    justify-content:center; align-items:center; margin:0 auto;">
                    <div style="font-size:12px; color:#333; text-align:center;">
                        This is a mock QR code.<br>In a real environment, you would scan<br>this with your authenticator app.
                    </div>
                </div>
            </div>
        `;
        document.getElementById('2facEbableButton').classList.add('d-none');
        document.getElementById('verify2fsection').classList.remove('d-none');
        return;
    }

    fetch('/api/users/me/2fa/enable/', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to enable 2FA: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Original code...
        })
        .catch(error => {
            console.error('Error enabling 2FA:', error);
            showMessage(`Error enabling 2FA: ${error.message}`, 'error');
        });
}

export function verify2f() {
    const token = localStorage.getItem('accessToken');
    const verificationCode = document.getElementById('qrVerifyInput').value.trim();

    if (!token) {
        showMessage('Please log in first', 'error');
        return;
    }

    if (!verificationCode || verificationCode.length !== 6) {
        showMessage('Please enter a valid 6-digit code', 'error');
        return;
    }

    const isMockMode = token.startsWith('mock_');

    if (isMockMode) {
        // In mock mode, accept any 6-digit code
        // Update mock user data to reflect 2FA is enabled
        document.getElementById('2facState').textContent = 'enabled';
        document.getElementById('2facState').setAttribute('data-i18n', 'enabled');
        document.getElementById('2facImg').src = "assets/img/illustrations/2factor_enabled.png";
        document.getElementById('verify2fsection').classList.add('d-none');

        const mockUser = JSON.parse(localStorage.getItem('mock_currentUser'));
        if (mockUser) {
            mockUser.two_factor_enabled = true;
            localStorage.setItem('mock_currentUser', JSON.stringify(mockUser));
        }

        showMessage('2FA has been enabled successfully', 'success');
        return;
    }

    fetch('/api/users/me/2fa/verify/', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: verificationCode })
    })
        .then(response => {
        })
        .catch(error => {
            console.error('Error verifying 2FA:', error);
            showMessage(`Error verifying 2FA: ${error.message}`, 'error');
        });
}

export async function validate2f(event) {
    event.preventDefault();
    const temp_token = localStorage.getItem('tmpToken');
    let formData = new FormData();
    let username = document.getElementById('username').value;
    let code = document.getElementById('otp_token').value;
    formData.append('username', username);
    formData.append('code', code);
    try {
        const response = await fetch(`/api/users/2fa/validate/`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + temp_token,
            },
            body: formData
        });
        const data = await response.json();
        console.log(response);
        if (response.ok) {
            localStorage.setItem('accessToken', data.access);
            localStorage.setItem('refreshToken', data.refresh);
            localStorage.setItem('username', username);
            const closeLoginModalButton = document.getElementById('closeLoginModal');
            closeLoginModalButton.click();
            checkLogin();
            clearLoginForm();
        } else {
            showModalMessage("Incorrect code", "error");
            setTimeout(function () {
                clearLoginForm();
            }, 2000);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Check the console for details.');
    }
}

window.enable2f = enable2f;
window.verify2f = verify2f;
window.validate2f = validate2f;
