import {
  forwardRef,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type ImgHTMLAttributes,
  type ReactNode,
} from "react";
import { cx } from "./utils";

export type PixelAssetTone = "market" | "currency" | "research" | "capital" | "intelligence";
export type PixelAssetFamily = "account" | "primary" | "navigation" | "content" | "compact";
export type PixelIconAsset =
  | "market-coins"
  | "research-pulse"
  | "capital-shield"
  | "intelligence-core"
  | "status-shield"
  | "deposit-plus";
export type PixelCompactAsset = "security" | "logout";

const ASSET_ROOT = "/assets/pixel-ui/generated";

const ICONS: Record<PixelIconAsset, { file: string; width: number; height: number }> = {
  "market-coins": { file: "icon-market-coins.png", width: 42, height: 42 },
  "research-pulse": { file: "icon-research-pulse.png", width: 42, height: 43 },
  "capital-shield": { file: "icon-capital-shield.png", width: 42, height: 43 },
  "intelligence-core": { file: "icon-intelligence-core.png", width: 42, height: 42 },
  "status-shield": { file: "icon-status-shield-cyan.png", width: 42, height: 42 },
  "deposit-plus": { file: "icon-deposit-plus-cyan.png", width: 28, height: 33 },
};

const COMPACT: Record<PixelCompactAsset, { file: string; width: number; height: number }> = {
  security: { file: "compact-security-amber.png", width: 62, height: 55 },
  logout: { file: "compact-logout-amber.png", width: 63, height: 55 },
};

export interface PixelIconProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "width" | "height"> {
  asset: PixelIconAsset;
  scale?: 1 | 2;
}

export const PixelIcon = forwardRef<HTMLImageElement, PixelIconProps>(function PixelIcon(
  { asset, scale = 1, className, alt, ...props },
  ref,
) {
  const metadata = ICONS[asset];
  return (
    <img
      ref={ref}
      className={cx("pixel-art", "px-asset-icon", className)}
      src={`${ASSET_ROOT}/${metadata.file}`}
      width={metadata.width * scale}
      height={metadata.height * scale}
      data-px-source-width={metadata.width}
      data-px-source-height={metadata.height}
      data-px-sprite-scale={scale}
      alt={alt}
      {...props}
    />
  );
});

export interface PixelAssetFrameProps extends HTMLAttributes<HTMLDivElement> {
  tone?: PixelAssetTone;
  family?: PixelAssetFamily;
}

export const PixelAssetFrame = forwardRef<HTMLDivElement, PixelAssetFrameProps>(function PixelAssetFrame(
  { className, children, tone = "market", family = "content", ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cx("px-asset-frame", className)}
      data-px-asset-tone={tone}
      data-px-asset-family={family}
      {...props}
    >
      <div className="px-asset-frame__surface">{children}</div>
    </div>
  );
});

export interface PixelDepositButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
}

export const PixelDepositButton = forwardRef<HTMLButtonElement, PixelDepositButtonProps>(function PixelDepositButton(
  { className, children, icon, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cx("px-asset-control", "px-deposit-button", className)}
      data-px-asset-tone="currency"
      disabled={disabled}
      {...props}
    >
      <span className="px-asset-control__content">
        {icon ?? <PixelIcon asset="deposit-plus" alt="" />}
        <span>{children}</span>
      </span>
    </button>
  );
});

export interface PixelNavigationItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone: Exclude<PixelAssetTone, "currency">;
  icon: PixelIconAsset;
  selected?: boolean;
}

export const PixelNavigationItem = forwardRef<HTMLButtonElement, PixelNavigationItemProps>(function PixelNavigationItem(
  { className, children, tone, icon, selected = false, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cx("px-asset-control", "px-navigation-item", className)}
      data-px-asset-tone={tone}
      data-px-selected={selected || undefined}
      aria-pressed={selected}
      disabled={disabled}
      {...props}
    >
      <span className="px-asset-control__content">
        <PixelIcon asset={icon} alt="" />
        <span className="px-navigation-item__label">{children}</span>
        <span className="px-navigation-item__marker" aria-hidden="true">◆</span>
      </span>
    </button>
  );
});

export interface PixelCompactFrameProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asset: PixelCompactAsset;
  label: string;
}

export const PixelCompactFrame = forwardRef<HTMLButtonElement, PixelCompactFrameProps>(function PixelCompactFrame(
  { asset, label, className, disabled, ...props },
  ref,
) {
  const metadata = COMPACT[asset];
  return (
    <button
      ref={ref}
      type="button"
      className={cx("px-compact-frame", className)}
      aria-label={label}
      disabled={disabled}
      style={{ "--px-compact-width": `${metadata.width}px`, "--px-compact-height": `${metadata.height}px` } as CSSProperties}
      {...props}
    >
      <img
        className="pixel-art"
        src={`${ASSET_ROOT}/${metadata.file}`}
        width={metadata.width}
        height={metadata.height}
        data-px-source-width={metadata.width}
        data-px-source-height={metadata.height}
        data-px-sprite-scale="1"
        alt=""
      />
    </button>
  );
});

export interface PixelContentPanelProps extends HTMLAttributes<HTMLElement> {
  tone?: PixelAssetTone;
  titleId: string;
}

export const PixelContentPanel = forwardRef<HTMLElement, PixelContentPanelProps>(function PixelContentPanel(
  { className, children, tone = "market", titleId, ...props },
  ref,
) {
  return (
    <section ref={ref} className={cx("px-content-panel", className)} aria-labelledby={titleId} {...props}>
      <PixelAssetFrame tone={tone} family="content">
        {children}
      </PixelAssetFrame>
    </section>
  );
});
