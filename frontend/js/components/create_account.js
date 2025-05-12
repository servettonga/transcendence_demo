export async function createAccount() {
    try {
        const response = await fetch(`/api/users/register/`, {
            method: 'POST'
        });

        const data = await response.text();
        document.getElementById('app').innerHTML = data;
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Check the console for details.');
    }
}
