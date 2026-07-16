import { forwardRef, type HTMLAttributes } from "react";
import type { PixelStyleProps } from "./types";
import { cx, pixelData } from "./utils";

export interface PixelFrameProps extends HTMLAttributes<HTMLDivElement>, PixelStyleProps {}

export const PixelFrame = forwardRef<HTMLDivElement, PixelFrameProps>(function PixelFrame(
  { className, children, theme, mode, grid, variant = "solid", tone = "neutral", density = "medium", size = "md", selected, loading, ...props },
  ref
) {
  return (
    <div ref={ref} className={cx("px-frame", className)} {...pixelData({ theme, mode, grid, variant, tone, density, size, selected, loading })} {...props}>
      <div className="px-frame__surface">{children}</div>
    </div>
  );
});
