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
    if (saved) {
        const parsed = JSON.parse(saved);
        // 古いデータとの互換性維持
        state = Object.assign(state, parsed);
    }
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

    // 最強属性を特定
    let maxAttr = "火";
    let maxVal = -1;
    CONFIG.ATTR_NAMES.forEach(a => {
        if (state.stats[a] > maxVal) {
            maxVal = state.stats[a];
            maxAttr = a;
        }
    });

    // 称号決定
    const prefixList = CONFIG.MAIN_PREFIX[maxAttr];
    const prefix = prefixList[Math.min(Math.floor((state.level - 1) / 3), prefixList.length - 1)];
    const rankName = CONFIG.MAIN_RANKS[Math.min(state.level - 1, CONFIG.MAIN_RANKS.length - 1)];
    
    mainTitle.innerText = `【${prefix}】${rankName}`;
    userLevel.innerText = state.level;

    const nextXp = state.level * 1000; 
    const xpPercent = Math.min((state.xp / nextXp) * 100, 100);
    xpBar.style.width = xpPercent + "%";
}

// 放射状スキルツリーの描画
function renderStage() {
    const svg = document.getElementById('tree-svg');
    const container = document.getElementById('tree-container');
    
    // 既存のノードと線をクリア
    container.innerHTML = '';
    svg.innerHTML = '';

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    state.categories.forEach((cat, cIdx) => {
        // カテゴリごとの角度（上から時計回り）
        const angle = (cIdx / state.categories.length) * 2 * Math.PI - Math.PI / 2;
        
        for (let i = 1; i <= 10; i++) {
            const dist = 85 + (i * 48); // コアからの距離
            const x = centerX + Math.cos(angle) * dist;
            const y = centerY + Math.sin(angle) * dist;

            // 線を描画（前のノードまたはコアから繋ぐ）
            const prevDist = (i === 1) ? 0 : 85 + ((i - 1) * 48);
            const px = centerX + Math.cos(angle) * prevDist;
            const py = centerY + Math.sin(angle) * prevDist;

            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", px);
            line.setAttribute("y1", py);
            line.setAttribute("x2", x);
            line.setAttribute("y2", y);
            line.setAttribute("stroke", i <= cat.rank ? "var(--accent-color)" : "#222");
            line.setAttribute("stroke-width", i <= cat.rank ? "2" : "1");
            svg.appendChild(line);

            // ノード（ボタン）を作成
            const node = document.createElement('div');
            node.className = 'node';
            
            const cost = CONFIG.TREE_COSTS[i - 1];
            const isLocked = i > cat.rank + 1;
            const canUnlock = i === cat.rank + 1 && cat.points >= cost;

            if (isLocked) node.classList.add('locked');
            if (canUnlock) node.classList.add('can-unlock');

            // 座標セット
            node.style.left = `${x}px`;
            node.style.top = `${y}px`;
            node.style.transform = 'translate(-50%, -50%)';

            // 表示内容（10段階目は「真の」）
            const subTitle = (i === 10) ? `真の${cat.name}` : `${cat.name}${CONFIG.SUB_TITLES[i-1]}`;
            node.innerHTML = `<strong>${i}</strong><div style="font-size:7px; scale:0.8; white-space:nowrap;">${cat.name}</div>`;
            
            // タップイベント
            node.onclick = (e) => {
                e.stopPropagation();
                if (canUnlock) {
                    unlockNode(cat.name, i);
                } else {
                    showToast(`${cat.name}習得まで あと ${cost - cat.points}pt`);
                }
            };
            container.appendChild(node);
        }
    });
}

// --- ロジック：報告送信 ---
function submitTask() {
    const taskName = document.getElementById('task-select').value;
    const workMin = parseInt(document.getElementById('pomo-work').value) || 0;
    const count = parseInt(document.getElementById('pomo-count').value) || 0;
    
    if (!taskName) return showToast("タスクを先に登録してください");

    const task = state.tasks.find(t => t.name === taskName);
    const totalWork = workMin * count;

    // 1. カテゴリポイント獲得 (ツリー用)
    const cat = state.categories.find(c => c.name === task.cat);
    if (cat) {
        cat.points += totalWork;
    }

    // 2. 素材ドロップ (30分毎に1個 + 確率ボーナス)
    let dropCount = Math.floor(totalWork / 30);
    if (Math.random() < (totalWork % 30) / 30) {
        dropCount++;
    }

    if (dropCount > 0) {
        const matFullName = `【${task.cat}】${task.suffix}`;
        state.inventory[matFullName] = (state.inventory[matFullName] || 0) + dropCount;
        showToast(`${matFullName}を${dropCount}個抽出！`);
    } else {
        showToast("作業を確認。素材抽出には時間が足りません。");
    }
    
    closeAllModals();
    renderAll();
}

