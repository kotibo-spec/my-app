// 設定データ
const RANKS = [
    "UNRANKED", "IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "MASTER"
];
const TITLES = [
    "見習い観測者", "駆け出しの収集家", "論理の探求者", "熟練の錬金術師",
    "深淵を覗く者", "カオス・エンジニア", "時空の覇者", "THE CORE"
];

// 状態（セーブデータ）
let state = {
    level: 1,
    xp: 0,
    nextXp: 100,
    logs: []
};

// 起動時の処理
window.onload = () => {
    loadState();
    renderUI();
    generateSkillNodes();
    
    // ファイルアップロード（擬似）の監視
    document.getElementById('file-upload').addEventListener('change', handleUpload);
};

// アップロード時の処理
function handleUpload(e) {
    if (e.target.files.length === 0) return;

    // 解析演出（1.5秒待つ）
    addLog("解析中... データをスキャンしています...");
    
    setTimeout(() => {
        // ランダムな素材と経験値をゲット
        const materials = ["論理の欠片", "集中の結晶", "バグの死骸", "聖なる汗", "虚無の砂"];
        const gotMaterial = materials[Math.floor(Math.random() * materials.length)];
        const gotXp = 20 + Math.floor(Math.random() * 30); // 20~50 XP

        // データの更新
        state.xp += gotXp;
        addLog(`>> 解析完了: 【${gotMaterial}】を抽出しました。`);
        addLog(`>> 経験値 +${gotXp} 獲得。`);

        // レベルアップ判定
        checkLevelUp();
        
        saveState();
        renderUI();
        
        // 入力をリセット（同じファイルでも反応するように）
        e.target.value = '';
    }, 1500);
}

// レベルアップ判定
function checkLevelUp() {
    if (state.xp >= state.nextXp) {
        state.level++;
        state.xp -= state.nextXp;
        state.nextXp = Math.floor(state.nextXp * 1.2); // 必要経験値が増えていく
        
        addLog(`★ LEVEL UP! 現在 Lv.${state.level} ★`);
        addLog(`コアの出力が上昇しました。`);
        
        // 演出：コアをピカッとさせる
        const core = document.getElementById('core');
        core.style.transform = "scale(1.5)";
        setTimeout(() => core.style.transform = "scale(1)", 300);
    }
}

// 画面描画
function renderUI() {
    // レベルとランクの計算
    const rankIndex = Math.min(Math.floor((state.level - 1) / 5), RANKS.length - 1);
    const titleIndex = Math.min(Math.floor((state.level - 1) / 3), TITLES.length - 1);

    document.getElementById('level-val').innerText = state.level;
    document.getElementById('rank-name').innerText = RANKS[rankIndex];
    document.getElementById('title-name').innerText = TITLES[titleIndex];

    // コアの色を変える（レベルに応じて青→赤→金と変わる）
    const core = document.getElementById('core');
    const hue = (state.level * 10) % 360; 
    core.style.background = `radial-gradient(circle, #fff, hsl(${hue}, 100%, 50%))`;
    core.style.boxShadow = `0 0 20px hsl(${hue}, 100%, 50%)`;

    // スキルノードの点灯
    const nodes = document.querySelectorAll('.skill-node');
    nodes.forEach((node, index) => {
        if (index < state.level) {
            node.classList.add('active');
        }
    });
}

// ログ追加
function addLog(text) {
    const logBox = document.getElementById('log-window');
    const p = document.createElement('p');
    p.innerText = text;
    logBox.prepend(p); // 新しいものを上に
    state.logs.push(text);
    if (state.logs.length > 20) state.logs.shift(); // 履歴は20件まで
}

// スキルツリー（点）の配置
function generateSkillNodes() {
    const container = document.getElementById('skills-container');
    const totalNodes = 30; // 適当な数
    const radius = 100; // コアからの距離

    for (let i = 0; i < totalNodes; i++) {
        const div = document.createElement('div');
        div.className = 'skill-node';
        // 円形に配置する計算
        const angle = (i / totalNodes) * (2 * Math.PI);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        div.style.left = `calc(50% + ${x}px)`;
        div.style.top = `calc(50% + ${y}px)`;
        container.appendChild(div);
    }
}

// データ保存
function saveState() {
    localStorage.setItem('myPwaState', JSON.stringify(state));
}

// データ読み込み
function loadState() {
    const saved = localStorage.getItem('myPwaState');
    if (saved) {
        state = JSON.parse(saved);
    }
}
