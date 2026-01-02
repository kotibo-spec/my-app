// script.js (中身をこれに差し替えててください)
let state = {
    level: 1, xp: 0,
    stats: { "火": 0, "水": 0, "風": 0, "土": 0, "光": 0, "闇": 0 },
    inventory: {}, categories: [], tasks: [], history: []
};

// 属性ごとの絵文字
const ATTR_EMOJI = { "火": "🔥", "水": "💧", "風": "🌪️", "土": "⛰️", "光": "✨", "闇": "🌑" };
let statusChart = null;

window.onload = () => {
    loadState();
    initChart();
    renderAll();
};

function saveState() { localStorage.setItem('coreAlchemistData', JSON.stringify(state)); }
function loadState() {
    const saved = localStorage.getItem('coreAlchemistData');
    if (saved) state = JSON.parse(saved);
}

function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
    updateSelectBoxes();
    if (id === 'modal-status') updateRadarChart();
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

function renderAll() {
    updateHeader();
    renderTree();
    updateInventoryUI();
    updateSubTitlesUI();
    saveState();
}

// 称号・レベル更新
function updateHeader() {
    let maxAttr = "火", maxVal = -1;
    for (const a of CONFIG.ATTR_NAMES) {
        if (state.stats[a] > maxVal) { maxVal = state.stats[a]; maxAttr = a; }
    }
    const prefix = CONFIG.MAIN_PREFIX[maxAttr][Math.min(state.level-1, 2)];
    const rank = CONFIG.MAIN_RANKS[Math.min(state.level-1, 9)];
    const titleStr = `【${prefix}】${rank}`;
    document.getElementById('main-title').innerText = titleStr;
    document.getElementById('profile-main-title').innerText = titleStr;
    document.getElementById('user-level').innerText = state.level;
    const nextXp = state.level * 500;
    document.getElementById('xp-bar').style.width = Math.min((state.xp / nextXp) * 100, 100) + "%";
}

// ★修正：ツリー描画ロジック (放射状)
function renderTree() {
    const svg = document.getElementById('tree-svg');
    const container = document.getElementById('tree-container');
    container.innerHTML = '';
    svg.innerHTML = '';

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    state.categories.forEach((cat, cIdx) => {
        const angle = (cIdx / state.categories.length) * 2 * Math.PI - Math.PI/2;
        
        for (let i = 1; i <= 10; i++) {
            const dist = 60 + (i * 35); // コアからの距離
            const x = centerX + Math.cos(angle) * dist;
            const y = centerY + Math.sin(angle) * dist;

            // 線を引く (1つ前のノードから)
            const prevDist = 60 + ((i-1) * 35);
            const px = i === 1 ? centerX : centerX + Math.cos(angle) * prevDist;
            const py = i === 1 ? centerY : centerY + Math.sin(angle) * prevDist;

            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", px); line.setAttribute("y1", py);
            line.setAttribute("x2", x); line.setAttribute("y2", y);
            line.setAttribute("stroke", i <= cat.rank ? "var(--accent-color)" : "#333");
            line.setAttribute("stroke-width", i <= cat.rank ? "2" : "1");
            svg.appendChild(line);

            // ノード作成
            const node = document.createElement('div');
            node.className = `node ${i > cat.rank + 1 ? 'locked' : ''}`;
            node.style.left = `${x}px`;
            node.style.top = `${y}px`;
            node.style.transform = "translate(-50%, -50%)"; // 中心合わせ
            
            // ノードのラベル (10段目は「真」、それ以外は数字)
            node.innerText = i === 10 ? "真" : i;
            node.onclick = () => upgradeTree(cat.name, i);
            container.appendChild(node);
        }

        // カテゴリ名のラベルを枝の先に表示
        const labelDist = 60 + (11 * 35);
        const lx = centerX + Math.cos(angle) * labelDist;
        const ly = centerY + Math.sin(angle) * labelDist;
        const label = document.createElement('div');
        label.className = 'tree-label';
        label.style.left = `${lx}px`; label.style.top = `${ly}px`;
        label.innerText = cat.name;
        container.appendChild(label);
    });
}

