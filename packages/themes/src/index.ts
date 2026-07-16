export const bundledThemes = ["ornamental", "sci-fi", "fantasy", "cyberpunk", "terminal", "arcade", "industrial", "minimal"] as const;
export type BundledTheme = (typeof bundledThemes)[number];
