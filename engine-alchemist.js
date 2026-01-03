/* --- ENGINE-ALCHEMIST.JS --- */
function generateMaterial(attr) {
    const rand = Math.random();
    let rarity = "N";
    let cumulative = 0;
    const rarityOrder = ["UR", "SSR", "SR", "R", "N"];

    for (const r of rarityOrder) {
        cumulative += CONFIG.RARITIES[r].chance;
        if (rand < cumulative) { rarity = r; break; }
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

function checkLevelUp() {
    let leveledUp = false;
    while (state.xp >= state.level * 1000) {
        state.xp -= state.level * 1000;
        state.level++;
        leveledUp = true;
    }
    return leveledUp;
}