// タスク完了
function submitTask() {
    const taskName = document.getElementById('task-select').value;
    const workMin = parseInt(document.getElementById('pomo-work').value);
    const count = parseInt(document.getElementById('pomo-count').value);
    if (!taskName) return alert("タスクを選択してください");

    const task = state.tasks.find(t => t.name === taskName);
    const totalWork = workMin * count;

    // ポイント加算
    const cat = state.categories.find(c => c.name === task.cat);
    if (cat) cat.points += totalWork;

    // 素材獲得 (30分ごと)
    let dropCount = Math.floor(totalWork / 30);
    if (Math.random() < (totalWork % 30) / 30) dropCount++;

    if (dropCount > 0) {
        const matName = `【${task.cat}】${task.suffix}`; // Prefixをしっかり結合
        state.inventory[matName] = (state.inventory[matName] || 0) + dropCount;
        showToast(`${matName} を獲得！`);
    }
    closeAllModals();
    renderAll();
}

// 素材投入
function evolveCore() {
    let xpGain = 0;
    for (const name in state.inventory) {
        const count = state.inventory[name];
        const suffixMatch = CONFIG.SUFFIXES.find(s => name.endsWith(s.name));
        if (suffixMatch) {
            state.stats[suffixMatch.attr] += count * 5;
            xpGain += count * 20;
        }
    }
    state.inventory = {};
    state.xp += xpGain;
    while (state.xp >= state.level * 500) {
        state.xp -= state.level * 500;
        state.level++;
    }
    renderAll();
    showToast("コアに素材を捧げ、力が上昇した！");
}

function upgradeTree(catName, step) {
    const cat = state.categories.find(c => c.name === catName);
    if (cat.rank + 1 !== step) return;
    const cost = CONFIG.TREE_COSTS[step-1];
    if (cat.points >= cost) {
        cat.points -= cost;
        cat.rank++;
        renderAll();
    } else { alert(`ポイント不足！ 必要: ${cost}`); }
}

function updateInventoryUI() {
    const inv = document.getElementById('inventory');
    inv.innerHTML = '';
    for (const name in state.inventory) {
        if (state.inventory[name] <= 0) continue;
        const suffix = CONFIG.SUFFIXES.find(s => name.endsWith(s.name));
        const emoji = ATTR_EMOJI[suffix.attr];
        const item = document.createElement('div');
        item.className = 'item-slot';
        item.innerHTML = `<span style="font-size:16px">${emoji}</span><span style="font-size:8px; text-align:center">${name}</span><span class="item-count">${state.inventory[name]}</span>`;
        inv.appendChild(item);
    }
}

function updateSubTitlesUI() {
    const container = document.getElementById('sub-titles');
    container.innerHTML = '<h3>習得称号</h3>';
    state.categories.forEach(cat => {
        if (cat.rank > 0) {
            const title = cat.rank === 10 ? `真の${cat.name}` : `${cat.name}${CONFIG.SUB_TITLES[cat.rank-1]}`;
            container.innerHTML += `<div style="color:var(--accent-color); font-size:12px;">◈ ${title}</div>`;
        }
    });
}

function updateSelectBoxes() {
    document.getElementById('task-select').innerHTML = state.tasks.map(t => `<option value="${t.name}">${t.name} (報酬:${t.suffix})</option>`).join('');
    document.getElementById('new-task-cat').innerHTML = state.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    document.getElementById('new-task-suffix').innerHTML = CONFIG.SUFFIXES.map(s => `<option value="${s.name}">${s.name} [${s.attr}]</option>`).join('');
}

function addCategory() {
    const name = document.getElementById('new-cat-name').value;
    if (name && !state.categories.find(c => c.name === name)) {
        state.categories.push({ name, points: 0, rank: 0 });
        renderAll();
    }
}

function addTask() {
    const name = document.getElementById('new-task-name').value;
    const cat = document.getElementById('new-task-cat').value;
    const suffix = document.getElementById('new-task-suffix').value;
    if (name && cat) {
        state.tasks.push({ name, cat, suffix });
        updateSelectBoxes();
        showToast("タスクを登録しました");
    }
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
    t.className = "toast";
    t.innerText = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}