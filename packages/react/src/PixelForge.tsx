import {
  forwardRef,
  useEffect,
  useState,
  type HTMLAttributes,
} from "react";
import { cx } from "./utils";

export type PixelRarityTier = "common" | "rare" | "epic" | "ssr" | "ur";

export interface PixelSocketPin {
  id: string;
  x: number;
  y: number;
  angleDeg: number;
  zOrder: number;
  visible: boolean;
}

export interface PixelActionTiming {
  windupFrames: number;
  hitFrame: number;
  recoveryFrames: number;
  hitStopMs: number;
  screenShakePx: number;
}

export interface PixelPaperdollLayerItem {
  id: string;
  label: string;
  src: string;
  width: 64 | 96;
  height: 64 | 96;
  enabled: boolean;
}

export interface PixelPaperdollProps extends HTMLAttributes<HTMLDivElement> {
  layers: readonly PixelPaperdollLayerItem[];
  sockets?: readonly PixelSocketPin[];
  showSockets?: boolean;
  scale?: 1 | 2;
}

export const PixelPaperdoll = forwardRef<HTMLDivElement, PixelPaperdollProps>(function PixelPaperdoll(
  { className, layers, sockets = [], showSockets = false, scale = 1, ...props },
  ref,
) {
  const stageSize = 96 * scale;
  const bodyOffset = 16 * scale;

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
        const offset = layer.width === 64 ? bodyOffset : 0;
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
            style={{ insetInlineStart: `${offset}px`, insetBlockStart: `${offset}px` }}
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
              <b className="px-socket-pin__tag">{socket.id}</b>
            </span>
          ) : null,
        )}
    </div>
  );
});

export interface PixelSpriteAnimatorProps extends HTMLAttributes<HTMLDivElement> {
  clipLabel: string;
  frames: readonly string[];
  vfxFrames?: readonly string[];
  showVfx?: boolean;
  fps?: number;
  frameWidth?: 64 | 96;
  frameHeight?: 64 | 96;
  timing?: PixelActionTiming;
  baselineY?: number;
  weaponOverlaySrc?: string;
  weaponTransforms?: readonly { dx: number; dy: number; rotDeg: number }[];
}

const DEFAULT_WEAPON_TRANSFORMS = [
  { dx: 0, dy: 0, rotDeg: 0 },
  { dx: -10, dy: -12, rotDeg: -35 },
  { dx: 12, dy: 8, rotDeg: 45 },
  { dx: 0, dy: -2, rotDeg: 0 },
] as const;

