import type { PixelDensity, PixelGrid, PixelMode, PixelSize, PixelTheme, PixelTone, PixelVariant } from "@pixel-ui/core";

export interface PixelStyleProps {
  theme?: PixelTheme;
  mode?: PixelMode;
  grid?: PixelGrid;
  variant?: PixelVariant;
  tone?: PixelTone;
  density?: PixelDensity;
  size?: PixelSize;
  selected?: boolean;
  loading?: boolean;
}
