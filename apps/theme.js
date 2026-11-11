(() => {
    function applyTheme(settings) {
        if (!settings) return;
        const root = document.documentElement;
        root.style.setProperty('--background', settings.background);
        root.style.setProperty('--orange', settings.accent);
        root.style.setProperty('--yellow', settings.highlight);
        root.style.setProperty('--accent', settings.accent);
        root.style.setProperty('--highlight', settings.highlight);
    }

    try {
        applyTheme(window.parent.ChillestOS?.getSettings());
    } catch { /* The app can render before the OS bridge is available. */ }

    window.addEventListener('message', event => {
        if (event.source !== window.parent || event.data?.type !== 'chillest-theme') return;
        applyTheme(event.data.theme);
    });

    window.ChillestApp = {
        os: window.parent.ChillestOS,
        applyTheme
    };
})();