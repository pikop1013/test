// ========= ゲーム状態 =========
const state = {
  money: 0,
  totalTapCount: 0,
  level: 1,
  xp: 0,
  xpMax: 100,
  combo: 0,
  comboMultiplier: 1.0,
  comboTimeoutId: null,
  spawnUpgradeLevel: 0,
  autoMinerLevel: 0,
  gemValueUpgradeLevel: 0,
  feverGauge: 0,
  isFever: false,
  feverTimeoutId: null,
  totalEarned: 0,
  lastMoneyForDps: 0,
  currentDps: 0,
  burstGauge: 0,
  burstCharges: 0,
};

// ========= 宝石定義 =========
const GEM_TYPES = [
  {
    id: "normal",
    name: "ノーマル",
    value: 10,
    unlockMoney: 0,
    cssClass: "gem-normal",
    icon: "♦",
  },
  {
    id: "rare",
    name: "レア",
    value: 80,
    unlockMoney: 500,
    cssClass: "gem-rare",
    icon: "💎",
  },
  {
    id: "epic",
    name: "エピック",
    value: 500,
    unlockMoney: 5000,
    cssClass: "gem-epic",
    icon: "⭐",
  },
  {
    id: "mythic",
    name: "ミシック",
    value: 3000,
    unlockMoney: 50000,
    cssClass: "gem-mythic",
    icon: "👑",
  },
];

const BOMB_TYPE = {
  id: "bomb",
  name: "ボム",
  value: 0,
  unlockLevel: 5,
  cssClass: "gem-bomb",
  icon: "💣",
};

const BASE_SPAWN_INTERVAL_MS = 2500;

// ========= 要素参照 =========
const moneyEl = document.getElementById("money");
const levelEl = document.getElementById("level");
const xpEl = document.getElementById("xp");
const xpMaxEl = document.getElementById("xp-max");
const xpBarEl = document.getElementById("xp-bar");
const tapCountEl = document.getElementById("tap-count");
const autoIncomeEl = document.getElementById("auto-income");
const dpsEl = document.getElementById("dps");
const comboEl = document.getElementById("combo");
const fieldEl = document.getElementById("field");
const statusMainEl = document.getElementById("status-main");
const statusSubEl = document.getElementById("status-sub");

const spawnLevelEl = document.getElementById("spawn-level");
const spawnCostEl = document.getElementById("spawn-cost");
const spawnBtn = document.getElementById("spawn-btn");
const spawnQuickBtn = document.getElementById("spawn-quick-btn");

const autoLevelEl = document.getElementById("auto-level");
const autoCostEl = document.getElementById("auto-cost");
const autoBtn = document.getElementById("auto-btn");
const autoQuickBtn = document.getElementById("auto-quick-btn");
const valueLevelEl = document.getElementById("value-level");
const valueCostEl = document.getElementById("value-cost");
const valueBtn = document.getElementById("value-btn");
const valueQuickBtn = document.getElementById("value-quick-btn");

const spawnLevelModalEl = document.getElementById("spawn-level-modal");
const spawnCostModalEl = document.getElementById("spawn-cost-modal");
const autoLevelModalEl = document.getElementById("auto-level-modal");
const autoCostModalEl = document.getElementById("auto-cost-modal");
const valueLevelModalEl = document.getElementById("value-level-modal");
const valueCostModalEl = document.getElementById("value-cost-modal");

const feverLabelEl = document.getElementById("fever-label");
const feverBarEl = document.getElementById("fever-bar");
const feverBtn = document.getElementById("fever-btn");
const burstLabelEl = document.getElementById("burst-label");
const burstBarEl = document.getElementById("burst-bar");
const burstBtn = document.getElementById("burst-btn");
const burstStockEl = document.getElementById("burst-stock");

const openStatusBtn = document.getElementById("open-status-modal");
const openShopBtn = document.getElementById("open-shop-modal");
const modalOverlay = document.getElementById("modal-overlay");
const modalTitleEl = document.getElementById("modal-title");
const modalCloseBtn = document.getElementById("modal-close");
const statusModalContent = document.getElementById("status-modal-content");
const shopModalContent = document.getElementById("shop-modal-content");
const statusMainFullEl = document.getElementById("status-main-full");
const statusSubFullEl = document.getElementById("status-sub-full");
const metricTapsEl = document.getElementById("metric-taps");
const metricAutoEl = document.getElementById("metric-auto");
const metricDpsEl = document.getElementById("metric-dps");

