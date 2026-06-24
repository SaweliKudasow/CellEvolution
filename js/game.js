const CANVAS_W = 800;
const CANVAS_H = 600;

const FOOD_VALUE = 1;
const GROWTH_PER_FOOD = 0.2;
const MUTATION_THRESHOLD = 10;
const BASE_SPEED = 3.5;
const INITIAL_SIZE = 20;
const FOOD_COUNT = 80;
const FOOD_RADIUS = 4;

const MUTATIONS = {
  speed: {
    id: 'speed',
    icon: '⚡',
    name: 'Скорость',
    description: '+20% к скорости движения',
    enabled: true,
  },
  armor: {
    id: 'armor',
    icon: '🛡️',
    name: 'Броня',
    description: '−50% потери размера при столкновении',
    enabled: true,
  },
  predator: {
    id: 'predator',
    icon: '🦷',
    name: 'Хищник',
    description: 'Можно есть других клеток (скоро)',
    enabled: false,
  },
};

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const sizeDisplay = document.getElementById('size-display');
const energyDisplay = document.getElementById('energy-display');
const mutationProgressDisplay = document.getElementById('mutation-progress');
const mutationsDisplay = document.getElementById('mutations-display');
const mutationOverlay = document.getElementById('mutation-overlay');
const mutationCards = document.getElementById('mutation-cards');

const keys = { w: false, a: false, s: false, d: false };
let mouse = { x: CANVAS_W / 2, y: CANVAS_H / 2, active: false };
let paused = false;

const player = {
  x: CANVAS_W / 2,
  y: CANVAS_H / 2,
  size: INITIAL_SIZE,
  energy: 0,
  foodEaten: 0,
  foodSinceMutation: 0,
  mutations: { speed: 0, armor: 0, predator: 0 },
};

let foods = [];
let rivals = [];

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function distance(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

function getSpeed() {
  const sizePenalty = 1 + player.size * 0.015;
  const speedBonus = 1 + player.mutations.speed * 0.2;
  return (BASE_SPEED * speedBonus) / sizePenalty;
}

function spawnFood() {
  const margin = 20;
  foods.push({
    x: rand(margin, CANVAS_W - margin),
    y: rand(margin, CANVAS_H - margin),
    radius: FOOD_RADIUS,
    hue: rand(100, 160),
  });
}

function initFoods() {
  foods = [];
  for (let i = 0; i < FOOD_COUNT; i++) spawnFood();
}

function spawnRival() {
  const margin = 40;
  const size = rand(12, 22);
  const angle = rand(0, Math.PI * 2);
  rivals.push({
    x: rand(margin, CANVAS_W - margin),
    y: rand(margin, CANVAS_H - margin),
    size,
    vx: Math.cos(angle) * rand(0.8, 1.5),
    vy: Math.sin(angle) * rand(0.8, 1.5),
    hue: rand(0, 20),
  });
}

function initRivals() {
  rivals = [];
  for (let i = 0; i < 5; i++) spawnRival();
}

function updateHUD() {
  sizeDisplay.textContent = player.size.toFixed(1);
  energyDisplay.textContent = player.energy;
  mutationProgressDisplay.textContent =
    MUTATION_THRESHOLD - (player.foodSinceMutation % MUTATION_THRESHOLD);

  mutationsDisplay.innerHTML = '';
  for (const [id, level] of Object.entries(player.mutations)) {
    if (level > 0) {
      const badge = document.createElement('span');
      badge.className = 'mutation-badge';
      badge.textContent = `${MUTATIONS[id].icon} ${MUTATIONS[id].name} ×${level}`;
      mutationsDisplay.appendChild(badge);
    }
  }
}

function showMutationChoice() {
  paused = true;
  mutationOverlay.classList.remove('hidden');
  mutationCards.innerHTML = '';

  for (const mut of Object.values(MUTATIONS)) {
    const card = document.createElement('div');
    card.className = 'mutation-card' + (mut.enabled ? '' : ' disabled');

    const level = player.mutations[mut.id];
    card.innerHTML = `
      <div class="icon">${mut.icon}</div>
      <h3>${mut.name}</h3>
      <p>${mut.description}</p>
      ${level > 0 ? `<div class="level">Уровень ${level}</div>` : ''}
    `;

    if (mut.enabled) {
      card.addEventListener('click', () => selectMutation(mut.id));
    }

    mutationCards.appendChild(card);
  }
}

function selectMutation(id) {
  player.mutations[id]++;
  player.foodSinceMutation = 0;
  paused = false;
  mutationOverlay.classList.add('hidden');
  updateHUD();
}

function checkMutationTrigger() {
  if (player.foodSinceMutation >= MUTATION_THRESHOLD) {
    showMutationChoice();
  }
}

function eatFood(food, index) {
  player.energy += FOOD_VALUE;
  player.size += GROWTH_PER_FOOD;
  player.foodEaten++;
  player.foodSinceMutation++;
  foods.splice(index, 1);
  spawnFood();
  updateHUD();
  checkMutationTrigger();
}

function handleRivalCollision(rival) {
  if (player.size <= rival.size) {
    const loss = 2 * (1 - player.mutations.armor * 0.5);
    player.size = Math.max(INITIAL_SIZE * 0.5, player.size - loss);
    const angle = Math.atan2(player.y - rival.y, player.x - rival.x);
    player.x += Math.cos(angle) * 8;
    player.y += Math.sin(angle) * 8;
    updateHUD();
  }
}

function updatePlayer() {
  const speed = getSpeed();
  let dx = 0;
  let dy = 0;

  if (keys.w) dy -= 1;
  if (keys.s) dy += 1;
  if (keys.a) dx -= 1;
  if (keys.d) dx += 1;

  const usingKeyboard = dx !== 0 || dy !== 0;

  if (usingKeyboard) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx = (dx / len) * speed;
    dy = (dy / len) * speed;
  } else if (mouse.active) {
    const dist = distance(player.x, player.y, mouse.x, mouse.y);
    if (dist > 2) {
      dx = ((mouse.x - player.x) / dist) * speed;
      dy = ((mouse.y - player.y) / dist) * speed;
    }
  }

  player.x = Math.max(player.size, Math.min(CANVAS_W - player.size, player.x + dx));
  player.y = Math.max(player.size, Math.min(CANVAS_H - player.size, player.y + dy));
}

