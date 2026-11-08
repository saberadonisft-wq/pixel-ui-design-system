import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type MouseEvent,
} from "react";
import { cx } from "./utils";

export type PixelRarityTier = "common" | "rare" | "epic" | "ssr" | "ur";
export type PixelVfxTriggerMode = "auto" | "always" | "off";

export interface PixelSocketPin {
  id: string;
  x: number;
  y: number;
  angleDeg: number;
  zOrder: number;
  visible: boolean;
  poseTag?: string;
}

export interface PixelActionTiming {
  windupFrames: number;
  hitFrame: number;
  recoveryFrames: number;
  hitStopMs: number;
  screenShakePx: number;
}

export interface PixelSpriteTransformOptions {
  tintBodyHex?: string;
  tintIrisHex?: string;
  tintOutfitHex?: string;
  tintHairHex?: string;
  elementRamp?: readonly [string, string, string, string];
  damagedMode?: boolean;
  hideHelmet?: boolean;
  hideOffhand?: boolean;
  hideFx?: boolean;
  helmetMaskSrc?: string;
  offhandMaskSrc?: string;
}

export interface PixelPaperdollLayerItem {
  id: string;
  label: string;
  src: string;
  width: 64 | 96;
  height: 64 | 96;
  enabled: boolean;
  offsetX?: number;
  offsetY?: number;
  tintMaskSrc?: string;
  tintColorHex?: string;
}

export interface PixelPaperdollProps extends HTMLAttributes<HTMLDivElement> {
  layers: readonly PixelPaperdollLayerItem[];
  sockets?: readonly PixelSocketPin[];
  showSockets?: boolean;
  scale?: 1 | 2;
}

function resolveDefaultLayerOffsets(layer: PixelPaperdollLayerItem): { ox: number; oy: number } {
  if (typeof layer.offsetX === "number" && typeof layer.offsetY === "number") {
    return { ox: layer.offsetX, oy: layer.offsetY };
  }
  if (layer.width === 64) {
    return { ox: 16, oy: layer.id === "40_hair" ? 4 : 26 };
  }
  return { ox: 0, oy: 0 };
}

function parseHexRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 6) {
    const r = Number.parseInt(clean.slice(0, 2), 16);
    const g = Number.parseInt(clean.slice(2, 4), 16);
    const b = Number.parseInt(clean.slice(4, 6), 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      return [r, g, b];
    }
  }
  return [255, 255, 255];
}

const PROCESSED_SPRITE_CACHE = new Map<string, string>();

function hasActiveSpriteTransform(opts?: PixelSpriteTransformOptions): boolean {
  if (!opts) return false;
  return Boolean(
    opts.tintBodyHex ||
      opts.tintIrisHex ||
      opts.tintOutfitHex ||
      opts.tintHairHex ||
      opts.elementRamp ||
      opts.damagedMode ||
      opts.hideHelmet ||
      opts.hideOffhand ||
      opts.hideFx,
  );
}

function loadMaskAlpha64(src?: string): Promise<Uint8ClampedArray | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const mImg = new Image();
    mImg.src = src;
    mImg.onload = () => {
      const c = document.createElement("canvas");
      c.width = 64;
      c.height = 64;
      const mCtx = c.getContext("2d");
      if (!mCtx) {
        resolve(null);
        return;
      }
      mCtx.imageSmoothingEnabled = false;
      mCtx.drawImage(mImg, 0, 0, 64, 64);
      resolve(mCtx.getImageData(0, 0, 64, 64).data);
    };
    mImg.onerror = () => resolve(null);
  });
}

