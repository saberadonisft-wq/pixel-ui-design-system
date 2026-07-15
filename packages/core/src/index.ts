export const pixelGridOptions = [2, 4, 8] as const;
export const pixelDensities = ["low", "medium", "high"] as const;
export const pixelThemes = ["sci-fi", "fantasy", "cyberpunk", "terminal", "arcade", "industrial", "minimal"] as const;

export type PixelGrid = (typeof pixelGridOptions)[number];
export type PixelDensity = (typeof pixelDensities)[number];
export type PixelTheme = (typeof pixelThemes)[number];
export type PixelTone = "neutral" | "accent" | "success" | "warning" | "danger";
export type PixelSize = "sm" | "md" | "lg";
export type PixelVariant = "solid" | "outline" | "inset" | "ghost";
