import { loadTranslations } from './i18n.js';
import { isLoggedIn } from '../utils/session.js';

function setUserLanguage(lang) {
    localStorage.setItem('preferredLanguage', lang);
    loadTranslations(lang);

    // If user is logged in, save preference to profile
    if (isLoggedIn(false)) {
        fetch('/api/users/me/', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Bearer ' + localStorage.getItem('accessToken')
            },
            body: new URLSearchParams({
                preferred_language: lang
            }).toString()
        })
            .then(response => {
                if (!response.ok) {
                    console.error('Failed to update language preference:', response.status);
                }
            })
            .catch(error => {
                console.error('Could not update profile language preference:', error);
            });
    }
}

function initializeLanguageSelector() {
    document.querySelectorAll('[data-lang]').forEach(el => {
        el.addEventListener('click', function(e) {
            e.preventDefault();
            const lang = this.getAttribute('data-lang');
            setUserLanguage(lang);
        });
    });

    // Initialize with user's preferred language or browser language
    const savedLang = localStorage.getItem('preferredLanguage') ||
        navigator.language.substring(0,2);
    loadTranslations(savedLang);
}

document.addEventListener('DOMContentLoaded', initializeLanguageSelector);
