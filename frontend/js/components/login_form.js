import { showModalMessage } from "./show_message.js";

export function clearLoginForm() {
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('otp_token').value = '';
    document.getElementById('loginSection').classList.remove('d-none');
    document.getElementById('otpHandling').classList.add('d-none');
    showModalMessage("", "");
}
