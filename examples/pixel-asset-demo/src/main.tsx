import { StrictMode, useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { createRoot } from "react-dom/client";
import {
  pixelDensities,
  pixelGridOptions,
  pixelModes,
  pixelThemes,
  type PixelDensity,
  type PixelGrid,
  type PixelMode,
  type PixelTheme,
} from "@pixel-ui/core";
import {
  PixelAssetFrame,
  PixelAtlasInspector,
  PixelBadge,
  PixelButton,
  PixelCard,
  PixelCheckbox,
  PixelChromaLab,
  PixelCompactFrame,
  PixelContentPanel,
  PixelCounter,
  PixelCurrency,
  PixelDepositButton,
  PixelDivider,
  PixelFrame,
  PixelGachaCard,
  PixelIcon,
  PixelIconButton,
  PixelInput,
  PixelLightingPreview,
  PixelMeter,
  PixelModal,
  PixelNavigationItem,
  PixelOrnateButton,
  PixelOrnateFrame,
  PixelPanel,
  PixelPaperdoll,
  PixelProgress,
  PixelRadio,
  PixelSelect,
  PixelSlot,
  PixelSprite,
  PixelSpriteAnimator,
  PixelState,
  PixelStatus,
  PixelSwitch,
  PixelTab,
  PixelTabList,
  PixelTable,
  PixelTextarea,
  PixelTilemapView,
  PixelToast,
  PixelToolbar,
  PixelTooltip,
  PixelWindow,
  usePixelSpriteProcessor,
  type PixelActionTiming,
  type PixelAssetFamily,
  type PixelAssetTone,
  type PixelAtlasFrameMeta,
  type PixelIconAsset,
  type PixelOrnament,
  type PixelOrnateDetail,
  type PixelOrnateTone,
  type PixelPaperdollLayerItem,
  type PixelRarityTier,
  type PixelSocketPin,
  type PixelSpriteTransformOptions,
  type PixelVfxTriggerMode,
} from "@pixel-ui/react";

import "@pixel-ui/core/styles.css";
import "@pixel-ui/react/styles.css";
import "@pixel-ui/react/asset-styles.css";
import "@pixel-ui/themes/ornamental.css";
import "@pixel-ui/themes/sci-fi.css";
import "@pixel-ui/themes/fantasy.css";
import "@pixel-ui/themes/cyberpunk.css";
import "@pixel-ui/themes/terminal.css";
import "@pixel-ui/themes/arcade.css";
import "@pixel-ui/themes/industrial.css";
import "@pixel-ui/themes/minimal.css";
import "@pixel-ui/themes/pixel-assets.css";
import "./styles.css";

const DEFAULT_FORGE_ROOT = "/assets/pixel-forge/generated";

type ForgeTabId =
  | "overview"
  | "stage-1-raw"
  | "stage-2-paperdoll"
  | "stage-3-motion"
  | "stage-4-bible"
  | "stage-5-world"
  | "stage-6-export"
  | "ui-kit-showcase";

type DirectionKey = "S" | "SE" | "E" | "NE" | "N" | "NW" | "W" | "SW";
type TintLayerKey = "10_body" | "20_iris" | "30_outfit" | "40_hair";

interface LayerSpecJson {
  id: string;
  role: string;
  zIndex: number;
  width: 64 | 96;
  height: 64 | 96;
  offsetX: number;
  offsetY: number;
  pivotX: number;
  pivotY: number;
  tintable: boolean;
  file: string;
}

interface RawFrameItemJson {
  slot: string;
  title: string;
  rawFile: string;
  cleanedFile: string;
  unarmedFile?: string;
  rawSize: [number, number];
  cleanedSize: [number, number];
  note: string;
}

interface WeaponArsenalItemJson {
  id: string;
  name: string;
  rarity: string;
  layerFile: string;
}

interface DirectionMetaItemJson {
  source: "ai-source" | "dorsal-pixel" | "mirror-flip";
  label: string;
  mirrorOf: DirectionKey | null;
}

interface CharacterBibleJson {
  totalPanels: number;
  expressions: { id: string; label: string; file: string; size: 48 }[];
  skins: { id: string; label: string; file: string; size: 96 }[];
  chibi: { file: string; size: 64; label: string };
}

interface ClipJson {
  label: string;
  strip: string;
  frames: string[];
  unarmedFrames?: string[];
  framePoseTags?: string[];
  fps: number;
  loop: boolean;
  regionMasked: boolean;
  crawlPixelsSuppressed: number;
  timing: PixelActionTiming;
}

interface VfxJson {
  name: string;
  category: string;
  colorStrip: string;
  emissiveStrip: string;
  compositeStrip: string;
  frames: string[];
  fps: number;
  craftChecksPassed: number;
}

interface LootJson {
  id: string;
  name: string;
  category: string;
  rarity: PixelRarityTier;
  material: string;
  size: 32;
  file: string;
}

interface QualityCheckJson {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

interface ForgeManifestJson {
  schemaVersion: number;
  buildRevision?: number;
  assetProvenance?: string;
  rawAiDir?: string;
  fileSlug?: string;
  rawSlotProvenance?: Record<string, string>;
  character: {
    id: string;
    name: string;
    title: string;
    rarity: PixelRarityTier;
    masterStill: string;
    damagedStill: string;
    normalMap: string;
    specularMap: string;
    emissiveMap: string;
    damagedBboxDeltaPx: number;
    bodyCanvas: [number, number];
    weaponCanvas: [number, number];
    footBaselineY: number;
    paletteHex: string[];
  };
  layers: Record<string, string>;
  layerSpecs: LayerSpecJson[];
  masks: Record<string, string>;
  rawThumbnails: Record<string, string>;
  rawFrames?: RawFrameItemJson[];
  weaponArsenal?: WeaponArsenalItemJson[];
  weaponPoses: Record<string, Record<string, string>>;
  sockets: PixelSocketPin[];
  elements: Record<string, { label: string; file: string }>;
  directions: Record<DirectionKey, string>;
  directionMeta?: Record<DirectionKey, DirectionMetaItemJson>;
  characterBible?: CharacterBibleJson;
  clips: Record<string, ClipJson>;
  vfx: Record<string, VfxJson>;
  loot: LootJson[];
  world: {
    tilesetId: string;
    tilesetName: string;
    biomeElement?: string;
    stageWidth: number;
    stageHeight: number;
    autotileSheet: string;
    mapPreview: string;
    gridLayout?: number[][];
    parallaxSky: string;
    parallaxRuins: string;
    parallaxArena: string;
    parallaxComposite: string;
    tileMeta?: {
      mask: number;
      binary: string;
      neighbors: { N: boolean; E: boolean; S: boolean; W: boolean };
      sheetX: number;
      sheetY: number;
    }[];
  };
  atlas: {
    diffuse: string;
    normal: string;
    emissive: string;
    width: number;
    height: number;
    extrudePx: number;
    frameCount: number;
    deduplicatedFrames: number;
    bundleZip?: string;
    bundleZipBytes?: number;
    frames?: PixelAtlasFrameMeta[];
    exports: {
      aseprite: string;
      unity: string;
      godot: string;
    };
  };
  qualityReport: {
    score: number;
    allPassed: boolean;
    checks: QualityCheckJson[];
    globalPaletteCount: number;
    paletteRgb: number[][];
  };
}

interface PromptStageJson {
  title: string;
  prompt: string;
  constraints: string[];
}

interface ForgePromptsJson {
  schemaVersion: number;
  selectedProvider: string;
  availableProviders: {
    id: string;
    label: string;
    status: string;
    cost: string;
    capabilities: string[];
  }[];
  negativePrompt: string;
  stages: Record<string, PromptStageJson>;
  lootPrompts: {
    id: string;
    name: string;
    rarity: string;
    category: string;
    canvas: string;
    prompt: string;
  }[];
}

interface BatchUnitJson {
  id: string;
  fileSlug?: string;
  name: string;
  title: string;
  classRole: string;
  rarity: PixelRarityTier;
  baseElement: string;
  rawAiDir?: string;
  outputDir: string;
  manifestUrl?: string;
  promptsUrl?: string;
  assetProvenance: "ai-native" | "class-rig-synthesized";
  buildRevision?: number;
  alphaDiffFromMaster: number;
  headgearSpec?: string;
  silhouette?: string;
  weaponSpec: string;
  skills: string[];
  previewSprite: string;
  attackFrame: string;
  chibiSprite?: string;
  normalMap: string;
  emissiveMap: string;
  atlasDiffuse: string;
  promptCount: number;
  prompts: {
    slot: string;
    file: string;
    label: string;
    prompt: string;
  }[];
  qualityScore: number;
  allPassed: boolean;
}

interface BatchManifestJson {
  rosterVersion: number;
  buildRevision?: number;
  lastUpdatedUnitId?: string;
  totalUnits: number;
  allUnitsPassed: boolean;
  averageScore: number;
  units: BatchUnitJson[];
}

type IdeEditorKey = "antigravity" | "cursor" | "codex";
type IdePackScope = "fast4" | "full10" | "single";
type IdeTargetMode = "existing" | "custom";

interface CustomHeroDraft {
  id: string;
  name: string;
  title: string;
  classRole: string;
  rarity: PixelRarityTier;
  baseElement: "solar" | "fire" | "ice" | "shadow" | "emerald";
  headgearSpec: string;
  silhouette: string;
  weaponSpec: string;
}

const CUSTOM_HERO_PRESETS: readonly CustomHeroDraft[] = [
  {
    id: "hero-thunder-shogun",
    name: "Kiếm Thánh Lôi Điện",
    title: "Tướng Quân Thiên Lôi",
    classRole: "Burst / Blademaster",
    rarity: "ur",
    baseElement: "solar",
    headgearSpec: "Horned golden Raijin kabuto helmet with glowing electric-cyan visor",
    silhouette:
      "Horned golden Raijin kabuto helmet, lacquered indigo-gold samurai o-yoroi armor, crackling thunder drum haori cloak",
    weaponSpec: "Oversized lightning-wreathed Odachi katana in right gauntlet",
  },
  {
    id: "hero-astral-oracle",
    name: "Thánh Nữ Tinh Tú",
    title: "Tiên Tri Ngân Hà",
    classRole: "Support / Mystic",
    rarity: "ssr",
    baseElement: "ice",
    headgearSpec: "Floating crescent starlight halo crown with silver veil",
    silhouette:
      "Floating crescent starlight halo crown, celestial sapphire-white ceremonial vestments, hovering astrolabe rings",
    weaponSpec: "Oversized crystalline Star-Weaver Scepter in right hand",
  },
  {
    id: "hero-abyss-reaper",
    name: "Ma Thần Vực Thẳm",
    title: "Kẻ Phán Quyết Hắc Tinh",
    classRole: "Bruiser / Executioner",
    rarity: "ur",
    baseElement: "shadow",
    headgearSpec: "Crowned obsidian dread-helm with blazing violet eye slits",
    silhouette:
      "Crowned obsidian dread-helm, spiked void-iron plate armor, tattered spectral shadow wings on shoulders",
    weaponSpec: "Oversized amethyst Soul-Cleaver Halberd in right hand",
  },
];

const CORE_HERO_IDS = new Set([
  "hero-paladin-knight",
  "hero-crimson-valkyrie",
  "hero-frost-archmage",
  "hero-shadow-assassin",
  "hero-emerald-ranger",
]);

function fileToPngDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const srcUrl = String(reader.result ?? "");
      if (srcUrl.startsWith("data:image/png;base64,")) {
        resolve(srcUrl);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 96;
        canvas.height = img.naturalHeight || 96;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context unavailable"));
          return;
        }
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("Không đọc được file ảnh"));
      img.src = srcUrl;
    };
    reader.onerror = () => reject(new Error("Lỗi đọc file"));
    reader.readAsDataURL(file);
  });
}

function normalizeUnitSlug(unitId: string): string {
  const clean = unitId.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const fullId = clean.startsWith("hero-") ? clean : `hero-${clean || "custom-unit"}`;
  return fullId === "hero-paladin-knight" ? "knight" : fullId.replace(/^hero-/, "").replace(/-/g, "_");
}

function normalizeHeroId(unitId: string): string {
  const clean = unitId.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return clean.startsWith("hero-") ? clean : `hero-${clean || "custom-unit"}`;
}

function buildUnit10PromptsClient(draft: CustomHeroDraft): { slot: string; file: string; label: string; prompt: string }[] {
  const unitId = normalizeHeroId(draft.id);
  const slug = normalizeUnitSlug(unitId);
  const rarityUpper = draft.rarity.toUpperCase();
  const baseStyle = `16-bit SNES/GBA pixel art RPG character sprite of ${draft.name} (${rarityUpper}), 3/4 front-right tactical RPG view, wearing ${draft.silhouette}, wielding ${draft.weaponSpec}, crisp pixel art clusters, dark pixel outlines, isolated on solid flat pure bright green chroma key background #00FF00`;

  return [
    {
      slot: "01_idle_f0",
      file: `${slug}_idle_f0.png`,
      label: "Frame 1: Idle Guard (F0)",
      prompt: `${baseStyle}, standing combat ready pose, feet planted on baseline Y=88.`,
    },
    {
      slot: "02_idle_f1",
      file: `${slug}_idle_f1.png`,
      label: "Frame 2: Idle Breath (F1)",
      prompt: `${baseStyle}, subtle breathing combat stance, mantle billowing slightly, runes glowing brighter.`,
    },
    {
      slot: "03_walk_f0",
      file: `${slug}_walk_f0.png`,
      label: "Frame 3: Walk Stride Left (F0)",
      prompt: `${baseStyle}, dynamic forward walking stride with left leg stepping forward, cloak flowing.`,
    },
    {
      slot: "04_walk_f1",
      file: `${slug}_walk_f1.png`,
      label: "Frame 4: Walk Stride Right (F1)",
      prompt: `${baseStyle}, dynamic forward walking stride with right leg stepping forward, balanced weapon.`,
    },
    {
      slot: "05_attack_f0",
      file: `${slug}_attack_f0.png`,
      label: "Frame 5: Attack Overhead Windup (F0)",
      prompt: `${baseStyle}, dramatic attack windup pose raising ${draft.weaponSpec} high overhead charging elemental energy.`,
    },
    {
      slot: "06_attack_f1",
      file: `${slug}_attack_f1.png`,
      label: "Frame 6: Attack Cleave Slash (F1)",
      prompt: `${baseStyle}, explosive forward cleave swing unleashing a crescent energy slash arc.`,
    },
    {
      slot: "07_victory_f0",
      file: `${slug}_victory_f0.png`,
      label: "Frame 7: Victory Pose",
      prompt: `${baseStyle}, triumphant victory pose raising ${draft.weaponSpec} skyward with radiant aura burst.`,
    },
    {
      slot: "08_paperdoll_kit",
      file: `${slug}_paperdoll_kit.png`,
      label: "Frame 8: Modular Paper-Doll 2×2 Kit",
      prompt: `16-bit pixel art modular RPG equipment sprite sheet for ${draft.name} divided into 4 distinct quadrants on solid pure green #00FF00: Top-Left: Base body in class tunic & boots without headgear or weapon; Top-Right: Headgear (${draft.headgearSpec}) isolated; Bottom-Left: Off-hand shield/grimoire/quiver & mantle isolated; Bottom-Right: Primary weapon (${draft.weaponSpec}) isolated.`,
    },
    {
      slot: "09_loot_sheet",
      file: `${slug}_loot_sheet.png`,
      label: "Frame 9: 3×2 RPG Weapon & Relic Sheet",
      prompt: `16-bit pixel art RPG item icon sheet arranged in a 3x2 grid (6 distinct items) for ${draft.name} on solid pure green #00FF00: Row 1: Mythic UR Primary Weapon, SSR Arcane Staff, Epic Off-Hand Crest; Row 2: Rare Elixir Potion, SSR Relic Chest, Class Sigil.`,
    },
    {
      slot: "10_arena_stage",
      file: `${slug}_arena_stage.png`,
      label: "Frame 10: HD-2D Battle Arena Stage",
      prompt: `16-bit SNES/Octopath HD-2D pixel art RPG battle arena background for ${draft.name}, wide side-view perspective, ornate stone pillars, stained-glass arches, flat stone battle floor in lower third, crisp pixel art clusters.`,
    },
  ];
}

