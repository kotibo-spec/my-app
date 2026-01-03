// --- 状態管理 ---
let state = {
    level: 1, xp: 0,
    stats: { "火": 0, "水": 0, "風": 0, "土": 0, "光": 0, "闇": 0 },
    // 素材データを詳細に持つように変更
    inventory: {}, // "素材名": { count: 1, rarity: "N", attr: "火" }
    archive: {},   // 図鑑データ "素材名": { count: 1, firstDate: "..." }
    categories: [],
    tasks: [],
    history: []
};

// 属性ごとのイメージカラー設定
const ATTR_COLORS = {
    "火": "255, 68, 0",   // 赤
    "水": "0, 102, 255",  // 青
    "風": "0, 255, 136",  // 緑
    "土": "255, 170, 0",  // 橙
    "光": "255, 255, 204",// 白黄
    "闇": "170, 0, 255"   // 紫
};

let statusChart = null;
let isDragging = false;
let startX, startY;
let scrollX = 0, scrollY = 0; // 移動距離
let currentScale = 1.0; // ズーム倍率（1.0が通常）

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

// 素材ガチャ（鑑定）ロジック
// --- ガチャロジックの改善 (config.jsに完全準拠) ---
function generateMaterial(attr) {
    const rand = Math.random();
    let rarity = "N";
    
    // 累積確率で判定
    let cumulative = 0;
    const rarityOrder = ["UR", "SSR", "SR", "R", "N"];
    for (const r of rarityOrder) {
        cumulative += CONFIG.RARITIES[r].chance;
        if (rand < cumulative) {
            rarity = r;
            break;
        }
    }

    const config = CONFIG.RARITIES[rarity];
    let fullName = "";
    let icon = "💎";

    if (rarity === "UR") {
        const urList = [...CONFIG.UR_MATERIALS[attr], ...CONFIG.UR_MATERIALS["共通"]];
        fullName = urList[Math.floor(Math.random() * urList.length)];
        icon = "👑";
    } else {
        const nouns = CONFIG.MATERIAL_NOUNS[rarity];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const prefixGroup = CONFIG.MATERIAL_PREFIXES[attr];
        let prefixList = (rarity === "SSR") ? prefixGroup.SSR : 
                         (rarity === "N") ? prefixGroup.N : prefixGroup.RSR;
        
        const prefixData = prefixList[Math.floor(Math.random() * prefixList.length)];
        fullName = `${prefixData.text}${noun}`;
        icon = prefixData.icon;
    }
    return { name: fullName, rarity: rarity, attr: attr, mult: config.mult, icon: icon };
}

// --- レーダーチャートの更新 (色をテーマに合わせる) ---
function updateRadarChart() {
    if (!statusChart) return;

    // 現在のアクセントカラーを取得
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();

    statusChart.data.datasets[0].data = CONFIG.ATTR_NAMES.map(a => state.stats[a]);
    // チャートの色も現在の属性色に変更
    statusChart.data.datasets[0].borderColor = accentColor;
    statusChart.data.datasets[0].backgroundColor = accentColor.replace('rgb', 'rgba').replace(')', ', 0.2)');
    statusChart.data.datasets[0].pointBackgroundColor = accentColor;
    
    statusChart.update();
}

// --- 初期化時の安全策 (loadStateの強化) ---
function loadState() {
    const saved = localStorage.getItem('coreAlchemistData');
    if (saved) {
        const parsed = JSON.parse(saved);
        state = Object.assign(state, parsed);
        // inventoryが古い形式（数値）だった場合の修復ロジックを入れるとさらに安全です
    }
}

