const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const healthValue = document.getElementById('healthValue');
const scoreValue = document.getElementById('scoreValue');
const waveValue = document.getElementById('waveValue');
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
  x: canvas.width / 2,
  y: canvas.height / 2,
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
    running: true,
    score: 0,
    wave: 1,
    spawnTimer: 1.25,
    enemies: [],
    bullets: [],
    particles: [],
    lastTime: 0,
    player: {
      x: world.width / 2,
      y: world.height / 2,
      radius: 18,
      speed: 240,
      health: 100,
      maxHealth: 100,
      fireCooldown: 0,
    },
  };
}

let game = resetGame();

function updateHud() {
  healthValue.textContent = String(Math.max(0, Math.ceil(game.player.health)));
  scoreValue.textContent = String(game.score);
  waveValue.textContent = String(game.wave);
}

function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;

  if (side === 0) {
    x = Math.random() * world.width;
    y = -30;
  } else if (side === 1) {
    x = world.width + 30;
    y = Math.random() * world.height;
  } else if (side === 2) {
    x = Math.random() * world.width;
    y = world.height + 30;
  } else {
    x = -30;
    y = Math.random() * world.height;
  }

  game.enemies.push({
    x,
    y,
    radius: 16,
    speed: 60 + game.wave * 6,
    health: 25 + game.wave * 8,
    damage: 7 + game.wave * 1.3,
    hitCooldown: 0,
  });
}

function shootBullet() {
  if (game.player.fireCooldown > 0 || !game.running) {
    return;
  }

  const dx = mouse.x - game.player.x;
  const dy = mouse.y - game.player.y;
  const length = Math.hypot(dx, dy) || 1;

  game.bullets.push({
    x: game.player.x,
    y: game.player.y,
    vx: (dx / length) * 520,
    vy: (dy / length) * 520,
    radius: 4,
    life: 1.4,
  });

  game.player.fireCooldown = 0.18;
}

function createParticles(x, y, color, count = 12) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 90;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 3,
      life: 0.6 + Math.random() * 0.5,
      color,
    });
  }
}

function update(dt) {
  if (!game.running) {
    return;
  }

  const player = game.player;
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);

  let moveX = 0;
  let moveY = 0;

  if (input.left) moveX -= 1;
  if (input.right) moveX += 1;
  if (input.up) moveY -= 1;
  if (input.down) moveY += 1;

  const magnitude = Math.hypot(moveX, moveY) || 1;
  const speedScale = player.speed / magnitude;

  player.x += (moveX / magnitude) * player.speed * dt;
  player.y += (moveY / magnitude) * player.speed * dt;
  player.x = clamp(player.x, player.radius, world.width - player.radius);
  player.y = clamp(player.y, player.radius, world.height - player.radius);

  if (mouse.down) {
    shootBullet();
  }

  game.bullets = game.bullets.filter((bullet) => {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;

    return bullet.life > 0 &&
      bullet.x > -20 &&
      bullet.x < world.width + 20 &&
      bullet.y > -20 &&
      bullet.y < world.height + 20;
  });

  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0) {
    spawnEnemy();
    game.spawnTimer = Math.max(0.45, 1.4 - game.wave * 0.08);
  }

  for (const enemy of game.enemies) {
    enemy.hitCooldown = Math.max(0, enemy.hitCooldown - dt);
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;
    const nx = dx / distance;
    const ny = dy / distance;

    enemy.x += (nx * enemy.speed * dt);
    enemy.y += (ny * enemy.speed * dt);

    if (distance < player.radius + enemy.radius + 2 && enemy.hitCooldown <= 0) {
      player.health -= enemy.damage;
      enemy.hitCooldown = 0.7;
      createParticles(player.x, player.y, '#ff6b6b', 8);
    }
  }

  for (const bullet of game.bullets) {
    for (const enemy of game.enemies) {
      if (getDistance(bullet, enemy) < bullet.radius + enemy.radius) {
        enemy.health -= 20;
        bullet.life = 0;
        createParticles(bullet.x, bullet.y, '#9adf7d', 5);
        break;
      }
    }
  }

  game.enemies = game.enemies.filter((enemy) => {
    if (enemy.health <= 0) {
      game.score += 1;
      createParticles(enemy.x, enemy.y, '#d8f9a3', 12);
      return false;
    }
    return true;
  });

  if (game.score > 0 && game.score % 10 === 0 && Math.floor(game.score / 10) >= game.wave) {
    game.wave += 1;
  }

  game.particles = game.particles.filter((particle) => {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
    return particle.life > 0;
  });

  if (player.health <= 0) {
    player.health = 0;
    game.running = false;
    gameOverScreen.classList.remove('hidden');
  }

  updateHud();
}

function drawBackground() {
  ctx.fillStyle = '#132218';
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.strokeStyle = 'rgba(190, 255, 175, 0.1)';
  ctx.lineWidth = 1;

  for (let x = 0; x < world.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, world.height);
    ctx.stroke();
  }

  for (let y = 0; y < world.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(world.width, y);
    ctx.stroke();
  }

  ctx.fillStyle = '#7dd36a';
  ctx.beginPath();
  ctx.arc(world.width / 2, world.height / 2, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e7f5d8';
  ctx.font = 'bold 26px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('HOME', world.width / 2, world.height / 2 + 8);
}

function drawPlayer() {
  const player = game.player;
  ctx.save();
  ctx.translate(player.x, player.y);

  const dx = mouse.x - player.x;
  const dy = mouse.y - player.y;
  const angle = Math.atan2(dy, dx);

  ctx.rotate(angle);

  ctx.fillStyle = '#75c7ff';
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#dfeeff';
  ctx.fillRect(10, -4, 18, 8);

  ctx.restore();
}

function drawEnemies() {
  for (const enemy of game.enemies) {
    ctx.fillStyle = '#f06d5c';
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawBullets() {
  ctx.fillStyle = '#f5d76e';
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

  if (!game.running) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(0, 0, world.width, world.height);
  }
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

restartButton.addEventListener('click', () => {
  game = resetGame();
  gameOverScreen.classList.add('hidden');
  updateHud();
});

updateHud();
requestAnimationFrame(gameLoop);

