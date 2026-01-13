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

function updateStatusStatsUI() {
    const container = document.getElementById('status-stats-container');
    if (!container) return;

    let html = '';

    // 1. 属性ステータス
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

    // 2. メイン称号履歴
    let maxAttr = "火";
    let maxVal = -1;
    CONFIG.ATTR_NAMES.forEach(a => {
        if (state.stats[a] > maxVal) { maxVal = state.stats[a]; maxAttr = a; }
    });
    
    html += '<h3 style="margin-top:20px;">メイン称号の記録</h3>';
    const currentRankIndex = Math.min(state.level - 1, CONFIG.MAIN_RANKS.length - 1);
    const prefixList = CONFIG.MAIN_PREFIX[maxAttr];

    html += '<div style="display:flex; flex-direction:column-reverse; gap:5px;">';
    for (let i = 0; i <= currentRankIndex; i++) {
        const rankName = CONFIG.MAIN_RANKS[i];
        const pIndex = Math.min(Math.floor(i / 3), prefixList.length - 1);
        const prefix = prefixList[pIndex];
        const fullName = `【${prefix}】${rankName}`;
        const style = (i === currentRankIndex) ? 'color:var(--accent-color); font-weight:bold;' : 'color:#666;';
        html += `<div style="${style}">Lv.${i + 1} ${fullName}</div>`;
    }
    html += '</div>';

    // 3. サブ称号
    html += '<h3 style="margin-top:20px;">サブ称号（熟練度）</h3>';
    const subTitles = state.categories.map(c => {
        if (c.rank === 0) return "";
        const titleText = (c.rank === 10) ? `真の${c.name}` : `${c.name}${CONFIG.SUB_TITLES[c.rank-1]}`;
        return `<div style="color:#fff; margin-bottom:5px;">◈ ${titleText} <span style="color:#666; font-size:10px;">(Rank:${c.rank})</span></div>`;
    }).join('');
    
    html += subTitles || '<div style="color:#444; font-size:12px;">まだサブ称号はありません</div>';

    container.innerHTML = html;
}