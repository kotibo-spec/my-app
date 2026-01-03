/* --- CONTROLLER-TASK.JS --- */

// 入力タイプの切り替え
function toggleReportType() {
    const type = document.getElementById('report-type').value;
    document.getElementById('input-pomo').classList.toggle('hidden', type !== 'pomo');
    document.getElementById('input-manual').classList.toggle('hidden', type !== 'manual');
}

// 報告送信
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
        
        if (!state.inventory[mat.name]) {
            state.inventory[mat.name] = { count: 0, rarity: mat.rarity, attr: mat.attr, mult: mat.mult, icon: mat.icon };
        }
        state.inventory[mat.name].count++;

        if (!state.archive[mat.name]) {
            state.archive[mat.name] = { 
                count: 0, 
                firstDate: new Date().toLocaleDateString('ja-JP'),
                rarity: mat.rarity, attr: mat.attr, icon: mat.icon      
            };
            dropMsg += `\n【NEW!】${mat.name}`;
        } else {
            dropMsg += `\n${mat.name}`;
        }
        state.archive[mat.name].count++;
    }

    showToast(`【${task.cat}】＋${totalWork}pt！${dropMsg}`);
    state.history.unshift({ date: new Date().toLocaleString('ja-JP'), task: taskName, cat: task.cat, detail: logDetail, point: totalWork });
    closeAllModals();
    renderAll();
}

// 素材を捧げる
function evolveCore() {
    let totalGainXp = 0;
    let hasItems = false;
    
    for (const name in state.inventory) {
        const item = state.inventory[name];
        if (!item || item.count <= 0) continue;
        hasItems = true;
        const power = item.count * 5 * item.mult;
        state.stats[item.attr] += power;
        totalGainXp += power * 20; 
    }

    if (!hasItems) return showToast("素材がありません");

    state.inventory = {};
    state.xp += totalGainXp;
    checkLevelUp();
    showToast("ステータスと経験値が上昇！");
    updateRadarChart();
    renderAll();
}

// 枝の削除
function deleteCategory(name) {
    if (!confirm(`枝「${name}」を削除しますか？`)) return;
    state.categories = state.categories.filter(c => c.name !== name);
    state.tasks = state.tasks.filter(t => t.cat !== name);
    updateSelectBoxes();
    renderAll();
}

// セレクトボックスの同期
function updateSelectBoxes() {
    const taskSel = document.getElementById('task-select');
    const catSel = document.getElementById('new-task-cat');
    const sufSel = document.getElementById('new-task-suffix');

    if (taskSel) taskSel.innerHTML = state.tasks.map(t => `<option value="${t.name}">${t.name} (${t.cat})</option>`).join('');
    if (catSel) catSel.innerHTML = state.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    if (sufSel) sufSel.innerHTML = CONFIG.ATTR_NAMES.map(a => `<option value="${a}">${a}属性</option>`).join('');
}

function renderCategoryList() {
    const list = document.getElementById('category-list');
    list.innerHTML = state.categories.map(cat => `
        <div class="manage-item">
            <div>${cat.name} <small>(Rank:${cat.rank})</small></div>
            <button class="delete-btn" onclick="deleteCategory('${cat.name}')">削除</button>
        </div>
    `).join('');
}