export function showMessage(message, type = "success") {
    const info = document.getElementById("info");

    info.textContent = message;
    info.className = type;  
    info.style.display = "block";

    setTimeout(() => {
        info.style.opacity = "0";
        setTimeout(() => {
            info.style.display = "none";
            info.style.opacity = "1";  
        }, 500);
    }, 3000);
}

export function showModalMessage(message, type) {
    let infoElement;
    if (document.getElementById('signup_modal') && document.getElementById('signup_modal').classList.contains('show')) {
        infoElement = document.getElementById('signup_info');

        infoElement.innerHTML = '';
        const messageElement = document.createElement('div');
        messageElement.textContent = message;

        if (type === 'success') {
            messageElement.className = 'modal-success-message';
        } else if (type === 'error') {
            messageElement.className = 'modal-error-message';
        }

        infoElement.appendChild(messageElement);
        infoElement.classList.remove('hidden');
    } else if (document.getElementById('login_modal') && document.getElementById('login_modal').classList.contains('show')) {
        infoElement = document.getElementById('login_info');

        infoElement.innerHTML = '';
        const messageElement = document.createElement('div');
        messageElement.textContent = message;

        if (type === 'success') {
            messageElement.className = 'modal-success-message';
        } else if (type === 'error') {
            messageElement.className = 'modal-error-message';
        }

        infoElement.appendChild(messageElement);
        infoElement.classList.remove('hidden');
    } else {
        console.error("No modal is currently open.");
        return;
    }
}

export const show_message = {};
