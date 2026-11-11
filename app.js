const defaults = { background: '#06384b', accent: '#ff8c00', highlight: '#ffb000', backgroundStyle: 'gradient', wallpaperText: 'time-name', dock: 'bottom', wallpaper: '' };
const backgroundStyles = ['gradient', 'grid', 'custom'];
const wallpaperTextModes = ['none', 'time', 'time-name', 'name'];
const storageKey = 'chillest-os-settings';
const onboardingKey = 'chillest-os-onboarding-complete';
const nameKey = 'chillest-os-name';
let settings = { ...defaults };
let highestWindow = 10;
const minimizedLayouts = new WeakMap();
let activeWindowAnimations = 0;

try {
    settings = { ...defaults, ...JSON.parse(localStorage.getItem(storageKey) || '{}') };
} catch {
    settings = { ...defaults };
}

const desktop = document.querySelector('#desktop');
const dock = document.querySelector('#dock');
const windowLayer = document.querySelector('#window-layer');
const clock = document.querySelector('#clock');
const onboarding = document.querySelector('#onboarding');

function applyIconColors(root = document) {
    root.querySelectorAll('.brand-mark, .top-icon-button, .app-icon, .window-title-icon, .battery-status').forEach(container => {
        const image = container.querySelector('img');
        if (!image) return;
        container.style.setProperty('--icon-mask', `url("${image.src}")`);
        image.classList.add('theme-icon-source');
    });
}

function saveSettings() {
    localStorage.setItem(storageKey, JSON.stringify(settings));
}

function applySettings() {
    document.documentElement.style.setProperty('--background', settings.background);
    document.documentElement.style.setProperty('--orange', settings.accent);
    document.documentElement.style.setProperty('--yellow', settings.highlight);
    applyIconColors();
    const backgroundStyle = backgroundStyles.includes(settings.backgroundStyle) ? settings.backgroundStyle : defaults.backgroundStyle;
    const wallpaperText = wallpaperTextModes.includes(settings.wallpaperText) ? settings.wallpaperText : defaults.wallpaperText;
    desktop.className = `desktop theme-${backgroundStyle} text-${wallpaperText}`;
    dock.className = `dock dock-${settings.dock}`;
    const wallpaper = document.querySelector('#wallpaper-image');
    const showWallpaper = backgroundStyle === 'custom' && Boolean(settings.wallpaper);
    wallpaper.style.backgroundImage = showWallpaper ? `url("${settings.wallpaper}")` : '';
    wallpaper.classList.toggle('has-image', showWallpaper);
    document.querySelector('meta[name="theme-color"]').content = settings.background;
    const theme = { background: settings.background, accent: settings.accent, highlight: settings.highlight };
    windowLayer.querySelectorAll('.app-frame').forEach(frame => {
        frame.contentWindow?.postMessage({ type: 'chillest-theme', theme }, '*');
    });
}

window.ChillestOS = Object.freeze({
    getSettings: () => ({ ...settings }),
    getName() {
        try { return localStorage.getItem(nameKey) || ''; }
        catch { return ''; }
    },
    listApps() {
        return Object.entries(appInfo).map(([id, app]) => ({ id, title: app.title }));
    },
    openApp(app) {
        if (!appInfo[app]) return false;
        launchApp(app);
        return true;
    },
    updateName(value) {
        const name = String(value || '').trim().slice(0, 32);
        if (name) localStorage.setItem(nameKey, name);
        else localStorage.removeItem(nameKey);
        setDesktopName(name);
        return name;
    },
    updateSettings(patch) {
        settings = { ...settings, ...patch };
        applySettings();
        saveSettings();
        return { ...settings };
    },
    resetTheme() {
        settings = { ...settings, background: defaults.background, accent: defaults.accent, highlight: defaults.highlight };
        applySettings();
        saveSettings();
        return { ...settings };
    },
    resetData() {
        try {
            for (let index = localStorage.length - 1; index >= 0; index -= 1) {
                const key = localStorage.key(index);
                if (key?.startsWith('chillest-os-')) localStorage.removeItem(key);
            }
        } catch { /* Continue resetting the current session if storage is unavailable. */ }
        settings = { ...defaults };
        applySettings();
        setDesktopName('');
        document.querySelector('#onboarding-name').value = '';
        document.querySelector('#onboarding-wallpaper-url').value = '';
        document.querySelector('#onboarding-wallpaper-file').value = '';
        document.querySelector('#onboarding-error').textContent = '';
        document.querySelector('#onboarding-settings-status').textContent = '';
        windowLayer.replaceChildren();
        document.querySelectorAll('.dock-app.running').forEach(button => button.classList.remove('running'));
        document.querySelector('#active-app').textContent = 'Desktop';
        showOnboarding();
    }
});

