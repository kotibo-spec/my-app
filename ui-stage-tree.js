/* --- UI-STAGE-TREE.JS --- */
let isDragging = false;
let startX, startY;
let scrollX = 0, scrollY = 0;
let currentScale = 1.0;

function setupDrag() {
    const stage = document.getElementById('stage');
    const container = document.getElementById('tree-container');
    const btnIn = document.getElementById('btn-zoom-in');
    const btnOut = document.getElementById('btn-zoom-out');

    const updateTransform = () => {
        container.style.transform = `translate(calc(-50% + ${scrollX}px), calc(-50% + ${scrollY}px)) scale(${currentScale})`;
    };

    stage.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button') || e.target.closest('.modal')) return;
        isDragging = true;
        startX = e.clientX - scrollX;
        startY = e.clientY - scrollY;
    });

    window.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        scrollX = e.clientX - startX;
        scrollY = e.clientY - startY;
        updateTransform();
    });

    window.addEventListener('pointerup', () => { isDragging = false; });

    btnIn.onclick = () => { currentScale = Math.min(currentScale + 0.2, 2.0); updateTransform(); };
    btnOut.onclick = () => { currentScale = Math.max(currentScale - 0.2, 0.2); updateTransform(); };

    updateTransform();
}

function renderStage() {
    const svg = document.getElementById('tree-svg');
    const container = document.getElementById('tree-container');
    container.querySelectorAll('.node').forEach(n => n.remove());
    svg.innerHTML = '';

    const centerX = 1000, centerY = 1000;

    state.categories.forEach((cat, cIdx) => {
        const angle = (cIdx / state.categories.length) * 2 * Math.PI - Math.PI / 2;
        for (let i = 1; i <= 10; i++) {
            const dist = 100 + (i * 60);
            const x = centerX + Math.cos(angle) * dist, y = centerY + Math.sin(angle) * dist;
            const prevDist = (i === 1) ? 0 : 100 + ((i - 1) * 60);
            const px = centerX + Math.cos(angle) * prevDist, py = centerY + Math.sin(angle) * prevDist;

            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", px); line.setAttribute("y1", py);
            line.setAttribute("x2", x); line.setAttribute("y2", y);
            line.setAttribute("stroke", i <= cat.rank ? "rgba(var(--accent-rgb), 0.6)" : "rgba(255,255,255,0.05)");
            line.setAttribute("stroke-width", i <= cat.rank ? "1.5" : "0.5");
            if (i <= cat.rank) line.setAttribute("style", "filter: drop-shadow(0 0 3px var(--accent-color))");
            svg.appendChild(line);

            const node = document.createElement('div');
            node.className = 'node';
            if (i <= cat.rank) node.classList.add('active');
            if (i > cat.rank + 1) node.classList.add('locked');
            if (i === cat.rank + 1 && cat.points >= CONFIG.TREE_COSTS[i - 1]) node.classList.add('can-unlock');
            node.style.left = `${x}px`; node.style.top = `${y}px`; node.style.transform = 'translate(-50%, -50%)';
            node.innerHTML = `<span>${i}</span><div style="font-size:6px; opacity:0.7;">${cat.name}</div>`;
            
            node.onclick = (e) => {
                e.stopPropagation();
                const cost = CONFIG.TREE_COSTS[i - 1];
                if (i === cat.rank + 1 && cat.points >= cost) unlockNode(cat.name, i);
                else if (i > cat.rank) showToast(`必要:${cost}pt (現在:${cat.points})`);
            };
            container.appendChild(node);
        }
    });
}

function unlockNode(catName, step) {
    const cat = state.categories.find(c => c.name === catName);
    const cost = CONFIG.TREE_COSTS[step - 1];
    if (cat.points >= cost) {
        cat.points -= cost; cat.rank = step;
        showToast(`${catName}の称号を獲得！`);
        renderAll();
    }
}