const BURST_NAME = "ルミナスバースト";
const MAX_BURST_CHARGES = 9;

let currentModal = null;

// ========= 数値フォーマット =========
function formatBigNumber(value) {
  const abs = Math.abs(value);
  const units = [
    { v: 1e16, s: "京" },
    { v: 1e12, s: "兆" },
    { v: 1e8, s: "億" },
    { v: 1e4, s: "万" },
  ];
  for (const u of units) {
    if (abs >= u.v) {
      return (value / u.v).toFixed(1).replace(/\.0$/, "") + u.s;
    }
  }
  return value.toLocaleString("ja-JP");
}

// ========= コンボ関連 =========
function maxComboMultiplier() {
  // Lvが上がるほど上限UP、最大10倍
  return Math.min(10, 2 + (state.level - 1) * 0.3);
}

function resetCombo() {
  state.combo = 0;
  state.comboMultiplier = 1.0;
  comboEl.textContent = "x1.0";
  comboEl.classList.remove("combo-active");
  comboEl.classList.add("combo-none");
}

function addCombo() {
  state.combo += 1;
  const raw = 1 + 0.15 * state.combo;
  state.comboMultiplier = Math.min(maxComboMultiplier(), raw);
  comboEl.textContent = "x" + state.comboMultiplier.toFixed(1);
  comboEl.classList.remove("combo-none");
  comboEl.classList.add("combo-active");

  if (state.comboTimeoutId) clearTimeout(state.comboTimeoutId);
  state.comboTimeoutId = setTimeout(resetCombo, 1500);
}

// ========= FEVER（インフレモード） =========
function levelValueMultiplier() {
  // レベルに応じて価値がどんどんインフレ
  return 1 + (state.level - 1) * 0.35;
}

function feverValueMultiplier() {
  // レベルによってフェーバー倍率も少しずつ上昇
  if (!state.isFever) return 1.0;
  const base = 2;
  const bonus = Math.floor((state.level - 1) / 10) * 0.5; // 10Lvごとに+0.5
  return base + bonus;
}

function totalValueMultiplier() {
  return (
    levelValueMultiplier() *
    feverValueMultiplier() *
    investmentValueMultiplier()
  );
}

function investmentValueMultiplier() {
  // 宝石価値投資の恒久倍率。Lvごとに+25%
  return 1 + state.gemValueUpgradeLevel * 0.25;
}

function updateFeverUI() {
  const gauge = Math.round(state.feverGauge);
  feverLabelEl.textContent = `${gauge}%`;
  feverBarEl.style.width = `${Math.min(100, gauge)}%`;

  feverBtn.disabled = true;
  const isReady = !state.isFever && gauge >= 100;
  feverBtn.classList.toggle("active", state.isFever);
  feverBtn.classList.toggle("ready", isReady);
  feverBtn.textContent = state.isFever
    ? "FEVER中"
    : isReady
    ? "AUTO発動"
    : "AUTO";
}

function addFeverGauge(amount) {
  if (state.isFever) return;
  state.feverGauge = Math.min(100, state.feverGauge + amount);
  if (state.feverGauge >= 100) {
    startFever();
  } else {
    updateFeverUI();
  }
}

// ========= ハイパーゲージ（爽快インフレボーナス） =========
function updateBurstUI() {
  const gauge = Math.round(state.burstGauge);
  burstLabelEl.textContent = `${gauge}%`;
  burstBarEl.style.width = `${Math.min(100, gauge)}%`;
  burstStockEl.textContent = `x${state.burstCharges}`;
  const ready = state.burstCharges > 0;
  burstBtn.disabled = !ready;
  burstBtn.classList.toggle("ready", ready);
  burstBtn.textContent = ready ? `${BURST_NAME} 発射` : BURST_NAME;
}

function addBurstGauge(amount) {
  const total = state.burstGauge + amount;
  const gainedCharges = Math.floor(total / 100);
  if (gainedCharges > 0) {
    state.burstCharges = Math.min(
      MAX_BURST_CHARGES,
      state.burstCharges + gainedCharges
    );
  }

  if (state.burstCharges >= MAX_BURST_CHARGES) {
    state.burstGauge = 0;
  } else {
    state.burstGauge = Math.min(100, total % 100);
  }
  updateBurstUI();
}