let onboardingStep = 0;

function setDesktopName(name) {
    document.querySelector('#desktop-name').textContent = name || 'FRIEND';
}

function showOnboardingStep(step) {
    onboardingStep = step;
    onboarding.querySelectorAll('[data-onboarding-page]').forEach(page => {
        page.hidden = Number(page.dataset.onboardingPage) !== step;
    });
    document.querySelector('#onboarding-count').textContent = `${String(step + 1).padStart(2, '0')} / 03`;
    document.querySelector('#onboarding-back').hidden = step === 0;
    document.querySelector('#onboarding-next').hidden = step === 2;
    document.querySelector('#onboarding-finish').hidden = step !== 2;
    if (step === 0) document.querySelector('#onboarding-name').focus();
    document.querySelector('#onboarding-next').textContent = step === 1 ? 'Next: tour' : 'Continue';
}

function showOnboarding() {
    document.body.classList.add('onboarding-active');
    onboarding.hidden = false;
    syncOnboardingSettings();
    showOnboardingStep(0);
}

function finishOnboarding() {
    const nameInput = document.querySelector('#onboarding-name');
    const name = nameInput.value.trim();
    if (!name) {
        document.querySelector('#onboarding-error').textContent = 'Enter a name to continue.';
        nameInput.focus();
        return;
    }
    try {
        localStorage.setItem(nameKey, name);
        localStorage.setItem(onboardingKey, 'complete');
    } catch {
        document.querySelector('#onboarding-error').textContent = 'Could not save your setup in this browser.';
        return;
    }
    setDesktopName(name);
    onboarding.hidden = true;
    document.body.classList.remove('onboarding-active');
}

function initializeOnboarding() {
    let name = '';
    let isComplete = false;
    try {
        name = localStorage.getItem(nameKey) || '';
        isComplete = localStorage.getItem(onboardingKey) === 'complete';
    } catch { /* Show setup if the browser cannot read saved data. */ }
    setDesktopName(name);
    initializeOnboardingSettings();
    if (!isComplete) showOnboarding();

    document.querySelector('#onboarding-next').addEventListener('click', () => {
        if (onboardingStep === 0 && !document.querySelector('#onboarding-name').value.trim()) {
            document.querySelector('#onboarding-error').textContent = 'Enter a name to continue.';
            document.querySelector('#onboarding-name').focus();
            return;
        }
        showOnboardingStep(Math.min(onboardingStep + 1, 2));
    });
    document.querySelector('#onboarding-back').addEventListener('click', () => showOnboardingStep(Math.max(onboardingStep - 1, 0)));
    document.querySelector('#onboarding-finish').addEventListener('click', finishOnboarding);
    document.querySelector('#onboarding-name').addEventListener('input', () => {
        document.querySelector('#onboarding-error').textContent = '';
    });
}

function syncOnboardingSettings() {
    document.querySelector('#onboarding-background').value = settings.background;
    document.querySelector('#onboarding-accent').value = settings.accent;
    document.querySelector('#onboarding-highlight').value = settings.highlight;
    document.querySelector('#onboarding-background-style').value = settings.backgroundStyle;
    document.querySelector('#onboarding-wallpaper-text').value = settings.wallpaperText;
    document.querySelector('#onboarding-dock').value = settings.dock;
}

function updateOnboardingSettings(patch) {
    const status = document.querySelector('#onboarding-settings-status');
    settings = { ...settings, ...patch };
    applySettings();
    try {
        saveSettings();
        status.textContent = 'Changes saved.';
    } catch {
        status.textContent = 'Could not save settings in this browser.';
    }
    syncOnboardingSettings();
}

