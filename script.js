const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const W = canvas.width,
  H = canvas.height;
const CX = W / 2,
  CY = H / 2;
const DOME_R = 230;
const FPS = 60;

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
let nukeCooldown = 0,
  nukeCheckTimer = 0;
let combo = 0,
  comboTimer = 0;
let popups = [];
const POWERUP_DURATION = 5 * FPS;
const NUKE_COOLDOWN = 30 * FPS;
const COMBO_WINDOW = Math.round(1.3 * FPS);
const COMBO_CAP = 6;

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
    combo > 1 ? "x" + Math.min(combo, COMBO_CAP) : "—";

  const shieldBadge = document.getElementById("shield-badge");
  const beamBadge = document.getElementById("beam-badge");
  const shieldTimer = document.getElementById("shield-timer");
  const beamTimer = document.getElementById("beam-timer");

  if (shieldActive) {
    shieldBadge.classList.remove("inactive");
    shieldTimer.textContent = Math.ceil(shieldTicks / FPS) + "s";
  } else {
    shieldBadge.classList.add("inactive");
    shieldTimer.textContent = "";
  }
  if (beamActive) {
    beamBadge.classList.remove("inactive");
    beamTimer.textContent = Math.ceil(beamTicks / FPS) + "s";
  } else {
    beamBadge.classList.add("inactive");
    beamTimer.textContent = "";
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
    dist: DOME_R - 8,
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
    dist: DOME_R - 8,
    speed: 0.35,
    radius: 16,
    kind,
    wobble: Math.random() * Math.PI * 2,
    bob: Math.random() * Math.PI * 2,
    flash: 0,
  });
}

function polarToXY(angle, dist) {
  return {
    x: CX + Math.cos(angle) * dist,
    y: CY + Math.sin(angle) * dist,
  };
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
    x: CX,
    y: CY,
    tx,
    ty,
    life: 1,
    col: col || "#FAC775",
  });
}

function activateShield() {
  shieldActive = true;
  shieldTicks = POWERUP_DURATION;
  //shieldTicks = 60 * 180;
  showMsg("Shield active — 5 seconds!");
}

function activateBeam() {
  beamActive = true;
  beamTicks = POWERUP_DURATION;
  showMsg("Power beam active — 5 seconds!");
}

