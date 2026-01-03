/* --- STATE.JS --- */
let state = {
    level: 1, xp: 0,
    stats: { "火": 0, "水": 0, "風": 0, "土": 0, "光": 0, "闇": 0 },
    inventory: {},
    archive: {},
    categories: [],
    tasks: [],
    history: []
};

const ATTR_COLORS = {
    "火": "255, 68, 0", "水": "0, 102, 255", "風": "0, 255, 136",
    "土": "255, 170, 0", "光": "255, 255, 204", "闇": "170, 0, 255"
};

function saveState() {
    localStorage.setItem('coreAlchemistData', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('coreAlchemistData');
    if (saved) {
        state = Object.assign(state, JSON.parse(saved));
    }
}