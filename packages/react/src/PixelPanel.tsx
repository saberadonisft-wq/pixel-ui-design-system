import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import type { PixelStyleProps } from "./types";
import { PixelFrame } from "./PixelFrame";
import { cx } from "./utils";

export interface PixelPanelProps extends Omit<HTMLAttributes<HTMLElement>, "title">, PixelStyleProps {
  title?: ReactNode;
  headerAction?: ReactNode;
  as?: "section" | "aside" | "article";
}

export const PixelPanel = forwardRef<HTMLElement, PixelPanelProps>(function PixelPanel(
  { className, children, title, headerAction, as: Element = "section", theme, mode, grid, variant, tone, density, size, selected, loading, ...props },
  ref
) {
  return (
    <PixelFrame theme={theme} mode={mode} grid={grid} variant={variant} tone={tone} density={density} size={size} selected={selected} loading={loading}>
      <Element ref={ref} className={cx("px-panel", className)} {...props}>
        {(title || headerAction) && (
          <header className="px-panel__header">
            {title ? <h2 className="px-panel__title">{title}</h2> : <span />}
            {headerAction}
          </header>
        )}
        {children}
      </Element>
    </PixelFrame>
  );
});