function detonateNuke() {
  // Big blast radiating outward from the apex
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const sp = 4 + Math.random() * 5;
    particles.push({
      x: CX,
      y: CY,
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
    const pos = polarToXY(c.angle, c.dist);
    spawnParticles(pos.x, pos.y, c.color, 8);
    gained += 10 * wave;
    waveKills++;
  }
  score += gained;
  if (gained > 0) spawnPopup(CX, CY - 44, "+" + gained, "#E24B4A", true);
  critters = [];
  // Advance waves as the kill count crosses each target
  while (waveKills >= waveTarget) {
    waveKills -= waveTarget;
    wave++;
    waveTarget = Math.round(waveTarget * 1.3);
    spawnInterval = Math.max(40, spawnInterval - 10);
  }
  nukeCooldown = NUKE_COOLDOWN;
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

function drawDome() {
  [0.25, 0.5, 0.75, 1.0].forEach((r) => {
    ctx.beginPath();
    ctx.arc(CX, CY, DOME_R * r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(28,39,51,0.15)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.lineTo(CX + Math.cos(a) * DOME_R, CY + Math.sin(a) * DOME_R);
    ctx.strokeStyle = "rgba(28,39,51,0.1)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(CX, CY, DOME_R, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(28,39,51,0.4)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.save();
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillStyle = "rgba(28,39,51,0.35)";
  ctx.textAlign = "center";
  ctx.fillText("RIM — spawn zone", CX, CY - DOME_R + 14);
  ctx.restore();
}

function drawApex() {
  // Shield ring
  if (shieldActive) {
    const pulse = 0.9 + 0.1 * Math.sin(Date.now() / 200);
    ctx.beginPath();
    ctx.arc(CX, CY, 40 * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(55,138,221,${0.5 + 0.3 * pulse})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(CX, CY, 46 * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(55,138,221,0.2)`;
    ctx.lineWidth = 6;
    ctx.stroke();
  }

  const pulse = 0.85 + 0.15 * Math.sin(Date.now() / 400);
  ctx.beginPath();
  ctx.arc(CX, CY, 22 * pulse, 0, Math.PI * 2);
  ctx.fillStyle = lives > 2 ? "#1D9E75" : "#E24B4A";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(CX, CY, 11 * pulse, 0, Math.PI * 2);
  ctx.fillStyle = lives > 2 ? "#5DCAA5" : "#F09595";
  ctx.fill();

  // Beam aura on apex
  if (beamActive) {
    const p2 = 0.8 + 0.2 * Math.sin(Date.now() / 100);
    ctx.beginPath();
    ctx.arc(CX, CY, 26 * p2, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(239,159,39,${0.6 + 0.3 * p2})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  ctx.save();
  ctx.font = "10px system-ui, sans-serif";
  ctx.fillStyle = "rgba(28,39,51,0.5)";
  ctx.textAlign = "center";
  ctx.fillText("APEX", CX, CY + 36);
  ctx.restore();
}

function drawCritter(c) {
  const pos = polarToXY(c.angle, c.dist);
  c.wobble += 0.08;
  const wob = Math.sin(c.wobble) * 2;

  ctx.save();
  ctx.translate(pos.x + wob, pos.y);

  for (let i = 0; i < 6; i++) {
    const la = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(la) * c.radius * 0.7, Math.sin(la) * c.radius * 0.7);
    ctx.lineTo(Math.cos(la) * (c.radius + 7), Math.sin(la) * (c.radius + 7));
    ctx.strokeStyle = c.flash > 0 ? "#ffffff" : c.color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
  ctx.fillStyle = c.flash > 0 ? "#ffffff" : c.color;
  ctx.fill();

  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath();
  ctx.arc(-4, -3, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(4, -3, 3, 0, Math.PI * 2);
  ctx.fill();

  if (c.maxHp > 1) {
    const bw = c.radius * 2.2;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(-bw / 2, -c.radius - 9, bw, 4);
    ctx.fillStyle = "#5DCAA5";
    ctx.fillRect(-bw / 2, -c.radius - 9, bw * (c.hp / c.maxHp), 4);
  }
  ctx.restore();
  if (c.flash > 0) c.flash--;
}

function drawPickup(p) {
  const pos = polarToXY(p.angle, p.dist);
  p.wobble += 0.06;
  p.bob += 0.07;
  const bob = Math.sin(p.bob) * 3;
  const col =
    p.kind === "shield" ? "#378ADD" : p.kind === "beam" ? "#EF9F27" : "#E24B4A";
  const colLight =
    p.kind === "shield" ? "#85B7EB" : p.kind === "beam" ? "#FAC775" : "#F09595";
  const icon = p.kind === "shield" ? "🛡" : p.kind === "beam" ? "⚡" : "☢";
  const label =
    p.kind === "shield" ? "SHIELD" : p.kind === "beam" ? "BEAM" : "NUKE";

  ctx.save();
  ctx.translate(pos.x, pos.y + bob);

  // Outer glow ring
  ctx.beginPath();
  ctx.arc(0, 0, p.radius + 6, 0, Math.PI * 2);
  ctx.strokeStyle = col + "55";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Body
  ctx.beginPath();
  ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
  ctx.fillStyle = p.flash > 0 ? "#ffffff" : col;
  ctx.fill();

  // Icon text
  ctx.font = "bold 14px system-ui, sans-serif";
  ctx.fillStyle = "#111";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(icon, 0, 1);

  // Label below
  ctx.font = "9px system-ui, sans-serif";
  ctx.fillStyle = colLight;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(label, 0, p.radius + 18);

  ctx.restore();
  if (p.flash > 0) p.flash--;
}

function drawParticles() {
  particles.forEach((p) => {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
    ctx.fillStyle = p.col;
    ctx.fill();
    ctx.restore();
  });
}

function drawPopups() {
  popups.forEach((p) => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
    ctx.fillStyle = p.col;
    ctx.font = `bold ${p.big ? 20 : 14}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(p.text, p.x, p.y);
    ctx.restore();
  });
}

function drawShots() {
  turretShots.forEach((s) => {
    ctx.save();
    ctx.globalAlpha = s.life;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.tx, s.ty);
    ctx.strokeStyle = s.col;
    ctx.lineWidth = beamActive ? 4 : 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(s.tx, s.ty, 4 * s.life, 0, Math.PI * 2);
    ctx.fillStyle = s.col;
    ctx.fill();
    ctx.restore();
  });
}

function drawOverlay(text) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.beginPath();
  ctx.roundRect(CX - 140, CY - 36, 280, 72, 10);
  ctx.fill();
  ctx.fillStyle = "#1c2733";
  ctx.font = "500 17px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, CX, CY + 7);
  ctx.restore();
}

function tick() {
  ctx.clearRect(0, 0, W, H);
  drawDome();
  drawApex();

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
        const kind = Math.random() < 0.5 ? "shield" : "beam";
        spawnPickup(kind);
      }
    }

    // Nuke pickup: emergency relief when the dome is swarmed (>8 critters).
    // 1/5 chance to appear, checked once a second, and blocked for 30s
    // after a nuke is used.
    if (nukeCooldown > 0) nukeCooldown--;
    nukeCheckTimer++;
    if (nukeCheckTimer >= FPS) {
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

    // Update pickups
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      p.dist -= p.speed;
      if (p.dist <= 22) {
        pickups.splice(i, 1);
        continue;
      }
      drawPickup(p);
    }

    // Update critters
    for (let i = critters.length - 1; i >= 0; i--) {
      const c = critters[i];
      c.dist -= c.speed;
      // Red critters make one random swerve (up to 180deg) near the halfway
      // mark, easing smoothly toward the new heading.
      const halfway = (DOME_R - 8 + 22) / 2;
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
            CX + Math.cos(c.angle) * 22,
            CY + Math.sin(c.angle) * 22,
            "#378ADD",
            6,
          );
          critters.splice(i, 1);
        } else {
          const pos = polarToXY(c.angle, c.dist);
          spawnParticles(pos.x, pos.y, c.color);
          critters.splice(i, 1);
          lives--;
          updateHUD();
          if (lives <= 0) {
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
            drawShots();
            drawParticles();
            drawPopups();
            drawOverlay(
              (isBest ? "New best — " : "Game over — ") + "score: " + score,
            );
            return;
          }
        }
        continue;
      }
      drawCritter(c);
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

  drawShots();
  drawParticles();
  drawPopups();

  if (state === "idle") drawOverlay("Press Start to play");
  if (state === "over") drawOverlay("Game over — score: " + score);

  raf = requestAnimationFrame(tick);
}

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (W / rect.width);
  const my = (e.clientY - rect.top) * (H / rect.height);

  // While the banner is showing, clicking it starts the game.
  if (state !== "playing") {
    if (mx >= CX - 140 && mx <= CX + 140 && my >= CY - 36 && my <= CY + 36) {
      startGame();
    }
    return;
  }

  const dx = mx - CX,
    dy = my - CY;
  if (Math.sqrt(dx * dx + dy * dy) > DOME_R) return;

  // Check pickups first
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    const pos = polarToXY(p.angle, p.dist);
    if (Math.hypot(mx - pos.x, my - pos.y) < p.radius + 12) {
      const burstCol =
        p.kind === "shield"
          ? "#378ADD"
          : p.kind === "beam"
            ? "#EF9F27"
            : "#E24B4A";
      const shotCol =
        p.kind === "shield"
          ? "#85B7EB"
          : p.kind === "beam"
            ? "#FAC775"
            : "#F09595";
      spawnParticles(pos.x, pos.y, burstCol, 14);
      fireTurret(pos.x, pos.y, shotCol);
      pickups.splice(i, 1);
      if (p.kind === "shield") activateShield();
      else if (p.kind === "beam") activateBeam();
      else detonateNuke();
      return;
    }
  }

  // Hit critters
  let hit = false;
  for (let i = critters.length - 1; i >= 0; i--) {
    const c = critters[i];
    const pos = polarToXY(c.angle, c.dist);
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
        spawnParticles(pos.x, pos.y, c.color, beamActive ? 16 : 10);
        critters.splice(i, 1);

        // Combo: chaining kills within the window ramps the multiplier
        combo++;
        comboTimer = COMBO_WINDOW;
        const mult = Math.min(combo, COMBO_CAP);
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
canvas.addEventListener("mousemove", (e) => {
  if (state === "playing") {
    canvas.style.cursor = "crosshair";
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (W / rect.width);
  const my = (e.clientY - rect.top) * (H / rect.height);
  const overBanner =
    mx >= CX - 140 && mx <= CX + 140 && my >= CY - 36 && my <= CY + 36;
  canvas.style.cursor = overBanner ? "pointer" : "default";
});

function startGame() {
  resetGame();
  state = "playing";
  document.getElementById("msg").textContent =
    "Tap critters before they reach the apex!";
  document.getElementById("start-btn").textContent = "Restart";
  cancelAnimationFrame(raf);
  tick();
}

document.getElementById("start-btn").addEventListener("click", startGame);

updateHUD();
tick();
