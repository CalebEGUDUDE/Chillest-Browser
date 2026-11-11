document.querySelectorAll('.file-entry').forEach(entry => {
    entry.addEventListener('click', () => {
        document.querySelector('#file-status').textContent = `${entry.querySelector('span:nth-child(2)').textContent} selected`;
    });
});