function initializeOnboardingSettings() {
    const colorFields = [
        ['#onboarding-background', 'background'],
        ['#onboarding-accent', 'accent'],
        ['#onboarding-highlight', 'highlight']
    ];
    for (const [selector, key] of colorFields) {
        document.querySelector(selector).addEventListener('input', event => updateOnboardingSettings({ [key]: event.target.value }));
    }
    document.querySelector('#onboarding-background-style').addEventListener('change', event => updateOnboardingSettings({ backgroundStyle: event.target.value }));
    document.querySelector('#onboarding-wallpaper-text').addEventListener('change', event => updateOnboardingSettings({ wallpaperText: event.target.value }));
    document.querySelector('#onboarding-dock').addEventListener('change', event => updateOnboardingSettings({ dock: event.target.value }));
    document.querySelector('#onboarding-set-wallpaper').addEventListener('click', () => {
        const value = document.querySelector('#onboarding-wallpaper-url').value.trim();
        if (!value) return;
        try {
            const url = new URL(value);
            if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported URL');
            updateOnboardingSettings({ wallpaper: url.href, backgroundStyle: 'custom' });
        } catch {
            document.querySelector('#onboarding-settings-status').textContent = 'Enter a valid http or https image URL.';
        }
    });
    document.querySelector('#onboarding-wallpaper-file').addEventListener('change', event => {
        const file = event.target.files?.[0];
        if (!file) return;
        const status = document.querySelector('#onboarding-settings-status');
        if (!file.type.startsWith('image/')) { status.textContent = 'Choose an image file.'; return; }
        if (file.size > 2 * 1024 * 1024) { status.textContent = 'That image is over the 2 MB limit.'; return; }
        const reader = new FileReader();
        reader.addEventListener('load', () => updateOnboardingSettings({ wallpaper: String(reader.result), backgroundStyle: 'custom' }));
        reader.addEventListener('error', () => { status.textContent = 'Could not read that image.'; });
        reader.readAsDataURL(file);
    });
    document.querySelector('#onboarding-clear-wallpaper').addEventListener('click', () => {
        document.querySelector('#onboarding-wallpaper-url').value = '';
        document.querySelector('#onboarding-wallpaper-file').value = '';
        updateOnboardingSettings({ wallpaper: '', backgroundStyle: 'gradient' });
    });
    syncOnboardingSettings();
}

