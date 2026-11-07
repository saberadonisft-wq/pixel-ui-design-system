import { forwardRef, type ButtonHTMLAttributes } from "react";
import type { PixelStyleProps } from "./types";
import { cx, pixelData } from "./utils";

export interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, PixelStyleProps {}

export const PixelButton = forwardRef<HTMLButtonElement, PixelButtonProps>(function PixelButton(
  { className, children, theme, mode, grid, variant = "solid", tone = "neutral", density = "medium", size = "md", selected, loading, disabled, ...props },
  ref
) {
  return (
    <button ref={ref} className={cx("px-control", "px-button", className)} disabled={disabled || loading} {...pixelData({ theme, mode, grid, variant, tone, density, size, selected, loading })} {...props}>
      {children}
    </button>
  );
});
