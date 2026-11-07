export const pixelGridOptions = [2, 4, 8] as const;
export const pixelModes = [
  "ornamental",
  "minimal-8bit",
  "rpg-16bit",
  "cozy",
  "tactical-hud",
  "cyber",
  "data-dashboard"
] as const;
export const pixelDensities = ["low", "medium", "high"] as const;
export const pixelThemes = ["ornamental", "sci-fi", "fantasy", "cyberpunk", "terminal", "arcade", "industrial", "minimal"] as const;

export type PixelGrid = (typeof pixelGridOptions)[number];
export type PixelMode = (typeof pixelModes)[number];
export type PixelDensity = (typeof pixelDensities)[number];
export type PixelTheme = (typeof pixelThemes)[number];
export type PixelTone = "neutral" | "accent" | "success" | "warning" | "danger";
export type PixelSize = "sm" | "md" | "lg";
export type PixelVariant = "solid" | "outline" | "inset" | "ghost";
