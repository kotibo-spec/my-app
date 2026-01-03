/* --- MAIN.JS --- */

window.onload = () => {
    loadState();
    initChart();
    setupDrag();
    setupEventListeners();
    updateSelectBoxes();
    renderAll();
};

function setupEventListeners() {
    // ナビゲーション
    document.getElementById('btn-report').onclick = () => openModal('modal-report');
    document.getElementById('btn-archive').onclick = () => { renderArchive(); openModal('modal-archive'); };
    document.getElementById('btn-logs').onclick = () => { renderHistory(); openModal('modal-logs'); };
    document.getElementById('btn-tree-manage').onclick = () => openModal('modal-config');
    document.getElementById('btn-settings').onclick = () => openModal('modal-settings');
    
    // アクション
    document.getElementById('btn-submit-task').onclick = submitTask;
    document.getElementById('btn-evolve').onclick = evolveCore;
    document.getElementById('core-circle').onclick = () => openModal('modal-status');
    
    // 管理
    document.getElementById('btn-add-category').onclick = () => {
        const name = document.getElementById('new-cat-name').value.trim();
        if (name && !state.categories.find(c => c.name === name)) {
            state.categories.push({ name: name, points: 0, rank: 0 });
            document.getElementById('new-cat-name').value = "";
            updateSelectBoxes(); renderAll();
            showToast("新たな星系が誕生。");
        }
    };

    document.getElementById('btn-add-task').onclick = () => {
        const name = document.getElementById('new-task-name').value.trim();
        const cat = document.getElementById('new-task-cat').value;
        const attr = document.getElementById('new-task-suffix').value;
        if (name && cat && attr) {
            state.tasks.push({ name: name, cat: cat, attr: attr }); 
            document.getElementById('new-task-name').value = "";
            updateSelectBoxes(); showToast(`タスク「${name}」を登録`);
        }
    };
}

// モーダル管理
function openModal(id) { 
    document.getElementById(id).classList.remove('hidden'); 
    if(id === 'modal-status') {
        updateRadarChart();
        document.getElementById('profile-title').innerText = document.getElementById('main-title').innerText;
    }
}
function closeAllModals() { document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden')); }

// チャート初期化
function initChart() {
    const ctx = document.getElementById('statusChart').getContext('2d');
    statusChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: CONFIG.ATTR_NAMES,
            datasets: [{
                data: CONFIG.ATTR_NAMES.map(a => state.stats[a]),
                backgroundColor: 'rgba(var(--accent-rgb), 0.2)',
                borderColor: 'rgb(var(--accent-rgb))',
                pointBackgroundColor: 'rgb(var(--accent-rgb))',
                borderWidth: 1
            }]
        },
        options: {
            scales: { r: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, angleLines: { color: 'rgba(255,255,255,0.05)' }, ticks: { display: false } } },
            plugins: { legend: { display: false } }
        }
    });
}

function updateRadarChart() {
    if (!statusChart) return;
    statusChart.data.datasets[0].data = CONFIG.ATTR_NAMES.map(a => state.stats[a]);
    statusChart.data.datasets[0].borderColor = `rgb(${getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb')})`;
    statusChart.update();
}