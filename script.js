import * as configs from "./config.js";
import * as utils from "./utils.js";
import * as render from "./render.js";
import * as sound from "./sound.js";

const ctx = configs.ctx;

let state = "idle";
let score = 0,
  lives = 5,
  wave = 1;
let critters = [],
  particles = [],
  turretShots = [],
  pickups = [];
let spawnTimer = 0,
  spawnInterval = 110;
let waveKills = 0,
  waveTarget = 8;
let pickupTimer = 0,
  pickupInterval = 600;

let shieldActive = false,
  shieldTicks = 0;
let beamActive = false,
  beamTicks = 0;
let freezeActive = false,
  freezeTicks = 0;
let nukeCooldown = 0,
  nukeCheckTimer = 0;
let combo = 0,
  comboTimer = 0;
let popups = [];

let bestScore = 0;
try {
  bestScore = Number(localStorage.getItem("domeBest")) || 0;
} catch (e) {}

let raf;

function updateHUD() {
  document.getElementById("score-val").textContent = score;
  document.getElementById("lives-val").textContent = lives;
  document.getElementById("wave-val").textContent = wave;
  const pct = Math.min(100, Math.round((waveKills / waveTarget) * 100));
  document.getElementById("wave-fill").style.width = pct + "%";

  document.getElementById("best-val").textContent = Math.max(bestScore, score);
  document.getElementById("combo-val").textContent =
    combo > 1 ? "x" + Math.min(combo, configs.COMBO_CAP) : "—";

  const shieldBadge = document.getElementById("shield-badge");
  const beamBadge = document.getElementById("beam-badge");
  const freezeBadge = document.getElementById("freeze-badge");
  const shieldTimer = document.getElementById("shield-timer");
  const beamTimer = document.getElementById("beam-timer");
  const freezeTimer = document.getElementById("freeze-timer");

  if (shieldActive) {
    shieldBadge.classList.remove("inactive");
    shieldTimer.textContent = Math.ceil(shieldTicks / configs.FPS) + "s";
  } else {
    shieldBadge.classList.add("inactive");
    shieldTimer.textContent = "";
  }
  if (beamActive) {
    beamBadge.classList.remove("inactive");
    beamTimer.textContent = Math.ceil(beamTicks / configs.FPS) + "s";
  } else {
    beamBadge.classList.add("inactive");
    beamTimer.textContent = "";
  }
  if (freezeActive) {
    freezeBadge.classList.remove("inactive");
    freezeTimer.textContent = Math.ceil(freezeTicks / configs.FPS) + "s";
  } else {
    freezeBadge.classList.add("inactive");
    freezeTimer.textContent = "";
  }
}

function resetGame() {
  score = 0;
  lives = 5;
  wave = 1;
  critters = [];
  particles = [];
  turretShots = [];
  pickups = [];
  spawnTimer = 0;
  spawnInterval = 110;
  waveKills = 0;
  waveTarget = 8;
  pickupTimer = 0;
  shieldActive = false;
  shieldTicks = 0;
  beamActive = false;
  beamTicks = 0;
  freezeActive = false;
  freezeTicks = 0;
  nukeCooldown = 0;
  nukeCheckTimer = 0;
  combo = 0;
  comboTimer = 0;
  popups = [];
  updateHUD();
}

function spawnCritter() {
  const angle = Math.random() * Math.PI * 2;
  const speed = 0.4 + wave * 0.08 + Math.random() * 0.2;
  critters.push({
    angle,
    dist: configs.DOME_R - 8,
    speed,
    radius: 14 + Math.floor(Math.random() * 8),
    hp: 1 + Math.floor(wave / 3),
    maxHp: 1 + Math.floor(wave / 3),
    color: ["#D85A30", "#D4537E", "#7F77DD", "#BA7517"][
      Math.floor(Math.random() * 4)
    ],
    flash: 0,
    wobble: Math.random() * Math.PI * 2,
    turned: false,
    type: "critter",
  });
}

function spawnPickup(kind) {
  const angle = Math.random() * Math.PI * 2;
  pickups.push({
    angle,
    dist: configs.DOME_R - 8,
    speed: 0.35,
    radius: 16,
    kind,
    wobble: Math.random() * Math.PI * 2,
    bob: Math.random() * Math.PI * 2,
    flash: 0,
  });
}

