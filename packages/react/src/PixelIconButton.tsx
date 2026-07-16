import { forwardRef, type ButtonHTMLAttributes } from "react";
import type { PixelStyleProps } from "./types";
import { cx, pixelData } from "./utils";

export interface PixelIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, PixelStyleProps {
  label: string;
}

export const PixelIconButton = forwardRef<HTMLButtonElement, PixelIconButtonProps>(function PixelIconButton(
  { className, children, label, theme, mode, grid, variant = "outline", tone = "neutral", density = "medium", size = "md", selected, loading, disabled, ...props },
  ref
) {
  return (
    <button ref={ref} type="button" className={cx("px-control", "px-icon-control", className)} aria-label={label} title={label} disabled={disabled || loading} {...pixelData({ theme, mode, grid, variant, tone, density, size, selected, loading })} {...props}>
      {children}
    </button>
  );
});
