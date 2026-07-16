import { forwardRef, type ButtonHTMLAttributes, type CSSProperties, type HTMLAttributes, type ImgHTMLAttributes, type OutputHTMLAttributes, type ReactNode } from "react";
import type { PixelStyleProps } from "./types";
import { cx, pixelData } from "./utils";

export interface PixelSpriteProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "width" | "height"> {
  sourceWidth: 8 | 16 | 24 | 32 | 48 | 64;
  sourceHeight: 8 | 16 | 24 | 32 | 48 | 64;
  scale?: 1 | 2 | 3 | 4;
}

export const PixelSprite = forwardRef<HTMLImageElement, PixelSpriteProps>(function PixelSprite(
  { className, sourceWidth, sourceHeight, scale = 1, alt, ...props },
  ref
) {
  return <img ref={ref} className={cx("px-sprite", className)} width={sourceWidth * scale} height={sourceHeight * scale} data-px-source-width={sourceWidth} data-px-source-height={sourceHeight} data-px-sprite-scale={scale} alt={alt} {...props} />;
});

export interface PixelSlotProps extends ButtonHTMLAttributes<HTMLButtonElement>, Pick<PixelStyleProps, "tone" | "size" | "selected" | "loading"> {
  itemLabel: string;
  quantity?: number;
  locked?: boolean;
}

export const PixelSlot = forwardRef<HTMLButtonElement, PixelSlotProps>(function PixelSlot(
  { className, children, itemLabel, quantity, locked = false, selected = false, loading = false, disabled, tone = "neutral", size = "md", ...props },
  ref
) {
  const state = locked ? "locked" : quantity === 0 ? "empty" : "filled";
  const label = `${itemLabel}${quantity === undefined ? "" : `, quantity ${quantity}`}${locked ? ", locked" : ""}`;
  return <button ref={ref} type="button" className={cx("px-slot", className)} aria-label={label} aria-pressed={selected} disabled={disabled || locked || loading} data-px-slot-state={state} {...pixelData({ tone, size, selected, loading })} {...props}><span className="px-slot__sprite" aria-hidden="true">{children}</span>{quantity !== undefined && quantity > 1 && <b className="px-slot__count" aria-hidden="true">{quantity}</b>}<i className="px-slot__marker" aria-hidden="true" /></button>;
});

export interface PixelMeterProps extends HTMLAttributes<HTMLDivElement>, Pick<PixelStyleProps, "size"> {
  kind?: "health" | "mana" | "stamina" | "progress";
  label: string;
  value: number;
  max: number;
  segments?: number;
}

export const PixelMeter = forwardRef<HTMLDivElement, PixelMeterProps>(function PixelMeter(
  { className, kind = "progress", label, value, max, segments = 10, size = "md", ...props },
  ref
) {
  const safeMax = Math.max(1, max);
  const safeValue = Math.min(safeMax, Math.max(0, value));
  const safeSegments = Math.min(12, Math.max(4, Math.round(segments)));
  const filled = Math.round((safeValue / safeMax) * safeSegments);
  return <div ref={ref} className={cx("px-meter", className)} data-px-meter={kind} {...pixelData({ size })} {...props}><div className="px-meter__label"><span>{label}</span><span>{safeValue} / {safeMax}</span></div><progress value={safeValue} max={safeMax} aria-label={label}>{safeValue} / {safeMax}</progress><span className="px-meter__cells" aria-hidden="true">{Array.from({ length: safeSegments }, (_, index) => <i key={index} data-filled={index < filled || undefined} />)}</span></div>;
});

export interface PixelCounterProps extends OutputHTMLAttributes<HTMLOutputElement> {
  label: string;
  value: number;
  digits?: number;
}

export const PixelCounter = forwardRef<HTMLOutputElement, PixelCounterProps>(function PixelCounter({ className, label, value, digits = 3, ...props }, ref) {
  return <output ref={ref} className={cx("px-counter", className)} aria-label={`${label}: ${value}`} {...props}>{Math.max(0, value).toString().padStart(digits, "0")}</output>;
});

export interface PixelCurrencyProps extends OutputHTMLAttributes<HTMLOutputElement> {
  label: string;
  amount: number;
  icon?: ReactNode;
}

export const PixelCurrency = forwardRef<HTMLOutputElement, PixelCurrencyProps>(function PixelCurrency({ className, label, amount, icon, ...props }, ref) {
  return <output ref={ref} className={cx("px-currency", className)} aria-label={`${label}: ${amount}`} {...props}>{icon && <span aria-hidden="true">{icon}</span>}<b>{amount.toLocaleString("en-US")}</b><small>{label}</small></output>;
});

export interface PixelStateProps extends HTMLAttributes<HTMLElement> {
  state: "loading" | "empty" | "error";
  title: string;
  action?: ReactNode;
}

export const PixelState = forwardRef<HTMLElement, PixelStateProps>(function PixelState({ className, state, title, children, action, ...props }, ref) {
  const busy = state === "loading";
  return <section ref={ref} className={cx("px-state", className)} data-px-state={state} role={state === "error" ? "alert" : "status"} aria-busy={busy || undefined} {...props}><span className="px-state__glyph" aria-hidden="true" /><h2>{title}</h2>{children && <div>{children}</div>}{action}</section>;
});

export type PixelDynamicStyle = CSSProperties & Record<`--px-${string}`, string | number>;
