/* --- UI-HEADER.JS --- */
function updateHeader() {
    const mainTitle = document.getElementById('main-title');
    const userLevel = document.getElementById('user-level');
    const xpBar = document.getElementById('xp-bar');

    let maxAttr = "火";
    let maxVal = -1;
    CONFIG.ATTR_NAMES.forEach(a => {
        if (state.stats[a] > maxVal) { maxVal = state.stats[a]; maxAttr = a; }
    });

    updateThemeColor(maxAttr);

    const prefixList = CONFIG.MAIN_PREFIX[maxAttr];
    const prefix = prefixList[Math.min(Math.floor((state.level - 1) / 3), prefixList.length - 1)];
    const rankName = CONFIG.MAIN_RANKS[Math.min(state.level - 1, CONFIG.MAIN_RANKS.length - 1)];
    
    mainTitle.innerText = `【${prefix}】${rankName}`;
    userLevel.innerText = state.level;

    const nextXp = state.level * 1000; 
    xpBar.style.width = Math.min((state.xp / nextXp) * 100, 100) + "%";
}

function updateStatusStatsUI() {
    const container = document.getElementById('sub-titles');
    let html = '<h3>サブ称号</h3>';
    html += state.categories.map(c => {
        if (c.rank === 0) return "";
        const titleText = (c.rank === 10) ? `真の${c.name}` : `${c.name}${CONFIG.SUB_TITLES[c.rank-1]}`;
        return `<div style="color:var(--accent-color); font-weight:bold; margin-bottom:5px;">◈ ${titleText}</div>`;
    }).join('');

    html += '<h3 style="margin-top:20px;">属性値</h3>';
    html += CONFIG.ATTR_NAMES.map(attr => {
        const val = state.stats[attr];
        const percent = ((val % 500) / 500) * 100;
        return `<div class="attribute-item"><span>${attr}：${val}</span><div class="attr-gauge-bg"><div class="attr-gauge-fill" style="width: ${percent}%"></div></div></div>`;
    }).join('');
    container.innerHTML = html;
}