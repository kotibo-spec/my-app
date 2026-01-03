/* --- UI-CORE-FX.JS --- */
function updateCoreEvolution() {
    const container = document.getElementById('ring-container');
    const flair = document.getElementById('stage-flair');
    if (!container || !flair) return;

    container.innerHTML = '';
    for (let i = 1; i <= state.level; i++) {
        const ring = document.createElement('div');
        ring.className = 'core-ring';
        const size = 110 + (i * 15); 
        ring.style.width = size + 'px'; ring.style.height = size + 'px';
        const speed = 3 + (i * 1.5); 
        const direction = (i % 2 === 0) ? 'rotate' : 'rotate-rev';
        ring.style.animation = `${direction} ${speed}s linear infinite`;
        if (i % 5 === 0) {
            ring.style.borderStyle = 'dashed'; ring.style.borderWidth = '2px'; ring.style.opacity = '0.6';
        } else {
            ring.style.opacity = 0.1 + (Math.random() * 0.3);
        }
        container.appendChild(ring);
    }

    if (state.level >= 5) {
        flair.classList.add('flair-active');
        const shadowPower = Math.min(state.level * 2, 40);
        flair.style.boxShadow = `inset 0 0 ${shadowPower}px var(--accent-color)`;
    } else {
        flair.classList.remove('flair-active');
    }
}