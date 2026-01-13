/* --- main.js --- */

window.onload = () => {
    loadState();
    initChart();
    setupDrag();
    setupEventListeners(); // ここでボタンの設定が走ります
    updateSelectBoxes();
    renderAll();
};

function setupEventListeners() {
    // 1. ナビゲーション（下部メニュー）の設定
    document.getElementById('btn-report').onclick = () => openModal('modal-report');
    
    // ★ここが重要！錬金ボタンの設定
    document.getElementById('btn-alchemy').onclick = () => {
        if (typeof updateInventoryUI === 'function') {
            updateInventoryUI(); // 最新の所持数を描画
        }
        openModal('modal-alchemy'); // モーダルを開く
    };

    document.getElementById('btn-archive').onclick = () => { renderArchive(); openModal('modal-archive'); };
    document.getElementById('btn-logs').onclick = () => { renderHistory(); openModal('modal-logs'); };
    document.getElementById('btn-tree-manage').onclick = () => openModal('modal-config');
    document.getElementById('btn-settings').onclick = () => openModal('modal-settings');
    
    // 2. アクションボタンの設定
    const btnSubmit = document.getElementById('btn-submit-task');
    if (btnSubmit) btnSubmit.onclick = submitTask;

    const btnEvolve = document.getElementById('btn-evolve');
    if (btnEvolve) btnEvolve.onclick = evolveCore;

    const coreCircle = document.getElementById('core-circle');
    if (coreCircle) coreCircle.onclick = () => openModal('modal-status');
    
    // 3. 管理画面の追加ボタン設定
    const btnAddCat = document.getElementById('btn-add-category');
    if (btnAddCat) {
        btnAddCat.onclick = () => {
            const name = document.getElementById('new-cat-name').value.trim();
            if (name && !state.categories.find(c => c.name === name)) {
                state.categories.push({ name: name, points: 0, rank: 0 });
                document.getElementById('new-cat-name').value = "";
                updateSelectBoxes(); renderAll();
                showToast("新たな星系が誕生。");
            }
        };
    }

    const btnAddTask = document.getElementById('btn-add-task');
    if (btnAddTask) {
        btnAddTask.onclick = () => {
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
}

// モーダル管理
function openModal(id) { 
    const modal = document.getElementById(id);
    if(modal) {
        modal.classList.remove('hidden'); 
        if(id === 'modal-status') {
            updateRadarChart();
            // プロフィールのタイトルをメインタイトルと同期
            const mainTitle = document.getElementById('main-title');
            const profileTitle = document.getElementById('profile-title');
            if(mainTitle && profileTitle) profileTitle.innerText = mainTitle.innerText;
        }
    } else {
        console.error("Modal not found: " + id);
    }
}

function closeAllModals() { document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden')); }

// チャート初期化
function initChart() {
    const ctx = document.getElementById('statusChart').getContext('2d');
    const accentRGB = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim() || "0, 242, 255";
    
    statusChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: CONFIG.ATTR_NAMES,
            datasets: [{
                data: CONFIG.ATTR_NAMES.map(a => state.stats[a]),
                backgroundColor: `rgba(${accentRGB}, 0.2)`,
                borderColor: `rgb(${accentRGB})`,
                pointBackgroundColor: `rgb(${accentRGB})`,
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
    const accentRGB = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim();
    
    statusChart.data.datasets[0].data = CONFIG.ATTR_NAMES.map(a => state.stats[a]);
    statusChart.data.datasets[0].borderColor = `rgb(${accentRGB})`;
    statusChart.data.datasets[0].backgroundColor = `rgba(${accentRGB}, 0.2)`;
    statusChart.data.datasets[0].pointBackgroundColor = `rgb(${accentRGB})`;
    statusChart.update();
}