// --- 全描画 ---
function renderAll() {
    updateHeader();
    renderStage();
    renderCategoryList();
    updateInventoryUI();
    updateStatusStatsUI(); // ←これを確認
    updateCoreEvolution();
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
        if (state.stats[a] > maxVal) {
            maxVal = state.stats[a];
            maxAttr = a;
        }
    });

    // --- ここで色を反映（RGBの数字としてセット） ---
    const themeRGB = ATTR_COLORS[maxAttr] || "0, 242, 255";
    document.documentElement.style.setProperty('--accent-rgb', themeRGB);
    // --------------------------------------------

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
    const container = document.getElementById('ring-container');
    const flair = document.getElementById('stage-flair');
    if (!container || !flair) return;

    // 1. リングの生成（レベルの数だけ出す）
    container.innerHTML = ''; // 一旦クリア
    // --- 修正箇所：updateCoreEvolution関数の中のforループ部分 ---
    for (let i = 1; i <= state.level; i++) {
        const ring = document.createElement('div');
        ring.className = 'core-ring';
        
        const size = 110 + (i * 15); 
        ring.style.width = size + 'px';
        ring.style.height = size + 'px';
        
        // --- ここを修正 ---
        // 内側（iが小さい）ほど速く、外側ほどゆっくり回るように計算
        const speed = 3 + (i * 1.5); 
        const direction = (i % 2 === 0) ? 'rotate' : 'rotate-rev';
        ring.style.animation = `${direction} ${speed}s linear infinite`;
        
        // 5の倍数のリングは点線（dashed）にしてアクセントをつける
        if (i % 5 === 0) {
            ring.style.borderStyle = 'dashed';
            ring.style.borderWidth = '2px';
            ring.style.opacity = '0.6';
        } else {
            // それ以外は透明度をランダムにして「ゆらぎ」を出す
            ring.style.opacity = 0.1 + (Math.random() * 0.3);
        }
        
        container.appendChild(ring);
    }

    // 2. 5レベルごとの豪華演出
    if (state.level >= 5) {
        flair.classList.add('flair-active');
        // レベルが高いほど巨大魔法陣が複雑になる（影を濃くする）
        const shadowPower = Math.min(state.level * 2, 40);
        flair.style.boxShadow = `inset 0 0 ${shadowPower}px var(--accent-color)`;
    } else {
        flair.classList.remove('flair-active');
    }
}

