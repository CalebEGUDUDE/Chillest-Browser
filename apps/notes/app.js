const notesKey = 'chillest-os-notes';
const editor = document.querySelector('#notes-editor');
const status = document.querySelector('#notes-status');

try { editor.value = localStorage.getItem(notesKey) || ''; } catch { status.textContent = 'Browser storage is unavailable.'; }
editor.addEventListener('input', () => {
    try {
        localStorage.setItem(notesKey, editor.value);
        status.textContent = 'Saved on this device.';
    } catch {
        status.textContent = 'Could not save in this browser.';
    }
});