function transformSpriteOnCanvas(
  img: HTMLImageElement,
  width: number,
  height: number,
  opts: PixelSpriteTransformOptions,
  helmetMaskData?: Uint8ClampedArray | null,
  offhandMaskData?: Uint8ClampedArray | null,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return img.src;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const bodyRgb = opts.tintBodyHex ? parseHexRgb(opts.tintBodyHex) : null;
  const irisRgb = opts.tintIrisHex ? parseHexRgb(opts.tintIrisHex) : null;
  const outfitRgb = opts.tintOutfitHex ? parseHexRgb(opts.tintOutfitHex) : null;
  const hairRgb = opts.tintHairHex ? parseHexRgb(opts.tintHairHex) : null;
  const rampRgbs = opts.elementRamp ? opts.elementRamp.map((hex) => parseHexRgb(hex)) : null;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const a = data[idx + 3];
      if (a < 128) {
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
        continue;
      }

      // Alpha-mask-guided visibility toggles that protect raised right-hand weapons (x > 60)
      if (opts.hideHelmet) {
        if (helmetMaskData) {
          const mx = x - 16;
          const my = y - 4;
          const inFaceCore = y >= 25 && y <= 38 && x >= 35 && x <= 57;
          if (mx >= 0 && mx < 64 && my >= 0 && my < 64 && x <= 60 && !inFaceCore) {
            const ma = helmetMaskData[(my * 64 + mx) * 4 + 3];
            if (ma >= 128) {
              data[idx + 3] = 0;
              continue;
            }
          }
        } else if (y < 23 && x >= 22 && x <= 58) {
          data[idx + 3] = 0;
          continue;
        }
      }
      if (opts.hideOffhand) {
        if (offhandMaskData) {
          const mx = x - 16;
          const my = y - 26;
          if (mx >= 0 && mx < 64 && my >= 0 && my < 64 && x >= 12 && x <= 38 && y >= 34 && y <= 76) {
            const ma = offhandMaskData[(my * 64 + mx) * 4 + 3];
            if (ma >= 128) {
              data[idx + 3] = 0;
              continue;
            }
          }
        } else if (x >= 16 && x <= 37 && y >= 42 && y <= 75) {
          data[idx + 3] = 0;
          continue;
        }
      }

      let r = data[idx];
      let g = data[idx + 1];
      let b = data[idx + 2];

      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const sat = maxC > 0 ? (maxC - minC) / maxC : 0;

      // Suppress high-energy outer FX glints when 60_fx is turned off
      if (opts.hideFx && lum > 0.78 && sat > 0.36 && (x < 28 || x > 68 || y < 22)) {
        data[idx + 3] = 0;
        continue;
      }

      // Keep crisp ink outlines untouched
      if (lum >= 0.14) {
        if (rampRgbs && sat > 0.22) {
          const band = lum < 0.34 ? 0 : lum < 0.56 ? 1 : lum < 0.78 ? 2 : 3;
          const [er, eg, eb] = rampRgbs[band];
          r = er;
          g = eg;
          b = eb;
        }

        const isEyeZone = y >= 25 && y <= 40 && x >= 36 && x <= 60 && lum > 0.52 && sat > 0.3;
        const isHeadCrest = y < 32 && sat > 0.25;
        const isTabardOrCape = y >= 36 && sat > 0.25;

        if (irisRgb && isEyeZone) {
          r = Math.min(255, Math.round(lum * irisRgb[0] * 1.25));
          g = Math.min(255, Math.round(lum * irisRgb[1] * 1.25));
          b = Math.min(255, Math.round(lum * irisRgb[2] * 1.25));
        } else if (hairRgb && isHeadCrest) {
          r = Math.min(255, Math.round(lum * hairRgb[0] * 1.18));
          g = Math.min(255, Math.round(lum * hairRgb[1] * 1.18));
          b = Math.min(255, Math.round(lum * hairRgb[2] * 1.18));
        } else if (outfitRgb && isTabardOrCape) {
          r = Math.min(255, Math.round(lum * outfitRgb[0] * 1.18));
          g = Math.min(255, Math.round(lum * outfitRgb[1] * 1.18));
          b = Math.min(255, Math.round(lum * outfitRgb[2] * 1.18));
        } else if (bodyRgb && !isEyeZone && !isHeadCrest && !isTabardOrCape) {
          r = Math.min(255, Math.round(lum * bodyRgb[0] * 1.15));
          g = Math.min(255, Math.round(lum * bodyRgb[1] * 1.15));
          b = Math.min(255, Math.round(lum * bodyRgb[2] * 1.15));
        }

        // Deterministic pixel battle-damage scorches & armor chips (zero bbox drift)
        if (opts.damagedMode && y >= 28 && y <= 82) {
          const diagA = (x + y * 2) % 23 === 0 && (x + y) % 5 < 3;
          const diagB = (x * 2 - y + 96) % 29 === 0 && y >= 40 && y <= 70;
          if (diagA || diagB) {
            r = Math.round(r * 0.42);
            g = Math.round(g * 0.36);
            b = Math.round(b * 0.38);
          }
        }
      }

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

export function usePixelSpriteProcessor(
  sources: readonly string[],
  width: number,
  height: number,
  options?: PixelSpriteTransformOptions,
): readonly string[] {
  const active = hasActiveSpriteTransform(options);
  const optionsKey = useMemo(() => (active ? JSON.stringify(options) : ""), [active, options]);
  const sourcesKey = sources.join("|");
  const [processed, setProcessed] = useState<readonly string[]>(sources);

  useEffect(() => {
    if (!active || !options || sources.length === 0) {
      setProcessed(sources);
      return undefined;
    }

    let cancelled = false;
    Promise.all([
      optsLoadMask(options.hideHelmet ? options.helmetMaskSrc : undefined),
      optsLoadMask(options.hideOffhand ? options.offhandMaskSrc : undefined),
    ]).then(([helmMask, offMask]) => {
      if (cancelled) return;
      Promise.all(
        sources.map(
          (src) =>
            new Promise<string>((resolve) => {
              const cacheKey = `${src}::${width}x${height}::${optionsKey}`;
              const hit = PROCESSED_SPRITE_CACHE.get(cacheKey);
              if (hit) {
                resolve(hit);
                return;
              }
              const img = new Image();
              img.src = src;
              img.onload = () => {
                const url = transformSpriteOnCanvas(img, width, height, options, helmMask, offMask);
                PROCESSED_SPRITE_CACHE.set(cacheKey, url);
                resolve(url);
              };
              img.onerror = () => resolve(src);
            }),
        ),
      ).then((urls) => {
        if (!cancelled) setProcessed(urls);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [active, options, optionsKey, sourcesKey, width, height, sources]);

  return active ? processed : sources;
}

function optsLoadMask(src?: string): Promise<Uint8ClampedArray | null> {
  return loadMaskAlpha64(src);
}

function TintedMaskLayer({
  maskSrc,
  colorHex,
  width,
  height,
  scale,
  offsetX,
  offsetY,
}: {
  maskSrc: string;
  colorHex: string;
  width: 64 | 96;
  height: 64 | 96;
  scale: 1 | 2;
  offsetX: number;
  offsetY: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let active = true;
    const img = new Image();
    img.src = maskSrc;
    img.onload = () => {
      if (!active || !canvasRef.current) return;
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const [tr, tg, tb] = parseHexRgb(colorHex);
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a >= 128) {
          const lum = data[i] / 255;
          if (lum < 0.14) {
            data[i] = Math.round(data[i] * 0.7);
            data[i + 1] = Math.round(data[i + 1] * 0.7);
            data[i + 2] = Math.round(data[i + 2] * 0.7);
          } else {
            data[i] = Math.min(255, Math.round(lum * tr * 1.18));
            data[i + 1] = Math.min(255, Math.round(lum * tg * 1.18));
            data[i + 2] = Math.min(255, Math.round(lum * tb * 1.18));
          }
          data[i + 3] = 255;
        } else {
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    };
    return () => {
      active = false;
    };
  }, [maskSrc, colorHex, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="pixel-art px-paperdoll-stage__layer"
      width={width}
      height={height}
      data-px-source-width={width}
      data-px-source-height={height}
      data-px-sprite-scale={scale}
      style={{
        inlineSize: `${width * scale}px`,
        blockSize: `${height * scale}px`,
        insetInlineStart: `${offsetX * scale}px`,
        insetBlockStart: `${offsetY * scale}px`,
      }}
      aria-hidden="true"
    />
  );
}

export const PixelPaperdoll = forwardRef<HTMLDivElement, PixelPaperdollProps>(function PixelPaperdoll(
  { className, layers, sockets = [], showSockets = false, scale = 1, ...props },
  ref,
) {
  const stageSize = 96 * scale;

  return (
    <div
      ref={ref}
      className={cx("px-paperdoll-stage", className)}
      data-px-scale={scale}
      style={{ inlineSize: `${stageSize}px`, blockSize: `${stageSize}px` }}
      {...props}
    >
      {layers.map((layer) => {
        if (!layer.enabled) return null;
        const { ox, oy } = resolveDefaultLayerOffsets(layer);
        if (layer.tintMaskSrc && layer.tintColorHex) {
          return (
            <TintedMaskLayer
              key={`${layer.id}-tint-${layer.tintColorHex}`}
              maskSrc={layer.tintMaskSrc}
              colorHex={layer.tintColorHex}
              width={layer.width}
              height={layer.height}
              scale={scale}
              offsetX={ox}
              offsetY={oy}
            />
          );
        }
        return (
          <img
            key={layer.id}
            className="pixel-art px-paperdoll-stage__layer"
            src={layer.src}
            width={layer.width * scale}
            height={layer.height * scale}
            data-px-source-width={layer.width}
            data-px-source-height={layer.height}
            data-px-sprite-scale={scale}
            style={{ insetInlineStart: `${ox * scale}px`, insetBlockStart: `${oy * scale}px` }}
            alt=""
          />
        );
      })}
      {showSockets &&
        sockets.map((socket) =>
          socket.visible ? (
            <span
              key={socket.id}
              className="px-socket-pin"
              style={{
                insetInlineStart: `${socket.x * scale - 4}px`,
                insetBlockStart: `${socket.y * scale - 4}px`,
              }}
              title={`${socket.id} (${socket.x}, ${socket.y})`}
            >
              <b
                className="px-socket-pin__tag"
                style={{
                  insetInlineStart: socket.x > 55 ? "auto" : "0px",
                  insetInlineEnd: socket.x > 55 ? "0px" : "auto",
                  insetBlockStart: socket.y < 24 ? "12px" : "-24px",
                }}
              >
                {socket.id}
              </b>
            </span>
          ) : null,
        )}
    </div>
  );
});

export interface PixelSpriteAnimatorProps extends HTMLAttributes<HTMLDivElement> {
  clipId?: string;
  clipLabel: string;
  frames: readonly string[];
  unarmedFrames?: readonly string[];
  weaponPoseFrames?: readonly string[];
  showWeaponOverlay?: boolean;
  unarmedMode?: boolean;
  vfxFrames?: readonly string[];
  vfxFps?: number;
  showVfx?: boolean;
  vfxMode?: PixelVfxTriggerMode;
  fps?: number;
  frameWidth?: 64 | 96;
  frameHeight?: 64 | 96;
  scale?: 1 | 2;
  timing?: PixelActionTiming;
  baselineY?: number;
  weaponOverlaySrc?: string;
  transformOptions?: PixelSpriteTransformOptions;
}

export const PixelSpriteAnimator = forwardRef<HTMLDivElement, PixelSpriteAnimatorProps>(
  function PixelSpriteAnimator(
    {
      className,
      clipId,
      clipLabel,
      frames,
      unarmedFrames,
      weaponPoseFrames,
      showWeaponOverlay = false,
      unarmedMode = false,
      vfxFrames = [],
      vfxFps = 12,
      showVfx = false,
      vfxMode,
      fps = 8,
      frameWidth = 96,
      frameHeight = 96,
      scale = 1,
      timing,
      baselineY = 88,
      weaponOverlaySrc,
      transformOptions,
      ...props
    },
    ref,
  ) {
    const [playing, setPlaying] = useState(true);
    const [frameIndex, setFrameIndex] = useState(0);
    const [vfxTick, setVfxTick] = useState(0);
    const [isHitStop, setIsHitStop] = useState(false);
    const [onionSkin, setOnionSkin] = useState(false);
    const [showGuides, setShowGuides] = useState(true);
    const [speedMultiplier, setSpeedMultiplier] = useState<0.5 | 1 | 2>(1);
    const [localVfxMode, setLocalVfxMode] = useState<PixelVfxTriggerMode>(
      vfxMode ?? (showVfx ? "auto" : "off"),
    );

    useEffect(() => {
      if (vfxMode) {
        setLocalVfxMode(vfxMode);
      } else {
        setLocalVfxMode(showVfx ? "auto" : "off");
      }
    }, [vfxMode, showVfx]);

    const useUnarmedBase = Boolean(
      unarmedFrames &&
        unarmedFrames.length > 0 &&
        (unarmedMode || (showWeaponOverlay && weaponPoseFrames && weaponPoseFrames.length > 0)),
    );
    const rawBaseFrames = useUnarmedBase && unarmedFrames ? unarmedFrames : frames;
    const activeBaseFrames = usePixelSpriteProcessor(rawBaseFrames, frameWidth, frameHeight, transformOptions);

    const safeCount = Math.max(1, activeBaseFrames.length);
    const currentIndex = frameIndex % safeCount;
    const prevIndex = (currentIndex - 1 + safeCount) % safeCount;
    const effectiveFps = Math.max(1, Math.round(fps * speedMultiplier));

    // Clip playback timer with authentic Hit-Stop & Screen-Shake execution
    useEffect(() => {
      if (!playing || safeCount <= 1) {
        setIsHitStop(false);
        return undefined;
      }
      if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        setIsHitStop(false);
        return undefined;
      }
      const baseDelay = Math.max(40, Math.round(1000 / effectiveFps));
      const hitStopExtra =
        timing && timing.hitStopMs > 0 && currentIndex === timing.hitFrame
          ? Math.round(timing.hitStopMs / speedMultiplier)
          : 0;

      if (hitStopExtra > 0) {
        setIsHitStop(true);
        const clearShake = window.setTimeout(() => setIsHitStop(false), hitStopExtra);
        const stepNext = window.setTimeout(() => {
          setIsHitStop(false);
          setFrameIndex((prev) => (prev + 1) % safeCount);
        }, baseDelay + hitStopExtra);
        return () => {
          window.clearTimeout(clearShake);
          window.clearTimeout(stepNext);
        };
      }

      setIsHitStop(false);
      const stepTimer = window.setTimeout(() => {
        setFrameIndex((prev) => (prev + 1) % safeCount);
      }, baseDelay);
      return () => window.clearTimeout(stepTimer);
    }, [playing, safeCount, effectiveFps, currentIndex, timing, speedMultiplier]);

    // Independent VFX frame clock so 4-frame 12 FPS VFX never truncates on 2-frame clips
    useEffect(() => {
      if (!playing || vfxFrames.length <= 1 || localVfxMode === "off") return undefined;
      if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        return undefined;
      }
      const vfxInterval = Math.max(40, Math.round(1000 / Math.max(1, Math.round(vfxFps * speedMultiplier))));
      const timer = window.setInterval(() => {
        setVfxTick((prev) => (prev + 1) % vfxFrames.length);
      }, vfxInterval);
      return () => window.clearInterval(timer);
    }, [playing, vfxFrames.length, vfxFps, speedMultiplier, localVfxMode]);

    const currentSrc = activeBaseFrames[currentIndex] ?? activeBaseFrames[0];
    const prevSrc = activeBaseFrames[prevIndex] ?? activeBaseFrames[0];

    const resolveWeaponOverlayForFrame = (idx: number): string | undefined => {
      if (unarmedMode) return undefined;
      if (useUnarmedBase && showWeaponOverlay && weaponPoseFrames && weaponPoseFrames.length > 0) {
        return weaponPoseFrames[idx % weaponPoseFrames.length];
      }
      if (!unarmedFrames && showWeaponOverlay) {
        return weaponOverlaySrc;
      }
      return undefined;
    };

    const currentWeaponSrc = resolveWeaponOverlayForFrame(currentIndex);

    const isActionImpactClip =
      clipId === "attack" ||
      clipId === "victory" ||
      (!clipId && Boolean(timing && timing.hitStopMs > 0 && timing.windupFrames > 0));

    const shouldRenderVfx =
      vfxFrames.length > 0 &&
      (localVfxMode === "always" ||
        (localVfxMode === "auto" &&
          isActionImpactClip &&
          currentIndex >= (timing ? Math.max(0, timing.hitFrame - 1) : 0)));

    const currentVfxSrc = shouldRenderVfx ? vfxFrames[vfxTick % vfxFrames.length] : undefined;

    const renderW = frameWidth * scale;
    const renderH = frameHeight * scale;
    const shakeOffsetPx = isHitStop && timing ? timing.screenShakePx * scale : 0;

    return (
      <div ref={ref} className={cx("px-animator", className)} {...props}>
        <div className="px-animator__viewport">
          <div
            className="px-animator__canvas"
            data-px-hitstop={isHitStop || undefined}
            style={{
              inlineSize: `${renderW}px`,
              blockSize: `${renderH}px`,
              transform: shakeOffsetPx ? `translate(${shakeOffsetPx}px, 0px)` : undefined,
            }}
          >
            {onionSkin && safeCount > 1 && prevSrc && (
              <img
                className="pixel-art px-animator__onion"
                src={prevSrc}
                width={renderW}
                height={renderH}
                data-px-source-width={frameWidth}
                data-px-source-height={frameHeight}
                data-px-sprite-scale={scale}
                alt=""
              />
            )}
            {currentSrc && (
              <img
                className="pixel-art px-animator__sprite"
                src={currentSrc}
                width={renderW}
                height={renderH}
                data-px-source-width={frameWidth}
                data-px-source-height={frameHeight}
                data-px-sprite-scale={scale}
                alt={clipLabel}
              />
            )}
            {currentWeaponSrc && frameWidth === 96 && (
              <img
                className="pixel-art px-animator__weapon"
                src={currentWeaponSrc}
                width={96 * scale}
                height={96 * scale}
                data-px-source-width={96}
                data-px-source-height={96}
                data-px-sprite-scale={scale}
                alt=""
              />
            )}
            {currentVfxSrc && (
              <img
                className="pixel-art px-animator__vfx"
                src={currentVfxSrc}
                width={64 * scale}
                height={64 * scale}
                data-px-source-width={64}
                data-px-source-height={64}
                data-px-sprite-scale={scale}
                style={{ insetInlineStart: `${16 * scale}px`, insetBlockStart: `${16 * scale}px` }}
                alt=""
              />
            )}
            {showGuides && frameWidth === 96 && (
              <>
                <span
                  className="px-animator__guide-x"
                  style={{ insetInlineStart: `${48 * scale}px` }}
                  title="Trục trọng tâm X=48"
                />
                <span
                  className="px-animator__guide-y"
                  style={{ insetBlockStart: `${baselineY * scale}px` }}
                  title={`Vạch khóa gót chân Y=${baselineY}`}
                />
              </>
            )}
          </div>
          <div className="px-animator__meta">
            <div className="px-animator__header">
              <strong className="px-animator__title">{clipLabel}</strong>
              <div className="px-animator__badges">
                {isHitStop && timing && (
                  <span className="px-animator__hitstop-badge">
                    HIT-STOP {timing.hitStopMs}MS • SHAKE {timing.screenShakePx}PX
                  </span>
                )}
                <output className="px-animator__counter" aria-label={`Khung hiện tại ${currentIndex + 1} trên ${safeCount}`}>
                  F0{currentIndex + 1}/0{safeCount} • {effectiveFps} FPS ({speedMultiplier}×)
                </output>
              </div>
            </div>
            {timing && (
              <dl className="px-animator__timing">
                <div>
                  <dt>Windup (Lấy đà)</dt>
                  <dd>{timing.windupFrames} frame</dd>
                </div>
                <div>
                  <dt>Active Hit (Trúng đòn)</dt>
                  <dd>Frame 0{timing.hitFrame + 1}</dd>
                </div>
                <div>
                  <dt>Hit-stop (Khựng đòn)</dt>
                  <dd>{timing.hitStopMs} ms</dd>
                </div>
                <div>
                  <dt>Screen Shake</dt>
                  <dd>{timing.screenShakePx} px</dd>
                </div>
              </dl>
            )}
          </div>
        </div>

        <div className="px-animator__filmstrip" aria-label="Dải các frame trong hoạt ảnh">
          {activeBaseFrames.map((frameSrc, idx) => {
            const thumbWeapon = resolveWeaponOverlayForFrame(idx);
            return (
              <button
                key={`${frameSrc}-${idx}`}
                type="button"
                className="px-animator__thumb"
                aria-pressed={currentIndex === idx}
                onClick={() => {
                  setPlaying(false);
                  setFrameIndex(idx);
                }}
              >
                <span className="px-animator__thumb-label">
                  F0{idx + 1}
                  {timing && timing.hitStopMs > 0 && idx === timing.hitFrame ? " ★HIT" : ""}
                </span>
                <span
                  className="px-animator__thumb-stage"
                  style={{ inlineSize: `${frameWidth}px`, blockSize: `${frameHeight}px` }}
                >
                  <img
                    className="pixel-art"
                    src={frameSrc}
                    width={frameWidth}
                    height={frameHeight}
                    data-px-source-width={frameWidth}
                    data-px-source-height={frameHeight}
                    data-px-sprite-scale="1"
                    alt={`${clipLabel} frame ${idx + 1}`}
                  />
                  {thumbWeapon && frameWidth === 96 && (
                    <img
                      className="pixel-art px-animator__thumb-weapon"
                      src={thumbWeapon}
                      width={96}
                      height={96}
                      data-px-source-width={96}
                      data-px-source-height={96}
                      data-px-sprite-scale="1"
                      alt=""
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="px-animator__controls" role="group" aria-label="Điều khiển khung hình và công cụ soi">
          <button
            type="button"
            className="px-forge-btn"
            aria-pressed={playing}
            onClick={() => setPlaying((prev) => !prev)}
          >
            {playing ? "⏸ Tạm dừng" : "▶ Phát tự động"}
          </button>
          <button
            type="button"
            className="px-forge-btn"
            onClick={() => {
              setPlaying(false);
              setFrameIndex((prev) => (prev - 1 + safeCount) % safeCount);
            }}
          >
            ◀ Frame trước
          </button>
          <button
            type="button"
            className="px-forge-btn"
            onClick={() => {
              setPlaying(false);
              setFrameIndex((prev) => (prev + 1) % safeCount);
            }}
          >
            Frame tiếp ▶
          </button>
          <button
            type="button"
            className="px-forge-btn"
            aria-pressed={onionSkin}
            onClick={() => setOnionSkin((prev) => !prev)}
          >
            {onionSkin ? "✓ Onion-Skin" : "○ Onion-Skin"}
          </button>
          {frameWidth === 96 && (
            <button
              type="button"
              className="px-forge-btn"
              aria-pressed={showGuides}
              onClick={() => setShowGuides((prev) => !prev)}
            >
              {showGuides ? `✓ Vạch Y=${baselineY}` : `○ Vạch Y=${baselineY}`}
            </button>
          )}
          {vfxFrames.length > 0 && (
            <button
              type="button"
              className="px-forge-btn"
              aria-pressed={localVfxMode !== "off"}
              onClick={() =>
                setLocalVfxMode((prev) => (prev === "auto" ? "always" : prev === "always" ? "off" : "auto"))
              }
            >
              VFX: {localVfxMode === "auto" ? "Theo đòn" : localVfxMode === "always" ? "Luôn bật" : "Tắt"}
            </button>
          )}
          <button
            type="button"
            className="px-forge-btn"
            onClick={() =>
              setSpeedMultiplier((prev) => (prev === 1 ? 0.5 : prev === 0.5 ? 2 : 1))
            }
          >
            Tốc độ: {speedMultiplier}×
          </button>
        </div>
      </div>
    );
  },
);

const RARITY_MARKERS: Record<PixelRarityTier, { stars: string; label: string }> = {
  common: { stars: "★", label: "COMMON" },
  rare: { stars: "★★", label: "RARE" },
  epic: { stars: "★★★", label: "EPIC" },
  ssr: { stars: "★★★★", label: "SSR LEGEND" },
  ur: { stars: "★★★★★", label: "UR MYTHIC" },
};

export interface PixelGachaCardProps extends HTMLAttributes<HTMLElement> {
  name: string;
  subtitle: string;
  rarity: PixelRarityTier;
  elementLabel: string;
  spriteSrc: string;
  spriteWidth?: 32 | 64 | 96;
  spriteHeight?: 32 | 64 | 96;
  spriteScale?: 1 | 2;
  foilActive?: boolean;
  summonVfxFrames?: readonly string[];
  stats: readonly { label: string; value: string }[];
}

export const PixelGachaCard = forwardRef<HTMLElement, PixelGachaCardProps>(function PixelGachaCard(
  {
    className,
    name,
    subtitle,
    rarity,
    elementLabel,
    spriteSrc,
    spriteWidth = 96,
    spriteHeight = 96,
    spriteScale = 1,
    foilActive = true,
    summonVfxFrames = [],
    stats,
    ...props
  },
  ref,
) {
  const rarityInfo = RARITY_MARKERS[rarity];
  const [summonStep, setSummonStep] = useState<number | null>(null);
  const [foilEnabled, setFoilEnabled] = useState(foilActive);

  useEffect(() => {
    setFoilEnabled(foilActive);
  }, [foilActive]);

  useEffect(() => {
    if (summonStep === null || summonVfxFrames.length === 0) return undefined;
    if (summonStep >= summonVfxFrames.length * 2) {
      setSummonStep(null);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setSummonStep((prev) => (prev === null ? null : prev + 1));
    }, 110);
    return () => window.clearTimeout(timer);
  }, [summonStep, summonVfxFrames.length]);

  const activeSummonSrc =
    summonStep !== null && summonVfxFrames.length > 0
      ? summonVfxFrames[summonStep % summonVfxFrames.length]
      : undefined;

  return (
    <article
      ref={ref}
      className={cx("px-gacha-card", className)}
      data-px-rarity={rarity}
      data-px-foil={foilEnabled || undefined}
      {...props}
    >
      <div className="px-gacha-card__inner">
        <header className="px-gacha-card__header">
          <span className="px-rarity-pill" data-px-rarity={rarity}>
            <span aria-hidden="true">{rarityInfo.stars}</span> {rarityInfo.label}
          </span>
          <small className="px-gacha-card__element">{elementLabel}</small>
        </header>

        <div className="px-gacha-card__stage">
          {foilEnabled && <span className="px-gacha-card__foil-tag">✦ FOIL HOLO</span>}
          <img
            className="pixel-art px-gacha-card__sprite"
            src={spriteSrc}
            width={spriteWidth * spriteScale}
            height={spriteHeight * spriteScale}
            data-px-source-width={spriteWidth}
            data-px-source-height={spriteHeight}
            data-px-sprite-scale={spriteScale}
            alt={name}
          />
          {activeSummonSrc && (
            <img
              className="pixel-art px-gacha-card__vfx"
              src={activeSummonSrc}
              width={128}
              height={128}
              data-px-source-width={64}
              data-px-source-height={64}
              data-px-sprite-scale="2"
              alt=""
            />
          )}
        </div>

        <div className="px-gacha-card__identity">
          <h4>{name}</h4>
          <p>{subtitle}</p>
        </div>

        <dl className="px-gacha-card__stats">
          {stats.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>

        {summonVfxFrames.length > 0 && (
          <div className="px-gacha-card__actions">
            <button
              type="button"
              className="px-forge-btn"
              aria-pressed={summonStep !== null}
              onClick={() => setSummonStep(0)}
            >
              {summonStep !== null ? "✦ Đang Triệu Hồi..." : "✦ Kích Hoạt Triệu Hồi"}
            </button>
            <button
              type="button"
              className="px-forge-btn"
              aria-pressed={foilEnabled}
              onClick={() => setFoilEnabled((prev) => !prev)}
            >
              {foilEnabled ? "✓ Lớp Foil Lăng Kính" : "○ Lớp Foil Lăng Kính"}
            </button>
          </div>
        )}
      </div>
    </article>
  );
});

const DEFAULT_WANG_MAP: readonly (readonly number[])[] = [
  [0, 1, 1, 1, 0, 0, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 0, 1, 1, 0, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
];

function computeWangBitmask(grid: readonly (readonly number[])[], x: number, y: number): number {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const isConnectedStone = (tx: number, ty: number) => {
    if (tx < 0 || tx >= w || ty < 0 || ty >= h) return false;
    return grid[ty][tx] === 1;
  };
  let mask = 0;
  if (isConnectedStone(x, y - 1)) mask |= 1;
  if (isConnectedStone(x + 1, y)) mask |= 2;
  if (isConnectedStone(x, y + 1)) mask |= 4;
  if (isConnectedStone(x - 1, y)) mask |= 8;
  return mask;
}

export interface PixelTilemapViewProps extends HTMLAttributes<HTMLDivElement> {
  autotileSheetSrc: string;
  mapPreviewSrc: string;
  parallaxCompositeSrc: string;
  parallaxSkySrc?: string;
  parallaxRuinsSrc?: string;
  parallaxGroundSrc?: string;
  initialGrid?: readonly (readonly number[])[];
  biomeElement?: string;
  stageWidth?: number;
  stageHeight?: number;
}

function SeamlessParallaxStrip({
  src,
  stageWidth,
  stageHeight,
  offsetPx,
  alt,
}: {
  src: string;
  stageWidth: number;
  stageHeight: number;
  offsetPx: number;
  alt: string;
}) {
  return (
    <>
      <img
        className="pixel-art px-tilemap-view__layer px-tilemap-view__layer--mirror"
        src={src}
        width={stageWidth}
        height={stageHeight}
        data-px-source-width={stageWidth}
        data-px-source-height={stageHeight}
        data-px-sprite-scale="1"
        style={{ insetInlineStart: `${offsetPx - stageWidth}px`, insetBlockStart: "0px" }}
        alt=""
      />
      <img
        className="pixel-art px-tilemap-view__layer"
        src={src}
        width={stageWidth}
        height={stageHeight}
        data-px-source-width={stageWidth}
        data-px-source-height={stageHeight}
        data-px-sprite-scale="1"
        style={{ insetInlineStart: `${offsetPx}px`, insetBlockStart: "0px" }}
        alt={alt}
      />
      <img
        className="pixel-art px-tilemap-view__layer px-tilemap-view__layer--mirror"
        src={src}
        width={stageWidth}
        height={stageHeight}
        data-px-source-width={stageWidth}
        data-px-source-height={stageHeight}
        data-px-sprite-scale="1"
        style={{ insetInlineStart: `${offsetPx + stageWidth}px`, insetBlockStart: "0px" }}
        alt=""
      />
    </>
  );
}

export const PixelTilemapView = forwardRef<HTMLDivElement, PixelTilemapViewProps>(function PixelTilemapView(
  {
    className,
    autotileSheetSrc,
    mapPreviewSrc,
    parallaxCompositeSrc,
    parallaxSkySrc,
    parallaxRuinsSrc,
    parallaxGroundSrc,
    initialGrid,
    biomeElement = "solar",
    stageWidth = 256,
    stageHeight = 144,
    ...props
  },
  ref,
) {
  const canonicalGrid = initialGrid && initialGrid.length > 0 ? initialGrid : DEFAULT_WANG_MAP;
  const [viewMode, setViewMode] = useState<"parallax" | "autotile">("parallax");
  const [panX, setPanX] = useState(0);
  const [showSky, setShowSky] = useState(true);
  const [showRuins, setShowRuins] = useState(true);
  const [showGround, setShowGround] = useState(true);
  const [wangGrid, setWangGrid] = useState<number[][]>(() => canonicalGrid.map((row) => [...row]));
  const [copiedMapTag, setCopiedMapTag] = useState(false);
  const [lastTileInfo, setLastTileInfo] = useState("Đồng bộ 1:1 với gridLayout • Nhấp ô để đổi Nền Đá / Trụ Độc Lập / Vực Thẳm");

  useEffect(() => {
    setWangGrid(canonicalGrid.map((row) => [...row]));
  }, [canonicalGrid]);

  const wangCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sheetImgRef = useRef<HTMLImageElement | null>(null);
  const [sheetLoaded, setSheetLoaded] = useState(false);

  const gridRows = wangGrid.length || 6;
  const gridCols = wangGrid[0]?.length || 10;
  const mapWidthPx = gridCols * 16;
  const mapHeightPx = gridRows * 16;

  useEffect(() => {
    let active = true;
    setSheetLoaded(false);
    const img = new Image();
    img.src = autotileSheetSrc;
    img.onload = () => {
      if (!active) return;
      sheetImgRef.current = img;
      setSheetLoaded(true);
    };
    return () => {
      active = false;
    };
  }, [autotileSheetSrc]);

  useEffect(() => {
    if (viewMode !== "autotile" || !wangCanvasRef.current || !sheetLoaded || !sheetImgRef.current) return;
    const ctx = wangCanvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, mapWidthPx, mapHeightPx);

    for (let y = 0; y < wangGrid.length; y++) {
      for (let x = 0; x < wangGrid[y].length; x++) {
        const px = x * 16;
        const py = y * 16;
        const cell = wangGrid[y][x];
        if (cell === 1) {
          const bitmask = computeWangBitmask(wangGrid, x, y);
          const sx = (bitmask % 4) * 16;
          const sy = Math.floor(bitmask / 4) * 16;
          ctx.drawImage(sheetImgRef.current, sx, sy, 16, 16, px, py, 16, 16);
        } else if (cell === 0) {
          // Matches world_and_atlas.py tiles[0] (isolated stone pillar / alcove)
          ctx.drawImage(sheetImgRef.current, 0, 0, 16, 16, px, py, 16, 16);
        } else {
          // Sample 1x1 biome chasm pixel from tile[0] (15, 7) -> zero hardcoded hex!
          ctx.drawImage(sheetImgRef.current, 15, 7, 1, 1, px, py, 16, 16);
        }
      }
    }
  }, [viewMode, wangGrid, sheetLoaded, mapWidthPx, mapHeightPx]);

  const handleWangCanvasClick = (event: MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const gx = Math.min(gridCols - 1, Math.max(0, Math.floor(((event.clientX - rect.left) / rect.width) * gridCols)));
    const gy = Math.min(gridRows - 1, Math.max(0, Math.floor(((event.clientY - rect.top) / rect.height) * gridRows)));
    setWangGrid((prev) => {
      const next = prev.map((r) => [...r]);
      const cur = next[gy][gx];
      // Cycle: 1 (Connected Stone) -> -1 (Abyss Chasm) -> 0 (Isolated Pillar) -> 1
      const nextVal = cur === 1 ? -1 : cur === -1 ? 0 : 1;
      next[gy][gx] = nextVal;
      const bm = computeWangBitmask(next, gx, gy);
      const stateLabel =
        nextVal === 1
          ? `Nền Đá Liền Khối • Wang Bitmask #${bm} (0b${bm.toString(2).padStart(4, "0")})`
          : nextVal === 0
            ? "Trụ Đá Độc Lập (Tile #0)"
            : "Vực Thẳm Hắc Diện";
      setLastTileInfo(`Ô (${gx}, ${gy}) → ${stateLabel}`);
      return next;
    });
  };

  const hasSeparateLayers = Boolean(parallaxSkySrc && parallaxRuinsSrc && parallaxGroundSrc);

  return (
    <div ref={ref} className={cx("px-tilemap-view", className)} {...props}>
      <div className="px-tilemap-view__toolbar" role="group" aria-label="Chế độ xem bản đồ">
        <button
          type="button"
          className="px-forge-btn"
          aria-pressed={viewMode === "parallax"}
          onClick={() => setViewMode("parallax")}
        >
          Sân Đấu 3 Lớp Parallax ({stageWidth}×{stageHeight})
        </button>
        <button
          type="button"
          className="px-forge-btn"
          aria-pressed={viewMode === "autotile"}
          onClick={() => setViewMode("autotile")}
        >
          Vẽ Bản Đồ 16-Tile Wang Autotile
        </button>
      </div>

      {viewMode === "parallax" ? (
        <div className="px-tilemap-view__parallax-panel">
          <div className="px-tilemap-view__stage-scroll">
            <div
              className="px-tilemap-view__stage-box"
              style={{ inlineSize: `${stageWidth}px`, blockSize: `${stageHeight}px` }}
            >
              {hasSeparateLayers ? (
                <>
                  {showSky && parallaxSkySrc && (
                    <SeamlessParallaxStrip
                      src={parallaxSkySrc}
                      stageWidth={stageWidth}
                      stageHeight={stageHeight}
                      offsetPx={Math.round(panX * 0.2)}
                      alt="Sky Far (0.2x)"
                    />
                  )}
                  {showRuins && parallaxRuinsSrc && (
                    <SeamlessParallaxStrip
                      src={parallaxRuinsSrc}
                      stageWidth={stageWidth}
                      stageHeight={stageHeight}
                      offsetPx={Math.round(panX * 0.55)}
                      alt="Ruins Mid (0.55x)"
                    />
                  )}
                  {showGround && parallaxGroundSrc && (
                    <SeamlessParallaxStrip
                      src={parallaxGroundSrc}
                      stageWidth={stageWidth}
                      stageHeight={stageHeight}
                      offsetPx={panX}
                      alt="Arena Ground (1.0x)"
                    />
                  )}
                </>
              ) : (
                <SeamlessParallaxStrip
                  src={parallaxCompositeSrc}
                  stageWidth={stageWidth}
                  stageHeight={stageHeight}
                  offsetPx={panX}
                  alt="Sân đấu tổng hợp"
                />
              )}
            </div>
          </div>

          <div className="px-tilemap-view__scrubber">
            <label className="px-tilemap-view__slider-label">
              <span>
                Cuộn Camera Ngang Liền Mạch (Pan X: {panX}px • Sky {Math.round(panX * 0.2)}px / Ruins {Math.round(panX * 0.55)}px)
              </span>
              <input
                type="range"
                min={-64}
                max={64}
                step={4}
                value={panX}
                onChange={(e) => setPanX(Number(e.target.value))}
              />
            </label>
            <div className="px-tilemap-view__toolbar">
              <button type="button" className="px-forge-btn" aria-pressed={showSky} onClick={() => setShowSky((v) => !v)}>
                {showSky ? "✓ Sky Far (0.2×)" : "○ Sky Far"}
              </button>
              <button type="button" className="px-forge-btn" aria-pressed={showRuins} onClick={() => setShowRuins((v) => !v)}>
                {showRuins ? "✓ Ruins Mid (0.55×)" : "○ Ruins Mid"}
              </button>
              <button type="button" className="px-forge-btn" aria-pressed={showGround} onClick={() => setShowGround((v) => !v)}>
                {showGround ? "✓ Arena Ground (1×)" : "○ Arena Ground"}
              </button>
              {panX !== 0 && (
                <button type="button" className="px-forge-btn" onClick={() => setPanX(0)}>
                  ↺ Về tâm (0px)
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="px-tilemap-view__grid">
          <div className="px-tilemap-view__card">
            <small>16-Tile Bitmask Sheet (64×64) & Bản Đồ Gốc</small>
            <img
              className="pixel-art"
              src={autotileSheetSrc}
              width={64}
              height={64}
              data-px-source-width={64}
              data-px-source-height={64}
              data-px-sprite-scale="1"
              alt="Bảng 16 ô gạch Wang Autotile"
            />
            <img
              className="pixel-art"
              src={mapPreviewSrc}
              width={mapWidthPx}
              height={mapHeightPx}
              data-px-source-width={mapWidthPx}
              data-px-source-height={mapHeightPx}
              data-px-sprite-scale="1"
              alt="Bản đồ xuất mặc định"
            />
          </div>
          <div className="px-tilemap-view__card">
            <small>{lastTileInfo}</small>
            <canvas
              ref={wangCanvasRef}
              className="pixel-art px-tilemap-view__painter"
              width={mapWidthPx}
              height={mapHeightPx}
              data-px-source-width={mapWidthPx}
              data-px-source-height={mapHeightPx}
              data-px-sprite-scale="1"
              style={{ inlineSize: `${mapWidthPx}px`, blockSize: `${mapHeightPx}px` }}
              onClick={handleWangCanvasClick}
              title="Nhấp chuột để đặt/xóa gạch nền & tính tự động bitmask"
            />
            <div className="px-tilemap-view__toolbar">
              <button
                type="button"
                className="px-forge-btn"
                onClick={() => {
                  setWangGrid(canonicalGrid.map((r) => [...r]));
                  setLastTileInfo(`Đã khôi phục bố cục gridLayout chuẩn (${gridCols}×${gridRows})`);
                }}
              >
                ↺ Khôi phục Sân chuẩn
              </button>
              <button
                type="button"
                className="px-forge-btn"
                onClick={() => {
                  setWangGrid(
                    Array.from({ length: gridRows }, (_, y) =>
                      Array.from({ length: gridCols }, (_, x) =>
                        y === 0 || y === gridRows - 1 || x === 0 || x === gridCols - 1 ? 1 : -1,
                      ),
                    ),
                  );
                  setLastTileInfo("Đã tạo khung đấu trường viền đá bao quanh vực thẳm");
                }}
              >
                Đấu Trường Viền Đá
              </button>
              <button
                type="button"
                className="px-forge-btn"
                onClick={() => {
                  const bitmaskMatrix = wangGrid.map((row, ry) =>
                    row.map((cell, rx) => (cell === 1 ? computeWangBitmask(wangGrid, rx, ry) : cell === 0 ? 0 : -1)),
                  );
                  const payload = JSON.stringify(
                    {
                      schema: "pixel-forge-wang16-tilemap-v1",
                      biomeElement,
                      tileSize: 16,
                      cols: gridCols,
                      rows: gridRows,
                      gridLayout: wangGrid,
                      wangBitmaskMatrix: bitmaskMatrix,
                    },
                    null,
                    2,
                  );
                  navigator.clipboard?.writeText(payload).catch(() => undefined);
                  setCopiedMapTag(true);
                  window.setTimeout(() => setCopiedMapTag(false), 1600);
                  setLastTileInfo(`Đã sao chép JSON bản đồ (${gridCols}×${gridRows} • Biome: ${biomeElement.toUpperCase()})`);
                }}
              >
                {copiedMapTag ? "✓ Đã Chép JSON" : `📋 Chép Map (${biomeElement.toUpperCase()})`}
              </button>
              <button
                type="button"
                className="px-forge-btn"
                onClick={() => {
                  const bitmaskMatrix = wangGrid.map((row, ry) =>
                    row.map((cell, rx) => (cell === 1 ? computeWangBitmask(wangGrid, rx, ry) : cell === 0 ? 0 : -1)),
                  );
                  const blob = new Blob(
                    [
                      JSON.stringify(
                        {
                          schema: "pixel-forge-wang16-tilemap-v1",
                          biomeElement,
                          tileSize: 16,
                          cols: gridCols,
                          rows: gridRows,
                          gridLayout: wangGrid,
                          wangBitmaskMatrix: bitmaskMatrix,
                        },
                        null,
                        2,
                      ),
                    ],
                    { type: "application/json" },
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `autotile-map-${biomeElement}.json`;
                  a.click();
                  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                ⬇ Xuất Map JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export interface PixelLightingPreviewProps extends HTMLAttributes<HTMLDivElement> {
  diffuseSrc: string;
  normalSrc: string;
  specularSrc: string;
  emissiveSrc: string;
}

function readImagePixels(src: string, size: number): Promise<Uint8ClampedArray | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      const off = document.createElement("canvas");
      off.width = size;
      off.height = size;
      const ctx = off.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, size, size);
      resolve(ctx.getImageData(0, 0, size, size).data);
    };
    img.onerror = () => resolve(null);
  });
}

export const PixelLightingPreview = forwardRef<HTMLDivElement, PixelLightingPreviewProps>(
  function PixelLightingPreview(
    { className, diffuseSrc, normalSrc, specularSrc, emissiveSrc, ...props },
    ref,
  ) {
    const [activeChannel, setActiveChannel] = useState<"realtime" | "diffuse" | "normal" | "specular" | "emissive">("realtime");
    const [lightX, setLightX] = useState(32);
    const [lightY, setLightY] = useState(28);
    const [ambientPct, setAmbientPct] = useState(32);
    const [shaderBuffers, setShaderBuffers] = useState<{
      diffuse: Uint8ClampedArray;
      normal: Uint8ClampedArray;
      specular: Uint8ClampedArray;
      emissive: Uint8ClampedArray;
    } | null>(null);
    const shaderCanvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
      let active = true;
      Promise.all([
        readImagePixels(diffuseSrc, 96),
        readImagePixels(normalSrc, 96),
        readImagePixels(specularSrc, 96),
        readImagePixels(emissiveSrc, 96),
      ]).then(([d, n, s, e]) => {
        if (!active || !d || !n || !s || !e) return;
        setShaderBuffers({ diffuse: d, normal: n, specular: s, emissive: e });
      });
      return () => {
        active = false;
      };
    }, [diffuseSrc, normalSrc, specularSrc, emissiveSrc]);

    useEffect(() => {
      if (activeChannel !== "realtime" || !shaderBuffers || !shaderCanvasRef.current) return;
      const ctx = shaderCanvasRef.current.getContext("2d");
      if (!ctx) return;
      const out = ctx.createImageData(96, 96);
      const { diffuse, normal, specular, emissive } = shaderBuffers;
      const amb = ambientPct / 100;

      for (let y = 0; y < 96; y++) {
        for (let x = 0; x < 96; x++) {
          const i = (y * 96 + x) * 4;
          const a = diffuse[i + 3];
          if (a < 128) {
            out.data[i + 3] = 0;
            continue;
          }
          const nx = (normal[i] / 255) * 2 - 1;
          const ny = -((normal[i + 1] / 255) * 2 - 1);
          const nz = Math.max(0.1, (normal[i + 2] / 255) * 2 - 1);
          const dx = (lightX - x) / 48;
          const dy = (lightY - y) / 48;
          const dz = 0.68;
          const len = Math.hypot(dx, dy, dz) || 1;
          const lx = dx / len;
          const ly = dy / len;
          const lz = dz / len;
          const ndotl = Math.max(0, nx * lx + ny * ly + nz * lz);
          const distAtten = Math.max(0.25, 1.35 - Math.hypot(dx, dy) * 0.6);
          const litFactor = Math.min(1.65, amb + ndotl * 1.15 * distAtten);
          const specPower = Math.pow(Math.max(0, nx * lx * 0.7 + ny * ly * 0.7 + nz * lz), 12) * (specular[i] / 255) * 90;

          const er = emissive[i];
          const eg = emissive[i + 1];
          const eb = emissive[i + 2];

          out.data[i] = Math.min(255, Math.round(diffuse[i] * litFactor + specPower + er * 0.9));
          out.data[i + 1] = Math.min(255, Math.round(diffuse[i + 1] * litFactor + specPower + eg * 0.9));
          out.data[i + 2] = Math.min(255, Math.round(diffuse[i + 2] * litFactor + specPower + eb * 0.95));
          out.data[i + 3] = 255;
        }
      }
      ctx.putImageData(out, 0, 0);
    }, [activeChannel, shaderBuffers, lightX, lightY, ambientPct]);

    const handlePointerMove = useCallback(
      (event: MouseEvent<HTMLCanvasElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const px = Math.min(95, Math.max(0, Math.round(((event.clientX - rect.left) / rect.width) * 95)));
        const py = Math.min(95, Math.max(0, Math.round(((event.clientY - rect.top) / rect.height) * 95)));
        setLightX(px);
        setLightY(py);
      },
      [],
    );

    const channels = useMemo(
      () => [
        { id: "realtime" as const, label: "★ Shader 2.5D Realtime", src: diffuseSrc },
        { id: "diffuse" as const, label: "Diffuse (Gốc)", src: diffuseSrc },
        { id: "normal" as const, label: "Normal 2.5D", src: normalSrc },
        { id: "specular" as const, label: "Specular (Thép)", src: specularSrc },
        { id: "emissive" as const, label: "Emissive (Phát Sáng)", src: emissiveSrc },
      ],
      [diffuseSrc, normalSrc, specularSrc, emissiveSrc],
    );
    const selected = channels.find((c) => c.id === activeChannel) ?? channels[0];

    return (
      <div ref={ref} className={cx("px-lighting-preview", className)} {...props}>
        <div className="px-lighting-preview__tabs" role="group" aria-label="Kênh bản đồ ánh sáng 2.5D">
          {channels.map((ch) => (
            <button
              key={ch.id}
              type="button"
              className="px-forge-btn"
              aria-pressed={activeChannel === ch.id}
              onClick={() => setActiveChannel(ch.id)}
            >
              {ch.label}
            </button>
          ))}
        </div>
        <div
          className={cx(
            "px-lighting-preview__stage",
            (activeChannel === "emissive" || activeChannel === "realtime") && "px-lighting-preview__stage--obsidian",
          )}
        >
          {activeChannel === "realtime" ? (
            <div className="px-lighting-preview__canvas-wrap">
              <canvas
                ref={shaderCanvasRef}
                className="pixel-art"
                width={96}
                height={96}
                data-px-source-width={96}
                data-px-source-height={96}
                data-px-sprite-scale="2"
                style={{ inlineSize: "192px", blockSize: "192px" }}
                onMouseMove={handlePointerMove}
                onClick={handlePointerMove}
                title="Rê hoặc nhấp chuột lên nhân vật để di chuyển nguồn đèn điểm 2.5D"
              />
              <span
                className="px-lighting-preview__light-dot"
                style={{
                  insetInlineStart: `${Math.min(184, Math.max(0, lightX * 2 - 4))}px`,
                  insetBlockStart: `${Math.min(184, Math.max(0, lightY * 2 - 4))}px`,
                }}
                aria-hidden="true"
              />
            </div>
          ) : (
            <img
              className="pixel-art"
              src={selected.src}
              width={192}
              height={192}
              data-px-source-width={96}
              data-px-source-height={96}
              data-px-sprite-scale="2"
              alt={selected.label}
            />
          )}
          <div className="px-lighting-preview__info">
            <strong>{selected.label}</strong>
            <p>
              {activeChannel === "realtime"
                ? `Đèn điểm tại (${lightX}, ${lightY}) • Ambient ${ambientPct}%. Di chuột hoặc kéo thanh trượt bên dưới để xem giáp thép bắt sáng Specular + mắt/kiếm Emissive trong bóng tối!`
                : "Tất cả 4 kênh ánh sáng dùng chung tọa độ khung bao cắt sát Alpha (Trimmed Multi-Map Rect) trên Texture Atlas (2px Extrude) để nạp trực tiếp vào Godot 4 CanvasTexture hoặc Unity 6 URP 2D Lights."}
            </p>
            {activeChannel === "realtime" && (
              <div className="px-lighting-preview__sliders">
                <label>
                  <span>Đèn X ({lightX})</span>
                  <input type="range" min={4} max={92} value={lightX} onChange={(e) => setLightX(Number(e.target.value))} />
                </label>
                <label>
                  <span>Đèn Y ({lightY})</span>
                  <input type="range" min={4} max={92} value={lightY} onChange={(e) => setLightY(Number(e.target.value))} />
                </label>
                <label>
                  <span>Môi trường ({ambientPct}%)</span>
                  <input type="range" min={10} max={90} value={ambientPct} onChange={(e) => setAmbientPct(Number(e.target.value))} />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);

export interface PixelAtlasFrameMeta {
  id: string;
  category: string;
  clipId?: string | null;
  durationMs?: number;
  deduplicated?: boolean;
  frame: { x: number; y: number; w: number; h: number };
  trimmedSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
  pivot: { x: number; y: number };
}

export interface PixelAtlasInspectorProps extends HTMLAttributes<HTMLDivElement> {
  diffuseSrc: string;
  normalSrc: string;
  emissiveSrc: string;
  atlasWidth: number;
  atlasHeight: number;
  extrudePx?: number;
  frames: readonly PixelAtlasFrameMeta[];
}

export const PixelAtlasInspector = forwardRef<HTMLDivElement, PixelAtlasInspectorProps>(
  function PixelAtlasInspector(
    {
      className,
      diffuseSrc,
      normalSrc,
      emissiveSrc,
      atlasWidth,
      atlasHeight,
      extrudePx = 2,
      frames,
      ...props
    },
    ref,
  ) {
    const [channel, setChannel] = useState<"diffuse" | "normal" | "emissive">("diffuse");
    const [showBoxes, setShowBoxes] = useState(true);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
    const atlasCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const zoomCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const loadedImgRef = useRef<HTMLImageElement | null>(null);
    const [imgReady, setImgReady] = useState(false);

    const activeSrc = channel === "normal" ? normalSrc : channel === "emissive" ? emissiveSrc : diffuseSrc;
    const safeIdx = frames.length > 0 ? Math.min(selectedIdx, frames.length - 1) : 0;
    const activeFrame = frames[hoveredIdx ?? safeIdx] ?? null;

    useEffect(() => {
      let alive = true;
      setImgReady(false);
      const img = new Image();
      img.src = activeSrc;
      img.onload = () => {
        if (!alive) return;
        loadedImgRef.current = img;
        setImgReady(true);
      };
      return () => {
        alive = false;
      };
    }, [activeSrc]);

    useEffect(() => {
      if (!atlasCanvasRef.current || !imgReady || !loadedImgRef.current) return;
      const ctx = atlasCanvasRef.current.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, atlasWidth, atlasHeight);
      ctx.drawImage(loadedImgRef.current, 0, 0, atlasWidth, atlasHeight);

      if (showBoxes) {
        frames.forEach((f, idx) => {
          const isSel = idx === safeIdx;
          const isHov = idx === hoveredIdx;
          if (isSel || isHov) {
            // 2px Extrude bleed zone indicator
            ctx.strokeStyle = "#46d9e8";
            ctx.lineWidth = 1;
            ctx.strokeRect(
              f.frame.x - extrudePx + 0.5,
              f.frame.y - extrudePx + 0.5,
              f.frame.w + extrudePx * 2 - 1,
              f.frame.h + extrudePx * 2 - 1,
            );
            // Trimmed Alpha Bounding Box
            ctx.strokeStyle = isSel ? "#ffe066" : "#65d47a";
            ctx.lineWidth = 2;
            ctx.strokeRect(f.frame.x + 1, f.frame.y + 1, Math.max(2, f.frame.w - 2), Math.max(2, f.frame.h - 2));
          } else {
            ctx.strokeStyle = "rgba(145, 171, 195, 0.32)";
            ctx.lineWidth = 1;
            ctx.strokeRect(f.frame.x + 0.5, f.frame.y + 0.5, f.frame.w - 1, f.frame.h - 1);
          }
        });
      }
    }, [atlasWidth, atlasHeight, extrudePx, frames, hoveredIdx, imgReady, safeIdx, showBoxes]);

    useEffect(() => {
      if (!zoomCanvasRef.current || !imgReady || !loadedImgRef.current || !activeFrame) return;
      const ctx = zoomCanvasRef.current.getContext("2d");
      if (!ctx) return;
      const sw = activeFrame.sourceSize.w || 96;
      const sh = activeFrame.sourceSize.h || 96;
      zoomCanvasRef.current.width = sw;
      zoomCanvasRef.current.height = sh;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, sw, sh);
      // Reconstruct original untrimmed canvas position + pivot crosshair
      ctx.drawImage(
        loadedImgRef.current,
        activeFrame.frame.x,
        activeFrame.frame.y,
        activeFrame.frame.w,
        activeFrame.frame.h,
        activeFrame.trimmedSourceSize.x,
        activeFrame.trimmedSourceSize.y,
        activeFrame.trimmedSourceSize.w,
        activeFrame.trimmedSourceSize.h,
      );
      const px = activeFrame.pivot.x;
      const py = activeFrame.pivot.y;
      ctx.fillStyle = "#ff5c66";
      if (py >= 0 && py < sh) ctx.fillRect(0, py, sw, 1);
      if (px >= 0 && px < sw) ctx.fillRect(px, 0, 1, sh);
    }, [activeFrame, imgReady]);

    const hitTestAtlas = useCallback(
      (event: MouseEvent<HTMLCanvasElement>, commitSelection: boolean) => {
        if (frames.length === 0) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const ax = Math.floor(((event.clientX - rect.left) / rect.width) * atlasWidth);
        const ay = Math.floor(((event.clientY - rect.top) / rect.height) * atlasHeight);
        const foundIdx = frames.findIndex(
          (f) => ax >= f.frame.x && ax < f.frame.x + f.frame.w && ay >= f.frame.y && ay < f.frame.y + f.frame.h,
        );
        if (foundIdx >= 0) {
          setHoveredIdx(foundIdx);
          if (commitSelection) setSelectedIdx(foundIdx);
        } else if (!commitSelection) {
          setHoveredIdx(null);
        }
      },
      [atlasWidth, atlasHeight, frames],
    );

    const previewScale = activeFrame && activeFrame.sourceSize.w <= 64 ? 2 : 2;
    const dispW = (activeFrame?.sourceSize.w ?? 96) * previewScale;
    const dispH = (activeFrame?.sourceSize.h ?? 96) * previewScale;

    return (
      <div ref={ref} className={cx("px-atlas-inspector", className)} {...props}>
        <div className="px-tilemap-view__toolbar" role="group" aria-label="Kênh Multi-Map Atlas">
          {(["diffuse", "normal", "emissive"] as const).map((ch) => (
            <button
              key={ch}
              type="button"
              className="px-forge-btn"
              aria-pressed={channel === ch}
              onClick={() => setChannel(ch)}
            >
              Atlas: {ch.toUpperCase()}
            </button>
          ))}
          <button
            type="button"
            className="px-forge-btn"
            aria-pressed={showBoxes}
            onClick={() => setShowBoxes((v) => !v)}
          >
            {showBoxes ? "✓ Khung Cắt Alpha & Extrude" : "○ Ẩn Khung Cắt"}
          </button>
        </div>

        {frames.length > 0 && (
          <div className="px-atlas-inspector__controls">
            <label className="px-atlas-inspector__select-wrap">
              <span>Chọn Sprite Trong Atlas ({safeIdx + 1}/{frames.length}):</span>
              <select
                className="px-atlas-inspector__select"
                value={safeIdx}
                onChange={(e) => {
                  setSelectedIdx(Number(e.target.value));
                  setHoveredIdx(null);
                }}
              >
                {frames.map((f, idx) => (
                  <option key={`${f.id}-${idx}`} value={idx}>
                    #{String(idx + 1).padStart(2, "0")} • {f.id} [{f.category}] ({f.frame.w}×{f.frame.h}px
                    {f.deduplicated ? " • DEDUP" : ""})
                  </option>
                ))}
              </select>
            </label>
            <div className="px-tilemap-view__toolbar">
              <button
                type="button"
                className="px-forge-btn"
                onClick={() => setSelectedIdx((prev) => (prev - 1 + frames.length) % frames.length)}
              >
                ◀ Sprite Trước
              </button>
              <button
                type="button"
                className="px-forge-btn"
                onClick={() => setSelectedIdx((prev) => (prev + 1) % frames.length)}
              >
                Sprite Tiếp ▶
              </button>
            </div>
          </div>
        )}

        {activeFrame && (
          <div className="px-atlas-inspector__detail">
            <div className="px-atlas-inspector__zoom-box">
              <canvas
                ref={zoomCanvasRef}
                className="pixel-art"
                width={activeFrame.sourceSize.w}
                height={activeFrame.sourceSize.h}
                data-px-source-width={activeFrame.sourceSize.w}
                data-px-source-height={activeFrame.sourceSize.h}
                data-px-sprite-scale={previewScale}
                style={{ inlineSize: `${dispW}px`, blockSize: `${dispH}px` }}
              />
            </div>
            <div className="px-atlas-inspector__meta">
              <strong>
                {activeFrame.id} {activeFrame.deduplicated ? "• [KHỬ TRÙNG DÙNG CHUNG Ô ATLAS]" : ""}
              </strong>
              <p>
                <code>
                  region = Rect2({activeFrame.frame.x}, {activeFrame.frame.y}, {activeFrame.frame.w},{" "}
                  {activeFrame.frame.h})
                </code>
              </p>
              <p>
                <code>
                  margin = Rect2({activeFrame.trimmedSourceSize.x}, {activeFrame.trimmedSourceSize.y},{" "}
                  {activeFrame.sourceSize.w - activeFrame.trimmedSourceSize.w},{" "}
                  {activeFrame.sourceSize.h - activeFrame.trimmedSourceSize.h})
                </code>
              </p>
              <small>
                Khung gốc: {activeFrame.sourceSize.w}×{activeFrame.sourceSize.h}px • Tâm Pivot: (
                {activeFrame.pivot.x}, {activeFrame.pivot.y}) • Extrude: {extrudePx}px
              </small>
            </div>
          </div>
        )}

        <div className="px-tilemap-view__stage-scroll">
          <canvas
            ref={atlasCanvasRef}
            className="pixel-art px-tilemap-view__painter"
            width={atlasWidth}
            height={atlasHeight}
            data-px-source-width={atlasWidth}
            data-px-source-height={atlasHeight}
            data-px-sprite-scale="1"
            style={{ inlineSize: `${atlasWidth}px`, blockSize: `${atlasHeight}px` }}
            onMouseMove={(e) => hitTestAtlas(e, false)}
            onMouseLeave={() => setHoveredIdx(null)}
            onClick={(e) => hitTestAtlas(e, true)}
            title="Rê hoặc nhấp chuột vào từng mảnh cắt trong Atlas để soi tọa độ Region, Margin & Pivot"
          />
        </div>
      </div>
    );
  },
);

export interface PixelChromaLabProps extends HTMLAttributes<HTMLDivElement> {
  rawSrc: string;
  slotLabel?: string;
}

export const PixelChromaLab = forwardRef<HTMLDivElement, PixelChromaLabProps>(function PixelChromaLab(
  { className, rawSrc, slotLabel = "01_idle_f0", ...props },
  ref,
) {
  const [tolerance, setTolerance] = useState(44);
  const [despillPct, setDespillPct] = useState(80);
  const [showBaseline, setShowBaseline] = useState(true);
  const [stats, setStats] = useState({ opaquePx: 0, despilledPx: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rawImgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    const img = new Image();
    img.src = rawSrc;
    img.onload = () => {
      if (!active) return;
      rawImgRef.current = img;
      setLoaded(true);
    };
    return () => {
      active = false;
    };
  }, [rawSrc]);

  useEffect(() => {
    if (!loaded || !rawImgRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 96, 96);
    ctx.drawImage(rawImgRef.current, 0, 0, 96, 96);
    const imgData = ctx.getImageData(0, 0, 96, 96);
    const d = imgData.data;
    let opaqueCount = 0;
    let despillCount = 0;
    const tolSq = (tolerance * 3.1) ** 2;
    const despillStrength = despillPct / 100;

    for (let y = 0; y < 96; y++) {
      for (let x = 0; x < 96; x++) {
        const i = (y * 96 + x) * 4;
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        const a = d[i + 3];
        if (a < 128) {
          d[i + 3] = 0;
          continue;
        }
        // Perceptual chroma-green distance to pure #00FF00 (0, 255, 0)
        const dr = r;
        const dg = 255 - g;
        const db = b;
        const distSq = dr * dr * 0.95 + dg * dg * 1.15 + db * db * 0.95;
        const greenExcess = g - Math.max(r, b);
        if (distSq <= tolSq && greenExcess >= 36) {
          d[i] = 0;
          d[i + 1] = 0;
          d[i + 2] = 0;
          d[i + 3] = 0;
          continue;
        }
        if (greenExcess > 18 && despillStrength > 0) {
          d[i + 1] = Math.round(g - greenExcess * despillStrength);
          despillCount++;
        }
        d[i + 3] = 255;
        opaqueCount++;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    if (showBaseline) {
      ctx.fillStyle = "rgba(255, 92, 102, 0.85)";
      ctx.fillRect(0, 88, 96, 1);
    }
    setStats({ opaquePx: opaqueCount, despilledPx: despillCount });
  }, [loaded, tolerance, despillPct, showBaseline]);

  return (
    <div ref={ref} className={cx("px-chroma-lab", className)} {...props}>
      <div className="px-lighting-preview__stage px-lighting-preview__stage--obsidian">
        <canvas
          ref={canvasRef}
          className="pixel-art"
          width={96}
          height={96}
          data-px-source-width={96}
          data-px-source-height={96}
          data-px-sprite-scale="2"
          style={{ inlineSize: "192px", blockSize: "192px" }}
        />
        <div className="px-lighting-preview__info">
          <strong>Bàn Thử Nghiệm Tách Nền #00FF00 Trực Quan ({slotLabel})</strong>
          <p>
            Alpha nhị phân <code>{"{0, 255}"}</code> • Pixel đặc: <strong>{stats.opaquePx}px</strong> • Khử viền xanh:{" "}
            <strong>{stats.despilledPx}px</strong>
          </p>
          <div className="px-lighting-preview__sliders">
            <label>
              <span>Delta-E ({tolerance})</span>
              <input
                type="range"
                min={16}
                max={72}
                value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value))}
              />
            </label>
            <label>
              <span>Despill ({despillPct}%)</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={despillPct}
                onChange={(e) => setDespillPct(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="px-tilemap-view__toolbar">
            <button
              type="button"
              className="px-forge-btn"
              aria-pressed={showBaseline}
              onClick={() => setShowBaseline((v) => !v)}
            >
              {showBaseline ? "✓ Vạch Chân Y=88" : "○ Vạch Chân Y=88"}
            </button>
            <button
              type="button"
              className="px-forge-btn"
              onClick={() => {
                if (!canvasRef.current) return;
                const url = canvasRef.current.toDataURL("image/png");
                const a = document.createElement("a");
                a.href = url;
                a.download = `cleaned-${slotLabel}.png`;
                a.click();
              }}
            >
              ⬇ Tải PNG Sạch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
