/* --- UI-COLLECTIONS.JS --- */

function updateInventoryUI() {
    const inv = document.getElementById('inventory');
    if (!inv) return;
    inv.innerHTML = '';

    const validKeys = Object.keys(state.inventory).filter(k => state.inventory[k]?.rarity);

    // ソート順：レアリティ(高->低) > 属性(定義順) > 名前(あいうえお順)
    validKeys.sort((a, b) => {
        const itemA = state.inventory[a];
        const itemB = state.inventory[b];

        // 1. レアリティ比較
        const order = { UR: 0, SSR: 1, SR: 2, R: 3, N: 4 };
        const rareDiff = (order[itemA.rarity] ?? 99) - (order[itemB.rarity] ?? 99);
        if (rareDiff !== 0) return rareDiff;

        // 2. 属性比較
        const attrOrder = CONFIG.ATTR_NAMES.indexOf(itemA.attr) - CONFIG.ATTR_NAMES.indexOf(itemB.attr);
        if (attrOrder !== 0) return attrOrder;

        // 3. 名前比較
        return a.localeCompare(b, 'ja');
    });

    for (const name of validKeys) {
        const item = state.inventory[name];
        if (item.count <= 0) continue;
        const slot = document.createElement('div');
        slot.className = `item-slot rarity-${item.rarity.toLowerCase()}`; 
        slot.innerHTML = `
            <div class="item-name" style="color:#fff; font-size:9px;">${item.rarity}</div>
            <div class="item-icon">${item.icon || "💎"}</div>
            <div class="item-name">${name}</div>
            <div class="item-count">${item.count}個</div>
        `;
        inv.appendChild(slot);
    }
}

function renderArchive(sortBy = 'rarity') {
    const list = document.getElementById('archive-list');
    if (!list) return;
    list.innerHTML = '';
    let itemNames = Object.keys(state.archive);
    if (itemNames.length === 0) { list.innerHTML = '<p class="hint">未発見</p>'; return; }

    itemNames.sort((a, b) => {
        const itemA = state.archive[a], itemB = state.archive[b];
        if (sortBy === 'rarity') {
            const order = { UR: 0, SSR: 1, SR: 2, R: 3, N: 4 };
            return (order[itemA.rarity] ?? 99) - (order[itemB.rarity] ?? 99);
        } else if (sortBy === 'attr') { return itemA.attr.localeCompare(itemB.attr); }
        return 0;
    });

    itemNames.forEach(name => {
        const arch = state.archive[name];
        const slot = document.createElement('div');
        slot.className = `item-slot rarity-${arch.rarity.toLowerCase()}`;
        slot.innerHTML = `
            <div class="item-name" style="color:#fff; font-size:9px;">${arch.rarity}</div>
            <div class="item-icon">${arch.icon}</div>
            <div class="item-name">${name}</div>
            <div class="archive-info">獲得: ${arch.count}回</div>
        `;
        list.appendChild(slot);
    });
}

function renderHistory() {
    const list = document.getElementById('history-list');
    if (state.history.length === 0) { list.innerHTML = '<p class="hint">記録なし</p>'; return; }
    list.innerHTML = state.history.map(log => `
        <div class="log-item">
            <div class="log-date">${log.date}</div>
            <div class="log-task">${log.task}</div>
            <div style="color:#aaa;">${log.detail} / ＋${log.point}pt</div>
        </div>
    `).join('');
}