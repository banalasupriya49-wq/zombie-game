const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const healthValue = document.getElementById('healthValue');
const homeValue = document.getElementById('homeValue');
const scoreValue = document.getElementById('scoreValue');
const waveValue = document.getElementById('waveValue');
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const gameOverScreen = document.getElementById('gameOver');
const restartButton = document.getElementById('restartButton');

const world = {
  width: canvas.width,
  height: canvas.height,
};

const input = {
  left: false,
  right: false,
  up: false,
  down: false,
};

const mouse = {
  x: world.width / 2,
  y: world.height / 2,
  down: false,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function resetGame() {
  return {
    phase: 'start',
    running: false,
    score: 0,
    wave: 1,
    spawnTimer: 1.2,
    enemies: [],
    bullets: [],
    particles: [],
    lastTime: 0,
    player: {
      x: world.width / 2,
      y: world.height - 90,
      radius: 18,
      speed: 220,
      health: 100,
      maxHealth: 100,
      fireCooldown: 0,
    },
    home: {
      x: world.width / 2,
      y: world.height / 2,
      radius: 85,
      health: 100,
      maxHealth: 100,
    },
  };
}

let game = resetGame();

function startGame() {
  game = resetGame();
  game.phase = 'playing';
  game.running = true;

  startScreen.classList.add('hidden');
  startScreen.classList.remove('visible');

  gameOverScreen.classList.add('hidden');
  gameOverScreen.classList.remove('visible');

  updateHud();
}

function updateHud() {
  healthValue.textContent = String(Math.max(0, Math.ceil(game.player.health)));
  homeValue.textContent = String(Math.max(0, Math.ceil(game.home.health)));
  scoreValue.textContent = String(game.score);
  waveValue.textContent = String(game.wave);
}

function createParticles(x, y, color, count = 10) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 25 + Math.random() * 80;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 3,
      life: 0.5 + Math.random() * 0.7,
      color,
    });
  }
}

function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;

  if (side === 0) {
    x = Math.random() * world.width;
    y = -32;
  } else if (side === 1) {
    x = world.width + 32;
    y = Math.random() * world.height;
  } else if (side === 2) {
    x = Math.random() * world.width;
    y = world.height + 32;
  } else {
    x = -32;
    y = Math.random() * world.height;
  }

  const isBrute = Math.random() < 0.18 + Math.min(0.18, game.wave * 0.025);

  game.enemies.push({
    x,
    y,
    radius: isBrute ? 20 : 15,
    speed: isBrute ? 52 + game.wave * 5 : 70 + game.wave * 6,
    health: isBrute ? 50 + game.wave * 10 : 25 + game.wave * 8,
    damage: isBrute ? 12 + game.wave * 1.5 : 8 + game.wave * 1.2,
    hitCooldown: 0,
    color: isBrute ? '#d67b66' : '#ef6f5e',
    type: isBrute ? 'brute' : 'walker',
  });
}

function shootBullet() {
  if (game.player.fireCooldown > 0 || game.phase !== 'playing') return;

  const dx = mouse.x - game.player.x;
  const dy = mouse.y - game.player.y;
  const length = Math.hypot(dx, dy) || 1;

  game.bullets.push({
    x: game.player.x,
    y: game.player.y,
    vx: (dx / length) * 520,
    vy: (dy / length) * 520,
    radius: 4,
    life: 1.2,
  });

  game.player.fireCooldown = 0.18;
}

