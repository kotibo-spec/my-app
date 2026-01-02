// --- 状態管理 (セーブデータ) ---
let state = {
    level: 1,
    xp: 0,
    stats: { "火": 0, "水": 0, "風": 0, "土": 0, "光": 0, "闇": 0 },
    inventory: {}, // "【漫画】の業火": 個数
    categories: [], // { name: "漫画", points: 0, rank: 0 }
    tasks: [],      // { name: "ネーム", cat: "漫画", suffix: "の業火" }
};

let statusChart = null;

// --- 初期化 ---
window.onload = () => {
    loadState();
    initChart();
    renderAll();
    setupEventListeners();
    updateSelectBoxes();
};

// --- セーブ/ロード ---
function saveState() {
    localStorage.setItem('coreAlchemistData', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('coreAlchemistData');
    if (saved) state = JSON.parse(saved);
}

// --- 描画全般 ---
function renderAll() {
    updateHeader();
    renderStage();
    updateInventoryUI();
    updateSubTitlesUI();
    saveState();
}

// ヘッダー（メイン称号・Lv・XP）
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
    const rank = CONFIG.MAIN_RANKS[Math.min(state.level - 1, CONFIG.MAIN_RANKS.length - 1)];
    
    mainTitle.innerText = `【${prefix}】${rank}`;
    userLevel.innerText = state.level;

    const nextXp = state.level * 1000; 
    xpBar.style.width = Math.min((state.xp / nextXp) * 100, 100) + "%";
}

// 放射状スキルツリーの描画
function renderStage() {
    const svg = document.getElementById('tree-svg');
    const container = document.getElementById('tree-container');
    const nodes = document.querySelectorAll('.node');
    nodes.forEach(n => n.remove());
    svg.innerHTML = '';

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    state.categories.forEach((cat, cIdx) => {
        const angle = (cIdx / state.categories.length) * 2 * Math.PI - Math.PI / 2;
        
        for (let i = 1; i <= 10; i++) {
            const dist = 70 + (i * 45); // コアからの距離
            const x = centerX + Math.cos(angle) * dist;
            const y = centerY + Math.sin(angle) * dist;

            // 線を描画（前のノードから）
            const prevDist = 70 + ((i-1) * 45);
            const px = (i === 1) ? centerX : centerX + Math.cos(angle) * prevDist;
            const py = (i === 1) ? centerY : centerY + Math.sin(angle) * prevDist;

            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", px); line.setAttribute("y1", py);
            line.setAttribute("x2", x); line.setAttribute("y2", y);
            line.setAttribute("stroke", i <= cat.rank ? "var(--accent-color)" : "#222");
            line.setAttribute("stroke-width", i <= cat.rank ? "2" : "1");
            svg.appendChild(line);

            // ノード（ボタン）を描画
            const node = document.createElement('div');
            const isLocked = i > cat.rank + 1;
            const canUnlock = i === cat.rank + 1 && cat.points >= CONFIG.TREE_COSTS[i-1];
            
            node.className = `node ${isLocked ? 'locked' : ''} ${canUnlock ? 'can-unlock' : ''}`;
            node.style.left = (x - 22) + "px";
            node.style.top = (y - 22) + "px";
            
            // 称号（サブ称号）の表示
            const subTitle = i === 10 ? `真の${cat.name}` : `${cat.name}${CONFIG.SUB_TITLES[i-1]}`;
            node.innerHTML = `<span>${i}</span><div style="font-size:5px; transform:scale(0.8)">${cat.name}</div>`;
            
            node.onclick = () => {
                if (canUnlock) unlockNode(cat.name, i);
                else if (isLocked) showToast(`必要：${CONFIG.TREE_COSTS[i-1]}pt`);
            };
            container.appendChild(node);
        }
    });
}

