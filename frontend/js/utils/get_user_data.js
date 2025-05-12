export async function getUsers() {
    try {
        const response = await fetch(`/api/users/`, {
            method: 'GET',
        });

        const data = await response.json();
        if (response.ok) {
            document.getElementById('app').innerHTML = JSON.stringify(data);
        } else {
            alert('Error: ' + JSON.stringify(data));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Check the console for details.');
    }
}

export async function getUserData(token) {
    try {
        const response = await fetch(`/api/users/me/`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });

        try {
            const data = await response.json();

            if (response.ok) {
                data.avatar = data.avatar || '/assets/img/avatars/default.png';
                return data;
            } else if (data.code == 'token_not_valid') {
                return "login_expired";
            }

            console.error('API error:', data);
            return getFallbackUserData();

        } catch (jsonError) {
            console.error('Error parsing JSON response:', jsonError);
            return getFallbackUserData();
        }
    } catch (error) {
        console.error('Network error:', error);
        return getFallbackUserData();
    }
}

function getFallbackUserData() {
    const username = localStorage.getItem('username') || 'User';

    return {
        id: 1,
        username: username,
        display_name: username,
        email: `${username}@example.com`,
        avatar: '/assets/img/avatars/default.png',
        status: 'online',
        settings: { color_theme: 0 },
        preferred_language: 'en',
        two_factor_enabled: false
    };
}

export async function getUserStats(token) {
    try {
        const cacheBuster = new Date().getTime();
        const response = await fetch(`/api/users/me/stats/?cb=${cacheBuster}`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
            }
        });

        const data = await response.json();
        if (response.ok)
            return data;
        else {
            console.log(data.code);
            alert('Error: ' + JSON.stringify(data));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Check the console for details.');
    }
}
