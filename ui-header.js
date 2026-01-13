/* --- ui-header.js --- */

function updateHeader() {
    const mainTitle = document.getElementById('main-title');
    const userLevel = document.getElementById('user-level');
    const xpBar = document.getElementById('xp-bar');

    let maxAttr = "火";
    let maxVal = -1;
    CONFIG.ATTR_NAMES.forEach(a => {
        if (state.stats[a] > maxVal) { maxVal = state.stats[a]; maxAttr = a; }
    });

    if (typeof updateThemeColor === 'function') updateThemeColor(maxAttr);

    const prefixList = CONFIG.MAIN_PREFIX[maxAttr];
    const prefix = prefixList[Math.min(Math.floor((state.level - 1) / 3), prefixList.length - 1)];
    const rankName = CONFIG.MAIN_RANKS[Math.min(state.level - 1, CONFIG.MAIN_RANKS.length - 1)];
    
    if (mainTitle) mainTitle.innerText = `【${prefix}】${rankName}`;
    if (userLevel) userLevel.innerText = state.level;

    const nextXp = state.level * 1000; 
    if (xpBar) xpBar.style.width = Math.min((state.xp / nextXp) * 100, 100) + "%";
}

/* --- ui-header.js の updateStatusStatsUI 関数 --- */

function updateStatusStatsUI() {
    const container = document.getElementById('status-stats-container');
    if (!container) return;

    let html = '';

    // 1. 属性ステータス（変更なし）
    html += '<h3 style="margin-top:0;">属性値</h3>';
    html += CONFIG.ATTR_NAMES.map(attr => {
        const val = state.stats[attr];
        const percent = Math.min(((val % 500) / 500) * 100, 100);
        return `
            <div class="attribute-item">
                <div class="attr-info">
                    <span>${attr}属性</span>
                    <span>${val}</span>
                </div>
                <div class="attr-gauge-bg">
                    <div class="attr-gauge-fill" style="width: ${percent}%"></div>
                </div>
            </div>
        `;
    }).join('');

    // 2. メイン称号の記録（修正：接頭辞を削除）
    html += '<h3 style="margin-top:20px;">メイン称号の記録</h3>';
    const currentRankIndex = Math.min(state.level - 1, CONFIG.MAIN_RANKS.length - 1);
    
    html += '<div style="display:flex; flex-direction:column-reverse; gap:5px;">';
    for (let i = 0; i <= currentRankIndex; i++) {
        const rankName = CONFIG.MAIN_RANKS[i]; // ここで接頭辞(prefix)を付けない
        
        // 最新の称号だけ色を明るく、過去のものは暗く
        const style = (i === currentRankIndex) ? 'color:var(--accent-color); font-weight:bold;' : 'color:#555;';
        html += `<div style="${style}">Lv.${i + 1} ${rankName}</div>`;
    }
    html += '</div>';

    // 3. サブ称号（修正：過去の称号もすべて累積表示）
    html += '<h3 style="margin-top:20px;">サブ称号（熟練度）</h3>';
    
    let subTitlesHtml = "";
    
    // 各カテゴリ（枝）ごとに処理
    state.categories.forEach(c => {
        if (c.rank === 0) return;
        
        // そのカテゴリの履歴を格納する一時配列
        let catHistory = [];
        
        // ランク1から現在のランクまで、全ての称号を生成
        for (let r = 1; r <= c.rank; r++) {
            const titleText = (r === 10) ? `真の${c.name}` : `${c.name}${CONFIG.SUB_TITLES[r-1]}`;
            
            // 最新のランクは明るく、過去は暗く
            const isCurrent = (r === c.rank);
            const style = isCurrent ? 'color:var(--accent-color); font-weight:bold;' : 'color:#555;';
            
            // リストに追加
            catHistory.push(`<div style="${style} margin-bottom:2px;">◈ ${titleText} <span style="font-size:10px; opacity:0.6;">(Rank:${r})</span></div>`);
        }
        
        // 新しいものが上に来るように逆順にして結合
        subTitlesHtml += catHistory.reverse().join('');
        subTitlesHtml += '<div style="height:15px;"></div>'; // カテゴリごとの区切りスペース
    });
    
    html += subTitlesHtml || '<div style="color:#444; font-size:12px;">まだサブ称号はありません</div>';

    container.innerHTML = html;
}