// --- ロジック：報告送信 ---
function submitTask() {
    const taskName = document.getElementById('task-select').value;
    const workMin = parseInt(document.getElementById('pomo-work').value);
    const count = parseInt(document.getElementById('pomo-count').value);
    if (!taskName) return showToast("タスクを登録してください");

    const task = state.tasks.find(t => t.name === taskName);
    const totalWork = workMin * count;

    // 1. カテゴリポイント獲得 (ツリー用)
    const cat = state.categories.find(c => c.name === task.cat);
    if (cat) cat.points += totalWork;

    // 2. 素材ドロップ (30分毎に1個 + 確率)
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

// --- ロジック：素材投入（進化） ---
function evolveCore() {
    let totalGainXp = 0;
    let hasItems = false;
    for (const name in state.inventory) {
        const count = state.inventory[name];
        if (count <= 0) continue;
        hasItems = true;

        const suffixName = name.split('】')[1];
        const configSuffix = CONFIG.SUFFIXES.find(s => s.name === suffixName);
        if (configSuffix) {
            state.stats[configSuffix.attr] += count * 5;
            totalGainXp += count * 100;
        }
    }

    if (!hasItems) return showToast("素材がありません");

    state.inventory = {};
    state.xp += totalGainXp;

    while (state.xp >= state.level * 1000) {
        state.xp -= state.level * 1000;
        state.level++;
        showToast("Lv UP!! 階級が上昇しました。");
    }

    showToast("ステータスと経験値が上昇！");
    updateRadarChart();
    renderAll();
}

// --- ロジック：ツリー解放 ---
function unlockNode(catName, step) {
    const cat = state.categories.find(c => c.name === catName);
    const cost = CONFIG.TREE_COSTS[step - 1];
    if (cat.points >= cost) {
        cat.points -= cost;
        cat.rank = step;
        showToast(`称号：${catName}${CONFIG.SUB_TITLES[step-1]} を獲得！`);
        renderAll();
    }
}

// --- 設定操作 ---
function setupEventListeners() {
    document.getElementById('btn-report').onclick = () => openModal('modal-report');
    document.getElementById('btn-tree-manage').onclick = () => openModal('modal-config');
    document.getElementById('btn-settings').onclick = () => openModal('modal-settings');
    document.getElementById('btn-submit-task').onclick = submitTask;
    document.getElementById('btn-evolve').onclick = evolveCore;

    document.getElementById('btn-add-category').onclick = () => {
        const name = document.getElementById('new-cat-name').value;
        if (name && !state.categories.find(c => c.name === name)) {
            state.categories.push({ name: name, points: 0, rank: 0 });
            document.getElementById('new-cat-name').value = "";
            updateSelectBoxes(); renderAll();
        }
    };

    document.getElementById('btn-add-task').onclick = () => {
        const name = document.getElementById('new-task-name').value;
        const cat = document.getElementById('new-task-cat').value;
        const suffix = document.getElementById('new-task-suffix').value;
        if (name && cat) {
            state.tasks.push({ name: name, cat: cat, suffix: suffix });
            document.getElementById('new-task-name').value = "";
            updateSelectBoxes(); showToast("タスク登録完了");
        }
    };
}

// --- UI補助 ---
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeAllModals() { document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden')); }

function updateSelectBoxes() {
    const taskSel = document.getElementById('task-select');
    const catSel = document.getElementById('new-task-cat');
    const sufSel = document.getElementById('new-task-suffix');

    taskSel.innerHTML = state.tasks.map(t => `<option value="${t.name}">${t.name} (${t.cat})</option>`).join('');
    catSel.innerHTML = state.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    sufSel.innerHTML = CONFIG.SUFFIXES.map(s => `<option value="${s.name}">${s.icon} ${s.name} [${s.attr}]</option>`).join('');
}

function updateInventoryUI() {
    const inv = document.getElementById('inventory');
    inv.innerHTML = '';
    for (const name in state.inventory) {
        if (state.inventory[name] > 0) {
            const suffix = name.split('】')[1];
            const icon = CONFIG.SUFFIXES.find(s => s.name === suffix)?.icon || "💎";
            const slot = document.createElement('div');
            slot.className = 'item-slot';
            slot.innerHTML = `<span class="item-icon">${icon}</span><span class="item-name">${name}</span><span class="item-count">${state.inventory[name]}</span>`;
            inv.appendChild(slot);
        }
    }
}

function updateSubTitlesUI() {
    const cont = document.getElementById('sub-titles');
    cont.innerHTML = state.categories.map(c => {
        if (c.rank === 0) return "";
        const title = c.rank === 10 ? `真の${c.name}` : `${c.name}${CONFIG.SUB_TITLES[c.rank-1]}`;
        return `<div style="color:var(--accent-color)">◈ ${title} (累計:${c.points}pt)</div>`;
    }).join('');
}

// --- グラフ ---
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
                pointBackgroundColor: '#00f2ff'
            }]
        },
        options: {
            scales: { r: { beginAtZero: true, grid: { color: '#333' }, angleLines: { color: '#333' }, ticks: { display: false } } },
            plugins: { legend: { display: false } }
        }
    });
}
function updateRadarChart() {
    if (statusChart) {
        statusChart.data.datasets[0].data = CONFIG.ATTR_NAMES.map(a => state.stats[a]);
        statusChart.update();
    }
}

function showToast(msg) {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.style = "background:rgba(0,0,0,0.9); border:1px solid var(--accent-color); padding:12px; margin-top:10px; border-radius:10px; font-size:12px; animation: fadeIn 0.3s;";
    t.innerText = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}