function spawnPopup(x, y, text, col, big) {
  popups.push({ x, y, text, col: col || "#1c2733", life: 1, big: !!big });
}

function spawnParticles(x, y, col, count = 10) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.5 + Math.random() * 3;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 1,
      col,
    });
  }
}

function fireTurret(tx, ty, col) {
  turretShots.push({
    x: configs.CX,
    y: configs.CY,
    tx,
    ty,
    life: 1,
    col: col || "#FAC775",
  });
}

function activateShield() {
  shieldActive = true;
  shieldTicks = configs.POWERUP_DURATION;
  //shieldTicks = 60 * 180;
  showMsg("Shield active — 5 seconds!");
}

function activateBeam() {
  beamActive = true;
  beamTicks = configs.POWERUP_DURATION;
  showMsg("Power beam active — 5 seconds!");
}

function activateFreeze() {
  freezeActive = true;
  freezeTicks = configs.FREEZE_DURATION;
  showMsg("Deep freeze — enemies slowed for 10 seconds!");
}

function detonateNuke() {
  // Big blast radiating outward from the apex
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const sp = 4 + Math.random() * 5;
    particles.push({
      x: configs.CX,
      y: configs.CY,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 1,
      col: i % 2 ? "#FFD36B" : "#E24B4A",
    });
  }
  // Wipe every critter currently on screen
  let gained = 0;
  for (let i = critters.length - 1; i >= 0; i--) {
    const c = critters[i];
    const pos = utils.polarToXY(c.angle, c.dist);
    spawnParticles(pos.x, pos.y, c.color, 8);
    gained += 10 * wave;
    waveKills++;
  }
  score += gained;
  if (gained > 0)
    spawnPopup(configs.CX, configs.CY - 44, "+" + gained, "#E24B4A", true);
  critters = [];
  // Advance waves as the kill count crosses each target
  while (waveKills >= waveTarget) {
    waveKills -= waveTarget;
    wave++;
    waveTarget = Math.round(waveTarget * 1.3);
    spawnInterval = Math.max(40, spawnInterval - 10);
  }
  nukeCooldown = configs.NUKE_COOLDOWN;
  showMsg("NUKE! The dome is cleared.");
  updateHUD();
}

function showMsg(text, duration = 2000) {
  const el = document.getElementById("msg");
  el.textContent = text;
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    if (state === "playing")
      el.textContent = "Tap critters before they reach the apex!";
  }, duration);
}

