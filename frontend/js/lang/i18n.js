const translations = {};

export async function loadTranslations(lang) {
    if (!translations[lang]) {
        try {
            const response = await fetch(`translations/${lang}.json`);
            translations[lang] = await response.json();
        } catch (error) {
            console.error(`Error loading translations for ${lang}:`, error);
            translations[lang] = {}; // Use empty object if loading fails
        }
    }
    window.currentLang = lang;
    updatePageContent();
}

// Get translation for a key
export function __(key, replacements = {}) {
    if (!translations[window.currentLang] || !translations[window.currentLang][key])
        return key; // Fallback to key if translation not found

    let text = translations[window.currentLang][key];

    // Handle replacements like {player} in "{player} wins!"
    Object.keys(replacements).forEach(placeholder => {
        text = text.replace(`{${placeholder}}`, replacements[placeholder]);
    });

    return text;
}

// Update all translatable elements on the page
export function updatePageContent() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = __(key);
        if (el.tagName === 'BUTTON') {
            el.style.width = 'auto';
            el.style.minWidth = 'fit-content';
        }
    });

    // Handle attributes like placeholder, title, etc.
    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
        const attr = el.getAttribute('data-i18n-attr').split(':');
        if (attr.length === 2)
            el.setAttribute(attr[0], __(attr[1]));
    });
}
