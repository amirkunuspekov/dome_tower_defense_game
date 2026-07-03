import * as configs from "./config.js";
import * as utils from "./utils.js";
const ctx = configs.ctx;

export function drawDome() {
  [0.25, 0.5, 0.75, 1.0].forEach((r) => {
    ctx.beginPath();
    ctx.arc(configs.CX, configs.CY, configs.DOME_R * r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(28,39,51,0.15)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(configs.CX, configs.CY);
    ctx.lineTo(
      configs.CX + Math.cos(a) * configs.DOME_R,
      configs.CY + Math.sin(a) * configs.DOME_R,
    );
    ctx.strokeStyle = "rgba(28,39,51,0.1)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(configs.CX, configs.CY, configs.DOME_R, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(28,39,51,0.4)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.save();
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillStyle = "rgba(28,39,51,0.35)";
  ctx.textAlign = "center";
  ctx.fillText(
    "RIM — spawn zone",
    configs.CX,
    configs.CY - configs.DOME_R + 14,
  );
  ctx.restore();
}

export function drawApex(shieldActive, beamActive, lives) {
  // Shield ring
  if (shieldActive) {
    const pulse = 0.9 + 0.1 * Math.sin(Date.now() / 200);
    ctx.beginPath();
    ctx.arc(configs.CX, configs.CY, 40 * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(55,138,221,${0.5 + 0.3 * pulse})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(configs.CX, configs.CY, 46 * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(55,138,221,0.2)`;
    ctx.lineWidth = 6;
    ctx.stroke();
  }

  const pulse = 0.85 + 0.15 * Math.sin(Date.now() / 400);
  ctx.beginPath();
  ctx.arc(configs.CX, configs.CY, 22 * pulse, 0, Math.PI * 2);
  ctx.fillStyle = lives > 2 ? "#1D9E75" : "#E24B4A";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(configs.CX, configs.CY, 11 * pulse, 0, Math.PI * 2);
  ctx.fillStyle = lives > 2 ? "#5DCAA5" : "#F09595";
  ctx.fill();

  // Beam aura on apex
  if (beamActive) {
    const p2 = 0.8 + 0.2 * Math.sin(Date.now() / 100);
    ctx.beginPath();
    ctx.arc(configs.CX, configs.CY, 26 * p2, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(239,159,39,${0.6 + 0.3 * p2})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  ctx.save();
  ctx.font = "10px system-ui, sans-serif";
  ctx.fillStyle = "rgba(28,39,51,0.5)";
  ctx.textAlign = "center";
  ctx.fillText("APEX", configs.CX, configs.CY + 36);
  ctx.restore();
}

export function drawCritter(c) {
  const pos = utils.polarToXY(c.angle, c.dist);
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