function triggerBurst() {
  if (state.burstCharges <= 0) return;
  state.burstCharges -= 1;
  updateBurstUI();

  statusMainEl.textContent =
    `${BURST_NAME}！光速の宝石シャワーで画面と財布を一気にブチ上げろ！`;
  syncStatusModalIfOpen();

  const bursts = 12;
  const autoBoost = Math.max(autoBaseIncome(), state.autoMinerLevel * 40);
  const baseValue = 160 + state.level * 40 + Math.floor(autoBoost * 0.6);

  for (let i = 0; i < bursts; i++) {
    const pos = {
      x: Math.random() * fieldEl.clientWidth,
      y: Math.random() * fieldEl.clientHeight,
    };
    addMoney(baseValue, "ハイパー宝石", { pos });
  }

  addFeverGauge(20);
  addCombo();
  updateStats();
  restartSpawnTimer();
}

burstBtn.addEventListener("click", triggerBurst);

function endFever() {
  state.isFever = false;
  state.feverGauge = 0;
  if (state.feverTimeoutId) state.feverTimeoutId = null;
  statusMainEl.textContent = "フィーバー終了！ゲージが溜まり次第また自動突入するよ。";
  syncStatusModalIfOpen();
  updateFeverUI();
  restartSpawnTimer();
}

function startFever() {
  if (state.isFever || state.feverGauge < 100) return;
  state.isFever = true;
  state.feverGauge = 100;
  statusMainEl.textContent =
    "FEVER!! 宝石価値＆出現速度が大幅アップ中！連打で一気にインフレ！";
  syncStatusModalIfOpen();
  updateFeverUI();
  restartSpawnTimer();

  if (state.feverTimeoutId) clearTimeout(state.feverTimeoutId);
  state.feverTimeoutId = setTimeout(endFever, 10000); // 10秒
}

// ========= クリティカル関連 =========
function getCritChance() {
  // ベース5% + レベルに応じて増加（最大50%）
  const base = 0.05;
  const fromLevel = (state.level - 1) * 0.004;
  return Math.min(0.5, base + fromLevel);
}

function getCritMultiplier() {
  // Lvが上がるほど最大倍率も増加（最大20倍）
  const min = 2;
  const maxBase = 4 + state.level * 0.4; // Lv10で8倍, Lv20で12倍…
  const max = Math.min(20, maxBase);
  return min + Math.random() * (max - min);
}

// ========= 浮遊テキスト演出 =========
function showFloatingText(text, x, y, type) {
  const rect = fieldEl.getBoundingClientRect();
  const el = document.createElement("div");
  el.className = "float-text " + type;
  el.textContent = text;
  el.style.left = x + "px";
  el.style.top = y + "px";
  fieldEl.appendChild(el);

  requestAnimationFrame(() => {
    el.style.opacity = "1";
    el.style.transform = "translate(-50%, -80%)";
  });

  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translate(-50%, -120%)";
    setTimeout(() => el.remove(), 500);
  }, 300);
}

