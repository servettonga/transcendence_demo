import { getUserStats, getUserData } from "./get_user_data.js";
import { loadMyGames } from '../components/gamesList.js';
import { loadTranslations } from '../lang/i18n.js';

export async function fillupUserData(token, site) {
    const data = await getUserData(token);

    if (data == "login_expired") {
        window.location.href = '#/';
        return;
    }

    if (site == "profile") {
        const avatarImg = document.getElementById('currentAvatar');
        avatarImg.src = data.avatar || '/assets/img/avatar/default.png';
        if (data.avatar === '/assets/img/avatar/default.png')
            document.getElementById('avatar').value = '';

        document.getElementById('displayName').value = data.display_name;
        document.getElementById('email').value = data.email || '';
    } else if (site == "settings") {
        if (data['two_factor_enabled'])
            {
                document.getElementById("2facImg").src = "assets/img/illustrations/2factor_enabled.png";
                document.getElementById("2facState").textContent = "enabled";
                document.getElementById("2facState").setAttribute("data-i18n", "enabled");
            } else {
                document.getElementById("2facImg").src = "assets/img/illustrations/2factor_disabled.png";
                document.getElementById("2facState").textContent = "disabled";
                document.getElementById("2facState").setAttribute("data-i18n", "disabled");
                document.getElementById("2facEbableButton").classList.remove("d-none");
                document.getElementById("2facEbableButton").classList.add("d-block");
            }

    }

    if (data.preferred_language) {
        const currentLang = localStorage.getItem('preferredLanguage');
        if (currentLang !== data.preferred_language) {
            console.log("Setting language from user profile:", data.preferred_language);
            localStorage.setItem('preferredLanguage', data.preferred_language);
            loadTranslations(data.preferred_language);
        }
    }

    // Set color theme
    const colorThemeSelect = document.getElementById('colorTheme');
    if (colorThemeSelect) {
        let selectedIndex = -1;
        for (let i = 0; i < colorThemeSelect.options.length; i++) {
            if (parseInt(colorThemeSelect.options[i].value, 10) === data.settings.color_theme) {
                colorThemeSelect.value = colorThemeSelect.options[i].value;
                break;
            }
        }
    }
}
