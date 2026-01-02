// --- 状態管理 ---
let state = {
    level: 1, xp: 0,
    stats: { "火": 0, "水": 0, "風": 0, "土": 0, "光": 0, "闇": 0 },
    inventory: {},
    categories: [], // { name: "漫画", points: 0, rank: 0 }
    tasks: [],      // { name: "ネーム", cat: "漫画", suffix: "の業火" }
};

let statusChart = null;
let isDragging = false;
let startX, startY;
let scrollX = -1000, scrollY = -1000; // 星図（2000x2000）の中心に合わせる初期値

// --- 起動 ---
window.onload = () => {
    loadState();
    initChart();
    setupDrag(); // ドラッグ移動の準備
    setupEventListeners();
    renderAll();
    updateSelectBoxes();
};

function saveState() { localStorage.setItem('coreAlchemistData', JSON.stringify(state)); }
function loadState() {
    const saved = localStorage.getItem('coreAlchemistData');
    if (saved) state = Object.assign(state, JSON.parse(saved));
}

// --- 全描画 ---
function renderAll() {
    updateHeader();
    renderStage();
    renderCategoryList(); // 削除用のリスト描画
    updateInventoryUI();
    updateSubTitlesUI();
    updateCoreEvolution(); // コアの進化
    saveState();
}

// 称号・経験値
function updateHeader() {
    const mainTitle = document.getElementById('main-title');
    const userLevel = document.getElementById('user-level');
    const xpBar = document.getElementById('xp-bar');

    let maxAttr = "火";
    let maxVal = -1;
    CONFIG.ATTR_NAMES.forEach(a => {
        if (state.stats[a] > maxVal) { maxVal = state.stats[a]; maxAttr = a; }
    });

    const prefixList = CONFIG.MAIN_PREFIX[maxAttr];
    const prefix = prefixList[Math.min(Math.floor((state.level - 1) / 3), prefixList.length - 1)];
    const rankName = CONFIG.MAIN_RANKS[Math.min(state.level - 1, CONFIG.MAIN_RANKS.length - 1)];
    
    mainTitle.innerText = `【${prefix}】${rankName}`;
    userLevel.innerText = state.level;
    const nextXp = state.level * 1000; 
    xpBar.style.width = Math.min((state.xp / nextXp) * 100, 100) + "%";
}

// コアの進化（リングの表示）
function updateCoreEvolution() {
    const ring = document.getElementById('core-ring');
    const count = state.categories.length;
    ring.className = "core-ring"; // リセット
    if (count >= 1) ring.classList.add('ring-1');
    if (count >= 4) ring.classList.add('ring-2');
}

