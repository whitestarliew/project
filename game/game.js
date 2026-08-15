/**
 * NEXUS SHOOTER — Modern Contemporary Space Shooter Engine
 * Features: 8 Boss Waves, 10s Cooldown BOOM Bomb, Circled Orbital Knives,
 * Enemy Skill Classes, Between-Wave Shop, and Datasheet Persistence.
 */

(function () {
  'use strict';

  // --- CONFIGURATION ---
  const CANVAS_WIDTH = 480;
  const CANVAS_HEIGHT = 640;

  let canvas, ctx;
  let audioCtx = null;

  // Game States
  const STATE_TITLE = 'TITLE';
  const STATE_PLAYING = 'PLAYING';
  const STATE_PAUSED = 'PAUSED';
  const STATE_SHOP = 'SHOP';
  const STATE_GAMEOVER = 'GAMEOVER';
  const STATE_VICTORY = 'VICTORY';
  const STATE_NAME_ENTRY = 'NAME_ENTRY';
  const STATE_LEADERBOARD = 'LEADERBOARD';

  let currentState = STATE_TITLE;

  // 8 Named Waves & Bosses
  const WAVES_DATA = [
    { name: "HAINAN", bossName: "HAINAN LEVIATHAN", bossHp: 50, color: "#00f3ff" },
    { name: "KWONG DONG", bossName: "KWONG DONG BEHEMOTH", bossHp: 80, color: "#00ff66" },
    { name: "HONG KONG", bossName: "HONG KONG DREADNOUGHT", bossHp: 120, color: "#ffea00" },
    { name: "ZHE KONG", bossName: "ZHE KONG VANGUARD", bossHp: 160, color: "#b026ff" },
    { name: "SHANGHAI", bossName: "SHANGHAI OVERLORD", bossHp: 200, color: "#ff0077" },
    { name: "TIANJING", bossName: "TIANJING FORTRESS", bossHp: 240, color: "#ff5500" },
    { name: "PEKING", bossName: "PEKING TITAN", bossHp: 280, color: "#00ffff" },
    { name: "ZHONGNANHOI", bossName: "ZHONGNANHAI APEX BOSS", bossHp: 350, color: "#ffffff" }
  ];

  // Inputs
  const keys = {};
  let mousePos = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 60 };
  let isMouseDown = false;

  // Game Entities
  let player;
  let playerBullets = [];
  let enemyBullets = [];
  let enemies = [];
  let activeBoss = null;
  let shockwaves = [];
  let particles = [];
  let coins = [];
  let powerups = [];
  let stars = [];

  // Game Progress
  let score = 0;
  let coinsEarned = 0;
  let lives = 3;
  let wave = 1;
  let waveStage = 'DRONES'; // 'DRONES', 'BOSS_INCOMING', 'BOSS_FIGHT'

  // Special Weapon: BOOM Bomb (10s Cooldown)
  const BOMB_COOLDOWN_MS = 10000;
  let lastBombTime = -10000;

  // Datasheet Data
  let top10Scores = [];
  let playerInitials = ['A', 'A', 'A'];
  let activeCharIdx = 0;
  let qualifyRank = -1;

  // Backend API
  const SERVER_URL = window.location.origin.startsWith('http') 
    ? window.location.origin 
    : 'http://localhost:3000';

  // --- SOUND SYNTHESIZER ---
  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playSound(type) {
    if (!audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'shoot') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(850, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(70, now + 0.06);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === 'bomb') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.6);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === 'explosion') {
        const bufferSize = audioCtx.sampleRate * 0.25;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const whiteNoise = audioCtx.createBufferSource();
        whiteNoise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.linearRampToValueAtTime(50, now + 0.25);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        whiteNoise.connect(filter);
        filter.connect(gain);
        whiteNoise.start(now);
        whiteNoise.stop(now + 0.25);
      } else if (type === 'coin') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046, now);
        osc.frequency.setValueAtTime(1396, now + 0.08);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'powerup') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.setValueAtTime(659, now + 0.08);
        osc.frequency.setValueAtTime(783, now + 0.16);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      } else if (type === 'gameover') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.7);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
        osc.start(now);
        osc.stop(now + 0.7);
      }
    } catch (e) {}
  }

  // --- DATASHEET PERSISTENCE ---
  async function loadDatasheet() {
    try {
      const res = await fetch(`${SERVER_URL}/api/datasheet`);
      if (res.ok) {
        top10Scores = await res.json();
        localStorage.setItem('ufo_invaders_scores', JSON.stringify(top10Scores));
        renderDatasheetTable();
        return;
      }
    } catch (e) {}
    const cached = localStorage.getItem('ufo_invaders_scores');
    if (cached) {
      try { top10Scores = JSON.parse(cached); } catch (e) {}
    } else {
      top10Scores = [];
    }
    renderDatasheetTable();
  }

  async function submitHighScore(name, scoreVal, waveVal) {
    const entry = { name, score: scoreVal, wave: waveVal };
    try {
      const res = await fetch(`${SERVER_URL}/api/datasheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      if (res.ok) {
        const data = await res.json();
        top10Scores = data.scores;
        localStorage.setItem('ufo_invaders_scores', JSON.stringify(top10Scores));
        renderDatasheetTable();
        return;
      }
    } catch (e) {}

    top10Scores.push({
      name: name.toUpperCase().substring(0, 3),
      score: scoreVal,
      wave: waveVal,
      date: new Date().toISOString().split('T')[0]
    });
    top10Scores.sort((a, b) => b.score - a.score);
    top10Scores = top10Scores.slice(0, 10).map((item, idx) => ({ ...item, rank: idx + 1 }));
    localStorage.setItem('ufo_invaders_scores', JSON.stringify(top10Scores));
    renderDatasheetTable();
  }

  function renderDatasheetTable() {
    const container = document.getElementById('datasheet-rows');
    if (!container) return;
    if (top10Scores.length === 0) {
      container.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 15px;">No records yet. Be the first!</td></tr>`;
      return;
    }
    container.innerHTML = top10Scores.map(item => `
      <tr>
        <td class="rank-${item.rank}">#${item.rank}</td>
        <td><strong>${item.name}</strong></td>
        <td>${item.score.toLocaleString()}</td>
        <td>W${item.wave}</td>
        <td>${item.date || ''}</td>
      </tr>
    `).join('');
  }

  function checkQualifiesTop10(finalScore) {
    if (finalScore <= 0) return -1;
    if (top10Scores.length < 10) return top10Scores.length + 1;
    for (let i = 0; i < top10Scores.length; i++) {
      if (finalScore > top10Scores[i].score) return i + 1;
    }
    return -1;
  }

  // --- STARFIELD ---
  function initStars() {
    stars = [];
    for (let i = 0; i < 60; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: Math.random() < 0.3 ? 2 : 1,
        speed: 0.6 + Math.random() * 1.8,
        color: Math.random() < 0.3 ? '#00f3ff' : '#ffffff'
      });
    }
  }

  function updateStars() {
    for (let s of stars) {
      s.y += s.speed;
      if (s.y > CANVAS_HEIGHT) {
        s.y = 0;
        s.x = Math.random() * CANVAS_WIDTH;
      }
    }
  }

  function drawStars() {
    for (let s of stars) {
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
  }

  // --- PLAYER OBJECT ---
  function createPlayer() {
    return {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 60,
      width: 32,
      height: 36,
      speed: 6.0,
      fireRate: 120,
      lastShotTime: 0,
      invulnTime: 0,
      weaponLevel: 1,
      shieldHp: 0,
      maxShieldHp: 0,
      knives: 0, // Circled Orbital Knives count
      knifeAngle: 0
    };
  }

  function drawPlayer(p) {
    if (p.invulnTime > 0 && Math.floor(Date.now() / 100) % 2 === 0) return;

    ctx.save();
    ctx.translate(p.x, p.y);

    // Twin cyan thruster energy trail
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, 12);
    ctx.lineTo(-6, 18 + Math.random() * 8);
    ctx.moveTo(6, 12);
    ctx.lineTo(6, 18 + Math.random() * 8);
    ctx.stroke();

    // Modern Stealth Vector Hull
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(14, 10);
    ctx.lineTo(6, 12);
    ctx.lineTo(0, 8);
    ctx.lineTo(-6, 12);
    ctx.lineTo(-14, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Core Crystal Accent
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(3, 0);
    ctx.lineTo(0, 4);
    ctx.lineTo(-3, 0);
    ctx.closePath();
    ctx.fill();

    // Shield Aura
    if (p.shieldHp > 0) {
      ctx.strokeStyle = '#00ffaa';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    // CIRCLED ORBITAL KNIVES (Spinning Plasma Blades Around Ship)
    if (p.knives > 0) {
      p.knifeAngle += 0.06;
      for (let k = 0; k < p.knives; k++) {
        const angle = p.knifeAngle + (k * (Math.PI * 2 / p.knives));
        const kx = p.x + Math.cos(angle) * 45;
        const ky = p.y + Math.sin(angle) * 45;

        ctx.save();
        ctx.translate(kx, ky);
        ctx.rotate(angle + Math.PI / 2);
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 10;

        // Plasma Dagger Blade Shape
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(4, 4);
        ctx.lineTo(0, 8);
        ctx.lineTo(-4, 4);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }
  }

  // --- ENEMIES & MULTIPLE SKILL CLASSES ---
  function spawnDronesForWave(waveNum) {
    enemies = [];
    activeBoss = null;
    waveStage = 'DRONES';

    const count = 12 + waveNum * 2;
    const cols = 6;
    const startX = 60;
    const startY = 60;
    const spacingX = 65;
    const spacingY = 48;

    const types = ['striker', 'shield', 'sniper', 'splitter'];

    for (let i = 0; i < count; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const eType = types[i % types.length];

      enemies.push({
        x: startX + c * spacingX,
        y: startY + r * spacingY,
        originX: startX + c * spacingX,
        originY: startY + r * spacingY,
        width: 30,
        height: 24,
        type: eType,
        hp: eType === 'shield' ? 3 : (eType === 'sniper' ? 2 : 1),
        maxHp: eType === 'shield' ? 3 : (eType === 'sniper' ? 2 : 1),
        scoreVal: 150,
        animFrame: Math.random() * Math.PI * 2,
        isSwooping: false,
        swoopAngle: 0,
        sniperCharge: 0,
        shieldActive: false
      });
    }
  }

  function spawnBoss(waveNum) {
    const data = WAVES_DATA[Math.min(waveNum - 1, WAVES_DATA.length - 1)];
    waveStage = 'BOSS_FIGHT';
    enemies = [];

    activeBoss = {
      name: data.bossName,
      x: CANVAS_WIDTH / 2,
      y: -80,
      targetY: 100,
      width: 75,
      height: 60,
      hp: data.bossHp,
      maxHp: data.bossHp,
      color: data.color,
      animFrame: 0,
      attackTimer: 0,
      scoreVal: 2500
    };

    const bossHpContainer = document.getElementById('boss-hp-container');
    const bossNameElem = document.getElementById('boss-name-text');
    if (bossHpContainer) bossHpContainer.classList.remove('hidden');
    if (bossNameElem) bossNameElem.innerText = data.bossName;
    updateBossHpBar();
  }

  function updateBossHpBar() {
    if (!activeBoss) return;
    const fill = document.getElementById('boss-hp-bar-fill');
    if (fill) {
      const pct = Math.max(0, (activeBoss.hp / activeBoss.maxHp) * 100);
      fill.style.width = `${pct}%`;
    }
  }

  function drawUFO(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    const bob = Math.sin(e.animFrame * 3) * 2;
    ctx.translate(0, bob);

    let color = '#00f3ff';
    if (e.type === 'shield') color = '#00ffaa';
    if (e.type === 'sniper') color = '#ff0055';
    if (e.type === 'splitter') color = '#ffea00';

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(14, -4);
    ctx.lineTo(14, 4);
    ctx.lineTo(0, 12);
    ctx.lineTo(-14, 4);
    ctx.lineTo(-14, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Central Core
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    // Sniper Beam Charge Warning Line
    if (e.type === 'sniper' && e.sniperCharge > 0) {
      ctx.strokeStyle = `rgba(255, 0, 85, ${e.sniperCharge / 60})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.lineTo(0, 400);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawBoss(b) {
    ctx.save();
    ctx.translate(b.x, b.y);

    ctx.fillStyle = '#0a1020';
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 3;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 15;

    // Modern Boss Octagonal Heavy Core
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(35, -15);
    ctx.lineTo(45, 10);
    ctx.lineTo(25, 30);
    ctx.lineTo(-25, 30);
    ctx.lineTo(-45, 10);
    ctx.lineTo(-35, -15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    // Glowing Core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // --- SPECIAL WEAPON: BOOM BOMB (10s COOLDOWN) ---
  function triggerBoomBomb() {
    if (currentState !== STATE_PLAYING) return;
    const now = Date.now();
    if (now - lastBombTime < BOMB_COOLDOWN_MS) return;

    lastBombTime = now;
    playSound('bomb');

    // Create Expanding Energy Shockwave
    shockwaves.push({
      x: player.x,
      y: player.y,
      radius: 10,
      maxRadius: 550,
      color: '#00f3ff'
    });

    // Clear all enemy bullets on screen!
    enemyBullets = [];

    // Damage all regular drones
    for (let i = enemies.length - 1; i >= 0; i--) {
      let e = enemies[i];
      e.hp -= 5;
      if (e.hp <= 0) {
        createExplosion(e.x, e.y, '#00f3ff');
        score += e.scoreVal;
        enemies.splice(i, 1);
      }
    }

    // Damage Boss
    if (activeBoss) {
      activeBoss.hp -= 40;
      createExplosion(activeBoss.x, activeBoss.y, activeBoss.color);
      updateBossHpBar();
      if (activeBoss.hp <= 0) {
        defeatBoss();
      }
    }

    updateHUDScore();
  }

  function updateBoomCooldownHUD() {
    const btn = document.getElementById('btn-boom-skill');
    const txt = document.getElementById('boom-text');
    const bar = document.getElementById('boom-cooldown-bar');
    if (!btn || !txt || !bar) return;

    const elapsed = Date.now() - lastBombTime;
    if (elapsed >= BOMB_COOLDOWN_MS) {
      txt.innerText = 'BOOM [READY]';
      bar.style.width = '0%';
      btn.style.opacity = '1';
    } else {
      const remainingSec = Math.ceil((BOMB_COOLDOWN_MS - elapsed) / 1000);
      txt.innerText = `BOOM [${remainingSec}s]`;
      const pct = 100 - (elapsed / BOMB_COOLDOWN_MS) * 100;
      bar.style.width = `${pct}%`;
      btn.style.opacity = '0.7';
    }
  }

  // --- PARTICLE & SHOCKWAVE EFFECTS ---
  function createExplosion(x, y, color = '#00f3ff') {
    playSound('explosion');
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.0;
      particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() < 0.4 ? 3 : 1.5,
        color: i % 2 === 0 ? color : '#ffffff',
        life: 1.0,
        decay: 0.04 + Math.random() * 0.04
      });
    }
  }

  function spawnCoin(x, y) {
    coins.push({ x: x, y: y, vy: 1.8, rotation: 0 });
  }

  function spawnPowerup(x, y) {
    const types = ['WEAPON', 'SHIELD', 'LIFE'];
    powerups.push({ x: x, y: y, vy: 1.5, type: types[Math.floor(Math.random() * types.length)] });
  }

  // --- UPDATE LOOP ---
  let lastFrameTime = performance.now();

  function gameLoop(now) {
    const dt = now - lastFrameTime;
    lastFrameTime = now;

    updateStars();
    updateBoomCooldownHUD();

    if (currentState === STATE_PLAYING) {
      updatePlaying(dt);
    }

    draw();

    requestAnimationFrame(gameLoop);
  }

  function updatePlaying(dt) {
    // Player Controls
    if (keys['ArrowLeft'] || keys['KeyA']) player.x -= player.speed;
    if (keys['ArrowRight'] || keys['KeyD']) player.x += player.speed;
    if (keys['ArrowUp'] || keys['KeyW']) player.y -= player.speed;
    if (keys['ArrowDown'] || keys['KeyS']) player.y += player.speed;

    player.x = Math.max(20, Math.min(CANVAS_WIDTH - 20, player.x));
    player.y = Math.max(CANVAS_HEIGHT * 0.4, Math.min(CANVAS_HEIGHT - 30, player.y));

    if (player.invulnTime > 0) player.invulnTime -= dt;

    // BOOM Bomb Key Shortcut (B or Shift)
    if (keys['KeyB'] || keys['ShiftLeft'] || keys['ShiftRight']) {
      triggerBoomBomb();
    }

    // Auto/Manual Shooting
    const nowTime = Date.now();
    if ((keys['Space'] || isMouseDown) && nowTime - player.lastShotTime > player.fireRate) {
      player.lastShotTime = nowTime;
      playSound('shoot');

      if (player.weaponLevel === 1) {
        playerBullets.push({ x: player.x - 8, y: player.y - 15, vy: -11, width: 3, height: 12 });
        playerBullets.push({ x: player.x + 8, y: player.y - 15, vy: -11, width: 3, height: 12 });
      } else if (player.weaponLevel === 2) {
        playerBullets.push({ x: player.x - 10, y: player.y - 15, vx: -2, vy: -10, width: 3, height: 12 });
        playerBullets.push({ x: player.x, y: player.y - 18, vx: 0, vy: -11, width: 4, height: 14 });
        playerBullets.push({ x: player.x + 10, y: player.y - 15, vx: 2, vy: -10, width: 3, height: 12 });
      } else {
        playerBullets.push({ x: player.x - 12, y: player.y - 15, vx: -1.5, vy: -11, width: 4, height: 14 });
        playerBullets.push({ x: player.x - 4, y: player.y - 18, vx: -0.5, vy: -12, width: 4, height: 14 });
        playerBullets.push({ x: player.x + 4, y: player.y - 18, vx: 0.5, vy: -12, width: 4, height: 14 });
        playerBullets.push({ x: player.x + 12, y: player.y - 15, vx: 1.5, vy: -11, width: 4, height: 14 });
      }
    }

    // Update Player Bullets
    for (let i = playerBullets.length - 1; i >= 0; i--) {
      let b = playerBullets[i];
      b.x += (b.vx || 0);
      b.y += b.vy;
      if (b.y < -20 || b.x < 0 || b.x > CANVAS_WIDTH) {
        playerBullets.splice(i, 1);
      }
    }

    // Update Enemy Bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      let eb = enemyBullets[i];
      eb.x += eb.vx;
      eb.y += eb.vy;

      if (Math.hypot(eb.x - player.x, eb.y - player.y) < 16) {
        enemyBullets.splice(i, 1);
        damagePlayer();
        continue;
      }
      if (eb.y > CANVAS_HEIGHT + 20) enemyBullets.splice(i, 1);
    }

    // BULLET INTERCEPTION (Player shoots enemy bullet)
    for (let i = playerBullets.length - 1; i >= 0; i--) {
      let pb = playerBullets[i];
      for (let j = enemyBullets.length - 1; j >= 0; j--) {
        let eb = enemyBullets[j];
        if (Math.hypot(pb.x - eb.x, pb.y - eb.y) < 14) {
          playSound('hit');
          playerBullets.splice(i, 1);
          enemyBullets.splice(j, 1);
          break;
        }
      }
    }

    // CIRCLED ORBITAL KNIFE COLLISIONS (Slices enemies & deflects bullets)
    if (player.knives > 0) {
      for (let k = 0; k < player.knives; k++) {
        const angle = player.knifeAngle + (k * (Math.PI * 2 / player.knives));
        const kx = player.x + Math.cos(angle) * 45;
        const ky = player.y + Math.sin(angle) * 45;

        // Deflect enemy bullets
        for (let j = enemyBullets.length - 1; j >= 0; j--) {
          let eb = enemyBullets[j];
          if (Math.hypot(kx - eb.x, ky - eb.y) < 16) {
            enemyBullets.splice(j, 1);
            playSound('hit');
          }
        }

        // Damage regular drones
        for (let i = enemies.length - 1; i >= 0; i--) {
          let e = enemies[i];
          if (Math.hypot(kx - e.x, ky - e.y) < 20) {
            e.hp -= 2;
            playSound('hit');
            if (e.hp <= 0) {
              createExplosion(e.x, e.y);
              score += e.scoreVal;
              enemies.splice(i, 1);
            }
          }
        }

        // Damage Boss
        if (activeBoss && Math.hypot(kx - activeBoss.x, ky - activeBoss.y) < 40) {
          activeBoss.hp -= 1;
          updateBossHpBar();
          if (activeBoss.hp <= 0) defeatBoss();
        }
      }
    }

    // UPDATE DRONES
    const formationOffset = Math.sin(nowTime / 800) * 40;
    for (let i = enemies.length - 1; i >= 0; i--) {
      let e = enemies[i];
      e.animFrame += 0.05;
      e.x = e.originX + formationOffset;

      // Sniper enemy skill charging
      if (e.type === 'sniper') {
        e.sniperCharge = (e.sniperCharge + 1) % 120;
        if (e.sniperCharge === 119) {
          enemyBullets.push({ x: e.x, y: e.y + 12, vx: 0, vy: 7 });
        }
      } else if (Math.random() < 0.003 + wave * 0.0005) {
        enemyBullets.push({ x: e.x, y: e.y + 10, vx: (Math.random() - 0.5) * 1.5, vy: 4 + Math.random() * 2 });
      }

      // Check Player Bullet collision with Drones
      for (let j = playerBullets.length - 1; j >= 0; j--) {
        let b = playerBullets[j];
        if (Math.abs(b.x - e.x) < e.width / 2 + 2 && Math.abs(b.y - e.y) < e.height / 2 + 2) {
          playerBullets.splice(j, 1);
          e.hp--;
          playSound('hit');

          if (e.hp <= 0) {
            createExplosion(e.x, e.y);
            score += e.scoreVal;
            updateHUDScore();

            if (Math.random() < 0.35) spawnCoin(e.x, e.y);
            if (Math.random() < 0.08) spawnPowerup(e.x, e.y);

            // Splitter Drone Skill
            if (e.type === 'splitter') {
              enemies.push({
                x: e.x - 12, y: e.y, originX: e.x - 12, originY: e.y,
                width: 20, height: 18, type: 'striker', hp: 1, maxHp: 1, scoreVal: 75, animFrame: 0
              });
              enemies.push({
                x: e.x + 12, y: e.y, originX: e.x + 12, originY: e.y,
                width: 20, height: 18, type: 'striker', hp: 1, maxHp: 1, scoreVal: 75, animFrame: 0
              });
            }

            enemies.splice(i, 1);
            break;
          }
        }
      }
    }

    // CHECK DRONES CLEARED -> SPAWN BOSS
    if (waveStage === 'DRONES' && enemies.length === 0 && !activeBoss) {
      spawnBoss(wave);
    }

    // UPDATE BOSS FIGHT
    if (activeBoss) {
      if (activeBoss.y < activeBoss.targetY) {
        activeBoss.y += 1.5;
      } else {
        activeBoss.x += Math.sin(nowTime / 600) * 2.5;
      }

      activeBoss.attackTimer++;
      if (activeBoss.attackTimer % 90 === 0) {
        // Radial Burst Attack
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          enemyBullets.push({
            x: activeBoss.x, y: activeBoss.y + 20,
            vx: Math.cos(a) * 3, vy: Math.sin(a) * 3
          });
        }
      }

      // Player Bullets vs Boss
      for (let j = playerBullets.length - 1; j >= 0; j--) {
        let b = playerBullets[j];
        if (Math.abs(b.x - activeBoss.x) < activeBoss.width / 2 && Math.abs(b.y - activeBoss.y) < activeBoss.height / 2) {
          playerBullets.splice(j, 1);
          activeBoss.hp--;
          playSound('hit');
          updateBossHpBar();

          if (activeBoss.hp <= 0) {
            defeatBoss();
            break;
          }
        }
      }
    }

    // Update Shockwaves
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      let sw = shockwaves[i];
      sw.radius += 18;
      if (sw.radius > sw.maxRadius) shockwaves.splice(i, 1);
    }

    // Update Coins
    for (let i = coins.length - 1; i >= 0; i--) {
      let c = coins[i];
      c.y += c.vy;
      c.rotation += 0.1;
      if (Math.hypot(c.x - player.x, c.y - player.y) < 20) {
        playSound('coin');
        score += 250;
        coinsEarned += 100;
        updateHUDScore();
        coins.splice(i, 1);
        continue;
      }
      if (c.y > CANVAS_HEIGHT + 20) coins.splice(i, 1);
    }

    // Update Powerups
    for (let i = powerups.length - 1; i >= 0; i--) {
      let p = powerups[i];
      p.y += p.vy;
      if (Math.hypot(p.x - player.x, p.y - player.y) < 20) {
        playSound('powerup');
        if (p.type === 'WEAPON') player.weaponLevel = Math.min(3, player.weaponLevel + 1);
        else if (p.type === 'SHIELD') player.shieldHp += 50;
        else if (p.type === 'LIFE') { lives++; updateHUDLives(); }
        powerups.splice(i, 1);
        continue;
      }
      if (p.y > CANVAS_HEIGHT + 20) powerups.splice(i, 1);
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      let pt = particles[i];
      pt.x += pt.vx; pt.y += pt.vy;
      pt.life -= pt.decay;
      if (pt.life <= 0) particles.splice(i, 1);
    }
  }

  function defeatBoss() {
    createExplosion(activeBoss.x, activeBoss.y, activeBoss.color);
    score += activeBoss.scoreVal;
    coinsEarned += 500;
    activeBoss = null;
    document.getElementById('boss-hp-container').classList.add('hidden');

    if (wave >= 8) {
      // VICTORY! ALL 8 WAVES CLEARED!
      triggerVictory();
    } else {
      // OPEN BETWEEN-WAVE SHOP!
      openShopModal();
    }
  }

  function openShopModal() {
    currentState = STATE_SHOP;
    playSound('powerup');
    const data = WAVES_DATA[wave - 1];
    document.getElementById('shop-wave-title').innerText = `${data.name} CLEARED!`;
    document.getElementById('shop-coins-val').innerText = `$${coinsEarned}`;
    showModal('modal-shop');
  }

  function damagePlayer() {
    if (player.invulnTime > 0) return;

    if (player.shieldHp > 0) {
      player.shieldHp -= 50;
      player.invulnTime = 800;
      playSound('hit');
      return;
    }

    lives--;
    updateHUDLives();
    createExplosion(player.x, player.y, '#ff0055');
    player.invulnTime = 1500;

    if (lives <= 0) triggerGameOver();
  }

  function updateHUDScore() {
    const elem = document.getElementById('hud-score-val');
    if (elem) elem.innerText = score.toString().padStart(10, '0');
  }

  function updateHUDLives() {
    const container = document.getElementById('hud-lives-container');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < lives; i++) {
      const icon = document.createElement('span');
      icon.className = 'life-icon';
      container.appendChild(icon);
    }
  }

  function triggerVictory() {
    currentState = STATE_VICTORY;
    playSound('powerup');
    document.getElementById('victory-score-val').innerText = score.toLocaleString();
    showModal('modal-victory');
  }

  function triggerGameOver() {
    currentState = STATE_GAMEOVER;
    playSound('gameover');

    qualifyRank = checkQualifiesTop10(score);

    if (qualifyRank !== -1) {
      showModal('modal-name-entry');
      setupInitialsInput();
    } else {
      document.getElementById('final-score-val').innerText = score.toLocaleString();
      document.getElementById('final-wave-val').innerText = wave;
      showModal('modal-gameover');
    }
  }

  // --- DRAW ROUTINES ---
  function draw() {
    ctx.fillStyle = '#040711';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    drawStars();

    if (currentState === STATE_PLAYING || currentState === STATE_PAUSED || currentState === STATE_SHOP || currentState === STATE_GAMEOVER || currentState === STATE_VICTORY || currentState === STATE_NAME_ENTRY) {
      // Draw Shockwaves
      for (let sw of shockwaves) {
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw Coins
      for (let c of coins) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.scale(Math.cos(c.rotation), 1);
        ctx.fillStyle = '#ffea00';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        ctx.restore();
      }

      // Draw Powerups
      for (let p of powerups) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = p.type === 'WEAPON' ? '#00f3ff' : (p.type === 'SHIELD' ? '#b026ff' : '#00ff66');
        ctx.fillRect(-7, -7, 14, 14);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(-7, -7, 14, 14);
        ctx.restore();
      }

      // Draw Player Bullets
      ctx.fillStyle = '#00f3ff';
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 8;
      for (let b of playerBullets) {
        ctx.fillRect(b.x - b.width / 2, b.y, b.width, b.height);
      }
      ctx.shadowBlur = 0;

      // Draw Enemy Bullets
      ctx.fillStyle = '#ff0055';
      for (let eb of enemyBullets) {
        ctx.fillRect(eb.x - 2, eb.y - 4, 4, 8);
      }

      // Draw Drones
      for (let e of enemies) {
        drawUFO(e);
      }

      // Draw Boss
      if (activeBoss) {
        drawBoss(activeBoss);
      }

      // Draw Particles
      for (let pt of particles) {
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.life;
        ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
      }
      ctx.globalAlpha = 1.0;

      // Draw Player
      if (lives > 0) {
        drawPlayer(player);
      }
    }
  }

  // --- UI MODAL MANAGERS ---
  function hideAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  }

  function showModal(modalId) {
    hideAllModals();
    const target = document.getElementById(modalId);
    if (target) target.classList.remove('hidden');
  }

  function setupInitialsInput() {
    playerInitials = ['A', 'A', 'A'];
    activeCharIdx = 0;
    updateInitialsDisplay();
    document.getElementById('qualify-rank-val').innerText = `#${qualifyRank}`;
    document.getElementById('entry-score-val').innerText = score.toLocaleString();
  }

  function updateInitialsDisplay() {
    for (let i = 0; i < 3; i++) {
      const box = document.getElementById(`initial-box-${i}`);
      if (box) {
        box.innerText = playerInitials[i];
        if (i === activeCharIdx) box.classList.add('active');
        else box.classList.remove('active');
      }
    }
  }

  function handleInitialsNav(dir) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let curr = playerInitials[activeCharIdx];
    let idx = chars.indexOf(curr);
    if (dir === 'UP') idx = (idx + 1) % chars.length;
    else if (dir === 'DOWN') idx = (idx - 1 + chars.length) % chars.length;
    playerInitials[activeCharIdx] = chars[idx];
    updateInitialsDisplay();
    playSound('coin');
  }

  function confirmInitials() {
    const nameStr = playerInitials.join('');
    submitHighScore(nameStr, score, wave);
    showModal('modal-leaderboard');
    currentState = STATE_LEADERBOARD;
  }

  // --- EVENT LISTENERS ---
  function bindEvents() {
    window.addEventListener('keydown', e => {
      initAudio();
      keys[e.code] = true;

      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (currentState === STATE_PLAYING || currentState === STATE_PAUSED) {
          if (currentState === STATE_PLAYING) {
            currentState = STATE_PAUSED;
            showModal('modal-pause');
          } else {
            currentState = STATE_PLAYING;
            hideAllModals();
          }
        }
      }

      if (currentState === STATE_NAME_ENTRY) {
        if (e.code === 'ArrowUp' || e.code === 'KeyW') handleInitialsNav('UP');
        if (e.code === 'ArrowDown' || e.code === 'KeyS') handleInitialsNav('DOWN');
        if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          activeCharIdx = Math.min(2, activeCharIdx + 1);
          updateInitialsDisplay();
        }
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          activeCharIdx = Math.max(0, activeCharIdx - 1);
          updateInitialsDisplay();
        }
        if (e.code === 'Enter' || e.code === 'Space') {
          if (activeCharIdx < 2) {
            activeCharIdx++;
            updateInitialsDisplay();
          } else {
            confirmInitials();
          }
        }
      }
    });

    window.addEventListener('keyup', e => { keys[e.code] = false; });

    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      mousePos.x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
      mousePos.y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
    });

    canvas.addEventListener('mousedown', () => { initAudio(); isMouseDown = true; });
    window.addEventListener('mouseup', () => { isMouseDown = false; });

    // Buttons
    document.getElementById('btn-start-game').addEventListener('click', startGame);
    document.getElementById('btn-view-leaderboard').addEventListener('click', () => {
      showModal('modal-leaderboard');
      currentState = STATE_LEADERBOARD;
    });
    document.getElementById('btn-back-title').addEventListener('click', () => {
      showModal('modal-title');
      currentState = STATE_TITLE;
    });
    document.getElementById('btn-restart-game').addEventListener('click', startGame);
    document.getElementById('btn-submit-initials').addEventListener('click', confirmInitials);
    
    // Pause Buttons
    document.getElementById('btn-hud-pause').addEventListener('click', () => {
      if (currentState === STATE_PLAYING) { currentState = STATE_PAUSED; showModal('modal-pause'); }
      else if (currentState === STATE_PAUSED) { currentState = STATE_PLAYING; hideAllModals(); }
    });
    document.getElementById('btn-resume-game').addEventListener('click', () => {
      currentState = STATE_PLAYING; hideAllModals();
    });
    document.getElementById('btn-quit-game').addEventListener('click', () => {
      showModal('modal-title'); currentState = STATE_TITLE;
    });

    // BOOM Bomb Skill HUD Button
    document.getElementById('btn-boom-skill').addEventListener('click', triggerBoomBomb);

    // SHOP PURCHASING BUTTONS
    document.getElementById('buy-armor-btn').addEventListener('click', () => {
      if (coinsEarned >= 500) {
        coinsEarned -= 500;
        player.shieldHp += 50;
        playSound('powerup');
        document.getElementById('shop-coins-val').innerText = `$${coinsEarned}`;
      }
    });
    document.getElementById('buy-life-btn').addEventListener('click', () => {
      if (coinsEarned >= 800) {
        coinsEarned -= 800;
        lives++;
        updateHUDLives();
        playSound('powerup');
        document.getElementById('shop-coins-val').innerText = `$${coinsEarned}`;
      }
    });
    document.getElementById('buy-knife-btn').addEventListener('click', () => {
      if (coinsEarned >= 1000) {
        coinsEarned -= 1000;
        player.knives++;
        playSound('powerup');
        document.getElementById('shop-coins-val').innerText = `$${coinsEarned}`;
      }
    });
    document.getElementById('buy-weapon-btn').addEventListener('click', () => {
      if (coinsEarned >= 600) {
        coinsEarned -= 600;
        player.weaponLevel = Math.min(3, player.weaponLevel + 1);
        player.fireRate = Math.max(80, player.fireRate - 15);
        playSound('powerup');
        document.getElementById('shop-coins-val').innerText = `$${coinsEarned}`;
      }
    });

    // Start Next Wave Button
    document.getElementById('btn-next-wave').addEventListener('click', () => {
      wave++;
      hideAllModals();
      spawnDronesForWave(wave);
      const waveElem = document.getElementById('hud-wave');
      if (waveElem) waveElem.innerText = `WAVE ${wave}: ${WAVES_DATA[wave - 1].name}`;
      currentState = STATE_PLAYING;
    });

    // Victory Continue Button
    document.getElementById('btn-victory-continue').addEventListener('click', () => {
      qualifyRank = checkQualifiesTop10(score);
      if (qualifyRank !== -1) {
        showModal('modal-name-entry');
        setupInitialsInput();
      } else {
        showModal('modal-title');
        currentState = STATE_TITLE;
      }
    });
  }

  function startGame() {
    initAudio();
    hideAllModals();
    score = 0;
    coinsEarned = 300; // Starting bonus coins
    lives = 3;
    wave = 1;
    lastBombTime = -10000;
    player = createPlayer();
    playerBullets = [];
    enemyBullets = [];
    shockwaves = [];
    particles = [];
    coins = [];
    powerups = [];

    spawnDronesForWave(wave);
    updateHUDScore();
    updateHUDLives();

    const waveElem = document.getElementById('hud-wave');
    if (waveElem) waveElem.innerText = `WAVE 1: ${WAVES_DATA[0].name}`;

    currentState = STATE_PLAYING;
  }

  // --- INIT ENTRY POINT ---
  window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    initStars();
    bindEvents();
    loadDatasheet();

    showModal('modal-title');
    currentState = STATE_TITLE;

    requestAnimationFrame(gameLoop);
  });
})();