function getPointerPositionInField(event) {
  const rect = fieldEl.getBoundingClientRect();
  let clientX = 0;
  let clientY = 0;
  if (event.touches && event.touches[0]) {
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  } else if (event.changedTouches && event.changedTouches[0]) {
    clientX = event.changedTouches[0].clientX;
    clientY = event.changedTouches[0].clientY;
  } else {
    clientX = event.clientX;
    clientY = event.clientY;
  }
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

// ========= 所持金 / XP / ステータス更新 =========
function addMoney(baseGain, gemName, options = {}) {
  const { isCrit = false, critMultiplier = 1, isBomb = false, pos } =
    options;

  let gain =
    baseGain * state.comboMultiplier * totalValueMultiplier() * critMultiplier;
  gain = Math.floor(gain);
  if (gain <= 0) return 0;

  state.money += gain;
  state.totalEarned += gain;
  moneyEl.textContent = formatBigNumber(state.money);

  let mainText = `${gemName} をタップ！ +${formatBigNumber(gain)}G`;
  if (isBomb) {
    mainText = `ボム炸裂！周囲の宝石をまとめて破壊！ +${formatBigNumber(
      gain
    )}G`;
  } else {
    const parts = [];
    parts.push(`コンボ x${state.comboMultiplier.toFixed(1)}`);
    parts.push(`レベル補正 x${levelValueMultiplier().toFixed(1)}`);
    if (state.isFever) parts.push(`FEVER x${feverValueMultiplier().toFixed(1)}`);
    if (isCrit) parts.push(`CRIT x${critMultiplier.toFixed(1)}`);
    mainText += `（${parts.join("／")}）`;
  }

  statusMainEl.textContent = mainText;
  syncStatusModalIfOpen();

  // 浮遊テキスト
  if (pos) {
    const floatType = isBomb
      ? "float-text-bomb"
      : isCrit
      ? "float-text-crit"
      : "float-text-normal";
    const label = (isCrit ? "CRIT!! " : "") + `+${formatBigNumber(gain)}G`;
    showFloatingText(label, pos.x, pos.y, floatType);
  }

  updateUnlockStatusText();
  updateShopButtons();
  return gain;
}

function addXp(amount) {
  state.xp += amount;
  while (state.xp >= state.xpMax) {
    state.xp -= state.xpMax;
    state.level += 1;
    state.xpMax = Math.floor(state.xpMax * 1.5);
    statusSubEl.textContent = `レベルアップ！ Lv.${state.level}。宝石価値とFEVER火力がさらにインフレ！`;
    syncStatusModalIfOpen();
  }

  levelEl.textContent = state.level;
  xpEl.textContent = state.xp;
  xpMaxEl.textContent = state.xpMax;
  const ratio = (state.xp / state.xpMax) * 100;
  xpBarEl.style.width = `${Math.min(100, ratio)}%`;

  restartSpawnTimer();
}

function autoBaseIncome() {
  if (state.autoMinerLevel <= 0) return 0;
  const exponential = Math.pow(1.15, state.autoMinerLevel);
  const levelScale = 1 + (state.level - 1) * 0.18;
  return Math.floor(12 * exponential * levelScale);
}

function updateStats() {
  tapCountEl.textContent = state.totalTapCount;
  const baseAuto = autoBaseIncome();
  const displayAuto = Math.floor(baseAuto * totalValueMultiplier());
  autoIncomeEl.textContent = formatBigNumber(displayAuto);
  dpsEl.textContent = formatBigNumber(state.currentDps);

  metricTapsEl.textContent = state.totalTapCount.toLocaleString("ja-JP");
  metricAutoEl.textContent = formatBigNumber(displayAuto);
  metricDpsEl.textContent = formatBigNumber(state.currentDps);
}

function updateUnlockStatusText() {
  const locked = GEM_TYPES.filter((g) => state.money < g.unlockMoney);
  const lines = GEM_TYPES.map((g) => {
    const unlocked = state.money >= g.unlockMoney;
    const condition =
      g.unlockMoney === 0
        ? "最初から出現"
        : `${formatBigNumber(g.unlockMoney)}G 以上で出現`;
    const badge = `<span class="badge ${
      unlocked ? "badge-unlocked" : "badge-locked"
    }">${unlocked ? "解放済" : "未解放"}</span>`;
    return `${g.name}（基礎 +${g.value.toLocaleString(
      "ja-JP"
    )}G）: ${condition} ${badge}`;
  });

  if (locked.length > 0) {
    locked.sort((a, b) => a.unlockMoney - b.unlockMoney);
    const next = locked[0];
    statusSubEl.innerHTML =
      `<div>次のレア宝石: <strong>${next.name}</strong>（${formatBigNumber(
        next.unlockMoney
      )}G で解放）</div>` +
      `<div style="margin-top:4px;">${lines.join("<br>")}</div>`;
  } else {
    statusSubEl.innerHTML =
      `<div>すべての宝石を解放しました！</div>` +
      `<div style="margin-top:4px;">${lines.join("<br>")}</div>`;
  }
  syncStatusModalIfOpen();
}

// ========= 宝石出現関連 =========
function getUnlockedGemTypes() {
  return GEM_TYPES.filter((g) => state.money >= g.unlockMoney);
}

function currentSpawnInterval() {
  const levelFactor = Math.max(0.25, 1 - (state.level - 1) * 0.04);
  const upgradeFactor = Math.pow(0.8, state.spawnUpgradeLevel);
  const feverFactor = state.isFever ? 0.4 : 1.0;
  return BASE_SPAWN_INTERVAL_MS * levelFactor * upgradeFactor * feverFactor;
}

function currentGemLimit() {
  // レベルに応じて最大150まで増加
  return Math.min(40 + state.level * 6, 150);
}

let spawnTimerId = null;

function restartSpawnTimer() {
  if (spawnTimerId) clearInterval(spawnTimerId);
  const interval = Math.max(200, currentSpawnInterval());
  spawnTimerId = setInterval(spawnGem, interval);
}

function spawnGem() {
  const currentGemCount = fieldEl.querySelectorAll(".gem").length;
  if (currentGemCount >= currentGemLimit()) return;

  const candidates = getUnlockedGemTypes();
  if (candidates.length === 0) return;

  let gemType;
  const canSpawnBomb = state.level >= BOMB_TYPE.unlockLevel;
  const bombChance = canSpawnBomb ? 0.07 : 0; // 7%でボム出現
  if (Math.random() < bombChance) {
    gemType = BOMB_TYPE;
  } else {
    gemType =
      candidates[Math.floor(Math.random() * candidates.length)];
  }

  const gemEl = document.createElement("button");
  gemEl.className = `gem ${gemType.cssClass}`;
  gemEl.innerHTML = gemType.icon;

  const leftPercent = 8 + Math.random() * 84;
  const topPercent = 8 + Math.random() * 84;
  gemEl.style.left = leftPercent + "%";
  gemEl.style.top = topPercent + "%";

  // 各宝石の基礎価値を保持（ボム用）
  gemEl.dataset.baseValue = gemType.value;
  gemEl.dataset.gemName = gemType.name;
  gemEl.dataset.gemId = gemType.id;

  const onTap = (event) => {
    event.preventDefault();
    if (!fieldEl.contains(gemEl)) return;
    const pos = getPointerPositionInField(event);

    if (gemType.id === "bomb") {
      handleBombTap(gemEl, pos);
    } else {
      handleNormalGemTap(gemEl, gemType, pos);
    }
  };

  gemEl.addEventListener("click", onTap);
  gemEl.addEventListener("touchstart", onTap, { passive: false });

  fieldEl.appendChild(gemEl);

  setTimeout(() => {
    if (gemEl.isConnected) gemEl.remove();
  }, 10000);
}

function handleNormalGemTap(gemEl, gemType, pos) {
  gemEl.remove();

  addCombo();
  addFeverGauge(5); // 1タップで5%（ベース）。オート収入でも徐々に加算。
  addBurstGauge(6);

  state.totalTapCount += 1;
  updateStats();

  // クリティカル判定
  const critChance = getCritChance();
  const isCrit = Math.random() < critChance;
  const critMultiplier = isCrit ? getCritMultiplier() : 1;

  const gainedMoney = addMoney(gemType.value, gemType.name, {
    isCrit,
    critMultiplier,
    isBomb: false,
    pos,
  });

  addXp(Math.floor(gainedMoney / 3));
}

function handleBombTap(bombEl, pos) {
  // 先にボムを消す
  bombEl.remove();

  addCombo();
  addFeverGauge(10); // ボムで一気にゲージUP
  addBurstGauge(12);
  state.totalTapCount += 1;

  const fieldRect = fieldEl.getBoundingClientRect();

  // タップ位置（フィールド内座標）を爆心地とする
  const centerX = fieldRect.left + pos.x;
  const centerY = fieldRect.top + pos.y;

  const gems = Array.from(fieldEl.querySelectorAll(".gem"));

  // 爆風半径（ちょっと広めに）
  const radius = 200;

  let totalBaseValue = 0;
  let destroyedCount = 0;

  // 「一番近い宝石」は必ず巻き込むために記録しておく
  let nearestGem = null;
  let nearestDist = Infinity;

  gems.forEach((g) => {
    if (g === bombEl) return;

    const r = g.getBoundingClientRect();
    const gx = r.left + r.width / 2;
    const gy = r.top + r.height / 2;

    const dx = gx - centerX;
    const dy = gy - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < nearestDist) {
      nearestDist = dist;
      nearestGem = g;
    }

    // 半径内なら爆破対象
    if (dist <= radius) {
      const baseValue = parseFloat(g.dataset.baseValue || "0");
      if (!isNaN(baseValue) && baseValue > 0) {
        totalBaseValue += baseValue;
        destroyedCount += 1;
      }
      g.remove();
    }
  });

  // 半径内に誰もいなかった場合でも、
  // 一番近い宝石だけは巻き込むようにする
  if (destroyedCount === 0 && nearestGem) {
    const baseValue = parseFloat(nearestGem.dataset.baseValue || "0");
    if (!isNaN(baseValue) && baseValue > 0) {
      totalBaseValue += baseValue;
      destroyedCount = 1;
    }
    nearestGem.remove();
  }

  // 爆破対象ゼロならそのまま終了
  if (destroyedCount === 0 || totalBaseValue <= 0) {
    statusMainEl.textContent =
      "ボムを起爆したが、巻き込まれた宝石はなかった…";
    updateStats();
    return;
  }

  // 平均基礎価値 × 個数 をベースにダメージ計算
  const avgBase = totalBaseValue / destroyedCount;

  // ボム用クリティカル（少し控えめ）
  const critChance = getCritChance() * 0.5;
  const isCrit = Math.random() < critChance;
  const critMultiplier = isCrit ? getCritMultiplier() : 1;

  const centerPos = { x: pos.x, y: pos.y };

  const gainedMoney = addMoney(avgBase * destroyedCount, "ボム", {
    isCrit,
    critMultiplier,
    isBomb: true,
    pos: centerPos,
  });

  addXp(Math.floor(gainedMoney / 4));
  updateStats();
  syncStatusModalIfOpen();
}