function compileIdeSkillCommandPrompt(opts: {
  editor: IdeEditorKey;
  targetMode: IdeTargetMode;
  packScope: IdePackScope;
  singleSlot: string;
  draft: CustomHeroDraft;
  existingUnit: BatchUnitJson | null;
}): {
  commandText: string;
  unitId: string;
  rawAiDir: string;
  outputDir: string;
  selectedPrompts: { slot: string; file: string; label: string; prompt: string }[];
} {
  const isCustom = opts.targetMode === "custom" || !opts.existingUnit;
  const unitId = isCustom ? normalizeHeroId(opts.draft.id) : opts.existingUnit!.id;
  const heroName = isCustom ? opts.draft.name : opts.existingUnit!.name;
  const heroTitle = isCustom ? opts.draft.title : opts.existingUnit!.title;
  const rawAiDir =
    unitId === "hero-paladin-knight"
      ? "public/assets/pixel-forge/raw_ai"
      : !isCustom && opts.existingUnit?.rawAiDir
        ? opts.existingUnit.rawAiDir
        : `public/assets/pixel-forge/batch/${unitId}/raw_ai`;
  const outputDir =
    unitId === "hero-paladin-knight"
      ? "public/assets/pixel-forge/generated"
      : !isCustom && opts.existingUnit?.outputDir
        ? opts.existingUnit.outputDir
        : `public/assets/pixel-forge/batch/${unitId}/generated`;

  const allPrompts =
    !isCustom && opts.existingUnit?.prompts?.length
      ? opts.existingUnit.prompts
      : buildUnit10PromptsClient(opts.draft);

  const fastSlots = new Set(["01_idle_f0", "05_attack_f0", "08_paperdoll_kit", "10_arena_stage"]);
  const selectedPrompts =
    opts.packScope === "fast4"
      ? allPrompts.filter((p) => fastSlots.has(p.slot))
      : opts.packScope === "single"
        ? allPrompts.filter((p) => p.slot === opts.singleSlot)
        : allPrompts;

  const ideHeader =
    opts.editor === "antigravity"
      ? "Hãy kích hoạt skill `pixel-forge-ai-gen` (`.agents/skills/pixel-forge-ai-gen/SKILL.md`) để sinh bộ ảnh Pixel Art cho dự án đang mở, lưu đúng đường dẫn và biên dịch hiển thị lên giao diện Studio:"
      : opts.editor === "cursor"
        ? "/pixel-forge-ai-gen Hãy đọc `.cursor/rules/pixel-forge-ai-gen.mdc` và `skills/pixel-forge-ai-gen/SKILL.md` để sinh bộ ảnh Pixel Art bên dưới, lưu đúng đường dẫn và biên dịch hiển thị lên giao diện Studio:"
        : "Hãy đọc `skills/pixel-forge-ai-gen/SKILL.md` để sinh bộ ảnh Pixel Art bên dưới, lưu đúng đường dẫn và chạy lệnh build-unit hiển thị lên giao diện Studio:";

  const registerPayload = {
    id: unitId,
    name: opts.draft.name,
    title: opts.draft.title,
    classRole: opts.draft.classRole,
    rarity: opts.draft.rarity,
    baseElement: opts.draft.baseElement,
    headgearSpec: opts.draft.headgearSpec,
    silhouette: opts.draft.silhouette,
    weaponSpec: opts.draft.weaponSpec,
  };

  const step1Lines = isCustom
    ? [
        "### BƯỚC 1: Đăng ký tướng mới vào `forge-roster.json` & tạo thư mục `raw_ai`",
        "Lưu JSON cấu hình bên dưới vào file tạm `.tmp/register-unit.json` rồi chạy:",
        "```bash",
        "python scripts/pixel-forge.py register-unit --spec-file .tmp/register-unit.json",
        "```",
        "`REGISTER_SPEC_JSON`:",
        "```json",
        JSON.stringify(registerPayload, null, 2),
        "```",
      ]
    : [
        `### BƯỚC 1: Xác nhận mục tiêu tướng có sẵn trong \`forge-roster.json\``,
        `- Unit ID: \`${unitId}\` (${heroName} — ${heroTitle})`,
        `- Thư mục lưu ảnh AI gốc (\`rawAiDir\`): \`${rawAiDir}\``,
      ];

  const promptLines = selectedPrompts.flatMap((p, idx) => [
    `${idx + 1}. **[${p.slot}] ${p.label}**`,
    `   - Lưu đúng đường dẫn: \`${rawAiDir}/${p.file}\``,
    `   - Prompt: \`${p.prompt}\``,
  ]);

  const buildCmd =
    unitId === "hero-paladin-knight"
      ? `python scripts/pixel-forge.py build && python scripts/pixel-forge.py build-unit --unit "${unitId}"`
      : `python scripts/pixel-forge.py build-unit --unit "${unitId}"`;

  const commandText = [
    ideHeader,
    "",
    "[PIXEL-FORGE-IDE-TASK]",
    `Target Hero : ${heroName} (${unitId})`,
    `Pack Mode   : ${opts.packScope === "fast4" ? "Fast 4 Core Plates (Auto-derives remaining motion frames)" : opts.packScope === "single" ? `Single Slot (${opts.singleSlot})` : "Full 10 Raw AI Plates"}`,
    `Raw Folder  : ${rawAiDir}`,
    `Output Dir  : ${outputDir}`,
    "",
    ...step1Lines,
    "",
    `### BƯỚC 2: Sinh ${selectedPrompts.length} tấm ảnh Pixel Art nền xanh lá thuần \`#00FF00\` & lưu đúng tên file`,
    "- Negative Constraints: `anti-aliasing, blurry edges, sub-pixel rendering, mixels, soft gradients on #00FF00 background, semi-transparent halo, baked text, watermark, cropped weapon tip, floating feet`",
    ...promptLines,
    "",
    "### BƯỚC 3: Hậu kỳ 6 công đoạn, kiểm định Quality Gate 100/100 & đẩy lên Web Studio UI",
    "Chạy lệnh dưới đây để tách nền CIELAB, khóa chân Y=88, tạo 7 lớp Paper-Doll, 5 clip động, 23 khung Bible, Atlas Godot 4 `.tres` và cập nhật `batch-manifest.json`:",
    "```bash",
    buildCmd,
    "```",
    "[/PIXEL-FORGE-IDE-TASK]",
  ].join("\n");

  return { commandText, unitId, rawAiDir, outputDir, selectedPrompts };
}

interface EngineExportDoc {
  id: "godot" | "unity" | "aseprite";
  title: string;
  file: string;
  href: string;
  content: string;
}

interface GeneratedUiMetadataJson {
  schemaVersion: number;
  source: string;
  sourceWidth: number;
  sourceHeight: number;
  backgroundRemoval: {
    strategy: string;
    defaultTolerance: number;
    alphaMode: string;
  };
  assets: {
    id: string;
    type: string;
    output: string;
    width: number;
    height: number;
    opaquePixels: number;
    alphaValues: number[];
    nineSlice?: { top: number; right: number; bottom: number; left: number };
  }[];
}

interface LoadedHeroBundle {
  assetRoot: string;
  manifest: ForgeManifestJson;
  prompts: ForgePromptsJson;
  engineDocs: EngineExportDoc[];
}

const ELEMENT_RAMPS: Record<string, readonly [string, string, string, string]> = {
  solar: ["#7a3e08", "#c97b14", "#f5be36", "#fff3a6"],
  fire: ["#6e1418", "#bf2828", "#ff5f38", "#ffd48a"],
  ice: ["#123f70", "#2278bd", "#5ad2ff", "#dcfaff"],
  shadow: ["#2c1248", "#6528a3", "#b25cff", "#f0c8ff"],
  emerald: ["#10492b", "#1e8b4e", "#54de85", "#d2ffe0"],
};

const TINT_PRESETS: Record<TintLayerKey, { label: string; maskKey: string; swatches: { name: string; hex: string }[] }> = {
  "10_body": {
    label: "10_body • Thân Giáp / Nội Y",
    maskKey: "10_body_greyscale",
    swatches: [
      { name: "Thép Bạc", hex: "#a8c5db" },
      { name: "Hoàng Kim", hex: "#f5c249" },
      { name: "Hắc Thiết", hex: "#5a6882" },
      { name: "Ngọc Lục", hex: "#52d18c" },
    ],
  },
  "20_iris": {
    label: "20_iris • Ánh Mắt Pháp Lực",
    maskKey: "20_iris_greyscale",
    swatches: [
      { name: "Lam Quang", hex: "#4ce8ff" },
      { name: "Huyết Nhãn", hex: "#ff4757" },
      { name: "Kim Nhãn", hex: "#ffd43b" },
      { name: "Tử Tinh", hex: "#c77dff" },
    ],
  },
  "30_outfit": {
    label: "30_outfit • Áo Choàng & Khiên",
    maskKey: "30_outfit_greyscale",
    swatches: [
      { name: "Lam Hoàng Gia", hex: "#3b6fd9" },
      { name: "Đỏ Thánh Chiến", hex: "#d6304a" },
      { name: "Tím Tinh Hà", hex: "#8e44ad" },
      { name: "Lục Cổ Mộc", hex: "#27ae60" },
    ],
  },
  "40_hair": {
    label: "40_hair • Mũ Giáp / Bờm Lông / Tóc",
    maskKey: "40_hair_greyscale",
    swatches: [
      { name: "Đỏ Huyết Vũ", hex: "#c92a42" },
      { name: "Bạch Kim", hex: "#e8f1f8" },
      { name: "Vàng Thái Dương", hex: "#f4b93b" },
      { name: "Băng Lam", hex: "#62c8ff" },
    ],
  },
};

const NAV_TABS: readonly { id: ForgeTabId; step: string; label: string }[] = [
  { id: "overview", step: "00 • Tổng Quan", label: "Sa Bàn Thực Chiến" },
  { id: "stage-1-raw", step: "Stage 01", label: "IDE Skill & 10 Raw AI" },
  { id: "stage-2-paperdoll", step: "Stage 02", label: "Paper-Doll & 4 Mask" },
  { id: "stage-3-motion", step: "Stage 03", label: "5 Clip, Hit-Stop & VFX" },
  { id: "stage-4-bible", step: "Stage 04", label: "Bible 23 Khung & La Bàn" },
  { id: "stage-5-world", step: "Stage 05", label: "Autotile, Parallax & 2.5D" },
  { id: "stage-6-export", step: "Stage 06", label: "Atlas, Godot 4 & Roster" },
  { id: "ui-kit-showcase", step: "Design System", label: "Pixel UI Kit & 9-Slice" },
];

const CANONICAL_6_STAGES: readonly { tab: ForgeTabId; stage: string; title: string; detail: string }[] = [
  {
    tab: "stage-1-raw",
    stage: "Stage 01",
    title: "CIELAB Chroma & 10 Khung AI",
    detail: "Tách nền #00FF00 nhị phân {0,255}, khóa chân Y=88 & 25 tư thế vũ khí lượng tử hóa.",
  },
  {
    tab: "stage-2-paperdoll",
    stage: "Stage 02",
    title: "7 Lớp Đồng Tâm & 4 Greyscale Mask",
    detail: "00_shadow..60_fx (64×64 & 96×96), 5 điểm neo Socket & nhuộm tự do 4 mặt nạ.",
  },
  {
    tab: "stage-3-motion",
    stage: "Stage 03",
    title: "Hoạt Ảnh, Hit-Stop & Dual VFX",
    detail: "5 clip chuẩn, khựng đòn Hit-Stop/Screen-Shake thật, Crawl Killer & 22/22 VFX Craft.",
  },
  {
    tab: "stage-4-bible",
    stage: "Stage 04",
    title: "Character Bible 23 Khung & Gacha",
    detail: "La bàn 8 hướng chuẩn gương, 6 biểu cảm, 3 giáp tiến hóa, 5 hệ, Chibi SD & Triệu hồi.",
  },
  {
    tab: "stage-5-world",
    stage: "Stage 05",
    title: "Wang 16-Autotile & Shader 2.5D",
    detail: "Bản đồ đồng bộ gridLayout, cuộn Parallax 3 lớp khép kín & đèn điểm Normal/Specular.",
  },
  {
    tab: "stage-6-export",
    stage: "Stage 06",
    title: "Multi-Map Atlas, Godot 4 & Batch",
    detail: "Đóng gói Alpha-Trimmed 48 khung (2px bleed), xuất SpriteFrames .tres & 5 tướng Roster.",
  },
];

const COMPASS_GRID_ORDER: readonly (DirectionKey | "CENTER")[] = [
  "NW",
  "N",
  "NE",
  "W",
  "CENTER",
  "E",
  "SW",
  "S",
  "SE",
];

function PixelGlyphSword() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges">
      <path
        fill="currentColor"
        d="M12 2h2v2h-2zM10 4h2v2h-2zM8 6h2v2H8zM6 8h2v2H6zM3 9h2v2H3zM5 11h2v2H5zM2 12h2v2H2z"
      />
    </svg>
  );
}

function PixelGlyphShield() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges">
      <path
        fill="currentColor"
        d="M3 2h10v6H11v3H9v3H7v-3H5V8H3V2zm2 2v4h2v3h2V8h2V4H5z"
      />
    </svg>
  );
}

function PixelGlyphSpark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges">
      <path
        fill="currentColor"
        d="M7 1h2v4H7zM7 11h2v4H7zM1 7h4v2H1zM11 7h4v2h-4zM5 5h6v6H5z"
      />
    </svg>
  );
}

async function fetchHeroBundle(
  assetRoot: string,
  promptsUrl?: string,
  bustRev?: number,
): Promise<LoadedHeroBundle> {
  const qs = bustRev ? `?v=${bustRev}` : "";
  const fetchInit: RequestInit | undefined = bustRev ? { cache: "no-store" } : undefined;
  const manifestRes = await fetch(`${assetRoot}/forge-manifest.json${qs}`, fetchInit);
  if (!manifestRes.ok) {
    throw new Error(`Không nạp được forge-manifest.json tại ${assetRoot}`);
  }
  const manifest = (await manifestRes.json()) as ForgeManifestJson;

  const resolvedPromptsUrl = promptsUrl ?? `${assetRoot}/forge-prompts.json`;
  const promptsRes = await fetch(`${resolvedPromptsUrl}${qs}`, fetchInit);
  const prompts = promptsRes.ok
    ? ((await promptsRes.json()) as ForgePromptsJson)
    : ({
        schemaVersion: 2,
        selectedProvider: "codeart2d",
        availableProviders: [],
        negativePrompt: "",
        stages: {},
        lootPrompts: [],
      } as ForgePromptsJson);

  const [godotText, unityText, asepriteText] = await Promise.all([
    fetch(`${assetRoot}/${manifest.atlas.exports.godot}${qs}`, fetchInit).then((r) => (r.ok ? r.text() : "")),
    fetch(`${assetRoot}/${manifest.atlas.exports.unity}${qs}`, fetchInit).then((r) => (r.ok ? r.text() : "")),
    fetch(`${assetRoot}/${manifest.atlas.exports.aseprite}${qs}`, fetchInit).then((r) => (r.ok ? r.text() : "")),
  ]);

  const engineDocs: EngineExportDoc[] = [
    {
      id: "godot",
      title: "Godot 4 SpriteFrames (.tres)",
      file: manifest.atlas.exports.godot,
      href: `${assetRoot}/${manifest.atlas.exports.godot}`,
      content: godotText,
    },
    {
      id: "unity",
      title: "Unity 6 URP 2D Secondary Textures (.json)",
      file: manifest.atlas.exports.unity,
      href: `${assetRoot}/${manifest.atlas.exports.unity}`,
      content: unityText,
    },
    {
      id: "aseprite",
      title: "Aseprite Trimmed Array Metadata (.json)",
      file: manifest.atlas.exports.aseprite,
      href: `${assetRoot}/${manifest.atlas.exports.aseprite}`,
      content: asepriteText,
    },
  ];

  return { assetRoot, manifest, prompts, engineDocs };
}

