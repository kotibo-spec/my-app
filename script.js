// --- 状態管理 (セーブデータ) ---
let state = {
    level: 1,
    xp: 0,
    stats: { "火": 0, "水": 0, "風": 0, "土": 0, "光": 0, "闇": 0 },
    inventory: {}, // 素材名: 個数
    categories: [], // { name: "漫画", points: 0, rank: 0 }
    tasks: [],      // { name: "ネーム", cat: "漫画", suffix: "の業火" }
    history: []     // { date: "", task: "", pomo: "" }
};

let statusChart = null;

// --- 初期化 ---
window.onload = () => {
    loadState();
    initChart();
    renderAll();
    setupEventListeners();
    
    // カテゴリとタスクのセレクトボックスを更新
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

// ヘッダー（称号・レベル・XP）
function updateHeader() {
    const mainTitle = document.getElementById('main-title');
    const userLevel = document.getElementById('user-level');
    const xpBar = document.getElementById('xp-bar');

    // 最強属性の特定
    let maxAttr = "火";
    let maxVal = -1;
    for (const a of CONFIG.ATTR_NAMES) {
        if (state.stats[a] > maxVal) {
            maxVal = state.stats[a];
            maxAttr = a;
        }
    }

    // 称号決定
    const prefixList = CONFIG.MAIN_PREFIX[maxAttr];
    const prefix = prefixList[Math.min(state.level - 1, prefixList.length - 1)];
    const rank = CONFIG.MAIN_RANKS[Math.min(state.level - 1, CONFIG.MAIN_RANKS.length - 1)];
    
    mainTitle.innerText = `【${prefix}】${rank}`;
    userLevel.innerText = state.level;

    const nextXp = state.level * 500; // 次のLvまでの必要経験値
    const percent = Math.min((state.xp / nextXp) * 100, 100);
    xpBar.style.width = percent + "%";
}

// ステージ（コア・ツリー）
function renderStage() {
    const stage = document.getElementById('stage');
    const svg = document.getElementById('tree-svg');
    const container = document.getElementById('tree-container');
    
    // 一旦クリア（コア以外）
    const oldNodes = document.querySelectorAll('.node');
    oldNodes.forEach(n => n.remove());
    svg.innerHTML = '';

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    state.categories.forEach((cat, cIdx) => {
        const angle = (cIdx / state.categories.length) * 2 * Math.PI;
        const baseRadius = 120;
        
        // 枝の線を描画
        let prevX = centerX;
        let prevY = centerY;

        for (let i = 1; i <= 10; i++) {
            const dist = baseRadius + (i * 40);
            const x = centerX + Math.cos(angle) * dist;
            const y = centerY + Math.sin(angle) * dist;

            // 線
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", prevX);
            line.setAttribute("y1", prevY);
            line.setAttribute("x2", x);
            line.setAttribute("y2", y);
            line.setAttribute("stroke", i <= cat.rank ? "var(--accent-color)" : "#222");
            line.setAttribute("stroke-width", "2");
            svg.appendChild(line);

            // ノード（10段階目まで描画）
            const node = document.createElement('div');
            node.className = `node ${i > cat.rank + 1 ? 'locked' : ''}`;
            if (i <= cat.rank) node.style.borderColor = "var(--p-color)";
            
            node.style.left = (x - 20) + "px";
            node.style.top = (y - 20) + "px";
            node.innerText = i;
            
            // ノードクリックで進化（重め設定）
            node.onclick = () => upgradeTree(cat.name, i);

            container.appendChild(node);
            prevX = x; prevY = y;
        }
    });
}

// --- ロジック：タスク完了 ---
function submitTask() {
    const taskName = document.getElementById('task-select').value;
    const workMin = parseInt(document.getElementById('pomo-work').value);
    const count = parseInt(document.getElementById('pomo-count').value);
    
    if (!taskName) return alert("タスクを選択してください");

    const task = state.tasks.find(t => t.name === taskName);
    const totalMin = workMin * count;

    // 1. カテゴリポイント加算
    const cat = state.categories.find(c => c.name === task.cat);
    if (cat) cat.points += totalMin;

    // 2. 素材ドロップ (30分につき1個 + 確率)
    let dropCount = Math.floor(totalMin / 30);
    if (Math.random() < (totalMin % 30) / 30) dropCount++;

    if (dropCount > 0) {
        const matName = `【${task.cat}】${task.suffix}`;
        state.inventory[matName] = (state.inventory[matName] || 0) + dropCount;
        showToast(`${matName} を ${dropCount}個 獲得！`);
    }

    // 3. 履歴保存
    state.history.push({ date: new Date().toLocaleString(), task: taskName, pomo: `${workMin}分×${count}` });

    closeAllModals();
    renderAll();
}

// --- ロジック：素材投入（進化） ---
function evolveCore() {
    let totalGainXp = 0;
    for (const matName in state.inventory) {
        const count = state.inventory[matName];
        if (count <= 0) continue;

        // 属性判定 (Suffixから属性を引く)
        const suffix = CONFIG.SUFFIXES.find(s => matName.endsWith(s.name));
        if (suffix) {
            state.stats[suffix.attr] += count * 10;
            totalGainXp += count * 50;
        }
    }

    state.inventory = {}; // 全投入
    state.xp += totalGainXp;

    // レベルアップチェック
    while (state.xp >= state.level * 500) {
        state.xp -= state.level * 500;
        state.level++;
        showToast("LEVEL UP!!");
    }

    updateRadarChart();
    renderAll();
}

// --- ロジック：ツリー強化 ---
function upgradeTree(catName, step) {
    const cat = state.categories.find(c => c.name === catName);
    if (cat.rank + 1 !== step) return; // 順番通りのみ

    const cost = CONFIG.TREE_COSTS[step - 1];
    if (cat.points >= cost) {
        cat.points -= cost;
        cat.rank++;
        showToast(`${catName}の称号が昇格！`);
        renderAll();
    } else {
        alert(`ポイントが足りません。必要: ${cost} (現在: ${cat.points})`);
    }
}

// --- UI操作 ---
function setupEventListeners() {
    document.getElementById('btn-status').onclick = () => openModal('modal-status');
    document.getElementById('btn-report').onclick = () => openModal('modal-report');
    document.getElementById('btn-tree-manage').onclick = () => openModal('modal-config');
    document.querySelectorAll('.close-btn').forEach(b => b.onclick = closeAllModals);
    
    document.getElementById('btn-submit-task').onclick = submitTask;
    document.getElementById('btn-evolve').onclick = evolveCore;

    // 設定画面の追加ボタン
    document.getElementById('btn-add-category').onclick = () => {
        const name = document.getElementById('new-cat-name').value;
        if (name && !state.categories.find(c => c.name === name)) {
            state.categories.push({ name: name, points: 0, rank: 0 });
            renderAll();
            updateSelectBoxes();
        }
    };

    document.getElementById('btn-add-task').onclick = () => {
        const name = document.getElementById('new-task-name').value;
        const cat = document.getElementById('new-task-cat').value;
        const suffix = document.getElementById('new-task-suffix').value;
        if (name && cat) {
            state.tasks.push({ name: name, cat: cat, suffix: suffix });
            updateSelectBoxes();
            alert("タスクを登録しました");
        }
    };
}

function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
    if (id === 'modal-status') updateRadarChart();
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

function updateSelectBoxes() {
    const taskSel = document.getElementById('task-select');
    const catSel = document.getElementById('new-task-cat');
    const sufSel = document.getElementById('new-task-suffix');

    taskSel.innerHTML = state.tasks.map(t => `<option value="${t.name}">${t.name} (${t.cat})</option>`).join('');
    catSel.innerHTML = state.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    sufSel.innerHTML = CONFIG.SUFFIXES.map(s => `<option value="${s.name}">${s.name} [${s.attr}]</option>`).join('');
}

function updateInventoryUI() {
    const inv = document.getElementById('inventory');
    inv.innerHTML = '';
    for (const name in state.inventory) {
        if (state.inventory[name] > 0) {
            const item = document.createElement('div');
            item.className = 'item-slot';
            item.innerHTML = `<span>${name.split('】')[1]}</span><span class="item-count">${state.inventory[name]}</span>`;
            inv.appendChild(item);
        }
    }
}

function updateSubTitlesUI() {
    const container = document.getElementById('sub-titles');
    container.innerHTML = '<h3>サブ称号</h3>';
    state.categories.forEach(cat => {
        if (cat.rank > 0) {
            const title = cat.rank === 10 ? `真の${cat.name}` : `${cat.name}${CONFIG.SUB_TITLES[cat.rank-1]}`;
            const div = document.createElement('div');
            div.style.color = "var(--p-color)";
            div.style.fontSize = "12px";
            div.innerText = `◈ ${title}`;
            container.appendChild(div);
        }
    });
}

// --- レーダーチャート (Chart.js) ---
function initChart() {
    const ctx = document.getElementById('statusChart').getContext('2d');
    statusChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: CONFIG.ATTR_NAMES,
            datasets: [{
                label: 'ステータス',
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
    if (!statusChart) return;
    statusChart.data.datasets[0].data = CONFIG.ATTR_NAMES.map(a => state.stats[a]);
    statusChart.update();
}

function showToast(msg) {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.style.background = "rgba(0,0,0,0.8)";
    t.style.border = "1px solid var(--accent-color)";
    t.style.padding = "10px 20px";
    t.style.marginTop = "10px";
    t.style.borderRadius = "5px";
    t.style.fontSize = "12px";
    t.innerText = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}