import * as configs from "./config.js";

export function polarToXY(angle, dist) {
  return {
    x: configs.CX + Math.cos(angle) * dist,
    y: configs.CY + Math.sin(angle) * dist,
  };
}

export function pickupStyle(kind) {
  switch (kind) {
    case "shield":
      return {
        col: "#378ADD",
        colLight: "#85B7EB",
        icon: "🛡",
        label: "SHIELD",
      };
    case "beam":
      return { col: "#EF9F27", colLight: "#FAC775", icon: "⚡", label: "BEAM" };
    case "freeze":
      return {
        col: "#2FB3CC",
        colLight: "#9BE3F0",
        icon: "❄",
        label: "FREEZE",
      };
    default: // nuke
      return { col: "#E24B4A", colLight: "#F09595", icon: "☢", label: "NUKE" };
  }
}