function PixelForgeStudioApp() {
  // Global Design System Render Contract state
  const [activeTheme, setActiveTheme] = useState<PixelTheme>("ornamental");
  const [activeMode, setActiveMode] = useState<PixelMode>("ornamental");
  const [activeGrid, setActiveGrid] = useState<PixelGrid>(4);
  const [activeDensity, setActiveDensity] = useState<PixelDensity>("medium");

  // Studio Navigation & Data Loading
  const [activeTab, setActiveTab] = useState<ForgeTabId>("overview");
  const [batchRoster, setBatchRoster] = useState<BatchManifestJson | null>(null);
  const [uiAssetMeta, setUiAssetMeta] = useState<GeneratedUiMetadataJson | null>(null);
  const [activeHeroId, setActiveHeroId] = useState<string>("hero-paladin-knight");
  const [heroBundle, setHeroBundle] = useState<LoadedHeroBundle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingHero, setLoadingHero] = useState<boolean>(true);

  // Unified Interactive Hero State (connected across Battle Arena + Animator + Paperdoll + Gacha!)
  const [activeClipKey, setActiveClipKey] = useState<string>("attack");
  const [equippedWeaponId, setEquippedWeaponId] = useState<string>("greatsword");
  const [activeElementKey, setActiveElementKey] = useState<string>("solar");
  const [damagedMode, setDamagedMode] = useState<boolean>(false);
  const [vfxTriggerMode, setVfxTriggerMode] = useState<PixelVfxTriggerMode>("auto");
  const [arenaPanX, setArenaPanX] = useState<number>(0);
  const [arenaPlaying, setArenaPlaying] = useState<boolean>(true);
  const [arenaFrameIdx, setArenaFrameIdx] = useState<number>(0);
  const [arenaVfxTick, setArenaVfxTick] = useState<number>(0);
  const [arenaHitStop, setArenaHitStop] = useState<boolean>(false);

  // Paperdoll Layers, Sockets & 4 Greyscale Tints
  const [showSockets, setShowSockets] = useState<boolean>(true);
  const [layerEnabled, setLayerEnabled] = useState<Record<string, boolean>>({
    "00_shadow": true,
    "10_body": true,
    "20_iris": true,
    "30_outfit": true,
    "40_hair": true,
    "50_weapon": true,
    "60_fx": true,
  });
  const [layerTints, setLayerTints] = useState<Partial<Record<TintLayerKey, string>>>({});

  // Stage-specific inspection state
  const [selectedDirection, setSelectedDirection] = useState<DirectionKey>("SE");
  const [selectedVfxId, setSelectedVfxId] = useState<string>("vfx-solar-slash");
  const [selectedEngineDocId, setSelectedEngineDocId] = useState<"godot" | "unity" | "aseprite">("godot");
  const [copiedPromptTag, setCopiedPromptTag] = useState<string | null>(null);

  // 1v1 Interactive Combat Sandbox state (Tab 00 Overview Arena)
  const [duelMode, setDuelMode] = useState<boolean>(true);
  const [opponentHeroId, setOpponentHeroId] = useState<string>("hero-crimson-valkyrie");
  const [defenderHp, setDefenderHp] = useState<number>(100);
  const [combatCombo, setCombatCombo] = useState<number>(0);

  // Two-Way Vite Dev Bridge, Drag-Drop Slot Upload & Chroma Lab state
  const [viteBridgeOnline, setViteBridgeOnline] = useState<boolean>(false);
  const [bridgeBusy, setBridgeBusy] = useState<boolean>(false);
  const [bridgeLogs, setBridgeLogs] = useState<string>("");
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [chromaLabSlot, setChromaLabSlot] = useState<string>("01_idle_f0");
  const [localChromaDataUrl, setLocalChromaDataUrl] = useState<string | null>(null);
  const slotFileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  // UI Kit Showcase Interactive State
  const [showcaseNavTone, setShowcaseNavTone] = useState<Exclude<PixelAssetTone, "currency">>("market");
  const [showcaseAssetTone, setShowcaseAssetTone] = useState<PixelAssetTone>("market");
  const [showcaseAssetFamily, setShowcaseAssetFamily] = useState<PixelAssetFamily>("content");
  const [showcaseOrnateTone, setShowcaseOrnateTone] = useState<PixelOrnateTone>("gold");
  const [showcaseOrnament, setShowcaseOrnament] = useState<PixelOrnament>("arcane");
  const [showcaseDetail, setShowcaseDetail] = useState<PixelOrnateDetail>("hero");
  const [heroCodeInput, setHeroCodeInput] = useState<string>("PALADIN-SSR-01");
  const [forgeNoteInput, setForgeNoteInput] = useState<string>(
    "Khóa Alpha nhị phân {0, 255}, chân Y=88, biên độ tối đa 19 màu trên toàn bộ 18 frame.",
  );
  const [exportTargetSelect, setExportTargetSelect] = useState<string>("godot4");
  const [autoExtrudeCheck, setAutoExtrudeCheck] = useState<boolean>(true);
  const [hysteresisSwitch, setHysteresisSwitch] = useState<boolean>(true);
  const [scaleRadio, setScaleRadio] = useState<"1x" | "2x">("2x");
  const [selectedLootId, setSelectedLootId] = useState<string>("loot-sunblade-ur");
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [goldBalance, setGoldBalance] = useState<number>(128500);

  // IDE Skill Prompt Composer & Live Disk Auto-Sync state
  const [ideEditor, setIdeEditor] = useState<IdeEditorKey>("antigravity");
  const [ideTargetMode, setIdeTargetMode] = useState<IdeTargetMode>("existing");
  const [idePackScope, setIdePackScope] = useState<IdePackScope>("fast4");
  const [ideSingleSlot, setIdeSingleSlot] = useState<string>("01_idle_f0");
  const [customDraft, setCustomDraft] = useState<CustomHeroDraft>(() => ({ ...CUSTOM_HERO_PRESETS[0] }));
  const [ideAutoSync, setIdeAutoSync] = useState<boolean>(true);
  const [assetCacheRev, setAssetCacheRev] = useState<number>(0);
  const [ideSyncToast, setIdeSyncToast] = useState<string | null>(null);
  const [syncingDisk, setSyncingDisk] = useState<boolean>(false);

  const lastKnownRevisionRef = useRef<number | null>(null);
  const activeHeroIdRef = useRef<string>(activeHeroId);
  useEffect(() => {
    activeHeroIdRef.current = activeHeroId;
  }, [activeHeroId]);

  // Sync Design System attributes onto <html>
  useEffect(() => {
    const rootEl = document.documentElement;
    rootEl.dataset.pxTheme = activeTheme;
    rootEl.dataset.pxMode = activeMode;
    rootEl.dataset.pxGrid = String(activeGrid);
    rootEl.dataset.pxDensity = activeDensity;
    rootEl.dataset.pxAssets = "pixel-ui-sheet";
  }, [activeTheme, activeMode, activeGrid, activeDensity]);

  // Initial load of Batch Roster + UI Asset Metadata + Default Hero
  useEffect(() => {
    let active = true;
    setLoadingHero(true);
    Promise.all([
      fetch("/assets/pixel-forge/batch-manifest.json").then((r) => {
        if (!r.ok) throw new Error("Không tải được batch-manifest.json");
        return r.json() as Promise<BatchManifestJson>;
      }),
      fetch("/assets/pixel-ui/generated/generated-metadata.json").then((r) =>
        r.ok ? (r.json() as Promise<GeneratedUiMetadataJson>) : null,
      ),
      fetchHeroBundle(DEFAULT_FORGE_ROOT),
    ])
      .then(([roster, uiMeta, bundle]) => {
        if (!active) return;
        lastKnownRevisionRef.current = roster.buildRevision ?? 0;
        setBatchRoster(roster);
        setUiAssetMeta(uiMeta);
        setHeroBundle(bundle);
        setLoadingHero(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : "Lỗi tải tài nguyên Pixel Forge");
        setLoadingHero(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSelectHero = useCallback(
    async (unit: BatchUnitJson, bustRev?: number) => {
      setActiveHeroId(unit.id);
      setLoadingHero(true);
      setLoadError(null);
      const assetRoot = unit.outputDir.replace(/^public/, "");
      try {
        const bundle = await fetchHeroBundle(assetRoot, unit.promptsUrl, bustRev);
        setHeroBundle(bundle);
        setActiveElementKey(unit.baseElement || "solar");
        setEquippedWeaponId("greatsword");
        setLayerTints({});
        setDamagedMode(false);
        setArenaFrameIdx(0);
        setLoadingHero(false);
      } catch (err: unknown) {
        setLoadError(err instanceof Error ? err.message : "Không nạp được dữ liệu tướng");
        setLoadingHero(false);
      }
    },
    [],
  );

  // Poll / Focus sync: automatically detects when Antigravity / Cursor / Codex finishes build-unit!
  const syncFromIdeDisk = useCallback(
    async (manualTrigger = false) => {
      if (manualTrigger) setSyncingDisk(true);
      try {
        const res = await fetch(`/assets/pixel-forge/batch-manifest.json?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          if (manualTrigger) setSyncingDisk(false);
          return;
        }
        const incoming = (await res.json()) as BatchManifestJson;
        const incomingRev = incoming.buildRevision ?? 0;
        const prevRev = lastKnownRevisionRef.current;
        const hasNewBuild = prevRev !== null && incomingRev > 0 && incomingRev !== prevRev;

        if (!hasNewBuild && !manualTrigger) {
          return;
        }

        const stamp = incomingRev || Date.now();
        lastKnownRevisionRef.current = incomingRev;
        setBatchRoster(incoming);
        setAssetCacheRev(stamp);

        const preferredId = hasNewBuild && incoming.lastUpdatedUnitId ? incoming.lastUpdatedUnitId : activeHeroIdRef.current;
        const targetUnit =
          incoming.units.find((u) => u.id === preferredId) ??
          incoming.units.find((u) => u.id === activeHeroIdRef.current) ??
          incoming.units[0];

        if (targetUnit) {
          await handleSelectHero(targetUnit, stamp);
          setIdeSyncToast(
            hasNewBuild
              ? `⚡ IDE vừa lưu & biên dịch xong: ${targetUnit.name} (${targetUnit.assetProvenance} • ${targetUnit.qualityScore}/100 PASS)`
              : `✓ Đã quét đĩa & đồng bộ ${incoming.units.length} tướng (Đang nạp: ${targetUnit.name})`,
          );
        }
      } catch {
        // Ignore transient write-in-progress JSON parse while Python is flushing manifest
      } finally {
        if (manualTrigger) setSyncingDisk(false);
      }
    },
    [handleSelectHero],
  );

  useEffect(() => {
    let active = true;
    fetch("/__pixel-forge/ping")
      .then((r) => (r.ok ? (r.json() as Promise<{ ok?: boolean }>) : null))
      .then((data) => {
        if (active && data?.ok) setViteBridgeOnline(true);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const hot = (import.meta as unknown as { hot?: { on: (ev: string, cb: () => void) => void; off?: (ev: string, cb: () => void) => void } }).hot;
    if (!hot) return undefined;
    const onPush = () => {
      void syncFromIdeDisk(false);
    };
    hot.on("pixel-forge:updated", onPush);
    return () => {
      hot.off?.("pixel-forge:updated", onPush);
    };
  }, [syncFromIdeDisk]);

  useEffect(() => {
    if (!ideAutoSync) return undefined;
    const timer = window.setInterval(() => {
      void syncFromIdeDisk(false);
    }, 3500);
    const onFocus = () => {
      void syncFromIdeDisk(false);
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [ideAutoSync, syncFromIdeDisk]);

  const activeUnitMeta = useMemo(
    () => batchRoster?.units.find((u) => u.id === activeHeroId) ?? batchRoster?.units[0] ?? null,
    [batchRoster, activeHeroId],
  );

  const opponentUnit = useMemo(() => {
    const list = batchRoster?.units ?? [];
    return (
      list.find((u) => u.id === opponentHeroId && u.id !== activeHeroId) ??
      list.find((u) => u.id !== activeHeroId) ??
      list[0] ??
      null
    );
  }, [batchRoster, opponentHeroId, activeHeroId]);

  const handleBridgeRegisterUnit = useCallback(async () => {
    setBridgeBusy(true);
    setBridgeLogs("Đang đăng ký tướng mới vào forge-roster.json & biên dịch 6 công đoạn...");
    try {
      const res = await fetch("/__pixel-forge/register-unit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spec: {
            id: normalizeHeroId(customDraft.id),
            name: customDraft.name,
            title: customDraft.title,
            classRole: customDraft.classRole,
            rarity: customDraft.rarity,
            baseElement: customDraft.baseElement,
            headgearSpec: customDraft.headgearSpec,
            silhouette: customDraft.silhouette,
            weaponSpec: customDraft.weaponSpec,
          },
          buildImmediately: true,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; logs?: string; error?: string; unitId?: string };
      setBridgeLogs(data.logs || data.error || "Hoàn tất.");
      if (data.ok) {
        if (data.unitId) activeHeroIdRef.current = data.unitId;
        await syncFromIdeDisk(true);
      }
    } catch (err: unknown) {
      setBridgeLogs(err instanceof Error ? err.message : "Lỗi kết nối Vite Bridge");
    } finally {
      setBridgeBusy(false);
    }
  }, [customDraft, syncFromIdeDisk]);

  const handleBridgeBuildUnit = useCallback(
    async (unitId: string) => {
      setBridgeBusy(true);
      setBridgeLogs(`Đang chạy hậu kỳ 6 công đoạn cho ${unitId}...`);
      try {
        const res = await fetch("/__pixel-forge/build-unit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unitId }),
        });
        const data = (await res.json()) as { ok?: boolean; logs?: string; error?: string };
        setBridgeLogs(data.logs || data.error || "Hoàn tất.");
        if (data.ok) {
          await syncFromIdeDisk(true);
        }
      } catch (err: unknown) {
        setBridgeLogs(err instanceof Error ? err.message : "Lỗi kết nối Vite Bridge");
      } finally {
        setBridgeBusy(false);
      }
    },
    [syncFromIdeDisk],
  );

  const handleBridgeDeleteUnit = useCallback(
    async (unitId: string) => {
      setBridgeBusy(true);
      try {
        const res = await fetch("/__pixel-forge/delete-unit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unitId }),
        });
        const data = (await res.json()) as { ok?: boolean; logs?: string; error?: string };
        setBridgeLogs(data.logs || data.error || "Đã xóa tướng.");
        if (data.ok) {
          activeHeroIdRef.current = "hero-paladin-knight";
          await syncFromIdeDisk(true);
        }
      } catch (err: unknown) {
        setBridgeLogs(err instanceof Error ? err.message : "Lỗi xóa tướng");
      } finally {
        setBridgeBusy(false);
      }
    },
    [syncFromIdeDisk],
  );

  const handleSlotFileDropOrPick = useCallback(
    async (slot: string, file: File) => {
      try {
        const pngDataUrl = await fileToPngDataUrl(file);
        setChromaLabSlot(slot);
        setLocalChromaDataUrl(pngDataUrl);

        if (!viteBridgeOnline) {
          setIdeSyncToast(`🔬 Đã nạp ảnh ${file.name} vào Bàn Thử Nghiệm Khử Nền (${slot})`);
          return;
        }
        const targetId = activeUnitMeta?.id ?? "hero-paladin-knight";
        const slug = normalizeUnitSlug(targetId);
        const suffix = slot.replace(/^\d+_/, "");
        const slotFileName = `${slug}_${suffix}.png`;
        const rawAiDir =
          activeUnitMeta?.rawAiDir ??
          (targetId === "hero-paladin-knight"
            ? "public/assets/pixel-forge/raw_ai"
            : `public/assets/pixel-forge/batch/${targetId}/raw_ai`);

        setBridgeBusy(true);
        setBridgeLogs(`Đang lưu ${rawAiDir}/${slotFileName} & chạy build-unit...`);
        const res = await fetch("/__pixel-forge/upload-raw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            unitId: targetId,
            rawAiDir,
            slotFileName,
            dataUrl: pngDataUrl,
            autoBuild: true,
          }),
        });
        const data = (await res.json()) as { ok?: boolean; logs?: string; error?: string };
        setBridgeLogs(data.logs || data.error || "Đã lưu & biên dịch.");
        if (data.ok) {
          await syncFromIdeDisk(true);
        }
      } catch (err: unknown) {
        setBridgeLogs(err instanceof Error ? err.message : "Lỗi xử lý file ảnh");
      } finally {
        setBridgeBusy(false);
      }
    },
    [viteBridgeOnline, activeUnitMeta, syncFromIdeDisk],
  );

  const compiledIdeTask = useMemo(
    () =>
      compileIdeSkillCommandPrompt({
        editor: ideEditor,
        targetMode: ideTargetMode,
        packScope: idePackScope,
        singleSlot: ideSingleSlot,
        draft: customDraft,
        existingUnit: activeUnitMeta,
      }),
    [ideEditor, ideTargetMode, idePackScope, ideSingleSlot, customDraft, activeUnitMeta],
  );

  const heroBaseElement = activeUnitMeta?.baseElement ?? "solar";
  const assetRoot = heroBundle?.assetRoot ?? DEFAULT_FORGE_ROOT;
  const manifest = heroBundle?.manifest ?? null;
  const prompts = heroBundle?.prompts ?? null;

  const withCacheRev = useCallback(
    (url: string) => (assetCacheRev > 0 ? `${url}${url.includes("?") ? "&" : "?"}v=${assetCacheRev}` : url),
    [assetCacheRev],
  );

  const assetUrl = useCallback(
    (file: string) => {
      const base = file.startsWith("/") ? file : `${assetRoot}/${file}`;
      return withCacheRev(base);
    },
    [assetRoot, withCacheRev],
  );

  // Build live PixelSpriteTransformOptions from ALL hero state controls!
  const spriteTransformOptions = useMemo<PixelSpriteTransformOptions>(() => {
    const elementChanged = activeElementKey !== heroBaseElement;
    return {
      tintBodyHex: layerTints["10_body"],
      tintIrisHex: layerTints["20_iris"],
      tintOutfitHex: layerTints["30_outfit"],
      tintHairHex: layerTints["40_hair"],
      elementRamp: elementChanged ? ELEMENT_RAMPS[activeElementKey] : undefined,
      damagedMode,
      hideHelmet: !layerEnabled["40_hair"],
      hideOffhand: !layerEnabled["30_outfit"],
      hideFx: !layerEnabled["60_fx"],
      helmetMaskSrc: manifest?.layers["40_hair"] ? assetUrl(manifest.layers["40_hair"]) : undefined,
      offhandMaskSrc: manifest?.layers["30_outfit"] ? assetUrl(manifest.layers["30_outfit"]) : undefined,
    };
  }, [activeElementKey, heroBaseElement, layerTints, damagedMode, layerEnabled, manifest, assetUrl]);

  const activeClip = useMemo(() => {
    if (!manifest) return null;
    return manifest.clips[activeClipKey] ?? manifest.clips.idle ?? Object.values(manifest.clips)[0] ?? null;
  }, [manifest, activeClipKey]);

  const isUnarmed = equippedWeaponId === "unarmed" || !layerEnabled["50_weapon"];

  const clipBaseFrameUrls = useMemo(() => {
    if (!activeClip) return [];
    const useUnarmed =
      Boolean(activeClip.unarmedFrames && activeClip.unarmedFrames.length > 0) &&
      (isUnarmed || equippedWeaponId !== "greatsword");
    const list = useUnarmed && activeClip.unarmedFrames ? activeClip.unarmedFrames : activeClip.frames;
    return list.map(assetUrl);
  }, [activeClip, isUnarmed, equippedWeaponId, assetUrl]);

  const processedArenaFrames = usePixelSpriteProcessor(clipBaseFrameUrls, 96, 96, spriteTransformOptions);

  const clipWeaponOverlayUrls = useMemo(() => {
    if (!manifest || !activeClip || isUnarmed) return undefined;
    if (equippedWeaponId === "greatsword" && (!activeClip.unarmedFrames || activeClip.unarmedFrames.length === 0)) {
      return undefined;
    }
    if (equippedWeaponId === "greatsword") {
      // Base frames already carry the hero's class signature weapon cleanly unless unarmed/swapped
      return undefined;
    }
    const poseMap = manifest.weaponPoses[equippedWeaponId];
    if (!poseMap) return undefined;
    const tags = activeClip.framePoseTags ?? activeClip.frames.map(() => "ready");
    return tags.map((tag) => assetUrl(poseMap[tag] ?? poseMap.ready));
  }, [manifest, activeClip, isUnarmed, equippedWeaponId, assetUrl]);

  const slashVfx = manifest?.vfx["vfx-solar-slash"] ?? null;
  const summonVfx = manifest?.vfx["vfx-gacha-summon-ssr"] ?? null;
  const slashVfxFrameUrls = useMemo(
    () => (slashVfx ? slashVfx.frames.map(assetUrl) : []),
    [slashVfx, assetUrl],
  );
  const summonVfxFrameUrls = useMemo(
    () => (summonVfx ? summonVfx.frames.map(assetUrl) : []),
    [summonVfx, assetUrl],
  );

  // Overview Battle Arena playback clock with real Hit-Stop & Screen-Shake
  const safeArenaCount = Math.max(1, processedArenaFrames.length);
  const safeArenaIdx = arenaFrameIdx % safeArenaCount;

  useEffect(() => {
    if (!arenaPlaying || !activeClip || safeArenaCount <= 1) {
      setArenaHitStop(false);
      return undefined;
    }
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setArenaHitStop(false);
      return undefined;
    }
    const baseDelay = Math.max(40, Math.round(1000 / Math.max(1, activeClip.fps)));
    const extraHitStop =
      activeClip.timing.hitStopMs > 0 && safeArenaIdx === activeClip.timing.hitFrame
        ? activeClip.timing.hitStopMs
        : 0;

    if (extraHitStop > 0) {
      setArenaHitStop(true);
      if (duelMode && activeClipKey === "attack") {
        setDefenderHp((prev) => (prev <= 24 ? 100 : prev - 24));
        setCombatCombo((prev) => prev + 1);
      }
      const endHit = window.setTimeout(() => setArenaHitStop(false), extraHitStop);
      const nextStep = window.setTimeout(() => {
        setArenaHitStop(false);
        setArenaFrameIdx((prev) => (prev + 1) % safeArenaCount);
      }, baseDelay + extraHitStop);
      return () => {
        window.clearTimeout(endHit);
        window.clearTimeout(nextStep);
      };
    }

    setArenaHitStop(false);
    const step = window.setTimeout(() => {
      setArenaFrameIdx((prev) => (prev + 1) % safeArenaCount);
    }, baseDelay);
    return () => window.clearTimeout(step);
  }, [arenaPlaying, activeClip, safeArenaCount, safeArenaIdx, duelMode, activeClipKey]);

  // Independent 12 FPS VFX clock for the Overview Battle Arena
  useEffect(() => {
    if (!arenaPlaying || slashVfxFrameUrls.length <= 1 || vfxTriggerMode === "off") return undefined;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }
    const vfxDelay = Math.max(40, Math.round(1000 / (slashVfx?.fps ?? 12)));
    const timer = window.setInterval(() => {
      setArenaVfxTick((prev) => (prev + 1) % slashVfxFrameUrls.length);
    }, vfxDelay);
    return () => window.clearInterval(timer);
  }, [arenaPlaying, slashVfxFrameUrls.length, slashVfx?.fps, vfxTriggerMode]);

  const showArenaVfx =
    slashVfxFrameUrls.length > 0 &&
    layerEnabled["60_fx"] &&
    (vfxTriggerMode === "always" ||
      (vfxTriggerMode === "auto" &&
        (activeClipKey === "attack" || activeClipKey === "victory") &&
        safeArenaIdx >= Math.max(0, (activeClip?.timing.hitFrame ?? 1) - 1)));

  // Paperdoll 7-Layer Items wired to Weapon Arsenal + Unarmed + 4 Greyscale Tints
  const paperdollItems = useMemo<PixelPaperdollLayerItem[]>(() => {
    if (!manifest) return [];
    const selectedWeaponSpec = manifest.weaponArsenal?.find((w) => w.id === equippedWeaponId);
    return manifest.layerSpecs.map((spec) => {
      let src = assetUrl(spec.file);
      let enabled = layerEnabled[spec.id] ?? true;
      if (spec.id === "50_weapon") {
        if (equippedWeaponId === "unarmed") {
          enabled = false;
        } else if (selectedWeaponSpec) {
          src = assetUrl(selectedWeaponSpec.layerFile);
        }
      }
      const tintKey = spec.id as TintLayerKey;
      const tintColorHex = layerTints[tintKey];
      const maskFile = manifest.masks[`${spec.id}_greyscale`];
      return {
        id: spec.id,
        label: `${spec.id} (${spec.role})`,
        src,
        width: spec.width,
        height: spec.height,
        enabled,
        offsetX: spec.offsetX,
        offsetY: spec.offsetY,
        tintMaskSrc: maskFile ? assetUrl(maskFile) : undefined,
        tintColorHex,
      };
    });
  }, [manifest, equippedWeaponId, layerEnabled, layerTints, assetUrl]);

  const weaponOptions = useMemo(() => {
    const baseList = manifest?.weaponArsenal ?? [
      { id: "greatsword", name: "Đại Kiếm Thánh Quang", rarity: "SSR", layerFile: "layer-50_weapon.png" },
    ];
    return [...baseList, { id: "unarmed", name: "Tay Không (Unarmed)", rarity: "BASE", layerFile: "" }];
  }, [manifest]);

  const copyText = useCallback((tag: string, value: string) => {
    navigator.clipboard?.writeText(value).catch(() => undefined);
    setCopiedPromptTag(tag);
    window.setTimeout(() => setCopiedPromptTag((cur) => (cur === tag ? null : cur)), 1600);
  }, []);

  if (loadError && !manifest) {
    return (
      <main className="studio-app">
        <PixelState
          state="error"
          title="Không Thể Nạp Tài Nguyên Pixel Forge"
          action={
            <PixelButton tone="accent" onClick={() => window.location.reload()}>
              Thử Tải Lại Trang
            </PixelButton>
          }
        >
          <p>{loadError}</p>
        </PixelState>
      </main>
    );
  }

  if (!manifest) {
    return (
      <main className="studio-app">
        <PixelState state="loading" title="Đang Khởi Động Xưởng Chế Tác Pixel Forge...">
          <p>Đang đồng bộ 7 lớp Paper-Doll, 5 chu kỳ hoạt ảnh, 4 mặt nạ Greyscale và Multi-Map Atlas...</p>
        </PixelState>
      </main>
    );
  }

  const gachaSpriteSrc = damagedMode
    ? assetUrl(manifest.character.damagedStill)
    : manifest.elements[activeElementKey]
      ? assetUrl(manifest.elements[activeElementKey].file)
      : assetUrl(manifest.character.masterStill);

  const arenaShakePx = arenaHitStop && activeClip ? activeClip.timing.screenShakePx * 2 : 0;
  const activeVfxObj = manifest.vfx[selectedVfxId] ?? Object.values(manifest.vfx)[0];
  const activeEngineDoc =
    heroBundle?.engineDocs.find((d) => d.id === selectedEngineDocId) ?? heroBundle?.engineDocs[0];
  const activeDirMeta = manifest.directionMeta?.[selectedDirection];

  return (
    <div className="studio-app">
      {/* GLOBAL ORNAMENTAL HEADER + LIVE ROSTER + RENDER CONTRACT SWITCHER */}
      <PixelOrnateFrame tone="market" ornament="reinforced" detail="hero" family="account">
        <div className="studio-header" style={{ padding: "var(--space-4)" }}>
          <div className="studio-header__top">
            <div className="studio-brand">
              <div className="studio-brand__badges">
                <PixelBadge tone="warning">PIXEL FORGE STUDIO V2</PixelBadge>
                <PixelBadge tone="success">QUALITY GATE {manifest.qualityReport.score}/100 PASS</PixelBadge>
                <PixelBadge tone="accent">
                  PALETTE {manifest.character.paletteHex.length} MÀU • ALPHA {"{0, 255}"}
                </PixelBadge>
                <PixelStatus
                  tone={loadingHero ? "warning" : "success"}
                  label={loadingHero ? "Đang chuyển tướng..." : `Đang nạp: ${manifest.character.name}`}
                />
              </div>
              <h1>
                {manifest.character.name} — {manifest.character.title}
              </h1>
              <p>
                Hệ thống thiết kế Pixel UI thuần chủng & Dây chuyền 6 công đoạn sản xuất tài nguyên Gacha/RPG: mọi nút
                điều khiển Vũ khí, Tay không, 5 Nguyên tố, Chiến tổn, 4 Mặt nạ nhuộm màu và Tướng Roster đều đồng bộ
                trực tiếp trên Sa bàn, Animator và Paper-Doll.
              </p>
            </div>

            <div className="studio-hud-Cluster">
              <PixelCurrency
                label="Ngân Khố Vàng"
                amount={goldBalance}
                icon={<PixelIcon asset="market-coins" alt="" />}
              />
              <PixelCounter label="Atlas Frames" value={manifest.atlas.frameCount} digits={3} />
            </div>
          </div>

          {/* LIVE GLOBAL ROSTER SWITCHER + IDE SKILL AUTO-SYNC BAR */}
          {batchRoster && (
            <section className="studio-roster-bar" aria-label="Chọn tướng hoạt động trên toàn bộ Studio">
              <div className="studio-roster-bar__label">
                <span>
                  Đội Hình {batchRoster.units.length} Tướng Roster (Nhấp để nạp toàn bộ 7 lớp, Clip, Bản đồ & Godot .tres)
                </span>
                <span>
                  Provenance:{" "}
                  {activeUnitMeta?.assetProvenance === "ai-native"
                    ? "AI-Native Chroma Frames"
                    : "Class-Rig Pixel Visage"}
                </span>
              </div>
              <div className="studio-roster-grid">
                {batchRoster.units.map((unit) => {
                  const isSelected = unit.id === activeHeroId;
                  return (
                    <button
                      key={unit.id}
                      type="button"
                      className="studio-hero-chip"
                      aria-pressed={isSelected}
                      onClick={() => handleSelectHero(unit, assetCacheRev || undefined)}
                    >
                      <span className="studio-hero-chip__avatar">
                        <img
                          className="pixel-art"
                          src={withCacheRev(unit.chibiSprite ?? unit.previewSprite)}
                          width={unit.chibiSprite ? 64 : 96}
                          height={unit.chibiSprite ? 64 : 96}
                          data-px-source-width={unit.chibiSprite ? 64 : 96}
                          data-px-source-height={unit.chibiSprite ? 64 : 96}
                          data-px-sprite-scale="1"
                          alt=""
                        />
                      </span>
                      <span className="studio-hero-chip__meta">
                        <strong>{unit.name}</strong>
                        <small>
                          {unit.rarity.toUpperCase()} • {unit.classRole}
                        </small>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="studio-row--between">
                <div className="studio-row">
                  <PixelButton
                    size="sm"
                    tone="accent"
                    className="studio-btn-auto"
                    onClick={() => setActiveTab("stage-1-raw")}
                  >
                    ⚡ Tạo Lệnh Skill AI Cho IDE (Antigravity / Cursor)
                  </PixelButton>
                  <PixelButton
                    size="sm"
                    variant="outline"
                    className="studio-btn-auto"
                    onClick={() => void syncFromIdeDisk(true)}
                  >
                    {syncingDisk ? "⏳ Đang Quét Thư Mục..." : "🔄 Quét File Mới Từ IDE"}
                  </PixelButton>
                  <PixelBadge tone={viteBridgeOnline ? "success" : "neutral"}>
                    {viteBridgeOnline ? "VITE BRIDGE 2 CHIỀU: ONLINE (HMR <90MS)" : "STATIC / AUTO-POLL"}
                  </PixelBadge>
                </div>
                <PixelCheckbox
                  label="Tự động đồng bộ khi IDE lưu file xong (HMR Push + Auto-Sync)"
                  checked={ideAutoSync}
                  onChange={(e) => setIdeAutoSync(e.target.checked)}
                />
              </div>

              {ideSyncToast && (
                <PixelToast
                  tone="success"
                  action={
                    <PixelButton
                      size="sm"
                      variant="ghost"
                      className="studio-btn-auto"
                      onClick={() => setIdeSyncToast(null)}
                    >
                      Ẩn
                    </PixelButton>
                  }
                >
                  {ideSyncToast}
                </PixelToast>
              )}
            </section>
          )}

          {/* LIVE DESIGN SYSTEM RENDER CONTRACT DECK (8 Themes × 7 Modes × 3 Grids × 3 Densities) */}
          <section className="studio-contract-deck" aria-label="Cấu hình Render Contract của Pixel UI Design System">
            <PixelSelect
              size="sm"
              label="Chủ Đề Màu (8 Themes)"
              value={activeTheme}
              onChange={(e) => setActiveTheme(e.target.value as PixelTheme)}
            >
              {pixelThemes.map((t) => (
                <option key={t} value={t}>
                  Theme: {t}
                </option>
              ))}
            </PixelSelect>

            <PixelSelect
              size="sm"
              label="Họ Nghệ Thuật (7 Modes)"
              value={activeMode}
              onChange={(e) => setActiveMode(e.target.value as PixelMode)}
            >
              {pixelModes.map((m) => (
                <option key={m} value={m}>
                  Mode: {m}
                </option>
              ))}
            </PixelSelect>

            <PixelSelect
              size="sm"
              label="Bước Lưới Cơ Sở (Grid)"
              value={String(activeGrid)}
              onChange={(e) => setActiveGrid(Number(e.target.value) as PixelGrid)}
            >
              {pixelGridOptions.map((g) => (
                <option key={g} value={String(g)}>
                  Lưới Pixel: {g}px
                </option>
              ))}
            </PixelSelect>

            <PixelSelect
              size="sm"
              label="Mật Độ Khung (Density)"
              value={activeDensity}
              onChange={(e) => setActiveDensity(e.target.value as PixelDensity)}
            >
              {pixelDensities.map((d) => (
                <option key={d} value={d}>
                  Density: {d}
                </option>
              ))}
            </PixelSelect>
          </section>
        </div>
      </PixelOrnateFrame>

      {/* 8-TAB STUDIO & UI KIT NAVIGATION */}
      <nav id="studio-main-nav" className="studio-nav-wrap" aria-label="Điều hướng 6 công đoạn Pixel Forge & UI Kit">
        <PixelTabList label="Các phân khu Pixel Forge Studio" className="studio-nav-list">
          {NAV_TABS.map((tab) => (
            <PixelTab
              key={tab.id}
              selected={activeTab === tab.id}
              controls={`panel-${tab.id}`}
              className="studio-nav-tab"
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="studio-nav-tab__body">
                <small className="studio-nav-tab__step">{tab.step}</small>
                <span className="studio-nav-tab__title">{tab.label}</span>
              </span>
            </PixelTab>
          ))}
        </PixelTabList>
      </nav>

      {/* MAIN TAB PANEL WORKSPACE */}
      <main id={`panel-${activeTab}`} role="tabpanel" className="studio-main">
        {/* =====================================================================
            TAB 0: OVERVIEW — UNIFIED BATTLE ARENA, ANIMATOR & PAPERDOLL
           ===================================================================== */}
        {activeTab === "overview" && (
          <div className="studio-stack">
            <div className="studio-grid-2">
              <PixelPanel
                title="Sa Bàn Thực Chiến Hợp Nhất (512×288 • 2× Integer)"
                headerAction={
                  <PixelBadge tone={damagedMode ? "danger" : "accent"}>
                    {damagedMode ? "CHIẾN TỔN (-DAMAGED)" : activeElementKey.toUpperCase()}
                  </PixelBadge>
                }
              >
                <div className="studio-scroll-stage">
                  <div
                    className="studio-arena-viewport"
                    data-px-hitstop={arenaHitStop || undefined}
                    style={{
                      inlineSize: "512px",
                      blockSize: "288px",
                      transform: arenaShakePx ? `translate(${arenaShakePx}px, 0px)` : undefined,
                    }}
                  >
                    {/* Seamless 3-copy Parallax Sky (0.2x), Ruins (0.55x), Ground (1.0x) */}
                    {[
                      { src: assetUrl(manifest.world.parallaxSky), factor: 0.2 },
                      { src: assetUrl(manifest.world.parallaxRuins), factor: 0.55 },
                      { src: assetUrl(manifest.world.parallaxArena), factor: 1 },
                    ].map((layer, lIdx) => {
                      const shift = Math.round(arenaPanX * layer.factor) * 2;
                      return (
                        <span key={lIdx}>
                          <img
                            className="pixel-art studio-arena-bg studio-arena-bg--mirror"
                            src={layer.src}
                            width={512}
                            height={288}
                            data-px-source-width={256}
                            data-px-source-height={144}
                            data-px-sprite-scale="2"
                            style={{ insetInlineStart: `${shift - 512}px` }}
                            alt=""
                          />
                          <img
                            className="pixel-art studio-arena-bg"
                            src={layer.src}
                            width={512}
                            height={288}
                            data-px-source-width={256}
                            data-px-source-height={144}
                            data-px-sprite-scale="2"
                            style={{ insetInlineStart: `${shift}px` }}
                            alt=""
                          />
                          <img
                            className="pixel-art studio-arena-bg studio-arena-bg--mirror"
                            src={layer.src}
                            width={512}
                            height={288}
                            data-px-source-width={256}
                            data-px-source-height={144}
                            data-px-sprite-scale="2"
                            style={{ insetInlineStart: `${shift + 512}px` }}
                            alt=""
                          />
                        </span>
                      );
                    })}

                    <div className="studio-arena-hud">
                      <span className="studio-arena-tag">
                        {manifest.character.name}
                        {duelMode && opponentUnit ? ` ⚔️ ${opponentUnit.name}` : ""} • Clip:{" "}
                        {activeClipKey.toUpperCase()} F0{safeArenaIdx + 1}
                      </span>
                      {arenaHitStop && activeClip && (
                        <span className="studio-arena-tag studio-arena-tag--hit">
                          HIT-STOP {activeClip.timing.hitStopMs}MS • SHAKE {activeClip.timing.screenShakePx}PX
                        </span>
                      )}
                    </div>

                    {/* Ground Shadow 00_shadow */}
                    {layerEnabled["00_shadow"] && manifest.layers["00_shadow"] && (
                      <img
                        className="pixel-art studio-arena-actor"
                        src={assetUrl(manifest.layers["00_shadow"])}
                        width={128}
                        height={128}
                        data-px-source-width={64}
                        data-px-source-height={64}
                        data-px-sprite-scale="2"
                        style={{
                          insetInlineStart: duelMode && opponentUnit ? "96px" : "192px",
                          insetBlockStart: "132px",
                        }}
                        alt=""
                      />
                    )}

                    {/* Live Processed Animated Hero (96x96 -> 192x192 2x) */}
                    {processedArenaFrames[safeArenaIdx] && (
                      <img
                        className="pixel-art studio-arena-actor"
                        src={processedArenaFrames[safeArenaIdx]}
                        width={192}
                        height={192}
                        data-px-source-width={96}
                        data-px-source-height={96}
                        data-px-sprite-scale="2"
                        style={{
                          insetInlineStart: duelMode && opponentUnit ? "64px" : "160px",
                          insetBlockStart: "80px",
                        }}
                        alt={manifest.character.name}
                      />
                    )}

                    {/* Pre-rendered Quantized Weapon Pose Overlay */}
                    {clipWeaponOverlayUrls?.[safeArenaIdx] && (
                      <img
                        className="pixel-art studio-arena-actor"
                        src={clipWeaponOverlayUrls[safeArenaIdx]}
                        width={192}
                        height={192}
                        data-px-source-width={96}
                        data-px-source-height={96}
                        data-px-sprite-scale="2"
                        style={{
                          insetInlineStart: duelMode && opponentUnit ? "64px" : "160px",
                          insetBlockStart: "80px",
                        }}
                        alt=""
                      />
                    )}

                    {/* 1v1 Interactive Combat Sandbox Opponent (Mirrored Roster Target Dummy) */}
                    {duelMode &&
                      opponentUnit &&
                      (() => {
                        const oppRoot = opponentUnit.outputDir.replace(/^public/, "");
                        const oppUnderHit = arenaHitStop && activeClipKey === "attack";
                        return (
                          <>
                            <img
                              className="pixel-art studio-arena-actor"
                              src={withCacheRev(`${oppRoot}/layer-00_shadow.png`)}
                              width={128}
                              height={128}
                              data-px-source-width={64}
                              data-px-source-height={64}
                              data-px-sprite-scale="2"
                              style={{ insetInlineStart: "288px", insetBlockStart: "132px" }}
                              alt=""
                            />
                            <img
                              className={`pixel-art studio-arena-actor studio-arena-actor--mirror${
                                oppUnderHit ? " studio-arena-actor--hitflash" : ""
                              }`}
                              src={withCacheRev(oppUnderHit ? `${oppRoot}/clip-hurt-f0.png` : opponentUnit.previewSprite)}
                              width={192}
                              height={192}
                              data-px-source-width={96}
                              data-px-source-height={96}
                              data-px-sprite-scale="2"
                              style={{
                                insetInlineStart: oppUnderHit ? "268px" : "256px",
                                insetBlockStart: "80px",
                              }}
                              alt={opponentUnit.name}
                            />
                            {oppUnderHit && (
                              <span
                                className="studio-arena-dmg-pop"
                                style={{ insetInlineStart: "260px", insetBlockStart: "56px" }}
                              >
                                CRIT! -2,480 • {Math.max(1, combatCombo)} HIT
                              </span>
                            )}
                          </>
                        );
                      })()}

                    {/* Smart Dual-Buffer VFX Overlay */}
                    {showArenaVfx && slashVfxFrameUrls[arenaVfxTick % slashVfxFrameUrls.length] && (
                      <img
                        className="pixel-art studio-arena-actor"
                        src={slashVfxFrameUrls[arenaVfxTick % slashVfxFrameUrls.length]}
                        width={128}
                        height={128}
                        data-px-source-width={64}
                        data-px-source-height={64}
                        data-px-sprite-scale="2"
                        style={{
                          insetInlineStart: duelMode && opponentUnit ? "184px" : "208px",
                          insetBlockStart: "108px",
                        }}
                        alt=""
                      />
                    )}
                  </div>
                </div>

                <label className="studio-range-label">
                  <span>Cuộn Camera Parallax Khép Kín (Pan X: {arenaPanX}px — không lộ viền đen)</span>
                  <input
                    type="range"
                    min={-64}
                    max={64}
                    step={4}
                    value={arenaPanX}
                    onChange={(e) => setArenaPanX(Number(e.target.value))}
                  />
                </label>

                <div className="studio-row">
                  <PixelButton
                    size="sm"
                    className="studio-btn-auto"
                    selected={arenaPlaying}
                    onClick={() => setArenaPlaying((p) => !p)}
                  >
                    {arenaPlaying ? "⏸ Dừng Sa Bàn" : "▶ Chạy Sa Bàn"}
                  </PixelButton>
                  <PixelButton
                    size="sm"
                    tone="accent"
                    className="studio-btn-auto"
                    selected={duelMode}
                    onClick={() => setDuelMode((v) => !v)}
                  >
                    {duelMode ? "⚔️ Đối Kháng 1v1" : "○ Đơn Đấu (Solo)"}
                  </PixelButton>
                  <PixelButton
                    size="sm"
                    tone={damagedMode ? "danger" : "neutral"}
                    className="studio-btn-auto"
                    selected={damagedMode}
                    onClick={() => setDamagedMode((d) => !d)}
                  >
                    {damagedMode ? "✓ Chiến Tổn (-damaged)" : "○ Chiến Tổn (-damaged)"}
                  </PixelButton>
                  <PixelButton
                    size="sm"
                    className="studio-btn-auto"
                    selected={vfxTriggerMode !== "off"}
                    onClick={() =>
                      setVfxTriggerMode((m) => (m === "auto" ? "always" : m === "always" ? "off" : "auto"))
                    }
                  >
                    VFX: {vfxTriggerMode === "auto" ? "Theo đòn" : vfxTriggerMode === "always" ? "Luôn bật" : "Tắt"}
                  </PixelButton>
                </div>

                {duelMode && batchRoster && opponentUnit && (
                  <div className="studio-box">
                    <div className="studio-grid-2">
                      <PixelSelect
                        size="sm"
                        label="Đối Thủ Đối Kháng / Bia Tập 1v1"
                        value={opponentUnit.id}
                        onChange={(e) => {
                          setOpponentHeroId(e.target.value);
                          setDefenderHp(100);
                          setCombatCombo(0);
                        }}
                      >
                        {batchRoster.units
                          .filter((u) => u.id !== activeHeroId)
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.rarity.toUpperCase()} • {u.classRole})
                            </option>
                          ))}
                      </PixelSelect>
                      <div className="studio-stack">
                        <PixelMeter
                          kind="health"
                          label={`HP ${opponentUnit.name} (Combo: ${combatCombo})`}
                          value={defenderHp}
                          max={100}
                        />
                        <PixelButton
                          size="sm"
                          variant="outline"
                          className="studio-btn-auto"
                          onClick={() => {
                            setDefenderHp(100);
                            setCombatCombo(0);
                          }}
                        >
                          ↺ Hồi Đầy HP & Đặt Lại Combo
                        </PixelButton>
                      </div>
                    </div>
                  </div>
                )}
              </PixelPanel>

              {/* UNIFIED CONTROL DECK */}
              <PixelPanel title="Bảng Điều Khiển Trạng Thái Nhân Vật (Đồng Bộ Toàn Studio)">
                <div className="studio-box">
                  <h4>1. Chu Kỳ Hành Động (5 Action Clips)</h4>
                  <div className="studio-row">
                    {Object.entries(manifest.clips).map(([clipKey, clipObj]) => (
                      <PixelButton
                        key={clipKey}
                        size="sm"
                        className="studio-btn-auto"
                        selected={activeClipKey === clipKey}
                        onClick={() => {
                          setActiveClipKey(clipKey);
                          setArenaFrameIdx(0);
                        }}
                      >
                        {clipKey.toUpperCase()} ({clipObj.frames.length}F)
                      </PixelButton>
                    ))}
                  </div>
                </div>

                <div className="studio-box">
                  <h4>2. Kho Vũ Khí Theo Pose & Chế Độ Tay Không (Unarmed)</h4>
                  <div className="studio-row">
                    {weaponOptions.map((wpn) => (
                      <PixelButton
                        key={wpn.id}
                        size="sm"
                        className="studio-btn-auto"
                        selected={equippedWeaponId === wpn.id}
                        onClick={() => {
                          setEquippedWeaponId(wpn.id);
                          if (wpn.id !== "unarmed") {
                            setLayerEnabled((prev) => ({ ...prev, "50_weapon": true }));
                          }
                        }}
                      >
                        {wpn.name} ({wpn.rarity})
                      </PixelButton>
                    ))}
                  </div>
                </div>

                <div className="studio-box">
                  <h4>3. Biến Thể 5 Hệ Nguyên Tố & Ẩn/Hiện Trang Bị Trực Tiếp</h4>
                  <div className="studio-row">
                    {Object.entries(manifest.elements).map(([elKey, elInfo]) => (
                      <PixelButton
                        key={elKey}
                        size="sm"
                        className="studio-btn-auto"
                        selected={activeElementKey === elKey}
                        onClick={() => setActiveElementKey(elKey)}
                      >
                        {elKey.toUpperCase()} — {elInfo.label.split("(")[0].trim()}
                      </PixelButton>
                    ))}
                  </div>
                  <PixelDivider />
                  <div className="studio-row">
                    {[
                      { id: "40_hair", label: "Mũ / Tóc (40_hair)" },
                      { id: "30_outfit", label: "Khiên & Áo (30_outfit)" },
                      { id: "60_fx", label: "Hào Quang (60_fx)" },
                      { id: "00_shadow", label: "Bóng Chân (00_shadow)" },
                    ].map((toggle) => (
                      <PixelButton
                        key={toggle.id}
                        size="sm"
                        variant="outline"
                        className="studio-btn-auto"
                        selected={layerEnabled[toggle.id]}
                        onClick={() =>
                          setLayerEnabled((prev) => ({ ...prev, [toggle.id]: !prev[toggle.id] }))
                        }
                      >
                        {layerEnabled[toggle.id] ? `✓ ${toggle.label}` : `○ ${toggle.label}`}
                      </PixelButton>
                    ))}
                  </div>
                </div>
              </PixelPanel>
            </div>

            {/* SYNCED SPRITE ANIMATOR + LIVE PAPERDOLL */}
            <div className="studio-grid-2">
              {activeClip && (
                <PixelPanel title="Máy Chiếu Sprite Animator & Filmstrip Đồng Bộ">
                  <PixelSpriteAnimator
                    clipId={activeClipKey}
                    clipLabel={`${manifest.character.name} — ${activeClip.label}`}
                    frames={activeClip.frames.map(assetUrl)}
                    unarmedFrames={activeClip.unarmedFrames?.map(assetUrl)}
                    weaponPoseFrames={clipWeaponOverlayUrls}
                    showWeaponOverlay={Boolean(clipWeaponOverlayUrls)}
                    unarmedMode={isUnarmed}
                    vfxFrames={slashVfxFrameUrls}
                    vfxFps={slashVfx?.fps ?? 12}
                    showVfx={layerEnabled["60_fx"]}
                    vfxMode={vfxTriggerMode}
                    fps={activeClip.fps}
                    frameWidth={96}
                    frameHeight={96}
                    scale={2}
                    timing={activeClip.timing}
                    baselineY={manifest.character.footBaselineY}
                    transformOptions={spriteTransformOptions}
                  />
                </PixelPanel>
              )}

              <PixelPanel
                title="Búp Bê Paper-Doll 7 Lớp Đồng Tâm (96×96 → 192×192)"
                headerAction={
                  <PixelButton size="sm" className="studio-btn-auto" onClick={() => setActiveTab("stage-2-paperdoll")}>
                    Mở Xưởng Nhuộm 4 Mask ▶
                  </PixelButton>
                }
              >
                <div className="studio-grid-2">
                  <PixelPaperdoll
                    layers={paperdollItems}
                    sockets={manifest.sockets}
                    showSockets={showSockets}
                    scale={2}
                  />
                  <div className="studio-stack">
                    <PixelButton
                      size="sm"
                      className="studio-btn-auto"
                      selected={showSockets}
                      onClick={() => setShowSockets((s) => !s)}
                    >
                      {showSockets ? "✓ Đang hiện 5 Điểm Neo Socket" : "○ Hiện 5 Điểm Neo Socket"}
                    </PixelButton>
                    <dl className="studio-kv-list">
                      <div>
                        <dt>Khung Thân</dt>
                        <dd>
                          {manifest.character.bodyCanvas[0]}×{manifest.character.bodyCanvas[1]}px
                        </dd>
                      </div>
                      <div>
                        <dt>Khung Vũ Khí</dt>
                        <dd>
                          {manifest.character.weaponCanvas[0]}×{manifest.character.weaponCanvas[1]}px
                        </dd>
                      </div>
                      <div>
                        <dt>Đường Chân</dt>
                        <dd>Y = {manifest.character.footBaselineY}px</dd>
                      </div>
                      <div>
                        <dt>Độ Lệch Damaged</dt>
                        <dd>{manifest.character.damagedBboxDeltaPx}px</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </PixelPanel>
            </div>

            {/* 6 CANONICAL PRODUCTION STAGES SHORTCUT CARDS */}
            <PixelPanel title="Kiến Trúc Chuẩn 6 Công Đoạn Pixel Forge (Nhấp Để Kiểm Tra Chi Tiết)">
              <div className="studio-stage-grid">
                {CANONICAL_6_STAGES.map((item) => (
                  <button
                    key={item.stage}
                    type="button"
                    className="studio-stage-card"
                    onClick={() => setActiveTab(item.tab)}
                  >
                    <PixelBadge tone="accent">{item.stage}</PixelBadge>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </button>
                ))}
              </div>
            </PixelPanel>
          </div>
        )}

        {/* =====================================================================
            TAB 1: STAGE 01 — IDE AI-GEN SKILL COMPOSER, 10 RAW AI FRAMES & 25 WEAPON POSES
           ===================================================================== */}
        {activeTab === "stage-1-raw" && (
          <div className="studio-stack">
            <PixelPanel
              title="Xưởng Tạo Lệnh Skill AI Cho IDE (Copy Prompt → Dán Vào Antigravity / Cursor / Codex → Tự Lưu & Hiện Lên UI)"
              headerAction={<PixelBadge tone="warning">SKILL: PIXEL-FORGE-AI-GEN</PixelBadge>}
            >
              <div className="studio-grid-2">
                <div className="studio-stack">
                  <div className="studio-box">
                    <h4>1. Chọn Chế Độ Tướng & IDE Đang Mở Sẵn Project</h4>
                    <div className="studio-row">
                      <PixelButton
                        size="sm"
                        className="studio-btn-auto"
                        selected={ideTargetMode === "existing"}
                        onClick={() => setIdeTargetMode("existing")}
                      >
                        Gen AI Cho Tướng Đang Chọn ({manifest.character.name})
                      </PixelButton>
                      <PixelButton
                        size="sm"
                        tone="accent"
                        className="studio-btn-auto"
                        selected={ideTargetMode === "custom"}
                        onClick={() => setIdeTargetMode("custom")}
                      >
                        + Thiết Kế Tướng Mới Hoàn Toàn
                      </PixelButton>
                    </div>

                    <div className="studio-grid-2">
                      <PixelSelect
                        size="sm"
                        label="IDE Đích Nhận Lệnh"
                        value={ideEditor}
                        onChange={(e) => setIdeEditor(e.target.value as IdeEditorKey)}
                      >
                        <option value="antigravity">Antigravity (.agents/skills/pixel-forge-ai-gen)</option>
                        <option value="cursor">Cursor (/pixel-forge-ai-gen + .cursor/rules)</option>
                        <option value="codex">Claude Code / Codex (skills/pixel-forge-ai-gen)</option>
                      </PixelSelect>

                      <PixelSelect
                        size="sm"
                        label="Quy Mô Gói Ảnh Cần Gen"
                        value={idePackScope}
                        onChange={(e) => setIdePackScope(e.target.value as IdePackScope)}
                      >
                        <option value="fast4">Gói Nhanh 4 Tấm Cốt Lõi (Tự nội suy đủ 6 Stage)</option>
                        <option value="full10">Trọn Bộ 10 Tấm Chuẩn (#00FF00 Full Pack)</option>
                        <option value="single">Gen Lẻ 1 Khung Duy Nhất (Tinh chỉnh nhanh)</option>
                      </PixelSelect>
                    </div>

                    {idePackScope === "single" && (
                      <PixelSelect
                        size="sm"
                        label="Chọn Khung Hình Đơn Lẻ Cần Gen Lại"
                        value={ideSingleSlot}
                        onChange={(e) => setIdeSingleSlot(e.target.value)}
                      >
                        {(activeUnitMeta?.prompts ?? buildUnit10PromptsClient(customDraft)).map((p) => (
                          <option key={p.slot} value={p.slot}>
                            {p.slot} — {p.label} ({p.file})
                          </option>
                        ))}
                      </PixelSelect>
                    )}
                  </div>

                  {ideTargetMode === "custom" ? (
                    <div className="studio-box">
                      <div className="studio-row--between">
                        <h4>2. Hồ Sơ Tướng Mới (Tự Động Đăng Ký Vào forge-roster.json)</h4>
                        <div className="studio-row">
                          {CUSTOM_HERO_PRESETS.map((preset) => (
                            <PixelButton
                              key={preset.id}
                              size="sm"
                              variant="outline"
                              className="studio-btn-auto"
                              selected={customDraft.id === preset.id}
                              onClick={() => setCustomDraft({ ...preset })}
                            >
                              Mẫu: {preset.name}
                            </PixelButton>
                          ))}
                        </div>
                      </div>

                      <div className="studio-grid-2">
                        <PixelInput
                          size="sm"
                          label="Tên Tướng Hiển Thị"
                          value={customDraft.name}
                          onChange={(e) => setCustomDraft((prev) => ({ ...prev, name: e.target.value }))}
                        />
                        <PixelInput
                          size="sm"
                          label="Mã Định Danh (hero-...)"
                          value={customDraft.id}
                          onChange={(e) => setCustomDraft((prev) => ({ ...prev, id: e.target.value }))}
                        />
                      </div>

                      <div className="studio-grid-3">
                        <PixelInput
                          size="sm"
                          label="Danh Hiệu"
                          value={customDraft.title}
                          onChange={(e) => setCustomDraft((prev) => ({ ...prev, title: e.target.value }))}
                        />
                        <PixelSelect
                          size="sm"
                          label="Phẩm Chất"
                          value={customDraft.rarity}
                          onChange={(e) =>
                            setCustomDraft((prev) => ({ ...prev, rarity: e.target.value as PixelRarityTier }))
                          }
                        >
                          <option value="ur">UR (Thần Thoại)</option>
                          <option value="ssr">SSR (Truyền Thuyết)</option>
                          <option value="epic">EPIC (Sử Thi)</option>
                          <option value="rare">RARE (Hiếm)</option>
                          <option value="common">COMMON (Thường)</option>
                        </PixelSelect>
                        <PixelSelect
                          size="sm"
                          label="Nguyên Tố Chủ Đạo"
                          value={customDraft.baseElement}
                          onChange={(e) =>
                            setCustomDraft((prev) => ({
                              ...prev,
                              baseElement: e.target.value as CustomHeroDraft["baseElement"],
                            }))
                          }
                        >
                          <option value="solar">Solar (Thánh Quang)</option>
                          <option value="fire">Fire (Hỏa Long)</option>
                          <option value="ice">Ice (Băng Tinh)</option>
                          <option value="shadow">Shadow (Hắc Ám)</option>
                          <option value="emerald">Emerald (Cổ Mộc)</option>
                        </PixelSelect>
                      </div>

                      <div className="studio-grid-2">
                        <PixelInput
                          size="sm"
                          label="Mũ Giáp / Tóc (40_hair)"
                          value={customDraft.headgearSpec}
                          onChange={(e) => setCustomDraft((prev) => ({ ...prev, headgearSpec: e.target.value }))}
                        />
                        <PixelInput
                          size="sm"
                          label="Vũ Khí Chấn Phái (50_weapon)"
                          value={customDraft.weaponSpec}
                          onChange={(e) => setCustomDraft((prev) => ({ ...prev, weaponSpec: e.target.value }))}
                        />
                      </div>

                      <PixelTextarea
                        label="Mô Tả Giáp Trụ & Phom Dáng Tổng Thể (Tiếng Anh cho AI Image Model)"
                        value={customDraft.silhouette}
                        onChange={(e) => setCustomDraft((prev) => ({ ...prev, silhouette: e.target.value }))}
                      />
                    </div>
                  ) : (
                    <div className="studio-box">
                      <h4>2. Thông Số Đích Của Tướng Đang Chọn Trong Project</h4>
                      <dl className="studio-kv-list">
                        <div>
                          <dt>Unit ID</dt>
                          <dd>{compiledIdeTask.unitId}</dd>
                        </div>
                        <div>
                          <dt>Trạng Thái Hiện Tại</dt>
                          <dd>{activeUnitMeta?.assetProvenance ?? manifest.assetProvenance ?? "ai-native"}</dd>
                        </div>
                        <div>
                          <dt>Thư Mục Lưu Raw AI</dt>
                          <dd>{compiledIdeTask.rawAiDir}</dd>
                        </div>
                        <div>
                          <dt>Thư Mục Xuất Game</dt>
                          <dd>{compiledIdeTask.outputDir}</dd>
                        </div>
                      </dl>
                      <p>
                        Cả <strong>5/5 tướng cốt lõi</strong> trong Roster hiện đã đạt chuẩn <code>ai-native</code>{" "}
                        (100/100 PASS). Bạn có thể copy lệnh Skill dán vào IDE để tinh chỉnh lại bất kỳ tấm nào, kéo
                        thả trực tiếp file PNG <code>#00FF00</code> vào 10 ô Raw bên dưới, hoặc bấm nút chạy{" "}
                        <code>build-unit</code> hai chiều ngay trên Web!
                      </p>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: ONE-CLICK COPY COMMAND BLOCK + TWO-WAY BRIDGE + TARGET FILE CHECKLIST */}
                <div className="studio-stack">
                  <div className="studio-box">
                    <div className="studio-row--between">
                      <h4>3. Lệnh Skill & Cầu Nối Vite 2 Chiều ({compiledIdeTask.selectedPrompts.length} File PNG Đích)</h4>
                      <div className="studio-row">
                        <PixelButton
                          tone="accent"
                          className="studio-btn-auto"
                          onClick={() => copyText("ide-skill-cmd", compiledIdeTask.commandText)}
                        >
                          {copiedPromptTag === "ide-skill-cmd"
                            ? "✓ Đã Chép Lệnh Skill! Hãy Dán Vào IDE"
                            : "📋 Sao Chép Lệnh Skill Dán Vào IDE"}
                        </PixelButton>
                        {viteBridgeOnline &&
                          (ideTargetMode === "custom" ? (
                            <PixelButton
                              size="sm"
                              tone="success"
                              className="studio-btn-auto"
                              disabled={bridgeBusy}
                              onClick={() => void handleBridgeRegisterUnit()}
                            >
                              {bridgeBusy ? "⏳ Đang Biên Dịch..." : "⚡ Đăng Ký & Dựng Tướng Trên Web"}
                            </PixelButton>
                          ) : (
                            <PixelButton
                              size="sm"
                              tone="success"
                              className="studio-btn-auto"
                              disabled={bridgeBusy}
                              onClick={() => void handleBridgeBuildUnit(compiledIdeTask.unitId)}
                            >
                              {bridgeBusy ? "⏳ Đang Chạy Hậu Kỳ..." : "⚙️ Chạy build-unit Trực Tiếp"}
                            </PixelButton>
                          ))}
                        <PixelButton
                          size="sm"
                          variant="outline"
                          className="studio-btn-auto"
                          onClick={() => void syncFromIdeDisk(true)}
                        >
                          🔄 Quét Kết Quả
                        </PixelButton>
                      </div>
                    </div>

                    <p>
                      Quy trình khép kín: <strong>1. Bấm Sao chép</strong> →{" "}
                      <strong>2. Dán vào cửa sổ chat của {ideEditor.toUpperCase()} đang mở sẵn project này</strong> →{" "}
                      <strong>3. IDE tự gen ảnh #00FF00, lưu vào {compiledIdeTask.rawAiDir} & chạy build-unit</strong> →{" "}
                      <strong>4. Vite HMR đẩy sự kiện tức thì (&lt;90ms) nạp tướng mới lên Sa bàn!</strong>
                    </p>

                    <pre className="studio-code studio-code--tall">{compiledIdeTask.commandText}</pre>

                    {bridgeLogs && <pre className="studio-code">{bridgeLogs}</pre>}

                    <div className="studio-row">
                      {compiledIdeTask.selectedPrompts.map((sp) => (
                        <PixelBadge key={sp.slot} tone="accent">
                          {sp.file}
                        </PixelBadge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </PixelPanel>

            <PixelPanel
              title="Stage 01 — 10 Khung Raw AI (#00FF00 • Hỗ Trợ Kéo Thả PNG Trực Tiếp) & Tách Nền CIELAB Nhị Phân"
              headerAction={<PixelBadge tone="success">10 / 10 RAW SLOTS • KÉO THẢ HOẶC TẢI FILE</PixelBadge>}
            >
              <div className="studio-grid-2">
                {(manifest.rawFrames ?? []).map((rf) => (
                  <div
                    key={rf.slot}
                    className="studio-box studio-drop-slot"
                    data-px-dragover={dragOverSlot === rf.slot ? "true" : undefined}
                    onDragOver={(e: DragEvent<HTMLDivElement>) => {
                      e.preventDefault();
                      if (dragOverSlot !== rf.slot) setDragOverSlot(rf.slot);
                    }}
                    onDragLeave={() => {
                      if (dragOverSlot === rf.slot) setDragOverSlot(null);
                    }}
                    onDrop={(e: DragEvent<HTMLDivElement>) => {
                      e.preventDefault();
                      setDragOverSlot(null);
                      const file = e.dataTransfer.files?.[0];
                      if (file) void handleSlotFileDropOrPick(rf.slot, file);
                    }}
                  >
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="studio-sr-file"
                      tabIndex={-1}
                      aria-hidden="true"
                      ref={(el) => {
                        slotFileInputsRef.current[rf.slot] = el;
                      }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleSlotFileDropOrPick(rf.slot, file);
                        e.currentTarget.value = "";
                      }}
                    />
                    <div className="studio-row--between">
                      <h4>{rf.title}</h4>
                      <PixelBadge tone="accent">{rf.slot}</PixelBadge>
                    </div>
                    <p>{rf.note}</p>
                    <div className="studio-grid-3">
                      <div className="studio-stack">
                        <small>AI Raw (#00FF00)</small>
                        <div className="studio-checker-box studio-checker-box--chroma">
                          <img
                            className="pixel-art"
                            src={assetUrl(rf.rawFile)}
                            width={rf.rawSize[0]}
                            height={rf.rawSize[1]}
                            data-px-source-width={rf.rawSize[0]}
                            data-px-source-height={rf.rawSize[1]}
                            data-px-sprite-scale="1"
                            alt={`${rf.title} raw`}
                          />
                        </div>
                      </div>
                      <div className="studio-stack">
                        <small>Cleaned RGBA</small>
                        <div className="studio-checker-box">
                          <img
                            className="pixel-art"
                            src={assetUrl(rf.cleanedFile)}
                            width={rf.cleanedSize[0]}
                            height={rf.cleanedSize[1]}
                            data-px-source-width={rf.cleanedSize[0]}
                            data-px-source-height={rf.cleanedSize[1]}
                            data-px-sprite-scale="1"
                            alt={`${rf.title} cleaned`}
                          />
                        </div>
                      </div>
                      {rf.unarmedFile ? (
                        <div className="studio-stack">
                          <small>Unarmed Base</small>
                          <div className="studio-checker-box">
                            <img
                              className="pixel-art"
                              src={assetUrl(rf.unarmedFile)}
                              width={96}
                              height={96}
                              data-px-source-width={96}
                              data-px-source-height={96}
                              data-px-sprite-scale="1"
                              alt={`${rf.title} unarmed`}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="studio-stack">
                          <small>Kích Thước Đích</small>
                          <div className="studio-box">
                            <strong>
                              {rf.cleanedSize[0]}×{rf.cleanedSize[1]}px
                            </strong>
                            <span>Alpha {"{0, 255}"}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="studio-row">
                      <PixelButton
                        size="sm"
                        variant="outline"
                        className="studio-btn-auto"
                        disabled={bridgeBusy}
                        onClick={() => slotFileInputsRef.current[rf.slot]?.click()}
                      >
                        📤 Nạp / Kéo Thả PNG #00FF00
                      </PixelButton>
                      <PixelButton
                        size="sm"
                        className="studio-btn-auto"
                        selected={chromaLabSlot === rf.slot && !localChromaDataUrl}
                        onClick={() => {
                          setChromaLabSlot(rf.slot);
                          setLocalChromaDataUrl(null);
                        }}
                      >
                        🔬 Soi Tách Nền
                      </PixelButton>
                    </div>
                  </div>
                ))}
              </div>
            </PixelPanel>

            <PixelPanel
              title="Phòng Thí Nghiệm Khử Nền CIELAB #00FF00 & Kiểm Tra Đường Chân Y=88 (PixelChromaLab)"
              headerAction={<PixelBadge tone="accent">ALPHA NHỊ PHÂN {"{0, 255}"}</PixelBadge>}
            >
              <PixelChromaLab
                rawSrc={
                  localChromaDataUrl ??
                  assetUrl(
                    (manifest.rawFrames?.find((r) => r.slot === chromaLabSlot) ?? manifest.rawFrames?.[0])?.rawFile ??
                      "stage1-raw-idle-f0.png",
                  )
                }
                slotLabel={localChromaDataUrl ? `${chromaLabSlot} (File Mới Nạp)` : chromaLabSlot}
              />
            </PixelPanel>

            <PixelPanel title="Ma Trận 25 Tư Thế Vũ Khí Đã Lượng Tử Hóa Bảng Màu (5 Vũ Khí × 5 Pose Tags)">
              <div className="studio-stack">
                {Object.entries(manifest.weaponPoses).map(([wpnId, poses]) => {
                  const meta = manifest.weaponArsenal?.find((w) => w.id === wpnId);
                  return (
                    <div key={wpnId} className="studio-box">
                      <div className="studio-row--between">
                        <h4>
                          {meta ? `${meta.name} (${meta.rarity})` : wpnId} — ID: {wpnId}
                        </h4>
                        <PixelButton
                          size="sm"
                          tone="accent"
                          className="studio-btn-auto"
                          selected={equippedWeaponId === wpnId}
                          onClick={() => setEquippedWeaponId(wpnId)}
                        >
                          {equippedWeaponId === wpnId ? "✓ Đang Trang Bị" : "Trang Bị Vũ Khí Này"}
                        </PixelButton>
                      </div>
                      <div className="studio-row">
                        {Object.entries(poses).map(([poseTag, file]) => (
                          <div key={poseTag} className="studio-checker-box">
                            <div className="studio-stack">
                              <PixelBadge>{poseTag}</PixelBadge>
                              <img
                                className="pixel-art"
                                src={assetUrl(file)}
                                width={96}
                                height={96}
                                data-px-source-width={96}
                                data-px-source-height={96}
                                data-px-sprite-scale="1"
                                alt={`${wpnId} ${poseTag}`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </PixelPanel>

            <PixelPanel title="Bảng Màu Khóa Chung (Master Palette <= 19 Màu) & Contact Sheet Kiểm Định 2×">
              <div className="studio-palette-grid">
                {manifest.character.paletteHex.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    className="studio-swatch-btn"
                    title={`Sao chép mã màu ${hex}`}
                    aria-label={`Sao chép mã màu ${hex}`}
                    onClick={() => copyText(hex, hex)}
                  >
                    <span className="studio-swatch-btn__chip" style={{ backgroundColor: hex }} />
                  </button>
                ))}
              </div>
              {copiedPromptTag && <PixelStatus tone="success" label={`Đã sao chép: ${copiedPromptTag}`} />}

              <div className="studio-grid-2">
                <div className="studio-box">
                  <h4>Contact Sheet Kiểm Định Nền Tối (896×672)</h4>
                  <div className="studio-scroll-stage">
                    <img
                      className="pixel-art"
                      src="/assets/pixel-ui/debug/contact-sheet-forge-dark.png"
                      width={896}
                      height={672}
                      data-px-source-width={896}
                      data-px-source-height={672}
                      data-px-sprite-scale="1"
                      alt="Contact sheet dark"
                    />
                  </div>
                </div>
                <div className="studio-box">
                  <h4>Contact Sheet Kiểm Định Nền Sáng (896×672)</h4>
                  <div className="studio-scroll-stage">
                    <img
                      className="pixel-art"
                      src="/assets/pixel-ui/debug/contact-sheet-forge-light.png"
                      width={896}
                      height={672}
                      data-px-source-width={896}
                      data-px-source-height={672}
                      data-px-sprite-scale="1"
                      alt="Contact sheet light"
                    />
                  </div>
                </div>
              </div>
            </PixelPanel>
          </div>
        )}

        {/* =====================================================================
            TAB 2: STAGE 02 — 7-LAYER PAPERDOLL, SOCKETS & 4 GREYSCALE TINT MASKS
           ===================================================================== */}
        {activeTab === "stage-2-paperdoll" && (
          <div className="studio-stack">
            <div className="studio-grid-2">
              <PixelPanel title="Stage 02 — Bàn Lắp Ráp Paper-Doll 7 Lớp & 5 Điểm Neo Socket">
                <div className="studio-row">
                  <PixelPaperdoll
                    layers={paperdollItems}
                    sockets={manifest.sockets}
                    showSockets={showSockets}
                    scale={2}
                  />
                  <div className="studio-stack">
                    <PixelButton
                      size="sm"
                      className="studio-btn-auto"
                      selected={showSockets}
                      onClick={() => setShowSockets((s) => !s)}
                    >
                      {showSockets ? "✓ Hiện 5 Điểm Neo Socket" : "○ Ẩn Điểm Neo Socket"}
                    </PixelButton>
                    {Object.keys(layerTints).length > 0 && (
                      <PixelButton
                        size="sm"
                        tone="warning"
                        className="studio-btn-auto"
                        onClick={() => setLayerTints({})}
                      >
                        ↺ Xóa Toàn Bộ Màu Nhuộm Tùy Chỉnh
                      </PixelButton>
                    )}
                    <div className="studio-row">
                      {manifest.layerSpecs.map((spec) => (
                        <PixelButton
                          key={spec.id}
                          size="sm"
                          variant="outline"
                          className="studio-btn-auto"
                          selected={layerEnabled[spec.id] ?? true}
                          onClick={() =>
                            setLayerEnabled((prev) => ({ ...prev, [spec.id]: !(prev[spec.id] ?? true) }))
                          }
                        >
                          {(layerEnabled[spec.id] ?? true) ? `✓ ${spec.id}` : `○ ${spec.id}`}
                        </PixelButton>
                      ))}
                    </div>
                  </div>
                </div>

                <PixelTable caption="Thông Số Đăng Ký Đồng Tâm 7 Lớp (Offset, Pivot & Khung Canvas)">
                  <thead>
                    <tr>
                      <th>Lớp</th>
                      <th>Vai Trò</th>
                      <th>Canvas</th>
                      <th>Offset (X,Y)</th>
                      <th>Pivot (X,Y)</th>
                      <th>Greyscale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manifest.layerSpecs.map((s) => (
                      <tr key={s.id}>
                        <td>{s.id}</td>
                        <td>{s.role}</td>
                        <td>
                          {s.width}×{s.height}
                        </td>
                        <td>
                          ({s.offsetX}, {s.offsetY})
                        </td>
                        <td>
                          ({s.pivotX}, {s.pivotY})
                        </td>
                        <td>{s.tintable ? "Có (Mask)" : "Không"}</td>
                      </tr>
                    ))}
                  </tbody>
                </PixelTable>
              </PixelPanel>

              {/* ALL 4 GREYSCALE MASKS WITH CUSTOM COLOR PICKERS + PRESETS */}
              <PixelPanel
                title="Xưởng Nhuộm Màu Tự Do Trên Cả 4 Mặt Nạ Greyscale (Đồng Bộ Sang Cả Hoạt Ảnh!)"
                headerAction={<PixelBadge tone="accent">4 / 4 TINT MASKS</PixelBadge>}
              >
                <div className="studio-stack">
                  {(Object.keys(TINT_PRESETS) as TintLayerKey[]).map((layerKey) => {
                    const cfg = TINT_PRESETS[layerKey];
                    const maskFile = manifest.masks[cfg.maskKey];
                    const activeHex = layerTints[layerKey];
                    return (
                      <div key={layerKey} className="studio-box">
                        <div className="studio-row--between">
                          <h4>{cfg.label}</h4>
                          <PixelBadge tone={activeHex ? "warning" : "neutral"}>
                            {activeHex ? `Đang nhuộm: ${activeHex}` : "Màu gốc"}
                          </PixelBadge>
                        </div>
                        <div className="studio-row">
                          {maskFile && (
                            <div className="studio-checker-box">
                              <img
                                className="pixel-art"
                                src={assetUrl(maskFile)}
                                width={64}
                                height={64}
                                data-px-source-width={64}
                                data-px-source-height={64}
                                data-px-sprite-scale="1"
                                alt={cfg.label}
                              />
                            </div>
                          )}
                          <div className="studio-stack">
                            <div className="studio-row">
                              {cfg.swatches.map((sw) => (
                                <PixelButton
                                  key={sw.hex}
                                  size="sm"
                                  className="studio-btn-auto"
                                  selected={activeHex?.toLowerCase() === sw.hex.toLowerCase()}
                                  onClick={() => setLayerTints((prev) => ({ ...prev, [layerKey]: sw.hex }))}
                                >
                                  {sw.name}
                                </PixelButton>
                              ))}
                              <label className="studio-color-picker">
                                <input
                                  type="color"
                                  value={activeHex ?? cfg.swatches[0].hex}
                                  aria-label={`Chọn màu tùy chỉnh cho ${cfg.label}`}
                                  onChange={(e) =>
                                    setLayerTints((prev) => ({ ...prev, [layerKey]: e.target.value }))
                                  }
                                />
                                <span>Màu Tự Chọn</span>
                              </label>
                              {activeHex && (
                                <PixelButton
                                  size="sm"
                                  variant="ghost"
                                  className="studio-btn-auto"
                                  onClick={() =>
                                    setLayerTints((prev) => {
                                      const next = { ...prev };
                                      delete next[layerKey];
                                      return next;
                                    })
                                  }
                                >
                                  ↺ Gốc
                                </PixelButton>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </PixelPanel>
            </div>

            <PixelPanel title="Đối Chiếu Trạng Thái Nguyên Vẹn vs Chiến Tổn (-damaged • Độ Lệch Khung Bao 0px)">
              <div className="studio-grid-2">
                <div className="studio-box">
                  <h4>Master Still Nguyên Vẹn (96×96 → 192×192)</h4>
                  <div className="studio-checker-box">
                    <img
                      className="pixel-art"
                      src={assetUrl(manifest.character.masterStill)}
                      width={192}
                      height={192}
                      data-px-source-width={96}
                      data-px-source-height={96}
                      data-px-sprite-scale="2"
                      alt="Master still"
                    />
                  </div>
                </div>
                <div className="studio-box">
                  <h4>Biến Thể Chiến Tổn (-damaged • Bbox Delta = {manifest.character.damagedBboxDeltaPx}px)</h4>
                  <div className="studio-checker-box">
                    <img
                      className="pixel-art"
                      src={assetUrl(manifest.character.damagedStill)}
                      width={192}
                      height={192}
                      data-px-source-width={96}
                      data-px-source-height={96}
                      data-px-sprite-scale="2"
                      alt="Damaged still"
                    />
                  </div>
                </div>
              </div>
            </PixelPanel>
          </div>
        )}

        {/* =====================================================================
            TAB 3: STAGE 03 — 5 CLIPS, REAL HIT-STOP/SHAKE & DUAL-BUFFER VFX
           ===================================================================== */}
        {activeTab === "stage-3-motion" && (
          <div className="studio-stack">
            <PixelPanel title="Stage 03 — Máy Chiếu Hoạt Ảnh Thực Thi Hit-Stop, Screen-Shake & Crawl Killer">
              <div className="studio-row">
                {Object.entries(manifest.clips).map(([clipKey, clipObj]) => (
                  <PixelButton
                    key={clipKey}
                    size="sm"
                    className="studio-btn-auto"
                    selected={activeClipKey === clipKey}
                    onClick={() => setActiveClipKey(clipKey)}
                  >
                    {clipKey.toUpperCase()} — {clipObj.label}
                  </PixelButton>
                ))}
              </div>

              {activeClip && (
                <PixelSpriteAnimator
                  clipId={activeClipKey}
                  clipLabel={`${manifest.character.name} — ${activeClip.label}`}
                  frames={activeClip.frames.map(assetUrl)}
                  unarmedFrames={activeClip.unarmedFrames?.map(assetUrl)}
                  weaponPoseFrames={clipWeaponOverlayUrls}
                  showWeaponOverlay={Boolean(clipWeaponOverlayUrls)}
                  unarmedMode={isUnarmed}
                  vfxFrames={slashVfxFrameUrls}
                  vfxFps={slashVfx?.fps ?? 12}
                  showVfx={true}
                  vfxMode={vfxTriggerMode}
                  fps={activeClip.fps}
                  frameWidth={96}
                  frameHeight={96}
                  scale={2}
                  timing={activeClip.timing}
                  baselineY={manifest.character.footBaselineY}
                  transformOptions={spriteTransformOptions}
                />
              )}

              <PixelTable caption="Bảng Thông Số Diễn Xuất & Lọc Khử Bò Viền (Temporal Hysteresis Crawl Killer)">
                <thead>
                  <tr>
                    <th>Clip</th>
                    <th>Số Khung</th>
                    <th>FPS</th>
                    <th>Region Mask</th>
                    <th>Crawl Khử</th>
                    <th>Hit-Stop / Shake</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(manifest.clips).map(([k, c]) => (
                    <tr key={k}>
                      <td>{k}</td>
                      <td>{c.frames.length}</td>
                      <td>{c.fps} FPS</td>
                      <td>{c.regionMasked ? "Bật" : "Toàn phần"}</td>
                      <td>{c.crawlPixelsSuppressed} px</td>
                      <td>
                        {c.timing.hitStopMs}ms / {c.timing.screenShakePx}px
                      </td>
                    </tr>
                  ))}
                </tbody>
              </PixelTable>
            </PixelPanel>

            {activeVfxObj && (
              <PixelPanel
                title="Kiểm Định Kỹ Xảo 2 Bộ Đệm (Dual-Buffer VFX: Color + Emissive + Composite)"
                headerAction={
                  <PixelBadge tone="success">
                    PIXEL CRAFT {activeVfxObj.craftChecksPassed} / 22 PASS
                  </PixelBadge>
                }
              >
                <div className="studio-row">
                  {Object.entries(manifest.vfx).map(([vId, vObj]) => (
                    <PixelButton
                      key={vId}
                      size="sm"
                      className="studio-btn-auto"
                      selected={selectedVfxId === vId}
                      onClick={() => setSelectedVfxId(vId)}
                    >
                      {vObj.name} ({vObj.fps} FPS)
                    </PixelButton>
                  ))}
                </div>

                <div className="studio-grid-3">
                  <div className="studio-box">
                    <h4>1. Color Strip (256×64)</h4>
                    <div className="studio-checker-box">
                      <img
                        className="pixel-art"
                        src={assetUrl(activeVfxObj.colorStrip)}
                        width={256}
                        height={64}
                        data-px-source-width={256}
                        data-px-source-height={64}
                        data-px-sprite-scale="1"
                        alt={`${activeVfxObj.name} color strip`}
                      />
                    </div>
                  </div>
                  <div className="studio-box">
                    <h4>2. Emissive Bloom Mask (256×64)</h4>
                    <div className="studio-checker-box studio-checker-box--obsidian">
                      <img
                        className="pixel-art"
                        src={assetUrl(activeVfxObj.emissiveStrip)}
                        width={256}
                        height={64}
                        data-px-source-width={256}
                        data-px-source-height={64}
                        data-px-sprite-scale="1"
                        alt={`${activeVfxObj.name} emissive strip`}
                      />
                    </div>
                  </div>
                  <div className="studio-box">
                    <h4>3. Composite Preview (256×64)</h4>
                    <div className="studio-checker-box studio-checker-box--obsidian">
                      <img
                        className="pixel-art"
                        src={assetUrl(activeVfxObj.compositeStrip)}
                        width={256}
                        height={64}
                        data-px-source-width={256}
                        data-px-source-height={64}
                        data-px-sprite-scale="1"
                        alt={`${activeVfxObj.name} composite strip`}
                      />
                    </div>
                  </div>
                </div>

                <PixelSpriteAnimator
                  clipId="vfx"
                  clipLabel={`${activeVfxObj.name} (64×64 → 128×128)`}
                  frames={activeVfxObj.frames.map(assetUrl)}
                  fps={activeVfxObj.fps}
                  frameWidth={64}
                  frameHeight={64}
                  scale={2}
                />
              </PixelPanel>
            )}
          </div>
        )}

        {/* =====================================================================
            TAB 4: STAGE 04 — 23-PANEL CHARACTER BIBLE, 3x3 COMPASS, GACHA & PROMPTS
           ===================================================================== */}
        {activeTab === "stage-4-bible" && (
          <div className="studio-stack">
            <div className="studio-grid-2">
              {/* SPATIAL 3x3 COMPASS ROSE */}
              <PixelPanel
                title="Stage 04 — La Bàn Xoay 8 Hướng Không Gian 3×3 (Chuẩn Đối Xứng & Mặt Lưng)"
                headerAction={
                  <PixelBadge tone="accent">
                    {activeDirMeta ? activeDirMeta.source.toUpperCase() : selectedDirection}
                  </PixelBadge>
                }
              >
                <div className="studio-compass-grid">
                  {COMPASS_GRID_ORDER.map((cell) => {
                    if (cell === "CENTER") {
                      return (
                        <div key="CENTER" className="studio-compass-center">
                          <PixelBadge tone="warning">TÂM LA BÀN: {selectedDirection}</PixelBadge>
                          <img
                            className="pixel-art"
                            src={assetUrl(manifest.directions[selectedDirection])}
                            width={96}
                            height={96}
                            data-px-source-width={96}
                            data-px-source-height={96}
                            data-px-sprite-scale="1"
                            alt={`Hướng ${selectedDirection}`}
                          />
                          <small>
                            {activeDirMeta?.label ?? selectedDirection}
                            {activeDirMeta?.mirrorOf ? ` (Lật từ ${activeDirMeta.mirrorOf})` : ""}
                          </small>
                        </div>
                      );
                    }
                    const dirMeta = manifest.directionMeta?.[cell];
                    return (
                      <button
                        key={cell}
                        type="button"
                        className="studio-compass-cell"
                        aria-pressed={selectedDirection === cell}
                        onClick={() => setSelectedDirection(cell)}
                      >
                        <PixelBadge
                          tone={
                            dirMeta?.source === "ai-source"
                              ? "success"
                              : dirMeta?.source === "dorsal-pixel"
                                ? "accent"
                                : "neutral"
                          }
                        >
                          {cell} •{" "}
                          {dirMeta?.source === "ai-source"
                            ? "Gốc"
                            : dirMeta?.source === "dorsal-pixel"
                              ? "Lưng"
                              : `Flip(${dirMeta?.mirrorOf ?? ""})`}
                        </PixelBadge>
                        <img
                          className="pixel-art"
                          src={assetUrl(manifest.directions[cell])}
                          width={96}
                          height={96}
                          data-px-source-width={96}
                          data-px-source-height={96}
                          data-px-sprite-scale="1"
                          alt={dirMeta?.label ?? cell}
                        />
                      </button>
                    );
                  })}
                </div>
              </PixelPanel>

              {/* INTERACTIVE GACHA SUMMON CARD + 6 LOOT SLOTS */}
              <PixelPanel title="Thẻ Triệu Hồi Gacha Lăng Kính & 6 Thần Khí Rơi Thưởng (UR / SSR)">
                <PixelGachaCard
                  name={manifest.character.name}
                  subtitle={manifest.character.title}
                  rarity={manifest.character.rarity}
                  elementLabel={manifest.elements[activeElementKey]?.label ?? activeElementKey}
                  spriteSrc={gachaSpriteSrc}
                  spriteWidth={96}
                  spriteHeight={96}
                  spriteScale={2}
                  foilActive={true}
                  summonVfxFrames={summonVfxFrameUrls}
                  stats={[
                    { label: "Vũ khí đang cầm", value: equippedWeaponId.toUpperCase() },
                    { label: "Bảng màu khóa", value: `${manifest.character.paletteHex.length} màu` },
                    { label: "Character Bible", value: "23 khung chuẩn" },
                    { label: "Quality Gate", value: `${manifest.qualityReport.score}/100 PASS` },
                  ]}
                />

                <div className="studio-box">
                  <h4>6 Vật Phẩm & Thần Khí Rơi Thưởng (Phân Biệt Rõ SSR Khởi Đầu vs UR Thần Khí)</h4>
                  <div className="studio-row">
                    {manifest.loot.map((item) => (
                      <PixelSlot
                        key={item.id}
                        itemLabel={`${item.name} (${item.rarity.toUpperCase()})`}
                        selected={selectedLootId === item.id}
                        onClick={() => setSelectedLootId(item.id)}
                      >
                        <PixelSprite
                          src={assetUrl(item.file)}
                          sourceWidth={32}
                          sourceHeight={32}
                          scale={1}
                          alt={item.name}
                        />
                      </PixelSlot>
                    ))}
                  </div>
                  {manifest.loot
                    .filter((l) => l.id === selectedLootId)
                    .map((item) => (
                      <div key={item.id} className="studio-row--between">
                        <strong>
                          {item.name} — Cấp {item.rarity.toUpperCase()}
                        </strong>
                        <span>Chất liệu: {item.material} (32×32px)</span>
                      </div>
                    ))}
                </div>
              </PixelPanel>
            </div>

            {/* COMPLETE 23-PANEL CHARACTER BIBLE GALLERY */}
            {manifest.characterBible && (
              <PixelPanel
                title="Trọn Bộ Kinh Thánh Nhân Vật 23 Khung (8 Hướng + 6 Biểu Cảm + 3 Giáp Tiến Hóa + 5 Hệ + 1 Chibi SD)"
                headerAction={<PixelBadge tone="warning">23 / 23 BIBLE PANELS</PixelBadge>}
              >
                <div className="studio-box">
                  <h4>6 Chân Dung Biểu Cảm Hội Thoại (48×48 → 96×96 • 2×)</h4>
                  <div className="studio-grid-6">
                    {manifest.characterBible.expressions.map((expr) => (
                      <div key={expr.id} className="studio-checker-box">
                        <div className="studio-stack">
                          <img
                            className="pixel-art"
                            src={assetUrl(expr.file)}
                            width={96}
                            height={96}
                            data-px-source-width={48}
                            data-px-source-height={48}
                            data-px-sprite-scale="2"
                            alt={expr.label}
                          />
                          <small>{expr.label}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="studio-grid-2">
                  <div className="studio-box">
                    <h4>3 Trang Phục Tiến Hóa Ascension Skins (96×96)</h4>
                    <div className="studio-grid-3">
                      {manifest.characterBible.skins.map((skin) => (
                        <div key={skin.id} className="studio-checker-box">
                          <div className="studio-stack">
                            <img
                              className="pixel-art"
                              src={assetUrl(skin.file)}
                              width={96}
                              height={96}
                              data-px-source-width={96}
                              data-px-source-height={96}
                              data-px-sprite-scale="1"
                              alt={skin.label}
                            />
                            <small>{skin.label}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="studio-box">
                    <h4>Chibi SD 2-Đầu (64×64 → 128×128) & 5 Biến Thể Nguyên Tố</h4>
                    <div className="studio-row">
                      <div className="studio-checker-box">
                        <div className="studio-stack">
                          <img
                            className="pixel-art"
                            src={assetUrl(manifest.characterBible.chibi.file)}
                            width={128}
                            height={128}
                            data-px-source-width={64}
                            data-px-source-height={64}
                            data-px-sprite-scale="2"
                            alt={manifest.characterBible.chibi.label}
                          />
                          <small>{manifest.characterBible.chibi.label}</small>
                        </div>
                      </div>
                      {Object.entries(manifest.elements).map(([elKey, elObj]) => (
                        <button
                          key={elKey}
                          type="button"
                          className="studio-compass-cell"
                          aria-pressed={activeElementKey === elKey}
                          onClick={() => setActiveElementKey(elKey)}
                        >
                          <PixelBadge tone={activeElementKey === elKey ? "warning" : "neutral"}>
                            {elKey.toUpperCase()}
                          </PixelBadge>
                          <img
                            className="pixel-art"
                            src={assetUrl(elObj.file)}
                            width={96}
                            height={96}
                            data-px-source-width={96}
                            data-px-source-height={96}
                            data-px-sprite-scale="1"
                            alt={elObj.label}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </PixelPanel>
            )}

            {/* 6-STAGE CANONICAL PROMPT COMPILER & PROVIDER ROUTER */}
            {prompts && (
              <PixelPanel
                title="Bộ Biên Dịch Prompt Chuẩn 6 Công Đoạn & Trạng Thái Kết Nối AI / IDE Skill"
                headerAction={
                  <PixelButton size="sm" tone="accent" className="studio-btn-auto" onClick={() => setActiveTab("stage-1-raw")}>
                    ⚡ Mở Xưởng Tạo Lệnh IDE Skill
                  </PixelButton>
                }
              >
                {prompts.availableProviders.length > 0 && (
                  <div className="studio-grid-3">
                    <div className="studio-box">
                      <div className="studio-row--between">
                        <h4>IDE Workspace Skill (pixel-forge-ai-gen)</h4>
                        <PixelBadge tone="success">ACTIVE</PixelBadge>
                      </div>
                      <p>
                        Đã cài đặt tại <code>.agents/skills/</code>, <code>skills/</code> & <code>.cursor/rules/</code>. Copy
                        lệnh từ Stage 01 dán thẳng vào Antigravity / Cursor / Codex để tự gen & tự lưu file!
                      </p>
                    </div>
                    {prompts.availableProviders.map((prov) => (
                      <div key={prov.id} className="studio-box">
                        <div className="studio-row--between">
                          <h4>{prov.label}</h4>
                          <PixelBadge tone={prov.status === "ready" || prov.status === "configured" ? "success" : "neutral"}>
                            {prov.status}
                          </PixelBadge>
                        </div>
                        <p>Chi phí: {prov.cost}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="studio-grid-2">
                  {Object.entries(prompts.stages).map(([stageKey, st]) => (
                    <div key={stageKey} className="studio-box">
                      <div className="studio-row--between">
                        <h4>{st.title}</h4>
                        <PixelButton
                          size="sm"
                          className="studio-btn-auto"
                          onClick={() => copyText(stageKey, st.prompt)}
                        >
                          {copiedPromptTag === stageKey ? "✓ Đã Chép" : "Sao Chép Prompt"}
                        </PixelButton>
                      </div>
                      <pre className="studio-code">{st.prompt}</pre>
                    </div>
                  ))}
                </div>
              </PixelPanel>
            )}
          </div>
        )}

        {/* =====================================================================
            TAB 5: STAGE 05 — WANG 16-AUTOTILE, SEAMLESS PARALLAX & 2.5D LIGHTING
           ===================================================================== */}
        {activeTab === "stage-5-world" && (
          <div className="studio-stack">
            <PixelPanel
              title={`Stage 05 — ${manifest.world.tilesetName} & Sân Đấu Parallax 3 Lớp Khép Kín`}
              headerAction={
                <PixelBadge tone="success">
                  BIOME: {(manifest.world.biomeElement ?? heroBaseElement).toUpperCase()} • GRID 1:1
                </PixelBadge>
              }
            >
              <PixelTilemapView
                autotileSheetSrc={assetUrl(manifest.world.autotileSheet)}
                mapPreviewSrc={assetUrl(manifest.world.mapPreview)}
                parallaxCompositeSrc={assetUrl(manifest.world.parallaxComposite)}
                parallaxSkySrc={assetUrl(manifest.world.parallaxSky)}
                parallaxRuinsSrc={assetUrl(manifest.world.parallaxRuins)}
                parallaxGroundSrc={assetUrl(manifest.world.parallaxArena)}
                initialGrid={manifest.world.gridLayout}
                stageWidth={manifest.world.stageWidth}
                stageHeight={manifest.world.stageHeight}
                biomeElement={manifest.world.biomeElement ?? heroBaseElement}
              />
            </PixelPanel>

            <PixelPanel title="Bản Đồ Ánh Sáng Động 2.5D (Normal + Specular Thép + Emissive Không Rò Sáng)">
              <PixelLightingPreview
                diffuseSrc={assetUrl(manifest.character.masterStill)}
                normalSrc={assetUrl(manifest.character.normalMap)}
                specularSrc={assetUrl(manifest.character.specularMap)}
                emissiveSrc={assetUrl(manifest.character.emissiveMap)}
              />
            </PixelPanel>
          </div>
        )}

        {/* =====================================================================
            TAB 6: STAGE 06 — TRIMMED MULTI-MAP ATLAS, GODOT 4 .TRES & BATCH FACTORY
           ===================================================================== */}
        {activeTab === "stage-6-export" && (
          <div className="studio-stack">
            <div className="studio-grid-2">
              <PixelPanel
                title={`Stage 06 — Soi Tọa Độ Multi-Map Atlas (${manifest.atlas.width}×${manifest.atlas.height}px • ${manifest.atlas.extrudePx}px Extrude)`}
                headerAction={
                  <PixelBadge tone="accent">
                    {manifest.atlas.frameCount} KHUNG • KHỬ TRÙNG {manifest.atlas.deduplicatedFrames}
                  </PixelBadge>
                }
              >
                <PixelAtlasInspector
                  diffuseSrc={assetUrl(manifest.atlas.diffuse)}
                  normalSrc={assetUrl(manifest.atlas.normal)}
                  emissiveSrc={assetUrl(manifest.atlas.emissive)}
                  atlasWidth={manifest.atlas.width}
                  atlasHeight={manifest.atlas.height}
                  extrudePx={manifest.atlas.extrudePx}
                  frames={manifest.atlas.frames ?? []}
                />
              </PixelPanel>

              <PixelPanel title="Xuất Cấu Hình Game Engine & Gói Bundle .ZIP (Godot 4 .tres / Unity 6 / Aseprite)">
                {manifest.atlas.bundleZip && (
                  <div className="studio-box">
                    <div className="studio-row--between">
                      <div>
                        <strong>Trọn Gói Tài Nguyên Tướng ({manifest.atlas.bundleZip})</strong>
                        <p>
                          Đóng gói sẵn 3 kênh Atlas (Diffuse/Normal/Emissive), Godot 4 .tres, Unity 6 .json, Aseprite
                          .json, 7 lớp Paper-Doll, 4 mặt nạ nhuộm màu, dải Clip, bản đồ Autotile & README-IMPORT.txt (
                          {manifest.atlas.bundleZipBytes
                            ? `${Math.round(manifest.atlas.bundleZipBytes / 1024)} KB`
                            : "ZIP"}
                          ).
                        </p>
                      </div>
                      <a
                        className="studio-link-btn"
                        href={assetUrl(manifest.atlas.bundleZip)}
                        download={`${activeHeroId}-engine-bundle.zip`}
                      >
                        📦 Tải Engine Bundle (.zip)
                      </a>
                    </div>
                  </div>
                )}

                <div className="studio-row">
                  {(heroBundle?.engineDocs ?? []).map((doc) => (
                    <PixelButton
                      key={doc.id}
                      size="sm"
                      className="studio-btn-auto"
                      selected={selectedEngineDocId === doc.id}
                      onClick={() => setSelectedEngineDocId(doc.id)}
                    >
                      {doc.title}
                    </PixelButton>
                  ))}
                </div>

                {activeEngineDoc && (
                  <div className="studio-stack">
                    <div className="studio-row--between">
                      <strong>{activeEngineDoc.file}</strong>
                      <div className="studio-row">
                        <PixelButton
                          size="sm"
                          className="studio-btn-auto"
                          onClick={() => copyText(activeEngineDoc.file, activeEngineDoc.content)}
                        >
                          {copiedPromptTag === activeEngineDoc.file ? "✓ Đã Chép" : "Sao Chép Nội Dung"}
                        </PixelButton>
                        <a className="studio-link-btn" href={activeEngineDoc.href} download={activeEngineDoc.file}>
                          ⬇ Tải {activeEngineDoc.file}
                        </a>
                      </div>
                    </div>
                    <pre className="studio-code">{activeEngineDoc.content}</pre>
                  </div>
                )}

                <div className="studio-box">
                  <h4>Báo Cáo Kiểm Định Tự Động Quality Gate ({manifest.qualityReport.score}/100)</h4>
                  {manifest.qualityReport.checks.map((chk) => (
                    <div key={chk.id} className="studio-row--between">
                      <PixelStatus tone={chk.passed ? "success" : "danger"} label={chk.label} />
                      <small>{chk.detail}</small>
                    </div>
                  ))}
                </div>
              </PixelPanel>
            </div>

            {/* MULTI-HERO BATCH FACTORY */}
            {batchRoster && (
              <PixelPanel
                title={`Xưởng Sản Xuất Hàng Loạt ${batchRoster.totalUnits} Tướng Roster (100% AI-Native & Tự Động Hóa IDE)`}
                headerAction={
                  <PixelBadge tone="success">
                    {batchRoster.totalUnits} TƯỚNG • TRUNG BÌNH {batchRoster.averageScore}/100 PASS
                  </PixelBadge>
                }
              >
                <div className="studio-grid-3">
                  {batchRoster.units.map((unit) => {
                    const isLoaded = unit.id === activeHeroId;
                    return (
                      <div key={unit.id} className="studio-box">
                        <div className="studio-row--between">
                          <PixelBadge tone={unit.rarity === "ur" ? "danger" : "warning"}>
                            {unit.rarity.toUpperCase()} • {unit.classRole}
                          </PixelBadge>
                          <PixelBadge tone={unit.assetProvenance === "ai-native" ? "success" : "accent"}>
                            {unit.assetProvenance}
                          </PixelBadge>
                        </div>
                        <h4>
                          {unit.name} — {unit.title}
                        </h4>
                        <div className="studio-row">
                          <div className="studio-checker-box">
                            <img
                              className="pixel-art"
                              src={withCacheRev(unit.previewSprite)}
                              width={96}
                              height={96}
                              data-px-source-width={96}
                              data-px-source-height={96}
                              data-px-sprite-scale="1"
                              alt={unit.name}
                            />
                          </div>
                          <div className="studio-checker-box">
                            <img
                              className="pixel-art"
                              src={withCacheRev(unit.attackFrame)}
                              width={96}
                              height={96}
                              data-px-source-width={96}
                              data-px-source-height={96}
                              data-px-sprite-scale="1"
                              alt={`${unit.name} attack`}
                            />
                          </div>
                        </div>
                        <p>
                          Vũ khí phái: {unit.weaponSpec} • File Prompt #1: <code>{unit.prompts[0]?.file}</code>
                        </p>
                        <div className="studio-row">
                          <PixelButton
                            tone={isLoaded ? "success" : "accent"}
                            className="studio-btn-auto"
                            selected={isLoaded}
                            onClick={() => {
                              handleSelectHero(unit, assetCacheRev || undefined);
                              setActiveTab("overview");
                            }}
                          >
                            {isLoaded ? "✓ Đang Nạp Trên Studio" : "⚡ Nạp Tướng Vào Studio"}
                          </PixelButton>
                          <PixelButton
                            size="sm"
                            variant="outline"
                            className="studio-btn-auto"
                            onClick={() => {
                              handleSelectHero(unit, assetCacheRev || undefined);
                              setIdeTargetMode("existing");
                              setActiveTab("stage-1-raw");
                            }}
                          >
                            📋 Tạo Lệnh Gen AI
                          </PixelButton>
                          {viteBridgeOnline && !CORE_HERO_IDS.has(unit.id) && (
                            <PixelButton
                              size="sm"
                              tone="danger"
                              variant="outline"
                              className="studio-btn-auto"
                              disabled={bridgeBusy}
                              onClick={() => void handleBridgeDeleteUnit(unit.id)}
                            >
                              🗑 Xóa Tướng
                            </PixelButton>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </PixelPanel>
            )}
          </div>
        )}

        {/* =====================================================================
            TAB 7: COMPLETE PIXEL UI DESIGN SYSTEM & NINE-SLICE ASSET SHOWCASE
           ===================================================================== */}
        {activeTab === "ui-kit-showcase" && (
          <div className="studio-stack">
            {/* 1. RASTER NINE-SLICE ASSET SYSTEM (PixelAsset.tsx) */}
            <PixelPanel
              title="1. Hệ Thống Khung Nine-Slice Raster & Biểu Tượng Pixel Đích Thực (PixelAsset.tsx)"
              headerAction={<PixelBadge tone="warning">SLICE 16PX • ALPHA {"{0, 255}"}</PixelBadge>}
            >
              <div className="studio-grid-2">
                <div className="studio-stack">
                  <div className="studio-row">
                    {(["market", "currency", "research", "capital", "intelligence"] as PixelAssetTone[]).map((t) => (
                      <PixelButton
                        key={t}
                        size="sm"
                        className="studio-btn-auto"
                        selected={showcaseAssetTone === t}
                        onClick={() => setShowcaseAssetTone(t)}
                      >
                        Tone: {t}
                      </PixelButton>
                    ))}
                  </div>
                  <div className="studio-row">
                    {(["account", "primary", "navigation", "content", "compact"] as PixelAssetFamily[]).map((f) => (
                      <PixelButton
                        key={f}
                        size="sm"
                        variant="outline"
                        className="studio-btn-auto"
                        selected={showcaseAssetFamily === f}
                        onClick={() => setShowcaseAssetFamily(f)}
                      >
                        Family: {f}
                      </PixelButton>
                    ))}
                  </div>

                  <PixelAssetFrame tone={showcaseAssetTone} family={showcaseAssetFamily}>
                    <div className="studio-stack">
                      <div className="studio-row--between">
                        <strong>
                          PixelAssetFrame ({showcaseAssetTone} × {showcaseAssetFamily})
                        </strong>
                        <PixelBadge tone="accent">border-image-slice: 16 fill</PixelBadge>
                      </div>
                      <p>
                        Khung Nine-Slice giữ nguyên 4 góc 16×16px không biến dạng và chỉ kéo giãn các cạnh giữa, bảo
                        toàn mật độ điểm ảnh trên mọi độ rộng màn hình.
                      </p>
                      <div className="studio-row">
                        <PixelDepositButton onClick={() => setGoldBalance((g) => g + 2500)}>
                          Nạp +2,500 Vàng
                        </PixelDepositButton>
                        <PixelCompactFrame
                          asset="security"
                          label="Khóa Bảo Mật Tài Khoản"
                          onClick={() => setModalOpen(true)}
                        />
                        <PixelCompactFrame
                          asset="logout"
                          label="Đăng Xuất Phiên Chơi"
                          onClick={() => setModalOpen(true)}
                        />
                      </div>
                    </div>
                  </PixelAssetFrame>
                </div>

                <div className="studio-stack">
                  <PixelContentPanel tone="intelligence" titleId="asset-nav-showcase-title">
                    <div className="studio-stack">
                      <strong id="asset-nav-showcase-title">
                        PixelNavigationItem & Trọn Bộ 6 PixelIcon Đã Tách Nền Nhị Phân
                      </strong>
                      <div className="studio-grid-2">
                        {(
                          [
                            { tone: "market", icon: "market-coins", label: "Chợ Giao Dịch" },
                            { tone: "research", icon: "research-pulse", label: "Viện Nghiên Cứu" },
                            { tone: "capital", icon: "capital-shield", label: "Pháo Đài Thủ Đô" },
                            { tone: "intelligence", icon: "intelligence-core", label: "Lõi Tình Báo" },
                          ] as const
                        ).map((item) => (
                          <PixelNavigationItem
                            key={item.tone}
                            tone={item.tone}
                            icon={item.icon}
                            selected={showcaseNavTone === item.tone}
                            onClick={() => setShowcaseNavTone(item.tone)}
                          >
                            {item.label}
                          </PixelNavigationItem>
                        ))}
                      </div>
                      <div className="studio-row">
                        {(
                          [
                            "market-coins",
                            "research-pulse",
                            "capital-shield",
                            "intelligence-core",
                            "status-shield",
                            "deposit-plus",
                          ] as PixelIconAsset[]
                        ).map((ic) => (
                          <div key={ic} className="studio-checker-box" title={ic}>
                            <PixelIcon asset={ic} alt={ic} />
                          </div>
                        ))}
                      </div>
                      {uiAssetMeta && (
                        <small>
                          Metadata nguồn: {uiAssetMeta.assets.length} asset trích xuất ({uiAssetMeta.backgroundRemoval.strategy},{" "}
                          alpha: {uiAssetMeta.backgroundRemoval.alphaMode}).
                        </small>
                      )}
                    </div>
                  </PixelContentPanel>
                </div>
              </div>
            </PixelPanel>

            {/* 2. CSS NINE-SLICE ORNAMENTAL HARDWARE (PixelOrnate.tsx) */}
            <PixelPanel title="2. Khung Cơ Khí / Pháp Thuật Nine-Slice DOM 9 Vùng (PixelOrnateFrame & PixelOrnateButton)">
              <div className="studio-row">
                {(["neutral", "market", "research", "capital", "intelligence", "currency", "gold"] as PixelOrnateTone[]).map(
                  (t) => (
                    <PixelButton
                      key={t}
                      size="sm"
                      className="studio-btn-auto"
                      selected={showcaseOrnateTone === t}
                      onClick={() => setShowcaseOrnateTone(t)}
                    >
                      Ornate Tone: {t}
                    </PixelButton>
                  ),
                )}
              </div>
              <div className="studio-row">
                {(["mechanical", "reinforced", "arcane", "intelligence", "currency"] as PixelOrnament[]).map((o) => (
                  <PixelButton
                    key={o}
                    size="sm"
                    variant="outline"
                    className="studio-btn-auto"
                    selected={showcaseOrnament === o}
                    onClick={() => setShowcaseOrnament(o)}
                  >
                    Ornament: {o}
                  </PixelButton>
                ))}
                {(["hero", "standard", "restrained"] as PixelOrnateDetail[]).map((d) => (
                  <PixelButton
                    key={d}
                    size="sm"
                    variant="ghost"
                    className="studio-btn-auto"
                    selected={showcaseDetail === d}
                    onClick={() => setShowcaseDetail(d)}
                  >
                    Detail: {d}
                  </PixelButton>
                ))}
              </div>

              <div className="studio-grid-2">
                <PixelOrnateFrame
                  tone={showcaseOrnateTone}
                  ornament={showcaseOrnament}
                  detail={showcaseDetail}
                  family="content"
                >
                  <div className="studio-stack" style={{ padding: "var(--space-4)" }}>
                    <strong>
                      PixelOrnateFrame ({showcaseOrnateTone} • {showcaseOrnament} • {showcaseDetail})
                    </strong>
                    <p>
                      Cấu trúc 9 vùng DOM độc lập gồm 4 góc vát bậc thang, 4 cạnh phân tầng ánh sáng, 2 thanh nẹp brace
                      và 4 đinh tán bolt thích ứng với cả 8 chủ đề màu.
                    </p>
                  </div>
                </PixelOrnateFrame>

                <div className="studio-stack">
                  <PixelOrnateButton
                    tone={showcaseOrnateTone}
                    ornament={showcaseOrnament}
                    detail={showcaseDetail}
                    family="primary"
                    selected={true}
                    icon={<PixelGlyphSword />}
                    marker={<PixelGlyphSpark />}
                    onClick={() => setModalOpen(true)}
                  >
                    Khởi Động Lò Rèn Thần Khí (PixelOrnateButton)
                  </PixelOrnateButton>
                </div>
              </div>
            </PixelPanel>

            {/* 3. CORE CONTAINERS, TOOLBAR, ICON BUTTONS, PROGRESS & WINDOW */}
            <div className="studio-grid-2">
              <PixelWindow
                title="3. PixelWindow, PixelToolbar & PixelIconButton"
                actions={
                  <PixelButton size="sm" tone="accent" className="studio-btn-auto" onClick={() => setModalOpen(true)}>
                    Mở PixelModal
                  </PixelButton>
                }
              >
                <div className="studio-stack">
                  <PixelToolbar label="Thanh công cụ tác chiến (Hỗ trợ phím mũi tên Trái/Phải)">
                    <PixelIconButton label="Cường hóa Vũ khí" tone="accent" selected={true}>
                      <PixelGlyphSword />
                    </PixelIconButton>
                    <PixelIconButton label="Gia cố Khiên Chắn" tone="success">
                      <PixelGlyphShield />
                    </PixelIconButton>
                    <PixelIconButton label="Kích hoạt Pháp Ấn" tone="warning">
                      <PixelGlyphSpark />
                    </PixelIconButton>
                    <PixelButton size="sm" variant="solid" tone="accent" className="studio-btn-auto">
                      Solid
                    </PixelButton>
                    <PixelButton size="sm" variant="outline" className="studio-btn-auto">
                      Outline
                    </PixelButton>
                    <PixelButton size="sm" variant="ghost" className="studio-btn-auto">
                      Ghost
                    </PixelButton>
                    <PixelButton size="sm" loading={true} className="studio-btn-auto">
                      Loading
                    </PixelButton>
                  </PixelToolbar>

                  <PixelCard tone="accent" selected={true}>
                    <strong>PixelCard & PixelFrame (Vát Góc Chamfer Theo Lưới)</strong>
                    <PixelFrame variant="inset" tone="warning">
                      <small>PixelFrame trực tiếp: hỗ trợ variant solid / outline / inset / ghost & đinh mốc góc.</small>
                    </PixelFrame>
                    <PixelProgress label="Tiến Độ Đóng Gói Atlas 48 Khung" value={100} max={100} tone="success" />
                    <PixelProgress label="Luồng Xử Lý Shader 2.5D (Indeterminate)" indeterminate={true} tone="accent" />
                  </PixelCard>
                </div>
              </PixelWindow>

              {/* 4. PIXEL FORM FIELDS, OVERLAYS & GAME HUD PRIMITIVES */}
              <PixelPanel title="4. Biểu Mẫu PixelFields, PixelOverlays & PixelGame HUD">
                <div className="studio-stack">
                  <div className="studio-grid-2">
                    <PixelInput
                      label="Mã Định Danh Tướng (PixelInput)"
                      value={heroCodeInput}
                      onChange={(e) => setHeroCodeInput(e.target.value)}
                      success={heroCodeInput.length >= 4 ? "Mã định danh hợp lệ" : undefined}
                      error={heroCodeInput.length < 4 ? "Tối thiểu 4 ký tự" : undefined}
                    />
                    <PixelSelect
                      label="Đích Xuất Engine (PixelSelect)"
                      value={exportTargetSelect}
                      onChange={(e) => setExportTargetSelect(e.target.value)}
                      helper="Đồng bộ tọa độ Trim + Margin"
                    >
                      <option value="godot4">Godot 4 SpriteFrames (.tres)</option>
                      <option value="unity6">Unity 6 URP 2D (.json)</option>
                      <option value="aseprite">Aseprite Array (.json)</option>
                    </PixelSelect>
                  </div>

                  <PixelTextarea
                    label="Ghi Chú Kỹ Thuật Quy Chuẩn Pixel (PixelTextarea)"
                    value={forgeNoteInput}
                    onChange={(e) => setForgeNoteInput(e.target.value)}
                  />

                  <div className="studio-row">
                    <PixelCheckbox
                      label="Đùn viền 2px Extrude"
                      checked={autoExtrudeCheck}
                      onChange={(e) => setAutoExtrudeCheck(e.target.checked)}
                    />
                    <PixelSwitch
                      label="Khử bò viền Hysteresis"
                      checked={hysteresisSwitch}
                      onChange={(e) => setHysteresisSwitch(e.target.checked)}
                    />
                    <PixelRadio
                      name="sprite-scale-demo"
                      label="Tỷ lệ 1×"
                      checked={scaleRadio === "1x"}
                      onChange={() => setScaleRadio("1x")}
                    />
                    <PixelRadio
                      name="sprite-scale-demo"
                      label="Tỷ lệ 2×"
                      checked={scaleRadio === "2x"}
                      onChange={() => setScaleRadio("2x")}
                    />
                  </div>

                  <PixelDivider />

                  <div className="studio-grid-3">
                    <PixelMeter kind="health" label="Sinh Lực (HP)" value={840} max={1000} segments={10} />
                    <PixelMeter kind="mana" label="Pháp Lực (MP)" value={420} max={500} segments={10} />
                    <PixelMeter kind="stamina" label="Thể Lực (STA)" value={90} max={100} segments={8} />
                  </div>

                  <div className="studio-row">
                    <PixelTooltip content="Hiển thị chú giải công cụ PixelTooltip không làm mờ viền!">
                      <PixelButton size="sm" variant="outline" className="studio-btn-auto">
                        Rê/Focus Xem PixelTooltip
                      </PixelButton>
                    </PixelTooltip>
                    <PixelButton
                      size="sm"
                      tone="warning"
                      className="studio-btn-auto"
                      onClick={() => setModalOpen(true)}
                    >
                      Mở Hộp Thoại PixelModal
                    </PixelButton>
                  </div>

                  <PixelToast
                    tone="neutral"
                    action={
                      <PixelButton size="sm" variant="ghost" className="studio-btn-auto" onClick={() => setActiveTab("overview")}>
                        Về Sa Bàn
                      </PixelButton>
                    }
                  >
                    PixelToast: Toàn bộ 31 component trong <code>@pixel-ui/react</code> đều hoạt động trực tiếp trên cả
                    8 chủ đề màu và 7 chế độ nghệ thuật!
                  </PixelToast>
                </div>
              </PixelPanel>
            </div>

            {/* PIXEL STATE SHOWCASE (Loading / Empty / Error) */}
            <PixelPanel title="5. Bộ Ba Trạng Thái Hệ Thống Không Phụ Thuộc Màu Sắc (PixelState)">
              <div className="studio-grid-3">
                <PixelState state="loading" title="Đang Biên Dịch Atlas">
                  <p>Đang đóng gói 48 khung cắt sát Alpha với bước lưới nguyên...</p>
                </PixelState>
                <PixelState
                  state="empty"
                  title="Chưa Có Bộ Lọc Màu"
                  action={
                    <PixelButton size="sm" className="studio-btn-auto" onClick={() => setActiveTab("stage-2-paperdoll")}>
                      Mở Xưởng Nhuộm Mask
                    </PixelButton>
                  }
                >
                  <p>Nhân vật đang giữ nguyên bảng màu gốc 19 sắc độ.</p>
                </PixelState>
                <PixelState state="error" title="Cảnh Báo Lệch Lưới">
                  <p>Mọi tỷ lệ lẻ thập phân đều bị chặn bởi trình kiểm định tự động.</p>
                </PixelState>
              </div>
            </PixelPanel>
          </div>
        )}
      </main>

      {/* NATIVE ACCESSIBLE PIXEL MODAL */}
      {modalOpen && (
        <PixelModal
          open={modalOpen}
          title="Hộp Thoại Xác Nhận Lò Rèn Pixel Forge (PixelModal)"
          closeLabel="Đóng"
          onClose={() => setModalOpen(false)}
        >
          <div className="studio-stack">
            <p>
              Hộp thoại <code>&lt;dialog&gt;</code> chuẩn HTML5 với vát góc <code>--px-corner-cut</code>, hỗ trợ phím{" "}
              <code>Escape</code>, khóa tiêu điểm bàn phím và tương thích hoàn toàn với chủ đề{" "}
              <strong>{activeTheme}</strong>.
            </p>
            <div className="studio-row">
              <PixelButton tone="accent" className="studio-btn-auto" onClick={() => setModalOpen(false)}>
                Xác Nhận Thiết Lập
              </PixelButton>
            </div>
          </div>
        </PixelModal>
      )}
    </div>
  );
}

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <PixelForgeStudioApp />
    </StrictMode>,
  );
}