function tick() {
  ctx.clearRect(0, 0, configs.W, configs.H);
  render.drawDome();
  render.drawApex(shieldActive, beamActive, lives);

  if (state === "playing") {
    // Critter spawning (30% slower after wave 4)
    spawnTimer++;
    const effInterval = wave > 4 ? spawnInterval / 0.7 : spawnInterval;
    if (spawnTimer >= effInterval) {
      spawnTimer = 0;
      spawnCritter();
      if (wave > 2 && Math.random() < 0.4) spawnCritter();
    }

    // Pickup spawning (wave 3+)
    if (wave >= 3) {
      pickupTimer++;
      if (pickupTimer >= pickupInterval) {
        pickupTimer = 0;
        // Freeze can appear after wave 5 (but not while one is already
        // active), otherwise pick shield/beam.
        let kind;
        if (wave > 5 && !freezeActive && Math.random() < 0.35) kind = "freeze";
        else kind = Math.random() < 0.5 ? "shield" : "beam";
        spawnPickup(kind);
      }
    }

    // Nuke pickup: emergency relief when the dome is swarmed (>8 critters).
    // 1/5 chance to appear, checked once a second, and blocked for 30s
    // after a nuke is used.
    if (nukeCooldown > 0) nukeCooldown--;
    nukeCheckTimer++;
    if (nukeCheckTimer >= configs.FPS) {
      nukeCheckTimer = 0;
      const nukeOnScreen = pickups.some((p) => p.kind === "nuke");
      if (
        critters.length > 4 &&
        nukeCooldown <= 0 &&
        !nukeOnScreen &&
        Math.random() < 0.5
      ) {
        spawnPickup("nuke");
      }
    }

    // Tick powerups
    if (shieldActive) {
      shieldTicks--;
      if (shieldTicks <= 0) {
        shieldActive = false;
        showMsg("Shield expired.");
      }
    }
    if (beamActive) {
      beamTicks--;
      if (beamTicks <= 0) {
        beamActive = false;
        showMsg("Power beam expired.");
      }
    }
    if (freezeActive) {
      freezeTicks--;
      if (freezeTicks <= 0) {
        freezeActive = false;
        showMsg("Enemies thawed out.");
      }
    }

    // Update pickups
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      p.dist -= p.speed;
      if (p.dist <= 22) {
        pickups.splice(i, 1);
        continue;
      }
      render.drawPickup(p);
    }

    // Update critters
    for (let i = critters.length - 1; i >= 0; i--) {
      const c = critters[i];
      c.dist -= c.speed * (freezeActive ? configs.FREEZE_SLOW : 1);
      // Red critters make one random swerve (up to 180deg) near the halfway
      // mark, easing smoothly toward the new heading.
      const halfway = (configs.DOME_R - 8 + 22) / 2;
      if (!c.turned && c.color === "#D85A30" && c.dist <= halfway) {
        c.targetAngle = c.angle + (Math.random() - 0.5) * 2 * Math.PI;
        c.turned = true;
      }
      if (c.targetAngle !== undefined) {
        const diff = c.targetAngle - c.angle;
        if (Math.abs(diff) > 0.005) c.angle += diff * 0.06;
        else c.angle = c.targetAngle;
      }
      if (c.dist <= 22) {
        if (shieldActive) {
          // Shield blocks the hit — bounce critter back
          spawnParticles(
            configs.CX + Math.cos(c.angle) * 22,
            configs.CY + Math.sin(c.angle) * 22,
            "#378ADD",
            6,
          );
          critters.splice(i, 1);
        } else {
          const pos = utils.polarToXY(c.angle, c.dist);
          spawnParticles(pos.x, pos.y, c.color);
          critters.splice(i, 1);
          lives--;
          sound.playDamage();
          updateHUD();
          if (lives <= 0) {
            sound.stopMusic();
            sound.playGameOver();
            const isBest = score > bestScore;
            if (isBest) {
              bestScore = score;
              try {
                localStorage.setItem("domeBest", String(bestScore));
              } catch (e) {}
            }
            updateHUD();
            state = "over";
            document.getElementById("msg").textContent =
              (isBest ? "New best! Final score: " : "Game over! Score: ") +
              score;
            document.getElementById("start-btn").textContent = "Play again";
            cancelAnimationFrame(raf);
            render.drawShots(turretShots);
            render.drawParticles(particles);
            render.drawPopups(popups);
            render.drawOverlay(
              (isBest ? "New best — " : "Game over — ") + "score: " + score,
            );
            return;
          }
        }
        continue;
      }
      render.drawCritter(c);
    }

    turretShots = turretShots.filter((s) => {
      s.life -= 0.07;
      return s.life > 0;
    });
    particles = particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.93;
      p.vy *= 0.93;
      p.life -= 0.035;
      return p.life > 0;
    });
    popups = popups.filter((p) => {
      p.y -= 0.7;
      p.life -= 0.02;
      return p.life > 0;
    });

    // Combo decays if you don't chain a kill in time
    if (comboTimer > 0) {
      comboTimer--;
      if (comboTimer === 0) combo = 0;
    }

    updateHUD();
  }

  render.drawShots(turretShots, beamActive);
  render.drawParticles(particles);
  render.drawPopups(popups);

  // Frost tint over the dome while enemies are frozen
  if (freezeActive) {
    const p = 0.5 + 0.15 * Math.sin(Date.now() / 300);
    ctx.save();
    ctx.beginPath();
    ctx.arc(configs.CX, configs.CY, configs.DOME_R, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(120, 210, 230, ${0.1 + 0.04 * p})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(47, 179, 204, ${0.4 + 0.25 * p})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  if (state === "idle") render.drawOverlay("Press Start to play");
  if (state === "over") render.drawOverlay("Game over — score: " + score);

  raf = requestAnimationFrame(tick);
}

configs.canvas.addEventListener("click", (e) => {
  const rect = configs.canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (configs.W / rect.width);
  const my = (e.clientY - rect.top) * (configs.H / rect.height);

  // While the banner is showing, clicking it starts the game.
  if (state !== "playing") {
    if (
      mx >= configs.CX - 140 &&
      mx <= configs.CX + 140 &&
      my >= configs.CY - 36 &&
      my <= configs.CY + 36
    ) {
      startGame();
    }
    return;
  }

  const dx = mx - configs.CX,
    dy = my - configs.CY;
  if (Math.sqrt(dx * dx + dy * dy) > configs.DOME_R) return;

  // Check pickups first
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    const pos = utils.polarToXY(p.angle, p.dist);
    if (Math.hypot(mx - pos.x, my - pos.y) < p.radius + 12) {
      const { col: burstCol, colLight: shotCol } = utils.pickupStyle(p.kind);
      spawnParticles(pos.x, pos.y, burstCol, 14);
      fireTurret(pos.x, pos.y, shotCol);
      pickups.splice(i, 1);
      sound.playPickup();
      if (p.kind === "shield") activateShield();
      else if (p.kind === "beam") activateBeam();
      else if (p.kind === "freeze") activateFreeze();
      else detonateNuke();
      return;
    }
  }

  // Hit critters
  let hit = false;
  for (let i = critters.length - 1; i >= 0; i--) {
    const c = critters[i];
    const pos = utils.polarToXY(c.angle, c.dist);
    if (Math.hypot(mx - pos.x, my - pos.y) < c.radius + 10) {
      const shotCol = beamActive ? "#EF9F27" : "#FAC775";
      fireTurret(pos.x, pos.y, shotCol);

      if (beamActive) {
        c.hp = 0;
      } else {
        c.hp--;
        c.flash = 5;
      }

      if (c.hp <= 0) {
        sound.playKill();
        spawnParticles(pos.x, pos.y, c.color, beamActive ? 16 : 10);
        critters.splice(i, 1);

        // Combo: chaining kills within the window ramps the multiplier
        combo++;
        comboTimer = configs.COMBO_WINDOW;
        const mult = Math.min(combo, configs.COMBO_CAP);
        const points = 10 * wave * mult;
        score += points;
        waveKills++;
        spawnPopup(
          pos.x,
          pos.y - c.radius - 8,
          "+" + points + (mult > 1 ? "  x" + mult : ""),
          mult > 1 ? "#E8912B" : "#1c2733",
          mult >= 4,
        );

        if (waveKills >= waveTarget) {
          wave++;
          waveKills = 0;
          waveTarget = Math.round(waveTarget * 1.3);
          spawnInterval = Math.max(40, spawnInterval - 10);
          if (wave === 3) showMsg("Wave 3 — power-ups now spawning!", 3000);
          else showMsg("Wave " + wave + " — incoming!");
        }
        updateHUD();
      }
      hit = true;
      break;
    }
  }

  if (!hit) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(mx, my, 14, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
});

// Show a pointer cursor over the start banner so it reads as pressable.
configs.canvas.addEventListener("mousemove", (e) => {
  if (state === "playing") {
    configs.canvas.style.cursor = "crosshair";
    return;
  }
  const rect = configs.canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (configs.W / rect.width);
  const my = (e.clientY - rect.top) * (configs.H / rect.height);
  const overBanner =
    mx >= configs.CX - 140 &&
    mx <= configs.CX + 140 &&
    my >= configs.CY - 36 &&
    my <= configs.CY + 36;
  configs.canvas.style.cursor = overBanner ? "pointer" : "default";
});

function startGame() {
  resetGame();
  state = "playing";
  sound.startMusic();
  document.getElementById("msg").textContent =
    "Tap critters before they reach the apex!";
  document.getElementById("start-btn").textContent = "Restart";
  cancelAnimationFrame(raf);
  tick();
}

document.getElementById("start-btn").addEventListener("click", startGame);

updateHUD();
tick();