function updateClock() {
    const now = new Date();
    clock.dateTime = now.toISOString();
    clock.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const wallpaperTime = document.querySelector('#wallpaper-time');
    wallpaperTime.dateTime = now.toISOString();
    wallpaperTime.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function updateBattery(battery) {
    const level = Math.round(battery.level * 100);
    const icon = document.querySelector('#battery-icon');
    const label = document.querySelector('#battery-level');
    const status = document.querySelector('#battery-status');
    const iconName = level >= 75 ? 'full' : level >= 50 ? 'medium' : level >= 25 ? 'low' : 'empty';
    icon.src = `assets/battery-${iconName}.svg`;
    icon.hidden = false;
    status.classList.add('has-battery');
    applyIconColors(status);
    label.textContent = `${level}%`;
    status.setAttribute('aria-label', `Battery ${iconName}, ${level}%${battery.charging ? ', charging' : ''}`);
    status.title = `Battery ${iconName}${battery.charging ? ', charging' : ''}`;
}

function initializeBattery() {
    if (!navigator.getBattery) return;
    navigator.getBattery().then(battery => {
        updateBattery(battery);
        battery.addEventListener('levelchange', () => updateBattery(battery));
        battery.addEventListener('chargingchange', () => updateBattery(battery));
    }).catch(() => {
        document.querySelector('#battery-status').title = 'Battery level unavailable';
    });
}

const appInfo = {
    about: { title: 'Welcome to Chillest OS', icon: 'assets/info.svg', path: 'apps/about/index.html' },
    notes: { title: 'Notes', icon: 'assets/edit.svg', path: 'apps/notes/index.html' },
    files: { title: 'Files', icon: 'assets/folder.svg', path: 'apps/files/index.html' },
    calculator: { title: 'Calculator', icon: 'assets/calculator.svg', path: 'apps/calculator/index.html' },
    editor: { title: 'Code Editor', icon: 'assets/docs.svg', path: 'apps/editor/index.html' },
    music: { title: 'Now Playing', icon: 'assets/music.svg', path: 'apps/music/index.html' },
    terminal: { title: 'Terminal', icon: 'assets/computer.svg', path: 'apps/terminal/index.html' },
    settings: { title: 'System Settings', icon: 'assets/gear.svg', path: 'apps/settings/index.html' }
};

function getAppLauncher(app) {
    const launcher = document.querySelector(`#dock [data-open-app="${app}"]`) || document.querySelector(`.topbar [data-open-app="${app}"]`);
    return launcher?.querySelector('.app-icon, .brand-mark') || launcher;
}

function fitWindowRect(rect) {
    const bounds = windowLayer.getBoundingClientRect();
    const width = Math.min(rect.width, bounds.width - 24);
    const height = Math.min(rect.height, bounds.height - 24);
    return {
        left: Math.max(bounds.left + 12, Math.min(rect.left, bounds.right - width - 12)),
        top: Math.max(bounds.top + 12, Math.min(rect.top, bounds.bottom - height - 12)),
        width,
        height
    };
}

function setDesktopWindowRect(windowElement, rect) {
    const bounds = windowLayer.getBoundingClientRect();
    const fitted = fitWindowRect(rect);
    windowElement.style.position = 'absolute';
    windowElement.style.minWidth = '';
    windowElement.style.minHeight = '';
    windowElement.style.maxWidth = '';
    windowElement.style.maxHeight = '';
    windowElement.style.left = `${fitted.left - bounds.left}px`;
    windowElement.style.top = `${fitted.top - bounds.top}px`;
    windowElement.style.width = `${fitted.width}px`;
    windowElement.style.height = `${fitted.height}px`;
    windowElement.style.transform = 'none';
    windowElement.style.transformOrigin = '';
    return fitted;
}

function setFixedWindowRect(windowElement, rect) {
    windowElement.style.position = 'fixed';
    windowElement.style.minWidth = '0';
    windowElement.style.minHeight = '0';
    windowElement.style.maxWidth = 'none';
    windowElement.style.maxHeight = 'none';
    windowElement.style.left = `${rect.left}px`;
    windowElement.style.top = `${rect.top}px`;
    windowElement.style.width = `${rect.width}px`;
    windowElement.style.height = `${rect.height}px`;
    windowElement.style.transform = 'none';
    windowElement.style.transformOrigin = 'top left';
}

function getDockAnimationState(windowRect, iconRect) {
    const visibleWidth = Math.min(windowRect.width, iconRect.width);
    const visibleHeight = Math.min(windowRect.height, iconRect.height);
    const insetX = ((windowRect.width - visibleWidth) / windowRect.width) * 50;
    const insetY = ((windowRect.height - visibleHeight) / windowRect.height) * 50;
    const offsetX = iconRect.left + iconRect.width / 2 - (windowRect.left + windowRect.width / 2);
    const offsetY = iconRect.top + iconRect.height / 2 - (windowRect.top + windowRect.height / 2);
    return {
        transform: `translate(${offsetX}px, ${offsetY}px)`,
        clipPath: `inset(${insetY}% ${insetX}% ${insetY}% ${insetX}% round 12px)`
    };
}

function beginWindowAnimation() {
    activeWindowAnimations += 1;
    windowLayer.classList.add('animating');
}

function endWindowAnimation() {
    activeWindowAnimations = Math.max(0, activeWindowAnimations - 1);
    if (activeWindowAnimations === 0) windowLayer.classList.remove('animating');
}

function minimizeWindow(windowElement) {
    if (windowElement.classList.contains('is-minimized')) return;
    const rect = windowElement.getBoundingClientRect();
    const savedRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    const target = getAppLauncher(windowElement.dataset.app);
    minimizedLayouts.set(windowElement, savedRect);
    if (!target || typeof windowElement.animate !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setDesktopWindowRect(windowElement, savedRect);
        windowElement.classList.add('is-minimized');
        return;
    }

    const targetRect = target.getBoundingClientRect();
    setFixedWindowRect(windowElement, rect);
    const dockState = getDockAnimationState(rect, targetRect);
    const animation = windowElement.animate([
        { transform: 'translate(0, 0)', clipPath: 'inset(0% 0% 0% 0% round 2px)', opacity: 1 },
        { ...dockState, opacity: 0.75 }
    ], { duration: 420, easing: 'cubic-bezier(.22, .75, .3, 1)', fill: 'forwards' });
    beginWindowAnimation();
    animation.finished.then(() => {
        if (!windowElement.isConnected) return;
        windowElement.classList.add('is-minimized');
        setDesktopWindowRect(windowElement, savedRect);
        animation.cancel();
    }).catch(() => {}).finally(endWindowAnimation);
}

function restoreWindow(windowElement) {
    const savedRect = minimizedLayouts.get(windowElement);
    const target = getAppLauncher(windowElement.dataset.app);
    if (!savedRect || !target || typeof windowElement.animate !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        windowElement.classList.remove('is-minimized');
        if (savedRect) setDesktopWindowRect(windowElement, savedRect);
        minimizedLayouts.delete(windowElement);
        return;
    }

    const iconRect = target.getBoundingClientRect();
    const rect = fitWindowRect(savedRect);
    setFixedWindowRect(windowElement, rect);
    const dockState = getDockAnimationState(rect, iconRect);
    windowElement.style.zIndex = ++highestWindow;
    windowElement.classList.remove('is-minimized');
    const animation = windowElement.animate([
        { ...dockState, opacity: 0.75 },
        { transform: 'translate(0, 0)', clipPath: 'inset(0% 0% 0% 0% round 2px)', opacity: 1 }
    ], { duration: 420, easing: 'cubic-bezier(.22, .75, .3, 1)', fill: 'forwards' });
    beginWindowAnimation();
    animation.finished.then(() => {
        if (!windowElement.isConnected) return;
        setDesktopWindowRect(windowElement, rect);
        minimizedLayouts.delete(windowElement);
        animation.cancel();
    }).catch(() => {}).finally(endWindowAnimation);
}

function launchApp(app) {
    const existing = windowLayer.querySelector(`[data-app="${app}"]`);
    if (existing) {
        if (existing.classList.contains('is-minimized')) restoreWindow(existing);
        else existing.style.zIndex = ++highestWindow;
        document.querySelector(`#dock [data-open-app="${app}"]`)?.classList.add('running');
        document.querySelector('#active-app').textContent = appInfo[app].title;
        return;
    }
    const info = appInfo[app];
    if (!info) return;
        const windowElement = document.createElement('section');
        windowElement.className = 'app-window';
        windowElement.dataset.app = app;
        windowElement.setAttribute('aria-label', info.title);
        windowElement.style.zIndex = ++highestWindow;
        windowElement.innerHTML = `<header class="window-titlebar"><span class="window-title"><span class="window-title-icon" aria-hidden="true"><img src="${info.icon}" alt=""></span> &nbsp;${info.title}</span><div class="window-controls"><button class="window-control minimize" type="button" aria-label="Minimize ${info.title}" title="Minimize">−</button><button class="window-control close" type="button" aria-label="Close ${info.title}" title="Close">×</button></div></header><div class="window-content"><iframe class="app-frame" title="${info.title}" src="${info.path}"></iframe></div>`;
    windowLayer.append(windowElement);
    applyIconColors(windowElement);
    document.querySelector(`#dock [data-open-app="${app}"]`)?.classList.add('running');
    document.querySelector('#active-app').textContent = info.title;
    wireWindow(windowElement);
}

function wireWindow(windowElement) {
    windowElement.addEventListener('pointerdown', () => { windowElement.style.zIndex = ++highestWindow; });
    windowElement.querySelector('.close').addEventListener('click', () => {
        const app = windowElement.dataset.app;
        minimizedLayouts.delete(windowElement);
        windowElement.remove();
        document.querySelector(`#dock [data-open-app="${app}"]`)?.classList.remove('running');
        document.querySelector('#active-app').textContent = 'Desktop';
    });
    windowElement.querySelector('.minimize').addEventListener('click', () => minimizeWindow(windowElement));
    const bar = windowElement.querySelector('.window-titlebar');
    bar.addEventListener('pointerdown', event => {
        if (event.target.closest('button')) return;
        const rect = windowElement.getBoundingClientRect();
        const parentRect = desktop.getBoundingClientRect();
        const offsetX = event.clientX - rect.left;
        const offsetY = event.clientY - rect.top;
        windowElement.style.left = `${rect.left - parentRect.left}px`;
        windowElement.style.top = `${rect.top - parentRect.top}px`;
        windowElement.style.transform = 'none';
        bar.setPointerCapture(event.pointerId);
        const move = moveEvent => {
            const x = Math.max(0, Math.min(parentRect.width - windowElement.offsetWidth, moveEvent.clientX - parentRect.left - offsetX));
            const y = Math.max(0, Math.min(parentRect.height - 44, moveEvent.clientY - parentRect.top - offsetY));
            windowElement.style.left = `${x}px`;
            windowElement.style.top = `${y}px`;
        };
        const end = () => {
            bar.removeEventListener('pointermove', move);
            bar.removeEventListener('pointerup', end);
            bar.removeEventListener('pointercancel', end);
        };
        bar.addEventListener('pointermove', move);
        bar.addEventListener('pointerup', end);
        bar.addEventListener('pointercancel', end);
    });
}

document.addEventListener('click', event => {
    const target = event.target.closest('[data-open-app]');
    if (target) launchApp(target.dataset.openApp);
});

applySettings();
updateClock();
initializeBattery();
initializeOnboarding();
setInterval(updateClock, 15000);