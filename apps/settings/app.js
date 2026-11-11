const os = window.ChillestApp?.os;
const fields = {
    background: document.querySelector('#background-color'),
    accent: document.querySelector('#accent-color'),
    highlight: document.querySelector('#highlight-color'),
    backgroundStyle: document.querySelector('#background-style'),
    wallpaperText: document.querySelector('#wallpaper-text'),
    dock: document.querySelector('#dock-location')
};
const status = document.querySelector('#settings-status');
const nameInput = document.querySelector('#desktop-name-input');

function showSettings(settings) {
    fields.background.value = settings.background;
    fields.accent.value = settings.accent;
    fields.highlight.value = settings.highlight;
    fields.backgroundStyle.value = settings.backgroundStyle;
    fields.wallpaperText.value = settings.wallpaperText;
    fields.dock.value = settings.dock;
}

function updateSettings(patch) {
    try {
        os.updateSettings(patch);
        status.textContent = 'Changes saved.';
    } catch {
        status.textContent = 'Could not save settings in this browser.';
    }
}

showSettings(os.getSettings());
nameInput.value = os.getName();
document.querySelector('#profile-form').addEventListener('submit', event => {
    event.preventDefault();
    try {
        const name = os.updateName(nameInput.value);
        nameInput.value = name;
        status.textContent = name ? 'Desktop name saved.' : 'Desktop name cleared.';
    } catch {
        status.textContent = 'Could not save your name in this browser.';
    }
});

for (const key of ['background', 'accent', 'highlight', 'backgroundStyle', 'wallpaperText', 'dock']) {
    fields[key].addEventListener('input', () => updateSettings({ [key]: fields[key].value }));
    fields[key].addEventListener('change', () => updateSettings({ [key]: fields[key].value }));
}

document.querySelector('#reset-theme').addEventListener('click', () => {
    const defaults = os.resetTheme();
    showSettings(defaults);
    status.textContent = 'Theme colors reset.';
});

document.querySelector('#set-wallpaper').addEventListener('click', () => {
    const value = document.querySelector('#wallpaper-url').value.trim();
    if (!value) return;
    try {
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported URL');
        updateSettings({ wallpaper: url.href, backgroundStyle: 'custom' });
        fields.backgroundStyle.value = 'custom';
    } catch {
        status.textContent = 'Enter a valid http or https image URL.';
    }
});

document.querySelector('#wallpaper-file').addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { status.textContent = 'Choose an image file.'; return; }
    if (file.size > 2 * 1024 * 1024) { status.textContent = 'That image is over the 2 MB limit.'; return; }
    const reader = new FileReader();
    reader.addEventListener('load', () => {
        updateSettings({ wallpaper: String(reader.result), backgroundStyle: 'custom' });
        fields.backgroundStyle.value = 'custom';
    });
    reader.addEventListener('error', () => { status.textContent = 'Could not read that image.'; });
    reader.readAsDataURL(file);
});

document.querySelector('#clear-wallpaper').addEventListener('click', () => {
    updateSettings({ wallpaper: '', backgroundStyle: 'gradient' });
    fields.backgroundStyle.value = 'gradient';
});

document.querySelector('#reset-data').addEventListener('click', () => {
    if (window.confirm('Reset saved settings and notes, then replay onboarding?')) os.resetData();
});