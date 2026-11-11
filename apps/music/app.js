const button = document.querySelector('#music-toggle');
button.addEventListener('click', () => {
    const playing = button.dataset.playing !== 'true';
    button.dataset.playing = String(playing);
    button.textContent = playing ? 'Ⅱ Pause' : '▶ Play';
    document.querySelector('.music-progress span').style.width = playing ? '63%' : '34%';
});