// ========= オート採掘機 =========
function autoMinerTick() {
  if (state.autoMinerLevel <= 0) return;
  let gain = autoBaseIncome();
  gain = Math.floor(gain * totalValueMultiplier());
  if (gain <= 0) return;
  state.money += gain;
  state.totalEarned += gain;
  moneyEl.textContent = formatBigNumber(state.money);
  addBurstGauge(3 + state.autoMinerLevel * 0.8);
  const feverFromAuto = 0.4 + state.autoMinerLevel * 0.04;
  addFeverGauge(feverFromAuto);
  addXp(Math.max(1, Math.floor(gain / 6)));
  updateUnlockStatusText();
  updateShopButtons();
  updateStats();
  syncStatusModalIfOpen();
}

// ========= DPS計測 =========
function dpsTick() {
  const diff = state.totalEarned - state.lastMoneyForDps;
  state.currentDps = diff;
  state.lastMoneyForDps = state.totalEarned;
  updateStats();
}

// ========= ショップ関連 =========
function spawnUpgradeCost(level) {
  return 200 * Math.pow(2, level); // 200, 400, 800, ...
}

function autoUpgradeCost(level) {
  return 280 * Math.pow(1.08, level); // 緩やかに伸ばし、オートを買いやすく
}

function gemValueUpgradeCost(level) {
  return 500 * Math.pow(1.6, level); // 宝石単価投資
}

