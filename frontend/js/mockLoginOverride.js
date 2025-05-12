window.loginForm = function(event) {
    event.preventDefault();
    console.log("Login form submitted");

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if ((username === 'player1' || username === 'player2' ||
            username === 'player3' || username === 'admin') &&
        password === 'password') {

        console.log("Login successful for:", username);

        const accessToken = `mock_access_token_${Date.now()}`;
        const refreshToken = `mock_refresh_token_${Date.now()}`;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('username', username);

        let userData;
        switch(username) {
            case 'player1':
                userData = {
                    id: 1,
                    username: 'player1',
                    display_name: 'Player One',
                    avatar: 'assets/img/avatars/avatar1.png'
                };
                break;
            case 'player2':
                userData = {
                    id: 2,
                    username: 'player2',
                    display_name: 'Player Two',
                    avatar: 'assets/img/avatars/avatar2.png'
                };
                break;
            case 'player3':
                userData = {
                    id: 3,
                    username: 'player3',
                    display_name: 'Player Three',
                    avatar: 'assets/img/avatars/avatar3.png'
                };
                break;
            case 'admin':
                userData = {
                    id: 4,
                    username: 'admin',
                    display_name: 'Admin User',
                    avatar: 'assets/img/avatars/avatar4.png'
                };
                break;
        }

        localStorage.setItem('mock_currentUser', JSON.stringify(userData));

        document.getElementById('userLogged').style.display = 'none';
        document.getElementById('userDropdown').style.display = 'inline-block';
        document.getElementById('userName').textContent = userData.display_name;
        document.getElementById('avatarSpan').innerHTML = `<img src="${userData.avatar}" alt="User Avatar" class="rounded-circle" height="50">`;

        const modal = bootstrap.Modal.getInstance(document.getElementById('login_modal'));
        if (modal) modal.hide();

        const info = document.getElementById("info");
        info.textContent = "Login successful!";
        info.className = "success";
        info.style.display = "block";
        setTimeout(() => {
            info.style.opacity = "0";
            setTimeout(() => {
                info.style.display = "none";
                info.style.opacity = "1";
            }, 500);
        }, 3000);

        return true;
    } else {
        const loginInfo = document.getElementById('login_info');
        loginInfo.innerHTML = '<div class="alert alert-danger">Invalid username or password. Use player1/player2/player3/admin with password "password"</div>';
        return false;
    }
};

// Override logout function
window.logout = function() {
    console.log("Logout function called");

    localStorage.clear();

    document.getElementById('userLogged').style.display = 'inline-block';
    document.getElementById('userDropdown').style.display = 'none';
    document.getElementById('userName').textContent = '';
    document.getElementById('avatarSpan').innerHTML = '';

    window.location.hash = '#/';

    const info = document.getElementById("info");
    info.textContent = "Logged out successfully!";
    info.className = "success";
    info.style.display = "block";
    setTimeout(() => {
        info.style.opacity = "0";
        setTimeout(() => {
            info.style.display = "none";
            info.style.opacity = "1";
        }, 500);
    }, 3000);
};

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.querySelector('#loginSection form');
    if (loginForm) {
        const helpText = document.createElement('div');
        helpText.className = 'alert alert-info small mt-3';
        helpText.innerHTML = '<strong>Demo Mode:</strong> Use username <code>player1</code>, <code>player2</code> or <code>admin</code> with password <code>password</code>';
        loginForm.appendChild(helpText);
    }
});
