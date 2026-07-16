import { forwardRef, type ButtonHTMLAttributes } from "react";
import type { PixelStyleProps } from "./types";
import { cx, pixelData } from "./utils";

export interface PixelTabProps extends ButtonHTMLAttributes<HTMLButtonElement>, PixelStyleProps {
  controls?: string;
}

export const PixelTab = forwardRef<HTMLButtonElement, PixelTabProps>(function PixelTab(
  { className, children, controls, theme, mode, grid, variant = "ghost", tone = "neutral", density = "medium", size = "md", selected = false, loading, disabled, ...props },
  ref
) {
  return (
    <button ref={ref} type="button" role="tab" className={cx("px-control", "px-tab", className)} aria-selected={selected} aria-controls={controls} disabled={disabled || loading} tabIndex={selected ? 0 : -1} {...pixelData({ theme, mode, grid, variant, tone, density, size, selected, loading })} {...props}>
      {children}
    </button>
  );
});
