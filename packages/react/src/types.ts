import type { PixelDensity, PixelSize, PixelTheme, PixelTone, PixelVariant } from "@pixel-ui/core";

export interface PixelStyleProps {
  theme?: PixelTheme;
  variant?: PixelVariant;
  tone?: PixelTone;
  density?: PixelDensity;
  size?: PixelSize;
  selected?: boolean;
  loading?: boolean;
}
