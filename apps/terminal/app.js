const form = document.querySelector('#terminal-form');
const input = document.querySelector('#terminal-input');
const output = document.querySelector('#terminal-output');
const os = window.ChillestApp?.os;
const appAliases = { calc: 'calculator', setting: 'settings' };

function appendOutput(command, result) {
    output.textContent += `${output.textContent ? '\n' : ''}~ $ ${command}\n${result}`;
    output.scrollTop = output.scrollHeight;
}

function openAppCommand(args) {
    const appName = (args[0] === 'app' ? args[1] : args[0])?.toLowerCase();
    if (!appName) return 'Usage: open <app>';
    const appId = appAliases[appName] || appName;
    const app = os.listApps().find(item => item.id === appId);
    if (!app || !os.openApp(app.id)) return `App not found: ${appName}. Type "apps" to list apps.`;
    return `Opening ${app.title}.`;
}

function runCommand(typed) {
    const [rawCommand, ...args] = typed.trim().split(/\s+/);
    const command = rawCommand.toLowerCase();
    const settings = os.getSettings();
    if (command === 'clear') {
        output.textContent = '';
        return;
    }
    if (command === 'help') return appendOutput(typed, 'Commands: help, clear, time, date, about, apps, app <name>, open <name>, settings, name, theme, wallpaper, dock');
    if (command === 'time') return appendOutput(typed, new Date().toLocaleTimeString());
    if (command === 'date') return appendOutput(typed, new Date().toLocaleDateString());
    if (command === 'about') return appendOutput(typed, 'Chillest OS 1.0 — take it easy.');
    if (command === 'apps') return appendOutput(typed, os.listApps().map(app => app.id).join(', '));
    if (command === 'app' || command === 'open') return appendOutput(typed, openAppCommand(command === 'app' ? ['app', ...args] : args));
    if (command === 'settings' || command === 'setting') return appendOutput(typed, openAppCommand(['settings']));
    if (command === 'name') return appendOutput(typed, os.getName() || 'No desktop name set.');
    if (command === 'theme') return appendOutput(typed, `Desktop ${settings.background} · Accent ${settings.accent} · Highlight ${settings.highlight}`);
    if (command === 'wallpaper') return appendOutput(typed, `Background style: ${settings.backgroundStyle}`);
    if (command === 'dock') return appendOutput(typed, `Dock position: ${settings.dock}`);
    appendOutput(typed, `command not found: ${command}`);
}

form.addEventListener('submit', event => {
    event.preventDefault();
    const typed = input.value.trim();
    if (typed) runCommand(typed);
    input.value = '';
});