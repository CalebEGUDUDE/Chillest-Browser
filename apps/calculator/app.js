const display = document.querySelector('#display');
let state = { display: '0', stored: null, operation: null, fresh: true };

document.querySelector('.calculator').addEventListener('click', event => {
    const key = event.target.closest('[data-key]')?.dataset.key;
    if (!key) return;
    if (key === 'clear') state = { display: '0', stored: null, operation: null, fresh: true };
    else if (key === 'sign') state.display = String(Number(state.display) * -1);
    else if (key === 'percent') state.display = String(Number(state.display) / 100);
    else if (key === '.') {
        if (state.fresh) state.display = '0';
        if (!state.display.includes('.')) state.display += '.';
        state.fresh = false;
    } else if (['+', '-', '*', '/'].includes(key)) {
        state.stored = Number(state.display);
        state.operation = key;
        state.fresh = true;
    } else if (key === 'equals') {
        if (state.operation && state.stored !== null) {
            const current = Number(state.display);
            const result = state.operation === '+' ? state.stored + current : state.operation === '-' ? state.stored - current : state.operation === '*' ? state.stored * current : current === 0 ? NaN : state.stored / current;
            state.display = Number.isFinite(result) ? String(Number(result.toFixed(8))) : 'Nope';
            state.stored = null;
            state.operation = null;
            state.fresh = true;
        }
    } else {
        state.display = state.fresh || state.display === '0' || state.display === 'Nope' ? key : state.display + key;
        state.fresh = false;
    }
    display.textContent = state.display;
});