export const canvas = document.getElementById("gameCanvas");
export const ctx = canvas.getContext("2d");
export const W = canvas.width,
  H = canvas.height;
export const CX = W / 2,
  CY = H / 2;
export const DOME_R = 322;
export const FPS = 60;

export const POWERUP_DURATION = 5 * FPS;
export const FREEZE_DURATION = 10 * FPS;
export const FREEZE_SLOW = 0.35; // enemies move at 35% speed while frozen
export const NUKE_COOLDOWN = 30 * FPS;
export const COMBO_WINDOW = Math.round(1.3 * FPS);
export const COMBO_CAP = 6;