function updateShopButtons() {
  const spawnCost = spawnUpgradeCost(state.spawnUpgradeLevel);
  const autoCost = autoUpgradeCost(state.autoMinerLevel);
  const valueCost = gemValueUpgradeCost(state.gemValueUpgradeLevel);

  spawnCostEl.textContent = formatBigNumber(spawnCost);
  autoCostEl.textContent = formatBigNumber(autoCost);
  valueCostEl.textContent = formatBigNumber(valueCost);

  spawnCostModalEl.textContent = formatBigNumber(spawnCost);
  autoCostModalEl.textContent = formatBigNumber(autoCost);
  valueCostModalEl.textContent = formatBigNumber(valueCost);

  spawnLevelEl.textContent = state.spawnUpgradeLevel;
  autoLevelEl.textContent = state.autoMinerLevel;
  valueLevelEl.textContent = state.gemValueUpgradeLevel;

  spawnLevelModalEl.textContent = state.spawnUpgradeLevel;
  autoLevelModalEl.textContent = state.autoMinerLevel;
  valueLevelModalEl.textContent = state.gemValueUpgradeLevel;

  const spawnDisabled = state.money < spawnCost;
  const autoDisabled = state.money < autoCost;
  const valueDisabled = state.money < valueCost;

  if (spawnBtn) spawnBtn.disabled = spawnDisabled;
  if (spawnQuickBtn) spawnQuickBtn.disabled = spawnDisabled;
  if (autoBtn) autoBtn.disabled = autoDisabled;
  if (autoQuickBtn) autoQuickBtn.disabled = autoDisabled;
  if (valueBtn) valueBtn.disabled = valueDisabled;
  if (valueQuickBtn) valueQuickBtn.disabled = valueDisabled;
}

