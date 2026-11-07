import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
import { cx } from "./utils";

export type PixelOrnateTone = "neutral" | "market" | "research" | "capital" | "intelligence" | "currency" | "gold";
export type PixelOrnament = "mechanical" | "reinforced" | "arcane" | "intelligence" | "currency";
export type PixelOrnateDetail = "hero" | "standard" | "restrained";
export type PixelOrnateFamily = "account" | "primary" | "navigation" | "content" | "compact";

interface PixelOrnateVisualProps {
  tone?: PixelOrnateTone;
  ornament?: PixelOrnament;
  detail?: PixelOrnateDetail;
  family?: PixelOrnateFamily;
}

function OrnateSlices() {
  return (
    <span className="px-nine__ornament" aria-hidden="true">
      <i className="px-nine__slice" data-slice="top-left" />
      <i className="px-nine__slice" data-slice="top" />
      <i className="px-nine__slice" data-slice="top-right" />
      <i className="px-nine__slice" data-slice="left" />
      <i className="px-nine__slice" data-slice="right" />
      <i className="px-nine__slice" data-slice="bottom-left" />
      <i className="px-nine__slice" data-slice="bottom" />
      <i className="px-nine__slice" data-slice="bottom-right" />
      <i className="px-nine__brace" data-edge="top" />
      <i className="px-nine__brace" data-edge="bottom" />
      <i className="px-nine__bolt" data-bolt="top-left" />
      <i className="px-nine__bolt" data-bolt="top-right" />
      <i className="px-nine__bolt" data-bolt="bottom-left" />
      <i className="px-nine__bolt" data-bolt="bottom-right" />
    </span>
  );
}

export interface PixelOrnateFrameProps extends HTMLAttributes<HTMLDivElement>, PixelOrnateVisualProps {}

export const PixelOrnateFrame = forwardRef<HTMLDivElement, PixelOrnateFrameProps>(function PixelOrnateFrame(
  { className, children, tone = "neutral", ornament = "mechanical", detail = "standard", family = "content", ...props },
  ref
) {
  return (
    <div ref={ref} className={cx("px-nine", "px-ornate-frame", className)} data-px-tone={tone} data-px-ornament={ornament} data-px-detail={detail} data-px-frame-family={family} {...props}>
      <OrnateSlices />
      <div className="px-nine__center">{children}</div>
    </div>
  );
});

export interface PixelOrnateButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, PixelOrnateVisualProps {
  icon?: ReactNode;
  marker?: ReactNode;
  selected?: boolean;
}

export const PixelOrnateButton = forwardRef<HTMLButtonElement, PixelOrnateButtonProps>(function PixelOrnateButton(
  { className, children, icon, marker, selected = false, tone = "neutral", ornament = "mechanical", detail = "standard", family = "navigation", disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cx("px-nine", "px-ornate-control", className)}
      data-px-tone={tone}
      data-px-ornament={ornament}
      data-px-detail={detail}
      data-px-frame-family={family}
      data-px-selected={selected || undefined}
      aria-pressed={selected}
      disabled={disabled}
      {...props}
    >
      <OrnateSlices />
      <span className="px-nine__center px-ornate-control__layout">
        {icon && <span className="px-ornate-control__icon" aria-hidden="true">{icon}</span>}
        <span className="px-ornate-control__label">{children}</span>
        {marker && <span className="px-ornate-control__marker" aria-hidden="true">{marker}</span>}
      </span>
    </button>
  );
});