// --- ロジック：素材投入（進化） ---
function evolveCore() {
    let totalGainXp = 0;
    let hasItems = false;
    
    for (const fullName in state.inventory) {
        const count = state.inventory[fullName];
        if (count <= 0) continue;
        hasItems = true;

        // "【カテゴリ】サフィックス" からサフィックス部分だけ抽出
        const suffixOnly = fullName.split('】')[1];
        const configSuffix = CONFIG.SUFFIXES.find(s => s.name === suffixOnly);
        
        if (configSuffix) {
            state.stats[configSuffix.attr] += count * 5; // ステータス上昇
            totalGainXp += count * 100; // 経験値上昇
        }
    }

    if (!hasItems) return showToast("捧げる素材がありません");

    state.inventory = {}; // 全消費
    state.xp += totalGainXp;

    // レベルアップ処理
    while (state.xp >= state.level * 1000) {
        state.xp -= state.level * 1000;
        state.level++;
        showToast("Lv UP!! あなたの存在が昇華されました。");
    }

    showToast("ステータスと総合経験値が上昇！");
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
        showToast(`称号：【${catName}${CONFIG.SUB_TITLES[step-1]}】を獲得！`);
        renderAll();
    }
}

// --- 設定・イベント操作 ---
function setupEventListeners() {
    // 各種ボタン
    document.getElementById('btn-report').onclick = () => openModal('modal-report');
    document.getElementById('btn-tree-manage').onclick = () => openModal('modal-config');
    document.getElementById('btn-settings').onclick = () => openModal('modal-settings');
    
    // フォーム送信
    document.getElementById('btn-submit-task').onclick = submitTask;
    document.getElementById('btn-evolve').onclick = evolveCore;

    // カテゴリ（枝）の追加
    document.getElementById('btn-add-category').onclick = () => {
        const name = document.getElementById('new-cat-name').value.trim();
        if (name && !state.categories.find(c => c.name === name)) {
            state.categories.push({ name: name, points: 0, rank: 0 });
            document.getElementById('new-cat-name').value = "";
            updateSelectBoxes();
            renderAll();
            showToast(`新たな枝「${name}」が芽生えました。`);
        }
    };

    // タスクの登録
    document.getElementById('btn-add-task').onclick = () => {
        const name = document.getElementById('new-task-name').value.trim();
        const cat = document.getElementById('new-task-cat').value;
        const suffix = document.getElementById('new-task-suffix').value;
        if (name && cat) {
            state.tasks.push({ name: name, cat: cat, suffix: suffix });
            document.getElementById('new-task-name').value = "";
            updateSelectBoxes();
            showToast(`タスク「${name}」を登録。`);
        } else {
            showToast("名前と枝を選択してください");
        }
    };
}

// --- UI補助機能 ---
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
    sufSel.innerHTML = CONFIG.SUFFIXES.map(s => `<option value="${s.name}">${s.icon} ${s.name} [${s.attr}]</option>`).join('');
}

function updateInventoryUI() {
    const inv = document.getElementById('inventory');
    inv.innerHTML = '';
    for (const fullName in state.inventory) {
        if (state.inventory[fullName] > 0) {
            const suffixOnly = fullName.split('】')[1];
            const icon = CONFIG.SUFFIXES.find(s => s.name === suffixOnly)?.icon || "💎";
            
            const slot = document.createElement('div');
            slot.className = 'item-slot';
            slot.innerHTML = `
                <span class="item-icon">${icon}</span>
                <span class="item-name">${fullName}</span>
                <span class="item-count">${state.inventory[fullName]}</span>
            `;
            inv.appendChild(slot);
        }
    }
}

function updateSubTitlesUI() {
    const cont = document.getElementById('sub-titles');
    cont.innerHTML = state.categories.map(c => {
        if (c.rank === 0) return "";
        const titleText = (c.rank === 10) ? `真の${c.name}` : `${c.name}${CONFIG.SUB_TITLES[c.rank-1]}`;
        return `<div style="margin-bottom:5px; color:var(--accent-color); font-weight:bold;">◈ ${titleText} <span style="font-size:10px; color:#777;">(累計:${c.points}pt)</span></div>`;
    }).join('');
    
    // プロフィール画面のメイン称号も更新
    const profileTitle = document.getElementById('profile-title');
    profileTitle.innerText = document.getElementById('main-title').innerText;
}

// --- レーダーチャート (Chart.js) ---
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
                borderWidth: 2
            }]
        },
        options: {
            scales: {
                r: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    angleLines: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { display: false, stepSize: 20 },
                    pointLabels: { color: '#aaa', font: { size: 12 } }
                }
            },
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
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.style.cssText = "background:rgba(0,0,0,0.85); border:1px solid var(--accent-color); color:#fff; padding:12px 20px; margin-bottom:10px; border-radius:12px; font-size:13px; box-shadow:0 0 15px rgba(0,242,255,0.4); animation: toastIn 0.3s ease-out;";
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = "toastOut 0.3s ease-in";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// トースト用のアニメーション定義をCSSに追加
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes toastIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes toastOut { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-20px); opacity: 0; } }
`;
document.head.appendChild(styleSheet);