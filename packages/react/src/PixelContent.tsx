import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactNode, type TableHTMLAttributes } from "react";
import type { PixelStyleProps } from "./types";
import { PixelFrame } from "./PixelFrame";
import { cx, pixelData } from "./utils";

export interface PixelCardProps extends HTMLAttributes<HTMLElement>, PixelStyleProps {
}

export const PixelCard = forwardRef<HTMLElement, PixelCardProps>(function PixelCard(
  { className, children, theme, variant = "inset", tone = "neutral", density = "low", size = "md", selected, loading, ...props },
  ref
) {
  return (
    <PixelFrame theme={theme} variant={variant} tone={tone} density={density} size={size} selected={selected} loading={loading}>
      <article ref={ref} className={cx("px-card", className)} {...props}>{children}</article>
    </PixelFrame>
  );
});

export interface PixelBadgeProps extends HTMLAttributes<HTMLSpanElement>, Pick<PixelStyleProps, "tone" | "variant"> {}
export const PixelBadge = forwardRef<HTMLSpanElement, PixelBadgeProps>(function PixelBadge({ className, tone = "neutral", variant = "outline", ...props }, ref) {
  return <span ref={ref} className={cx("px-badge", className)} {...pixelData({ tone, variant })} {...props} />;
});

export interface PixelDividerProps extends HTMLAttributes<HTMLHRElement> { orientation?: "horizontal" | "vertical"; }
export const PixelDivider = forwardRef<HTMLHRElement, PixelDividerProps>(function PixelDivider({ className, orientation = "horizontal", ...props }, ref) {
  return <hr ref={ref} className={cx("px-divider", className)} data-orientation={orientation} aria-orientation={orientation} {...props} />;
});

export interface PixelStatusProps extends HTMLAttributes<HTMLSpanElement>, Pick<PixelStyleProps, "tone"> { label: string; }
export const PixelStatus = forwardRef<HTMLSpanElement, PixelStatusProps>(function PixelStatus({ className, label, tone = "neutral", ...props }, ref) {
  return <span ref={ref} className={cx("px-status", className)} {...pixelData({ tone })} {...props}><i aria-hidden="true" /><span>{label}</span></span>;
});

export interface PixelProgressProps extends HTMLAttributes<HTMLDivElement>, Pick<PixelStyleProps, "tone" | "size"> {
  label: string;
  value?: number;
  max?: number;
  indeterminate?: boolean;
}
export const PixelProgress = forwardRef<HTMLDivElement, PixelProgressProps>(function PixelProgress({ className, label, value = 0, max = 100, indeterminate = false, tone = "accent", size = "md", style, ...props }, ref) {
  const safeMax = Math.max(1, max);
  const normalized = Math.min(safeMax, Math.max(0, value));
  const progressStyle = { ...style, "--px-progress-value": `${(normalized / safeMax) * 100}%` } as CSSProperties;
  return <div ref={ref} className={cx("px-progress", className)} style={progressStyle} {...pixelData({ tone, size })} {...props}><div className="px-progress__label"><span>{label}</span><span>{indeterminate ? "Working" : `${normalized} / ${safeMax}`}</span></div><progress value={indeterminate ? undefined : normalized} max={safeMax} aria-label={label} /><span className="px-progress__pattern" data-indeterminate={indeterminate || undefined} aria-hidden="true" /></div>;
});

export interface PixelToolbarProps extends HTMLAttributes<HTMLDivElement> { label: string; }
export const PixelToolbar = forwardRef<HTMLDivElement, PixelToolbarProps>(function PixelToolbar({ className, label, ...props }, ref) {
  return <div ref={ref} role="toolbar" aria-label={label} className={cx("px-toolbar", className)} {...props} />;
});

export interface PixelWindowProps extends Omit<HTMLAttributes<HTMLElement>, "title">, PixelStyleProps { title: ReactNode; actions?: ReactNode; }
export const PixelWindow = forwardRef<HTMLElement, PixelWindowProps>(function PixelWindow({ className, title, actions, children, theme, variant, tone, density, size, selected, loading, ...props }, ref) {
  return <PixelFrame theme={theme} variant={variant} tone={tone} density={density} size={size} selected={selected} loading={loading}><section ref={ref} className={cx("px-window", className)} {...props}><header className="px-window__header"><h2>{title}</h2>{actions && <div className="px-window__actions">{actions}</div>}</header><div className="px-window__content">{children}</div></section></PixelFrame>;
});

export interface PixelTableProps extends TableHTMLAttributes<HTMLTableElement> { caption?: ReactNode; }
export const PixelTable = forwardRef<HTMLTableElement, PixelTableProps>(function PixelTable({ className, caption, children, ...props }, ref) {
  return <div className="px-table-wrap" tabIndex={0} role="region" aria-label={typeof caption === "string" ? caption : "Data table"}><table ref={ref} className={cx("px-table", className)} {...props}>{caption && <caption>{caption}</caption>}{children}</table></div>;
});

export interface PixelToastProps extends HTMLAttributes<HTMLElement>, Pick<PixelStyleProps, "tone"> { action?: ReactNode; }
export const PixelToast = forwardRef<HTMLElement, PixelToastProps>(function PixelToast({ className, tone = "neutral", children, action, ...props }, ref) {
  const urgent = tone === "danger";
  return <aside ref={ref} className={cx("px-toast", className)} role={urgent ? "alert" : "status"} aria-live={urgent ? "assertive" : "polite"} {...pixelData({ tone })} {...props}><PixelStatus tone={tone} label={urgent ? "Error" : "Notice"} /><div className="px-toast__message">{children}</div>{action}</aside>;
});
