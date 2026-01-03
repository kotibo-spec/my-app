/* --- UI-MANAGER.JS --- */
let statusChart = null;

function renderAll() {
    updateHeader();
    renderStage();
    renderCategoryList();
    updateInventoryUI();
    updateStatusStatsUI();
    updateCoreEvolution();
    saveState();
}

function showToast(msg) {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.style = "background:rgba(0,0,0,0.85); border:1px solid var(--accent-color); color:#fff; padding:12px 20px; margin-bottom:10px; border-radius:12px; font-size:13px; box-shadow:0 0 15px rgba(0,242,255,0.4);";
    t.innerText = msg;
    c.appendChild(t);
    setTimeout(() => { t.remove(); }, 3000);
}

function updateThemeColor(attr) {
    const themeRGB = ATTR_COLORS[attr] || "0, 242, 255";
    document.documentElement.style.setProperty('--accent-rgb', themeRGB);
}