export const PixelSpriteAnimator = forwardRef<HTMLDivElement, PixelSpriteAnimatorProps>(
  function PixelSpriteAnimator(
    {
      className,
      clipLabel,
      frames,
      vfxFrames = [],
      showVfx = false,
      fps = 8,
      frameWidth = 96,
      frameHeight = 96,
      timing,
      baselineY = 88,
      weaponOverlaySrc,
      weaponTransforms = DEFAULT_WEAPON_TRANSFORMS,
      ...props
    },
    ref,
  ) {
    const [playing, setPlaying] = useState(true);
    const [frameIndex, setFrameIndex] = useState(0);
    const [onionSkin, setOnionSkin] = useState(false);
    const [showGuides, setShowGuides] = useState(true);
    const [speedMultiplier, setSpeedMultiplier] = useState<0.5 | 1 | 2>(1);

    const safeCount = Math.max(1, frames.length);
    const currentIndex = frameIndex % safeCount;
    const prevIndex = (currentIndex - 1 + safeCount) % safeCount;
    const effectiveFps = Math.max(1, Math.round(fps * speedMultiplier));

    useEffect(() => {
      if (!playing || safeCount <= 1) return undefined;
      if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        return undefined;
      }
      const intervalMs = Math.max(40, Math.round(1000 / effectiveFps));
      const timer = window.setInterval(() => {
        setFrameIndex((prev) => (prev + 1) % safeCount);
      }, intervalMs);
      return () => window.clearInterval(timer);
    }, [playing, safeCount, effectiveFps]);

    const currentSrc = frames[currentIndex] ?? frames[0];
    const prevSrc = frames[prevIndex] ?? frames[0];
    const currentVfxSrc = vfxFrames.length > 0 ? vfxFrames[currentIndex % vfxFrames.length] : undefined;

    return (
      <div ref={ref} className={cx("px-animator", className)} {...props}>
        <div className="px-animator__viewport">
          <div
            className="px-animator__canvas"
            style={{ inlineSize: `${frameWidth}px`, blockSize: `${frameHeight}px` }}
          >
            {onionSkin && safeCount > 1 && prevSrc && (
              <img
                className="pixel-art px-animator__onion"
                src={prevSrc}
                width={frameWidth}
                height={frameHeight}
                data-px-source-width={frameWidth}
                data-px-source-height={frameHeight}
                data-px-sprite-scale="1"
                alt=""
              />
            )}
            {currentSrc && (
              <img
                className="pixel-art px-animator__sprite"
                src={currentSrc}
                width={frameWidth}
                height={frameHeight}
                data-px-source-width={frameWidth}
                data-px-source-height={frameHeight}
                data-px-sprite-scale="1"
                alt={clipLabel}
              />
            )}
            {weaponOverlaySrc && frameWidth === 96 && (
              <img
                className="pixel-art px-animator__weapon"
                src={weaponOverlaySrc}
                width={96}
                height={96}
                data-px-source-width={96}
                data-px-source-height={96}
                data-px-sprite-scale="1"
                style={{
                  transformOrigin: "50px 56px",
                  transform: `translate(${weaponTransforms[currentIndex % weaponTransforms.length]?.dx ?? 0}px, ${weaponTransforms[currentIndex % weaponTransforms.length]?.dy ?? 0}px) rotate(${weaponTransforms[currentIndex % weaponTransforms.length]?.rotDeg ?? 0}deg)`,
                }}
                alt=""
              />
            )}
            {showVfx && currentVfxSrc && (
              <img
                className="pixel-art px-animator__vfx"
                src={currentVfxSrc}
                width={64}
                height={64}
                data-px-source-width={64}
                data-px-source-height={64}
                data-px-sprite-scale="1"
                style={{ insetInlineStart: "16px", insetBlockStart: "16px" }}
                alt=""
              />
            )}
            {showGuides && frameWidth === 96 && (
              <>
                <span
                  className="px-animator__guide-x"
                  style={{ insetInlineStart: "48px" }}
                  title="Trục trọng tâm X=48"
                />
                <span
                  className="px-animator__guide-y"
                  style={{ insetBlockStart: `${baselineY}px` }}
                  title={`Vạch khóa gót chân Y=${baselineY}`}
                />
              </>
            )}
          </div>
          <div className="px-animator__meta">
            <div className="px-animator__header">
              <strong className="px-animator__title">{clipLabel}</strong>
              <output className="px-animator__counter" aria-label={`Khung hiện tại ${currentIndex + 1} trên ${safeCount}`}>
                Frame 0{currentIndex + 1} / 0{safeCount} • {effectiveFps} FPS ({speedMultiplier}×)
              </output>
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
          {frames.map((frameSrc, idx) => (
            <button
              key={frameSrc}
              type="button"
              className="px-animator__thumb"
              aria-pressed={currentIndex === idx}
              onClick={() => {
                setPlaying(false);
                setFrameIndex(idx);
              }}
            >
              <span className="px-animator__thumb-label">F0{idx + 1}</span>
              <img
                className="pixel-art"
                src={frameSrc}
                width={64}
                height={64}
                data-px-source-width={frameWidth}
                data-px-source-height={frameHeight}
                data-px-sprite-scale="1"
                alt={`${clipLabel} frame ${idx + 1}`}
              />
            </button>
          ))}
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
            {onionSkin ? "✓ Bóng mờ Onion-Skin" : "○ Bóng mờ Onion-Skin"}
          </button>
          {frameWidth === 96 && (
            <button
              type="button"
              className="px-forge-btn"
              aria-pressed={showGuides}
              onClick={() => setShowGuides((prev) => !prev)}
            >
              {showGuides ? `✓ Thước Chân Y=${baselineY}` : `○ Thước Chân Y=${baselineY}`}
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
  foilActive?: boolean;
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
    foilActive = true,
    stats,
    ...props
  },
  ref,
) {
  const rarityInfo = RARITY_MARKERS[rarity];

  return (
    <article
      ref={ref}
      className={cx("px-gacha-card", className)}
      data-px-rarity={rarity}
      data-px-foil={foilActive || undefined}
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
          <img
            className="pixel-art px-gacha-card__sprite"
            src={spriteSrc}
            width={spriteWidth}
            height={spriteHeight}
            data-px-source-width={spriteWidth}
            data-px-source-height={spriteHeight}
            data-px-sprite-scale="1"
            alt={name}
          />
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
      </div>
    </article>
  );
});

export interface PixelTilemapViewProps extends HTMLAttributes<HTMLDivElement> {
  autotileSheetSrc: string;
  mapPreviewSrc: string;
  parallaxCompositeSrc: string;
}

export const PixelTilemapView = forwardRef<HTMLDivElement, PixelTilemapViewProps>(function PixelTilemapView(
  { className, autotileSheetSrc, mapPreviewSrc, parallaxCompositeSrc, ...props },
  ref,
) {
  const [viewMode, setViewMode] = useState<"autotile" | "parallax">("parallax");

  return (
    <div ref={ref} className={cx("px-tilemap-view", className)} {...props}>
      <div className="px-tilemap-view__toolbar" role="group" aria-label="Chế độ xem bản đồ">
        <button
          type="button"
          className="px-forge-btn"
          aria-pressed={viewMode === "parallax"}
          onClick={() => setViewMode("parallax")}
        >
          Sân Đấu Nhà Thờ Gothic (AI Stage)
        </button>
        <button
          type="button"
          className="px-forge-btn"
          aria-pressed={viewMode === "autotile"}
          onClick={() => setViewMode("autotile")}
        >
          Bản Đồ 16-Tile Wang Autotile
        </button>
      </div>

      <div className="px-tilemap-view__grid">
        <div className="px-tilemap-view__card">
          <small>16-Tile Bitmask Sheet (64×64 px)</small>
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
        </div>
        <div className="px-tilemap-view__card">
          <small>
            {viewMode === "autotile"
              ? "Bản Đồ Ghép Tự Động Theo Bitmask (160×96 px)"
              : "Cảnh Sân Đấu Đấu Trường Hiệp Sĩ (160×96 px)"}
          </small>
          <img
            className="pixel-art"
            src={viewMode === "autotile" ? mapPreviewSrc : parallaxCompositeSrc}
            width={160}
            height={96}
            data-px-source-width={160}
            data-px-source-height={96}
            data-px-sprite-scale="1"
            alt="Bản đồ kết xuất"
          />
        </div>
      </div>
    </div>
  );
});

export interface PixelLightingPreviewProps extends HTMLAttributes<HTMLDivElement> {
  diffuseSrc: string;
  normalSrc: string;
  specularSrc: string;
  emissiveSrc: string;
}

export const PixelLightingPreview = forwardRef<HTMLDivElement, PixelLightingPreviewProps>(
  function PixelLightingPreview(
    { className, diffuseSrc, normalSrc, specularSrc, emissiveSrc, ...props },
    ref,
  ) {
    const [activeChannel, setActiveChannel] = useState<"diffuse" | "normal" | "specular" | "emissive">("normal");
    const channels = [
      { id: "diffuse" as const, label: "Diffuse (Màu Gốc)", src: diffuseSrc },
      { id: "normal" as const, label: "Normal Map 2.5D", src: normalSrc },
      { id: "specular" as const, label: "Specular (Phản Xạ Thép)", src: specularSrc },
      { id: "emissive" as const, label: "Emissive (Phát Sáng)", src: emissiveSrc },
    ];
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
        <div className="px-lighting-preview__stage">
          <img
            className="pixel-art"
            src={selected.src}
            width={96}
            height={96}
            data-px-source-width={96}
            data-px-source-height={96}
            data-px-sprite-scale="1"
            alt={selected.label}
          />
          <div className="px-lighting-preview__info">
            <strong>{selected.label}</strong>
            <p>
              Tất cả 4 kênh ánh sáng dùng chung tọa độ khung bao (Multi-Map Bounding Rect) trên Texture Atlas 384×384px để nạp trực tiếp vào Godot 4 CanvasTexture hoặc Unity 6 URP 2D Lights.
            </p>
          </div>
        </div>
      </div>
    );
  },
);