function update(dt) {
  if (game.phase !== 'playing') return;

  const player = game.player;
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);

  let moveX = 0;
  let moveY = 0;

  if (input.left) moveX -= 1;
  if (input.right) moveX += 1;
  if (input.up) moveY -= 1;
  if (input.down) moveY += 1;

  if (moveX !== 0 || moveY !== 0) {
    const length = Math.hypot(moveX, moveY) || 1;
    player.x += (moveX / length) * player.speed * dt;
    player.y += (moveY / length) * player.speed * dt;
  }

  player.x = clamp(player.x, player.radius, world.width - player.radius);
  player.y = clamp(player.y, player.radius, world.height - player.radius);

  if (mouse.down) shootBullet();

  game.bullets = game.bullets.filter((bullet) => {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    return bullet.life > 0 && bullet.x > -30 && bullet.x < world.width + 30 && bullet.y > -30 && bullet.y < world.height + 30;
  });

  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0) {
    spawnEnemy();
    game.spawnTimer = Math.max(0.4, 1.3 - game.wave * 0.08);
  }

  for (const enemy of game.enemies) {
    enemy.hitCooldown = Math.max(0, enemy.hitCooldown - dt);

    const target = getDistance(enemy, game.home) < 220 ? game.home : player;
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;
    const nx = dx / distance;
    const ny = dy / distance;

    enemy.x += nx * enemy.speed * dt;
    enemy.y += ny * enemy.speed * dt;

    if (getDistance(enemy, player) < enemy.radius + player.radius + 2 && enemy.hitCooldown <= 0) {
      player.health -= enemy.damage;
      enemy.hitCooldown = 0.7;
      createParticles(player.x, player.y, '#f06d5b', 8);
    }

    if (getDistance(enemy, game.home) < enemy.radius + game.home.radius + 2) {
      game.home.health -= enemy.damage * dt * 1.5;
      createParticles(game.home.x, game.home.y, '#f7b25d', 4);
    }
  }

  for (const bullet of game.bullets) {
    for (const enemy of game.enemies) {
      if (getDistance(bullet, enemy) < bullet.radius + enemy.radius) {
        enemy.health -= 22;
        bullet.life = 0;
        createParticles(bullet.x, bullet.y, '#adf0a0', 4);
        break;
      }
    }
  }

  game.enemies = game.enemies.filter((enemy) => {
    if (enemy.health <= 0) {
      game.score += enemy.type === 'brute' ? 3 : 1;
      createParticles(enemy.x, enemy.y, '#d8f7ab', enemy.type === 'brute' ? 18 : 12);
      return false;
    }
    return true;
  });

  if (game.score > 0 && game.score % 12 === 0 && Math.floor(game.score / 12) >= game.wave) {
    game.wave += 1;
  }

  game.particles = game.particles.filter((particle) => {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
    return particle.life > 0;
  });

  if (player.health <= 0 || game.home.health <= 0) {
    player.health = Math.max(0, player.health);
    game.home.health = Math.max(0, game.home.health);

    game.phase = 'gameover';
    game.running = false;

    gameOverScreen.classList.remove('hidden');
    gameOverScreen.classList.add('visible');
  }

  updateHud();
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.fillStyle = '#8fe17f';
  ctx.beginPath();
  ctx.arc(game.home.x, game.home.y, game.home.radius, 0, Math.PI * 2);
  ctx.fill();

  const homeRatio = Math.max(0, game.home.health / game.home.maxHealth);
  ctx.fillStyle = '#d3d3d3';
  ctx.fillRect(game.home.x - 55, game.home.y + 58, 110, 10);
  ctx.fillStyle = '#6ad969';
  ctx.fillRect(game.home.x - 55, game.home.y + 58, 110 * homeRatio, 10);
}

function drawPlayer() {
  const player = game.player;
  ctx.save();
  ctx.translate(player.x, player.y);

  const dx = mouse.x - player.x;
  const dy = mouse.y - player.y;
  const angle = Math.atan2(dy, dx);
  ctx.rotate(angle);

  ctx.fillStyle = '#7ab8ff';
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#dfeef7';
  ctx.fillRect(12, -3, 22, 6);
  ctx.restore();
}

function drawEnemies() {
  for (const enemy of game.enemies) {
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();

    const hpRatio = Math.max(0, enemy.health / (enemy.type === 'brute' ? 50 : 25));
    ctx.fillStyle = '#b9b9b9';
    ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 8, enemy.radius * 2, 5);
    ctx.fillStyle = '#7ee378';
    ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 8, enemy.radius * 2 * hpRatio, 5);
  }
}

function drawBullets() {
  ctx.fillStyle = '#f2d159';
  for (const bullet of game.bullets) {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles() {
  for (const particle of game.particles) {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function render() {
  drawBackground();
  drawPlayer();
  drawBullets();
  drawEnemies();
  drawParticles();
}

function gameLoop(timestamp) {
  if (!game.lastTime) game.lastTime = timestamp;
  const dt = Math.min((timestamp - game.lastTime) / 1000, 0.033);
  game.lastTime = timestamp;

  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'a' || event.key === 'ArrowLeft') input.left = true;
  if (event.key === 'd' || event.key === 'ArrowRight') input.right = true;
  if (event.key === 'w' || event.key === 'ArrowUp') input.up = true;
  if (event.key === 's' || event.key === 'ArrowDown') input.down = true;
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'a' || event.key === 'ArrowLeft') input.left = false;
  if (event.key === 'd' || event.key === 'ArrowRight') input.right = false;
  if (event.key === 'w' || event.key === 'ArrowUp') input.up = false;
  if (event.key === 's' || event.key === 'ArrowDown') input.down = false;
});

canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  mouse.x = (event.clientX - rect.left) * scaleX;
  mouse.y = (event.clientY - rect.top) * scaleY;
});

canvas.addEventListener('mousedown', () => {
  mouse.down = true;
});

window.addEventListener('mouseup', () => {
  mouse.down = false;
});

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

updateHud();
requestAnimationFrame(gameLoop);