function handleSpawnPurchase() {
  const cost = spawnUpgradeCost(state.spawnUpgradeLevel);
  if (state.money < cost) return;
  state.money -= cost;
  moneyEl.textContent = formatBigNumber(state.money);
  state.spawnUpgradeLevel += 1;
  statusMainEl.textContent = `出現速度アップ Lv.${state.spawnUpgradeLevel} を購入！画面がどんどん宝石まみれに！`;
  updateShopButtons();
  restartSpawnTimer();
  syncStatusModalIfOpen();
}

function handleAutoPurchase() {
  const cost = autoUpgradeCost(state.autoMinerLevel);
  if (state.money < cost) return;
  state.money -= cost;
  moneyEl.textContent = formatBigNumber(state.money);
  state.autoMinerLevel += 1;
  statusMainEl.textContent = `オート採掘機 Lv.${state.autoMinerLevel} を購入！放置でもガンガン貯まる！`;
  updateStats();
  updateShopButtons();
  syncStatusModalIfOpen();
}

function handleValuePurchase() {
  const cost = gemValueUpgradeCost(state.gemValueUpgradeLevel);
  if (state.money < cost) return;
  state.money -= cost;
  moneyEl.textContent = formatBigNumber(state.money);
  state.gemValueUpgradeLevel += 1;
  statusMainEl.textContent = `宝石価値投資 Lv.${state.gemValueUpgradeLevel} に成功！すべての宝石がさらに高騰！`;
  updateShopButtons();
  updateStats();
  syncStatusModalIfOpen();
}

if (spawnBtn) spawnBtn.addEventListener("click", handleSpawnPurchase);
if (spawnQuickBtn) spawnQuickBtn.addEventListener("click", handleSpawnPurchase);
if (autoBtn) autoBtn.addEventListener("click", handleAutoPurchase);
if (autoQuickBtn) autoQuickBtn.addEventListener("click", handleAutoPurchase);
if (valueBtn) valueBtn.addEventListener("click", handleValuePurchase);
if (valueQuickBtn) valueQuickBtn.addEventListener("click", handleValuePurchase);

function syncStatusModal() {
  statusMainFullEl.textContent = statusMainEl.textContent;
  statusSubFullEl.innerHTML = statusSubEl.innerHTML || "最新情報はまだありません。";
  metricTapsEl.textContent = state.totalTapCount.toLocaleString("ja-JP");
  metricAutoEl.textContent = formatBigNumber(
    Math.floor(autoBaseIncome() * totalValueMultiplier())
  );
  metricDpsEl.textContent = formatBigNumber(state.currentDps);
}

function syncStatusModalIfOpen() {
  if (currentModal === "status") {
    syncStatusModal();
  }
}

function openModal(type) {
  currentModal = type;
  modalOverlay.classList.remove("hidden");
  modalOverlay.setAttribute("aria-hidden", "false");
  statusModalContent.classList.add("hidden");
  shopModalContent.classList.add("hidden");

  if (type === "status") {
    modalTitleEl.textContent = "ステータス詳細";
    statusModalContent.classList.remove("hidden");
    syncStatusModal();
  } else {
    modalTitleEl.textContent = "ショップ（アップグレード）";
    shopModalContent.classList.remove("hidden");
  }
}

function closeModal() {
  currentModal = null;
  modalOverlay.classList.add("hidden");
  modalOverlay.setAttribute("aria-hidden", "true");
}

modalCloseBtn.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (event) => {
  if (
    event.target === modalOverlay ||
    (event.target instanceof HTMLElement &&
      event.target.classList.contains("modal-backdrop"))
  ) {
    closeModal();
  }
});
openStatusBtn.addEventListener("click", () => openModal("status"));
openShopBtn.addEventListener("click", () => openModal("shop"));

// ========= 初期化 =========
function init() {
  moneyEl.textContent = formatBigNumber(state.money);
  levelEl.textContent = state.level;
  xpEl.textContent = state.xp;
  xpMaxEl.textContent = state.xpMax;
  xpBarEl.style.width = "0%";
  resetCombo();
  updateUnlockStatusText();
  updateShopButtons();
  updateFeverUI();
  updateBurstUI();
  updateStats();
  statusMainEl.textContent =
    "時間が経つと宝石が出現します。タップ連打とボム・FEVER・ルミナスバーストで画面をぶっ壊そう！";
  syncStatusModal();

  restartSpawnTimer();
  setInterval(autoMinerTick, 1000);
  setInterval(dpsTick, 1000);
}

init();