function updateRivals() {
  for (const rival of rivals) {
    rival.x += rival.vx;
    rival.y += rival.vy;

    if (rival.x - rival.size < 0 || rival.x + rival.size > CANVAS_W) {
      rival.vx *= -1;
      rival.x = Math.max(rival.size, Math.min(CANVAS_W - rival.size, rival.x));
    }
    if (rival.y - rival.size < 0 || rival.y + rival.size > CANVAS_H) {
      rival.vy *= -1;
      rival.y = Math.max(rival.size, Math.min(CANVAS_H - rival.size, rival.y));
    }

    const dist = distance(player.x, player.y, rival.x, rival.y);
    if (dist < player.size + rival.size) {
      handleRivalCollision(rival);
    }
  }
}

function checkFoodCollisions() {
  for (let i = foods.length - 1; i >= 0; i--) {
    const food = foods[i];
    const dist = distance(player.x, player.y, food.x, food.y);
    if (dist < player.size + food.radius) {
      eatFood(food, i);
    }
  }
}

function drawBackground() {
  const gradient = ctx.createRadialGradient(
    CANVAS_W / 2, CANVAS_H / 2, 0,
    CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.7
  );
  gradient.addColorStop(0, '#0f2035');
  gradient.addColorStop(1, '#060d18');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.strokeStyle = 'rgba(100, 180, 255, 0.06)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x <= CANVAS_W; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_H);
    ctx.stroke();
  }
  for (let y = 0; y <= CANVAS_H; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_W, y);
    ctx.stroke();
  }
}

function drawFood(food) {
  const glow = ctx.createRadialGradient(food.x, food.y, 0, food.x, food.y, food.radius * 2);
  glow.addColorStop(0, `hsla(${food.hue}, 80%, 60%, 0.9)`);
  glow.addColorStop(1, `hsla(${food.hue}, 80%, 50%, 0)`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(food.x, food.y, food.radius * 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `hsl(${food.hue}, 85%, 65%)`;
  ctx.beginPath();
  ctx.arc(food.x, food.y, food.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawCell(x, y, size, hue, isPlayer) {
  const glow = ctx.createRadialGradient(x, y, size * 0.3, x, y, size * 1.4);
  if (isPlayer) {
    glow.addColorStop(0, `hsla(${hue}, 90%, 65%, 0.5)`);
    glow.addColorStop(1, `hsla(${hue}, 90%, 50%, 0)`);
  } else {
    glow.addColorStop(0, `hsla(${hue}, 70%, 50%, 0.3)`);
    glow.addColorStop(1, `hsla(${hue}, 70%, 40%, 0)`);
  }
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, size * 1.4, 0, Math.PI * 2);
  ctx.fill();

  const bodyGrad = ctx.createRadialGradient(
    x - size * 0.3, y - size * 0.3, 0,
    x, y, size
  );
  bodyGrad.addColorStop(0, `hsl(${hue}, 85%, ${isPlayer ? 70 : 55}%)`);
  bodyGrad.addColorStop(1, `hsl(${hue}, 75%, ${isPlayer ? 45 : 35}%)`);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();

  if (isPlayer) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.stroke();

    const nucleusR = size * 0.25;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.arc(x - size * 0.2, y - size * 0.15, nucleusR, 0, Math.PI * 2);
    ctx.fill();
  }
}

function render() {
  drawBackground();

  for (const food of foods) drawFood(food);
  for (const rival of rivals) drawCell(rival.x, rival.y, rival.size, rival.hue, false);
  drawCell(player.x, player.y, player.size, 200, true);

  if (mouse.active && !paused) {
    ctx.strokeStyle = 'rgba(79, 195, 247, 0.15)';
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(mouse.x, mouse.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function update() {
  if (paused) return;
  updatePlayer();
  updateRivals();
  checkFoodCollisions();
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - rect.left) * (CANVAS_W / rect.width);
  mouse.y = (e.clientY - rect.top) * (CANVAS_H / rect.height);
  mouse.active = true;
});

canvas.addEventListener('mouseleave', () => {
  mouse.active = false;
});

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (key in keys) {
    keys[key] = true;
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  if (key in keys) keys[key] = false;
});

initFoods();
initRivals();
updateHUD();
gameLoop();