// --- 星図（ドラッグ移動）の設定 ---
function setupDrag() {
    const stage = document.getElementById('stage');
    const container = document.getElementById('tree-container');

    const updateTransform = () => {
        container.style.transform = `translate(${scrollX}px, ${scrollY}px)`;
    };

    updateTransform(); // 初期位置

    stage.addEventListener('pointerdown', (e) => {
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
}

// 星図ステージの描画
function renderStage() {
    const svg = document.getElementById('tree-svg');
    const container = document.getElementById('tree-container');
    container.querySelectorAll('.node').forEach(n => n.remove());
    svg.innerHTML = '';

    const centerX = 1000; // 2000pxのコンテナの真ん中
    const centerY = 1000;

    state.categories.forEach((cat, cIdx) => {
        const angle = (cIdx / state.categories.length) * 2 * Math.PI - Math.PI / 2;
        
        for (let i = 1; i <= 10; i++) {
            const dist = 100 + (i * 60); // 星図っぽく少し広めに
            const x = centerX + Math.cos(angle) * dist;
            const y = centerY + Math.sin(angle) * dist;

            const prevDist = (i === 1) ? 0 : 100 + ((i - 1) * 60);
            const px = centerX + Math.cos(angle) * prevDist;
            const py = centerY + Math.sin(angle) * prevDist;

            // 星座の線
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", px); line.setAttribute("y1", py);
            line.setAttribute("x2", x); line.setAttribute("y2", y);
            line.setAttribute("stroke", i <= cat.rank ? "rgba(0, 242, 255, 0.6)" : "rgba(255,255,255,0.05)");
            line.setAttribute("stroke-width", i <= cat.rank ? "1.5" : "0.5");
            if (i <= cat.rank) line.setAttribute("style", "filter: drop-shadow(0 0 3px #00f2ff)");
            svg.appendChild(line);

            // 星（ノード）
            const node = document.createElement('div');
            node.className = 'node';
            if (i <= cat.rank) node.classList.add('active');
            if (i > cat.rank + 1) node.classList.add('locked');
            if (i === cat.rank + 1 && cat.points >= CONFIG.TREE_COSTS[i - 1]) node.classList.add('can-unlock');

            node.style.left = `${x}px`;
            node.style.top = `${y}px`;
            node.style.transform = 'translate(-50%, -50%)';

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

// --- 管理画面のカテゴリリスト（削除機能） ---
function renderCategoryList() {
    const list = document.getElementById('category-list');
    list.innerHTML = state.categories.map(cat => `
        <div class="manage-item">
            <span>${cat.name} <small>(Rank:${cat.rank})</small></span>
            <button class="delete-btn" onclick="deleteCategory('${cat.name}')">削除</button>
        </div>
    `).join('');
}

function deleteCategory(name) {
    if (!confirm(`枝「${name}」を削除しますか？\n関連するタスクやポイントも消滅します。`)) return;
    state.categories = state.categories.filter(c => c.name !== name);
    state.tasks = state.tasks.filter(t => t.cat !== name);
    updateSelectBoxes();
    renderAll();
    showToast(`枝「${name}」は宇宙の塵となりました。`);
}

// --- ロジック：報告送信 ---
function submitTask() {
    const taskName = document.getElementById('task-select').value;
    const workMin = parseInt(document.getElementById('pomo-work').value) || 0;
    const count = parseInt(document.getElementById('pomo-count').value) || 0;
    if (!taskName) return showToast("タスクを選択してください");

    const task = state.tasks.find(t => t.name === taskName);
    const totalWork = workMin * count;

    const cat = state.categories.find(c => c.name === task.cat);
    if (cat) cat.points += totalWork;

    let dropCount = Math.floor(totalWork / 30);
    if (Math.random() < (totalWork % 30) / 30) dropCount++;

    if (dropCount > 0) {
        const matName = `【${task.cat}】${task.suffix}`;
        state.inventory[matName] = (state.inventory[matName] || 0) + dropCount;
        showToast(`${matName}を${dropCount}個獲得！`);
    }
    closeAllModals();
    renderAll();
}

// --- ロジック：素材投入 ---
function evolveCore() {
    let totalGainXp = 0;
    let hasItems = false;
    for (const name in state.inventory) {
        const count = state.inventory[name];
        if (count <= 0) continue;
        hasItems = true;
        const suffixOnly = name.split('】')[1];
        const conf = CONFIG.SUFFIXES.find(s => s.name === suffixOnly);
        if (conf) {
            state.stats[conf.attr] += count * 5;
            totalGainXp += count * 100;
        }
    }
    if (!hasItems) return showToast("素材がありません");
    state.inventory = {};
    state.xp += totalGainXp;
    while (state.xp >= state.level * 1000) { state.xp -= state.level * 1000; state.level++; }
    updateRadarChart();
    renderAll();
    showToast("コアが輝きを増した！");
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

// --- UI操作 ---
function setupEventListeners() {
    document.getElementById('btn-report').onclick = () => openModal('modal-report');
    document.getElementById('btn-tree-manage').onclick = () => openModal('modal-config');
    document.getElementById('btn-settings').onclick = () => openModal('modal-settings');
    document.getElementById('btn-submit-task').onclick = submitTask;
    document.getElementById('btn-evolve').onclick = evolveCore;
    document.getElementById('core-circle').onclick = () => openModal('modal-status');

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
        const suffix = document.getElementById('new-task-suffix').value;
        if (name && cat) {
            state.tasks.push({ name: name, cat: cat, suffix: suffix });
            document.getElementById('new-task-name').value = "";
            updateSelectBoxes(); showToast("タスクを記録。");
        }
    };
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); if(id==='modal-status') updateRadarChart(); }
function closeAllModals() { document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden')); }

function updateSelectBoxes() {
    document.getElementById('task-select').innerHTML = state.tasks.map(t => `<option value="${t.name}">${t.name} (${t.cat})</option>`).join('');
    document.getElementById('new-task-cat').innerHTML = state.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    document.getElementById('new-task-suffix').innerHTML = CONFIG.SUFFIXES.map(s => `<option value="${s.name}">${s.icon} ${s.name}</option>`).join('');
}

function updateInventoryUI() {
    const inv = document.getElementById('inventory'); inv.innerHTML = '';
    for (const name in state.inventory) {
        if (state.inventory[name] > 0) {
            const suffix = name.split('】')[1];
            const icon = CONFIG.SUFFIXES.find(s => s.name === suffix)?.icon || "💎";
            inv.innerHTML += `<div class="item-slot"><span class="item-icon">${icon}</span><span class="item-name">${name}</span><span class="item-count">${state.inventory[name]}</span></div>`;
        }
    }
}

function updateSubTitlesUI() {
    document.getElementById('sub-titles').innerHTML = state.categories.map(c => {
        if (c.rank === 0) return "";
        const titleText = (c.rank === 10) ? `真の${c.name}` : `${c.name}${CONFIG.SUB_TITLES[c.rank-1]}`;
        return `<div style="color:var(--accent-color); font-weight:bold; margin-bottom:5px;">◈ ${titleText} <small style="color:#555;">(${c.points}pt)</small></div>`;
    }).join('');
    document.getElementById('profile-title').innerText = document.getElementById('main-title').innerText;
}

function initChart() {
    const ctx = document.getElementById('statusChart').getContext('2d');
    statusChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: CONFIG.ATTR_NAMES,
            datasets: [{
                data: CONFIG.ATTR_NAMES.map(a => state.stats[a]),
                backgroundColor: 'rgba(0, 242, 255, 0.2)',
                borderColor: '#00f2ff',
                pointBackgroundColor: '#00f2ff',
                borderWidth: 1
            }]
        },
        options: {
            scales: { r: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, angleLines: { color: 'rgba(255,255,255,0.05)' }, ticks: { display: false } } },
            plugins: { legend: { display: false } }
        }
    });
}
function updateRadarChart() { if (statusChart) { statusChart.data.datasets[0].data = CONFIG.ATTR_NAMES.map(a => state.stats[a]); statusChart.update(); } }

function showToast(msg) {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.style = "background:rgba(0,0,0,0.85); border:1px solid var(--accent-color); color:#fff; padding:12px 20px; margin-bottom:10px; border-radius:12px; font-size:13px; box-shadow:0 0 15px rgba(0,242,255,0.4);";
    t.innerText = msg;
    c.appendChild(t);
    setTimeout(() => { t.remove(); }, 3000);
}