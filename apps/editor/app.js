const editor = document.querySelector('#code-input');
const preview = document.querySelector('#preview-frame');
const workspace = document.querySelector('#editor-workspace');
const gutter = document.querySelector('#line-numbers');
const status = document.querySelector('#editor-status');
const projectKey = 'chillest-os-editor-project';
const project = {
    html: '<main class="card">\n    <p class="eyebrow">A small experiment</p>\n    <h1>Hello, world.</h1>\n    <p>Edit the files to shape this little page.</p>\n    <button id="hello-button">Say hello</button>\n</main>',
    css: 'body {\n    min-height: 100vh;\n    display: grid;\n    place-items: center;\n    margin: 0;\n    background: #e7f1ee;\n    color: #173a42;\n    font-family: sans-serif;\n}\n\n.card {\n    max-width: 28rem;\n    padding: 2rem;\n}\n\n.eyebrow {\n    color: #c05a35;\n    text-transform: uppercase;\n}',
    javascript: 'document.querySelector("#hello-button").addEventListener("click", () => {\n    document.querySelector("h1").textContent = "Nice to see you!";\n});'
};
const fileNames = { html: 'index.html', css: 'style.css', javascript: 'app.js' };
let activeLanguage = 'html';
let renderTimer;

try {
    const savedProject = JSON.parse(localStorage.getItem(projectKey) || 'null');
    if (savedProject && typeof savedProject === 'object') Object.assign(project, savedProject);
} catch { /* Start with the sample project if saved code is unavailable. */ }

function updateLineNumbers() {
    const count = editor.value.split('\n').length;
    gutter.textContent = Array.from({ length: count }, (_, index) => index + 1).join('\n');
    gutter.scrollTop = editor.scrollTop;
}

function renderPreview() {
    const css = project.css.replace(/<\/style/gi, '<\\/style');
    const javascript = project.javascript.replace(/<\/script/gi, '<\\/script');
    const policy = "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'\">";
    preview.srcdoc = `<!doctype html>${policy}<style>${css}</style>${project.html}<script>${javascript}<\/script>`;
    status.textContent = 'Preview updated';
}

function schedulePreview() {
    project[activeLanguage] = editor.value;
    updateLineNumbers();
    status.textContent = 'Editing';
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
        try { localStorage.setItem(projectKey, JSON.stringify(project)); } catch { status.textContent = 'Draft could not be saved'; }
        renderPreview();
    }, 180);
}

function selectLanguage(language) {
    project[activeLanguage] = editor.value;
    activeLanguage = language;
    editor.value = project[language];
    editor.setAttribute('aria-label', `${language} source code`);
    document.querySelector('#file-name').textContent = fileNames[language];
    document.querySelectorAll('.language-tab').forEach(tab => {
        const selected = tab.dataset.language === language;
        tab.classList.toggle('active', selected);
        tab.setAttribute('aria-selected', String(selected));
    });
    updateLineNumbers();
    editor.focus();
}

document.querySelectorAll('.language-tab').forEach(tab => {
    tab.addEventListener('click', () => selectLanguage(tab.dataset.language));
});

editor.addEventListener('input', schedulePreview);
editor.addEventListener('scroll', () => { gutter.scrollTop = editor.scrollTop; });
editor.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        project[activeLanguage] = editor.value;
        renderPreview();
    } else if (event.key === 'Tab') {
        event.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.setRangeText('    ', start, end, 'end');
        editor.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (event.key === 'Enter' && !event.shiftKey) {
        const lineStart = editor.value.lastIndexOf('\n', editor.selectionStart - 1) + 1;
        const indentation = editor.value.slice(lineStart, editor.selectionStart).match(/^\s*/)?.[0] || '';
        if (indentation) {
            event.preventDefault();
            editor.setRangeText(`\n${indentation}`, editor.selectionStart, editor.selectionEnd, 'end');
            editor.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
});

document.querySelector('#refresh-preview').addEventListener('click', () => {
    project[activeLanguage] = editor.value;
    renderPreview();
});

document.querySelector('#preview-toggle').addEventListener('click', event => {
    const isExpanded = event.currentTarget.getAttribute('aria-expanded') === 'true';
    workspace.classList.toggle('preview-hidden', isExpanded);
    event.currentTarget.setAttribute('aria-expanded', String(!isExpanded));
    event.currentTarget.textContent = isExpanded ? 'Show preview' : 'Hide preview';
});

editor.value = project[activeLanguage];
updateLineNumbers();
renderPreview();