// --- 星図（ドラッグ移動）の設定 ---
function setupDrag() {
    const stage = document.getElementById('stage');
    const container = document.getElementById('tree-container');
    const btnIn = document.getElementById('btn-zoom-in');
    const btnOut = document.getElementById('btn-zoom-out');

    // 画面に移動とズームを反映させる関数
    const updateTransform = () => {
        container.style.transform = `translate(calc(-50% + ${scrollX}px), calc(-50% + ${scrollY}px)) scale(${currentScale})`;
    };

    // ドラッグ（指で動かす）処理
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

    // ズームボタンの処理
    btnIn.onclick = () => {
        currentScale = Math.min(currentScale + 0.2, 2.0); // 最大2倍まで
        updateTransform();
    };

    btnOut.onclick = () => {
        currentScale = Math.max(currentScale - 0.2, 0.2); // 最小0.2倍まで
        updateTransform();
    };

    updateTransform(); // 最初の一回
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
            // 0, 242, 255 を var(--accent-rgb) に書き換えました
            line.setAttribute("stroke", i <= cat.rank ? "rgba(var(--accent-rgb), 0.6)" : "rgba(255,255,255,0.05)");
            line.setAttribute("stroke-width", i <= cat.rank ? "1.5" : "0.5");
            // 光彩も var(--accent-color) を使うように変更
            if (i <= cat.rank) line.setAttribute("style", "filter: drop-shadow(0 0 3px var(--accent-color))");
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
    // 枝の名前、現在のランク、貯まっているポイントを全部出す
    list.innerHTML = state.categories.map(cat => `
        <div class="manage-item" style="border: 1px solid #333; margin-bottom: 10px; padding: 10px; border-radius: 10px; background: rgba(255,255,255,0.05);">
            <div style="display:flex; flex-direction:column;">
                <span style="font-size:16px;">${cat.name}</span>
                <span style="font-size:11px; color:#aaa;">ランク: ${cat.rank} / 蓄積: ${cat.points}pt</span>
            </div>
            <button class="delete-btn" onclick="deleteCategory('${cat.name}')" style="background:#400; color:#f00; border:1px solid #f00;">削除</button>
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
// 入力タイプの切り替え（HTMLから呼ばれる）
function toggleReportType() {
    const type = document.getElementById('report-type').value;
    document.getElementById('input-pomo').classList.toggle('hidden', type !== 'pomo');
    document.getElementById('input-manual').classList.toggle('hidden', type !== 'manual');
}

function submitTask() {
    const taskName = document.getElementById('task-select').value;
    const reportType = document.getElementById('report-type').value;
    if (!taskName) return showToast("タスクを選択してください");

    const task = state.tasks.find(t => t.name === taskName);
    let totalWork = 0;
    let logDetail = "";

    if (reportType === 'pomo') {
        const workMin = parseInt(document.getElementById('pomo-work').value) || 0;
        const count = parseInt(document.getElementById('pomo-count').value) || 1;
        totalWork = workMin * count;
        logDetail = `${workMin}分 × ${count}セット`;
    } else {
        const diff = document.getElementById('difficulty-select').value;
        const pts = { easy: 30, normal: 100, hard: 200 };
        totalWork = pts[diff];
        logDetail = `難易度: ${diff.toUpperCase()}`;
    }

    const cat = state.categories.find(c => c.name === task.cat);
    if (cat) cat.points += totalWork;

    // ガチャ判定
    let dropAttempts = Math.max(1, Math.floor(totalWork / 30));
    let dropMsg = "";
    
    for (let i = 0; i < dropAttempts; i++) {
        const mat = generateMaterial(task.attr); 
        
        // インベントリへの追加（ここを安全な書き方に変更）
        if (!state.inventory[mat.name] || typeof state.inventory[mat.name] !== 'object') {
            state.inventory[mat.name] = { count: 0, rarity: mat.rarity, attr: mat.attr, mult: mat.mult, icon: mat.icon };
        }
        state.inventory[mat.name].count++;

        // 図鑑への記録
        if (!state.archive[mat.name]) {
            state.archive[mat.name] = { count: 0, firstDate: new Date().toLocaleDateString('ja-JP') };
            dropMsg += `\n【NEW!】${mat.name} (${mat.rarity})`;
        } else {
            dropMsg += `\n${mat.name} (${mat.rarity})`;
        }
        state.archive[mat.name].count++;

        if (mat.rarity === "UR" || mat.rarity === "SSR") {
            setTimeout(() => showToast(`！！！奇跡発生：${mat.name}！！！`), 500);
        }
    }

    showToast(`【${task.cat}】＋${totalWork}pt 獲得！${dropMsg}`);
    
    state.history.unshift({ date: new Date().toLocaleString('ja-JP'), task: taskName, detail: logDetail, point: totalWork });
    closeAllModals();
    renderAll();
}

// --- ロジック：素材投入 ---
function evolveCore() {
    let totalGainXp = 0;
    let hasItems = false;
    
    for (const name in state.inventory) {
        const item = state.inventory[name];
        if (!item || item.count <= 0) continue;
        hasItems = true;

        // 今のアイテム情報（属性と倍率）をそのまま使う
        const power = item.count * 5 * item.mult;
        state.stats[item.attr] += power;
        totalGainXp += power * 20; 
    }

    if (!hasItems) return showToast("捧げる素材がありません");

    state.inventory = {}; // 全部捧げる
    state.xp += totalGainXp;

    while (state.xp >= state.level * 1000) {
        state.xp -= state.level * 1000;
        state.level++;
        showToast("Lv UP!! あなたの存在が昇華されました。");
    }

    showToast("ステータスと総合経験値が上昇！");
    updateRadarChart();
    renderAll();
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
    document.getElementById('btn-logs').onclick = () => {
        renderHistory(); // 履歴を描画してから開く
        openModal('modal-logs');
    };
    document.getElementById('btn-tree-manage').onclick = () => openModal('modal-config');
    document.getElementById('btn-settings').onclick = () => openModal('modal-settings');
    
    document.getElementById('btn-submit-task').onclick = submitTask;
    document.getElementById('btn-evolve').onclick = evolveCore;
    document.getElementById('core-circle').onclick = () => openModal('modal-status');
    
    document.getElementById('btn-archive').onclick = () => {
        renderArchive('rarity'); // 最初はレア度順で開く
        openModal('modal-archive');
    };

    // 以下、枝の追加・タスクの追加ボタンの処理が続く...
    // (ここは既存のままでOKですが、もし消えていたら前のコードを維持してください)
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
        const attr = document.getElementById('new-task-suffix').value; // 属性を取得
        if (name && cat && attr) {
            // suffix ではなく attr という名前で属性を保存します
            state.tasks.push({ name: name, cat: cat, attr: attr }); 
            document.getElementById('new-task-name').value = "";
            updateSelectBoxes(); 
            showToast(`タスク「${name}」を登録（${attr}属性）`);
        }
    };
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); if(id==='modal-status') updateRadarChart(); }
function closeAllModals() { document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden')); }

function updateSelectBoxes() {
    const taskSel = document.getElementById('task-select');
    const catSel = document.getElementById('new-task-cat');
    const sufSel = document.getElementById('new-task-suffix');

    if (taskSel) taskSel.innerHTML = state.tasks.map(t => `<option value="${t.name}">${t.name} (${t.cat} / ${t.attr})</option>`).join('');
    if (catSel) catSel.innerHTML = state.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    
    // ここを修正：属性（火・水など）を選べるようにします
    if (sufSel) sufSel.innerHTML = CONFIG.ATTR_NAMES.map(a => `<option value="${a}">${a}属性</option>`).join('');
}

function updateInventoryUI() {
    const inv = document.getElementById('inventory');
    if (!inv) return;
    inv.innerHTML = '';
    
    // エラー防止：古い形式（数字だけ）のデータを排除してリスト化
    const validKeys = Object.keys(state.inventory).filter(key => {
        return state.inventory[key] && typeof state.inventory[key] === 'object' && state.inventory[key].rarity;
    });

    // レアリティ順に並び替え
    validKeys.sort((a, b) => {
        const order = { UR: 0, SSR: 1, SR: 2, R: 3, N: 4 };
        return (order[state.inventory[a].rarity] || 99) - (order[state.inventory[b].rarity] || 99);
    });

    for (const name of validKeys) {
        const item = state.inventory[name];
        if (item.count <= 0) continue;

        const slot = document.createElement('div');
        // 安全にクラス名を設定
        const rarityClass = item.rarity ? item.rarity.toLowerCase() : 'n';
        slot.className = `item-slot rarity-${rarityClass}`; 
        
        slot.innerHTML = `
            <div class="item-name" style="color:#fff; font-size:9px;">${item.rarity}</div>
            <div class="item-icon">${item.icon || "💎"}</div>
            <div class="item-name">${name}</div>
            <div class="item-count">${item.count}個</div>
        `;
        inv.appendChild(slot);
    }
}

// 全履歴の描画
function renderHistory() {
    const list = document.getElementById('history-list');
    if (state.history.length === 0) {
        list.innerHTML = '<p class="hint">まだ記録がありません。</p>';
        return;
    }
    list.innerHTML = state.history.map(log => `
        <div class="log-item">
            <div class="log-date">${log.date}</div>
            <div class="log-task">${log.task} 【${log.cat}】</div>
            <div style="color:#aaa;">${log.detail} / ＋${log.point}pt</div>
        </div>
    `).join('');
}

// 属性数値リストの更新（ステータス画面用）
function updateStatusStatsUI() {
    const container = document.getElementById('sub-titles');
    // サブ称号の表示の後に、属性数値をくっつける
    let html = '<h3>サブ称号（熟練度）</h3>';
    html += state.categories.map(c => {
        if (c.rank === 0) return "";
        const titleText = (c.rank === 10) ? `真の${c.name}` : `${c.name}${CONFIG.SUB_TITLES[c.rank-1]}`;
        return `<div style="color:var(--accent-color); font-weight:bold; margin-bottom:5px;">◈ ${titleText} <small style="color:#555;">(${c.points}pt)</small></div>`;
    }).join('');

    html += '<h3 style="margin-top:20px;">属性ステータス</h3>';
    html += CONFIG.ATTR_NAMES.map(attr => {
        const val = state.stats[attr];
        const nextThreshold = (Math.floor(val / 500) + 1) * 500; // 500刻みで目標設定
        const percent = ((val % 500) / 500) * 100;
        return `
            <div class="attribute-item">
                <div class="attr-info">
                    <span>${attr}属性：${val}</span>
                    <span style="font-size:10px; color:#555;">Next: ${nextThreshold}</span>
                </div>
                <div class="attr-gauge-bg">
                    <div class="attr-gauge-fill" style="width: ${percent}%"></div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
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

// 図鑑（アーカイブ）の描画
function renderArchive(sortBy = 'rarity') {
    const list = document.getElementById('archive-list');
    if (!list) return;
    list.innerHTML = '';

    let itemNames = Object.keys(state.archive);

    if (itemNames.length === 0) {
        list.innerHTML = '<p class="hint">未発見：素材を鑑定して図鑑を埋めよ</p>';
        return;
    }

    // 並び替えロジック
    itemNames.sort((a, b) => {
        const itemA = state.inventory[a] || { rarity: "N", attr: "火" };
        const itemB = state.inventory[b] || { rarity: "N", attr: "火" };

        if (sortBy === 'rarity') {
            const order = { UR: 0, SSR: 1, SR: 2, R: 3, N: 4 };
            return order[itemA.rarity] - order[itemB.rarity];
        } else if (sortBy === 'attr') {
            return itemA.attr.localeCompare(itemB.attr);
        }
        return 0;
    });

    itemNames.forEach(name => {
        const arch = state.archive[name];
        // ★ここを修正：インベントリに保存されているアイコン（item.icon）を使うようにしました
        const invInfo = state.inventory[name] || { rarity: "N", attr: "火", icon: "💎" };
        const icon = invInfo.icon || "💎";

        const slot = document.createElement('div');
        slot.className = `item-slot rarity-${invInfo.rarity.toLowerCase()}`;
        slot.innerHTML = `
            <div class="item-name" style="color:#fff; font-size:9px;">${invInfo.rarity}</div>
            <div class="item-icon">${icon}</div>
            <div class="item-name">${name}</div>
            <div class="archive-info">獲得数: ${arch.count}回</div>
            <div class="archive-info">初観測: ${arch.firstDate}</div>
        `;
        list.appendChild(slot);
    });
}