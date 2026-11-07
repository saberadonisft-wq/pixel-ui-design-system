import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  PixelGachaCard,
  PixelLightingPreview,
  PixelPaperdoll,
  PixelSpriteAnimator,
  PixelTilemapView,
  type PixelActionTiming,
  type PixelRarityTier,
  type PixelSocketPin,
} from "@pixel-ui/react";
import "@pixel-ui/core/styles.css";
import "@pixel-ui/react/asset-styles.css";
import "@pixel-ui/themes/pixel-assets.css";
import "./styles.css";

const FORGE_ROOT = "/assets/pixel-forge/generated";

type ForgeTabId = "overview" | "ai-frames" | "paperdoll" | "motion" | "variants" | "world-export" | "batch-factory";

const QUALITY_GATES = [
  { id: "gate-alpha", label: "Alpha Nhị Phân", value: "0 / 255", desc: "Không lem viền xanh #00FF00", score: "20/20" },
  { id: "gate-palette", label: "Bảng Màu Chung", value: "20 / 24 màu", desc: "Đồng bộ toàn bộ các frame", score: "15/15" },
  { id: "gate-damaged", label: "Giáp Hư Hại (-damaged)", value: "0 px lệch", desc: "Khớp khung bao 100%", score: "15/15" },
  { id: "gate-foot", label: "Khóa Vạch Chân", value: "Y = 88 px", desc: "Không trượt chân khi bước/chém", score: "20/20" },
  { id: "gate-vfx", label: "Kiếm Khí & Crawl Killer", value: "22/22 tiêu chí", desc: "Khử nhấp nháy pixel đơn lẻ", score: "15/15" },
  { id: "gate-atlas", label: "Multi-Map Atlas", value: "384 × 384 px", desc: "Diffuse + Normal + Emissive", score: "15/15" },
] as const;

const MASTER_PALETTE_HEX = [
  { hex: "#10060B", name: "Viền Đen Sâu (Outline)" },
  { hex: "#1B171D", name: "Thép Đen (Dark Steel)" },
  { hex: "#262B45", name: "Bóng Giáp Lam (Shadow)" },
  { hex: "#29407E", name: "Lam Choàng Đậm (Royal Dark)" },
  { hex: "#3E5EA1", name: "Lam Choàng Trung (Royal Blue)" },
  { hex: "#464B66", name: "Thép Xám Đậm (Slate Steel)" },
  { hex: "#616D83", name: "Thép Bạc Trung (Mid Steel)" },
  { hex: "#7D889C", name: "Thép Bạc Sáng (Bright Steel)" },
  { hex: "#8C9BAF", name: "Viền Bạc Phản Quang (Rim)" },
  { hex: "#BCCCD6", name: "Đỉnh Sáng Giáp (Specular)" },
  { hex: "#4E182E", name: "Đỏ Lông Vũ Tối (Plume Dark)" },
  { hex: "#892338", name: "Đỏ Lông Vũ Sáng (Crimson)" },
  { hex: "#764D3D", name: "Da Thuộc Đai Kiếm (Leather)" },
  { hex: "#78726E", name: "Xám Giáp Xích (Chainmail)" },
  { hex: "#A36A38", name: "Vàng Đồng Tối (Bronze Trim)" },
  { hex: "#B38543", name: "Vàng Thánh Giá (Gold Cross)" },
  { hex: "#BDA573", name: "Vàng Nhạt (Pale Gold)" },
  { hex: "#E0CA7B", name: "Vàng Phát Sáng (Holy Gold)" },
  { hex: "#A3C2CA", name: "Lam Kiếm Khí (Aether Cyan)" },
  { hex: "#E7ECCB", name: "Lõi Thánh Quang (Core Glow)" },
] as const;

const PIPELINE_STEPS = [
  {
    step: "Bước 01",
    title: "Sinh AI Từng Frame (#00FF00)",
    desc: "Dùng mô hình AI sinh độc lập từng tư thế (Idle, Walk, Attack, Victory) và bảng tách bộ phận 2×2 trên nền xanh Chroma-Key.",
  },
  {
    step: "Bước 02",
    title: "Tách Nền CIELAB & Khử Ám Xanh",
    desc: "Flood-fill trong không gian màu CIELAB + xóa hốc xanh bên trong giáp/kiếm + Despill viền và ép nhị phân Alpha {0, 255}.",
  },
  {
    step: "Bước 03",
    title: "Khóa Lưới Pixel & Vạch Chân Y=88",
    desc: "Cắt khung bao, thu phóng Nearest-Neighbor về chuẩn 96×96px, căn giữa trọng tâm X=48 và khóa gót giày tại Y=88.",
  },
  {
    step: "Bước 04",
    title: "Tách Lớp, Chuyển Động & Xuất Atlas",
    desc: "Tách 7 lớp Paper-Doll, lọc nhấp nháy Crawl Killer, sinh bản đồ 2.5D Normal/Specular/Emissive và đóng gói Atlas 384×384.",
  },
] as const;

const PROMPT_STAGES = [
  {
    id: "masterStill",
    label: "1. Prompt Sinh Từng Frame AI",
    prompt:
      "16-bit SNES/GBA pixel art RPG character sprite of a heroic Astral Paladin Knight (Hiệp Sĩ Thánh Quang), full body, 3/4 front-right tactical RPG view, wearing winged silver-steel greathelm with glowing cyan T-visor and royal blue plume, ornate plate cuirass with gold sun cross, royal blue cape, heraldic heater shield on left arm, oversized glowing golden-cyan greatsword in right hand, crisp pixel art clusters, dark pixel outlines, isolated on solid flat pure bright green chroma key background #00FF00.",
    rules: [
      "Mỗi frame hoạt ảnh được sinh độc lập trên nền #00FF00 tuyệt đối phẳng",
      "Tách nền CIELAB + khử viền xanh trước khi đưa về lưới 96×96px",
      "Khóa bảng màu 20 màu + Alpha nhị phân 0/255 sạch tuyệt đối",
    ],
  },
  {
    id: "paperdoll",
    label: "2. Prompt Bảng Tách Trang Bị 2×2",
    prompt:
      "16-bit pixel art modular RPG equipment sprite sheet divided into 4 distinct quadrants on solid pure green background #00FF00: Top-Left: Paladin base body in chainmail tunic and steel greaves without helmet or shield; Top-Right: Winged silver-gold Greathelm with blue plume isolated; Bottom-Left: Heraldic blue-gold cross Heater Shield isolated; Bottom-Right: Oversized glowing golden-cyan Greatsword isolated.",
    rules: [
      "Tự động cắt 4 góc phần tư từ ảnh AI 1024×1024 sang 7 lớp chuẩn hóa",
      "Bật/tắt độc lập Mũ Giáp Greathelm, Khiên Chữ Thập, Đại Kiếm 96px",
      "5 điểm neo Sockets chuẩn hóa tọa độ khung (hand_r, hand_l, head, back, muzzle)",
    ],
  },
  {
    id: "motion",
    label: "3. Cấu Hình Hậu Kỳ Hoạt Ảnh & VFX",
    prompt:
      "[AI FRAME-BY-FRAME + CRAWL KILLER SPEC] 5 Knight clips (idle, walk, attack, hurt, victory). Temporal Hysteresis (Crawl Killer: suppresses 1-frame isolated pixel shimmer while preserving full AI keyframe poses), Sabaton Baseline Lock Y=88, Dual-Buffer Holy Slash VFX (color + emissive).",
    rules: [
      "Giữ nguyên 100% biên độ vung kiếm và bước chân từ các frame AI",
      "Khử nhấp nháy hạt pixel đơn lẻ (Crawl Killer hysteresis)",
      "Kiếm khí vòng cung bên ngoài + Cột sáng triệu hồi SSR",
    ],
  },
  {
    id: "characterBible",
    label: "4. Cấu Hình Hệ Màu, Hư Hại & 8 Hướng",
    prompt:
      "[PALETTE LUT & DAMAGED VARIANT SPEC] 5 orthographic views (S, SW, W, NW, N) + 3 mirror flips (SE, E, NE); 5 elemental armor LUTs (Solar, Fire, Ice, Shadow, Emerald); and battle-scarred '-damaged' armor/shield variant with 0px bounding box drift.",
    rules: [
      "5 hệ màu nguyên tố ánh xạ trực tiếp trên bảng màu chuẩn",
      "Giáp hư hại (-damaged) nứt giáp ngực & khiên nhưng lệch khung bao 0px",
      "Xoay đủ 8 hướng phục vụ game nhập vai chiến thuật (Tactical RPG)",
    ],
  },
] as const;

const INITIAL_LAYERS = [
  { id: "00_shadow", label: "00. Bóng chân (Shadow 64px)", z: 0, width: 64 as const, height: 64 as const, src: `${FORGE_ROOT}/layer-00_shadow.png` },
  { id: "10_body", label: "10. Thân Hiệp Sĩ & Giáp Xích (AI Quadrant 1)", z: 10, width: 64 as const, height: 64 as const, src: `${FORGE_ROOT}/layer-10_body.png` },
  { id: "20_iris", label: "20. Ánh mắt phát sáng qua khe mũ (64px)", z: 20, width: 64 as const, height: 64 as const, src: `${FORGE_ROOT}/layer-20_iris.png` },
  { id: "30_outfit", label: "30. Khiên Chữ Thập & Giáp Choàng (AI Quadrant 3)", z: 30, width: 64 as const, height: 64 as const, src: `${FORGE_ROOT}/layer-30_outfit.png` },
  { id: "40_hair", label: "40. Mũ Giáp Greathelm Lông Vũ (AI Quadrant 2)", z: 40, width: 64 as const, height: 64 as const, src: `${FORGE_ROOT}/layer-40_hair.png` },
  { id: "50_weapon", label: "50. Đại Kiếm Thánh Quang (AI Quadrant 4 - 96px)", z: 50, width: 96 as const, height: 96 as const, src: `${FORGE_ROOT}/layer-50_weapon.png` },
  { id: "60_fx", label: "60. Ấn Thánh & Hào Quang Hiệp Sĩ (96px)", z: 60, width: 96 as const, height: 96 as const, src: `${FORGE_ROOT}/layer-60_fx.png` },
] as const;

const SOCKETS: readonly PixelSocketPin[] = [
  { id: "hand_r", x: 58, y: 50, angleDeg: 0, zOrder: 50, visible: true },
  { id: "hand_l", x: 36, y: 51, angleDeg: 0, zOrder: 35, visible: true },
  { id: "head", x: 48, y: 28, angleDeg: 0, zOrder: 45, visible: true },
  { id: "back", x: 48, y: 48, angleDeg: 0, zOrder: 25, visible: true },
  { id: "muzzle", x: 60, y: 22, angleDeg: 0, zOrder: 60, visible: true },
];

const WEAPON_ARSENAL = [
  {
    id: "greatsword",
    name: "Đại Kiếm Thánh Quang",
    rarity: "SSR",
    atk: "+420 ATK",
    element: "Hệ Thánh Quang",
    layerSrc: `${FORGE_ROOT}/layer-50_weapon-greatsword.png`,
    iconSrc: `${FORGE_ROOT}/layer-50_weapon.png`,
    desc: "Vũ khí trấn phái tách từ góc phần tư thứ 4 của bảng AI Paper-Doll 2×2.",
  },
  {
    id: "sunblade",
    name: "Thái Dương Thần Kiếm",
    rarity: "UR",
    atk: "+680 ATK • Bạo Kích +25%",
    element: "Hệ Thái Dương",
    layerSrc: `${FORGE_ROOT}/layer-50_weapon-sunblade.png`,
    iconSrc: `${FORGE_ROOT}/loot-sunblade-ur.png`,
    desc: "Đại kiếm vàng rực tách từ ô [0,0] của bảng AI Loot Sheet, gắn khớp vào Socket hand_r (58, 50).",
  },
  {
    id: "staff",
    name: "Quyền Trượng Tinh Hà",
    rarity: "SSR",
    atk: "+540 MATK • Hồi Năng Lượng",
    element: "Hệ Tinh Hà",
    layerSrc: `${FORGE_ROOT}/layer-50_weapon-staff.png`,
    iconSrc: `${FORGE_ROOT}/loot-aether-staff-ssr.png`,
    desc: "Quyền trượng ngọc bích tách từ ô [1,0] của bảng AI Loot Sheet, chuyển Hiệp Sĩ thành Thánh Pháp Sư.",
  },
  {
    id: "crimson-blade",
    name: "Huyết Long Đại Kiếm",
    rarity: "UR",
    atk: "+650 ATK • Thiêu Đốt",
    element: "Hệ Hỏa Long",
    layerSrc: `${FORGE_ROOT}/layer-50_weapon-crimson-blade.png`,
    iconSrc: `${FORGE_ROOT}/layer-50_weapon-crimson-blade.png`,
    desc: "Biến thể ánh xạ bảng màu LUT Hỏa Long (Crimson Flame) với rãnh kiếm rực lửa.",
  },
  {
    id: "frost-blade",
    name: "Băng Vương Hàn Kiếm",
    rarity: "SSR",
    atk: "+510 ATK • Đóng Băng",
    element: "Hệ Băng Vương",
    layerSrc: `${FORGE_ROOT}/layer-50_weapon-frost-blade.png`,
    iconSrc: `${FORGE_ROOT}/layer-50_weapon-frost-blade.png`,
    desc: "Biến thể ánh xạ bảng màu LUT Băng Tuyết (Glacial Frost) phát hàn khí.",
  },
] as const;

const ELEMENTS = [
  { id: "solar", label: "Thánh Quang (Vàng Bạc)", src: `${FORGE_ROOT}/hero-element-solar.png` },
  { id: "fire", label: "Hỏa Long (Đỏ Đen)", src: `${FORGE_ROOT}/hero-element-fire.png` },
  { id: "ice", label: "Băng Vương (Lam Bạc)", src: `${FORGE_ROOT}/hero-element-ice.png` },
  { id: "shadow", label: "Hắc Ám (Tím Hắc Diện)", src: `${FORGE_ROOT}/hero-element-shadow.png` },
  { id: "emerald", label: "Cổ Mộc (Lục Bảo)", src: `${FORGE_ROOT}/hero-element-emerald.png` },
] as const;

const DIRECTIONS = ["S", "SW", "W", "NW", "N", "SE", "E", "NE"] as const;

const CLIPS: readonly {
  id: string;
  label: string;
  stripSrc: string;
  frames: readonly string[];
  fps: number;
  timing: PixelActionTiming;
  method: string;
}[] = [
  {
    id: "idle",
    label: "Đứng Canh Gác (Idle 4f)",
    stripSrc: `${FORGE_ROOT}/clip-idle-strip.png`,
    frames: [
      `${FORGE_ROOT}/clip-idle-f0.png`,
      `${FORGE_ROOT}/clip-idle-f1.png`,
      `${FORGE_ROOT}/clip-idle-f2.png`,
      `${FORGE_ROOT}/clip-idle-f3.png`,
    ],
    fps: 6,
    timing: { windupFrames: 0, hitFrame: 0, recoveryFrames: 0, hitStopMs: 0, screenShakePx: 0 },
    method: "2 AI Keyframes + Nhịp thở & phát sáng đại kiếm",
  },
  {
    id: "walk",
    label: "Hành Quân (Walk 4f)",
    stripSrc: `${FORGE_ROOT}/clip-walk-strip.png`,
    frames: [
      `${FORGE_ROOT}/clip-walk-f0.png`,
      `${FORGE_ROOT}/clip-walk-f1.png`,
      `${FORGE_ROOT}/clip-walk-f2.png`,
      `${FORGE_ROOT}/clip-walk-f3.png`,
    ],
    fps: 8,
    timing: { windupFrames: 0, hitFrame: 2, recoveryFrames: 0, hitStopMs: 0, screenShakePx: 0 },
    method: "AI Walk Stride L/R + Khóa vạch chân Y=88",
  },
  {
    id: "attack",
    label: "Trảm Đại Kiếm (Attack 4f)",
    stripSrc: `${FORGE_ROOT}/clip-attack-strip.png`,
    frames: [
      `${FORGE_ROOT}/clip-attack-f0.png`,
      `${FORGE_ROOT}/clip-attack-f1.png`,
      `${FORGE_ROOT}/clip-attack-f2.png`,
      `${FORGE_ROOT}/clip-attack-f3.png`,
    ],
    fps: 10,
    timing: { windupFrames: 1, hitFrame: 2, recoveryFrames: 1, hitStopMs: 80, screenShakePx: 4 },
    method: "AI Overhead Windup (F02) → AI Slash Arc (F03)",
  },
  {
    id: "hurt",
    label: "Đỡ Khiên Chịu Đòn (Hurt 2f)",
    stripSrc: `${FORGE_ROOT}/clip-hurt-strip.png`,
    frames: [
      `${FORGE_ROOT}/clip-hurt-f0.png`,
      `${FORGE_ROOT}/clip-hurt-f1.png`,
    ],
    fps: 6,
    timing: { windupFrames: 0, hitFrame: 1, recoveryFrames: 1, hitStopMs: 64, screenShakePx: 4 },
    method: "Giật lùi + Nứt giáp chiến trận (-damaged)",
  },
  {
    id: "victory",
    label: "Giương Kiếm Khải Hoàn (Victory 4f)",
    stripSrc: `${FORGE_ROOT}/clip-victory-strip.png`,
    frames: [
      `${FORGE_ROOT}/clip-victory-f0.png`,
      `${FORGE_ROOT}/clip-victory-f1.png`,
      `${FORGE_ROOT}/clip-victory-f2.png`,
      `${FORGE_ROOT}/clip-victory-f3.png`,
    ],
    fps: 8,
    timing: { windupFrames: 1, hitFrame: 2, recoveryFrames: 1, hitStopMs: 0, screenShakePx: 0 },
    method: "AI Skyward Sword Pose + Hào quang Thánh Quang",
  },
];

const SLASH_VFX_FRAMES = [
  `${FORGE_ROOT}/vfx-solar-slash-f0.png`,
  `${FORGE_ROOT}/vfx-solar-slash-f1.png`,
  `${FORGE_ROOT}/vfx-solar-slash-f2.png`,
  `${FORGE_ROOT}/vfx-solar-slash-f3.png`,
] as const;

const SUMMON_VFX_FRAMES = [
  `${FORGE_ROOT}/vfx-gacha-summon-ssr-f0.png`,
  `${FORGE_ROOT}/vfx-gacha-summon-ssr-f1.png`,
  `${FORGE_ROOT}/vfx-gacha-summon-ssr-f2.png`,
  `${FORGE_ROOT}/vfx-gacha-summon-ssr-f3.png`,
] as const;

const AI_RAW_VS_CLEAN_FRAMES = [
  {
    id: "idle-f0",
    label: "Frame 01: Đứng Canh Gác (Idle F0)",
    rawSrc: `${FORGE_ROOT}/raw-knight-idle-f0.png`,
    cleanSrc: `${FORGE_ROOT}/clip-idle-f0.png`,
    note: "Tách nền #00FF00 CIELAB + Khóa vạch chân Y=88",
  },
  {
    id: "idle-f1",
    label: "Frame 02: Nhịp Thở Chiến Đấu (Idle F1)",
    rawSrc: `${FORGE_ROOT}/raw-knight-idle-f1.png`,
    cleanSrc: `${FORGE_ROOT}/clip-idle-f1.png`,
    note: "Nhịp thở nhẹ & phát sáng rãnh đại kiếm",
  },
  {
    id: "walk-f0",
    label: "Frame 03: Bước Chân Trái (Walk F0)",
    rawSrc: `${FORGE_ROOT}/raw-knight-walk-f0.png`,
    cleanSrc: `${FORGE_ROOT}/clip-walk-f0.png`,
    note: "Bước chân trái tiến lên + áo choàng tung bay",
  },
  {
    id: "walk-f1",
    label: "Frame 04: Bước Chân Phải (Walk F1)",
    rawSrc: `${FORGE_ROOT}/raw-knight-walk-f1.png`,
    cleanSrc: `${FORGE_ROOT}/clip-walk-f2.png`,
    note: "Bước chân phải đối xứng trọng tâm X=48",
  },
  {
    id: "attack-f0",
    label: "Frame 05: Vung Kiếm Qua Đầu (Attack Windup)",
    rawSrc: `${FORGE_ROOT}/raw-knight-attack-f0.png`,
    cleanSrc: `${FORGE_ROOT}/clip-attack-f1.png`,
    note: "Tư thế tụ lực vung đại kiếm qua đầu",
  },
  {
    id: "attack-f1",
    label: "Frame 06: Trảm Đại Kiếm (Attack Slash)",
    rawSrc: `${FORGE_ROOT}/raw-knight-attack-f1.png`,
    cleanSrc: `${FORGE_ROOT}/clip-attack-f2.png`,
    note: "Trảm ngang phát vệt kiếm khí vàng-lam",
  },
  {
    id: "victory-f0",
    label: "Frame 07: Giương Kiếm Chiến Thắng (Victory)",
    rawSrc: `${FORGE_ROOT}/raw-knight-victory-f0.png`,
    cleanSrc: `${FORGE_ROOT}/clip-victory-f2.png`,
    note: "Giương cao đại kiếm triệu hồi cột sáng",
  },
  {
    id: "paperdoll-kit",
    label: "Frame 08: Bảng Tách Trang Bị 2×2 (Paper-Doll Kit)",
    rawSrc: `${FORGE_ROOT}/raw-knight-paperdoll-kit.png`,
    cleanSrc: `${FORGE_ROOT}/layer-50_weapon.png`,
    note: "Tách tự động 4 ô: Thân, Mũ Greathelm, Khiên, Đại Kiếm",
  },
] as const;

const LOOT_ITEMS: readonly {
  id: string;
  name: string;
  rarity: PixelRarityTier;
  src: string;
}[] = [
  { id: "loot-sunblade-ur", name: "Đại Kiếm Thánh Quang", rarity: "ur", src: `${FORGE_ROOT}/loot-sunblade-ur.png` },
  { id: "loot-aether-staff-ssr", name: "Quyền Trượng Tinh Hà", rarity: "ssr", src: `${FORGE_ROOT}/loot-aether-staff-ssr.png` },
  { id: "loot-fortress-shield-epic", name: "Khiên Chữ Thập Hiệp Sĩ", rarity: "epic", src: `${FORGE_ROOT}/loot-fortress-shield-epic.png` },
  { id: "loot-elixir-rare", name: "Huyết Dược Tinh Khiết", rarity: "rare", src: `${FORGE_ROOT}/loot-elixir-rare.png` },
  { id: "loot-relic-chest-ssr", name: "Rương Thánh Tích SSR", rarity: "ssr", src: `${FORGE_ROOT}/loot-relic-chest-ssr.png` },
  { id: "loot-core-sigil-common", name: "Ấn Ký Hiệp Sĩ", rarity: "common", src: `${FORGE_ROOT}/loot-core-sigil-common.png` },
];

const ENGINE_EXPORTS = [
  {
    id: "godot",
    title: "Godot 4 SpriteFrames (.tres)",
    file: "forge-sprites.godot.tres",
    href: `${FORGE_ROOT}/forge-sprites.godot.tres`,
    snippet: `[gd_scene load_steps=3 format=3 uid="uid://pixel_forge_paladin_knight_ssr"]
[ext_resource type="Texture2D" path="res://assets/pixel-forge/generated/forge-atlas-diffuse.png" id="1_diffuse"]
[ext_resource type="Texture2D" path="res://assets/pixel-forge/generated/forge-atlas-normal.png" id="2_normal"]

[resource]
resource_name = "PaladinKnightSpriteFrames"
character_id = "hero-paladin-knight"
foot_baseline_y = 88
animations = [
  { "name": &"idle", "speed": 6.0, "loop": true, "frames": 4, "hit_stop_ms": 0 },
  { "name": &"walk", "speed": 8.0, "loop": true, "frames": 4, "hit_stop_ms": 0 },
  { "name": &"attack", "speed": 10.0, "loop": false, "frames": 4, "hit_stop_ms": 80 },
  { "name": &"hurt", "speed": 6.0, "loop": false, "frames": 2, "hit_stop_ms": 64 },
  { "name": &"victory", "speed": 8.0, "loop": true, "frames": 4, "hit_stop_ms": 0 },
]`,
  },
  {
    id: "unity",
    title: "Unity 6 2D Sprite Atlas (.json)",
    file: "forge-atlas.unity.json",
    href: `${FORGE_ROOT}/forge-atlas.unity.json`,
    snippet: `{
  "schema": "unity-6-2d-sprite-atlas-v1",
  "textures": {
    "diffuse": "forge-atlas-diffuse.png",
    "normalMap": "_NormalMap:forge-atlas-normal.png",
    "maskMap": "_EmissiveMap:forge-atlas-emissive.png"
  },
  "pixelsPerUnit": 16,
  "filterMode": "Point",
  "sprites": [
    {
      "name": "hero_idle_0",
      "rect": { "x": 0, "y": 0, "w": 96, "h": 96 },
      "pivot": { "x": 48, "y": 72 },
      "sockets": [
        { "id": "hand_r", "x": 58, "y": 50, "zOrder": 50 },
        { "id": "hand_l", "x": 36, "y": 51, "zOrder": 35 }
      ]
    }
  ]
}`,
  },
  {
    id: "aseprite",
    title: "Aseprite Atlas Metadata (.json)",
    file: "forge-atlas.aseprite.json",
    href: `${FORGE_ROOT}/forge-atlas.aseprite.json`,
    snippet: `{
  "frames": {
    "hero_attack_1": {
      "frame": { "x": 96, "y": 96, "w": 96, "h": 96 },
      "rotated": false,
      "trimmed": true,
      "spriteSourceSize": { "x": 16, "y": 5, "w": 69, "h": 84 },
      "sourceSize": { "w": 96, "h": 96 },
      "duration": 100
    }
  },
  "meta": {
    "image": "forge-atlas-diffuse.png",
    "normalMap": "forge-atlas-normal.png",
    "emissiveMap": "forge-atlas-emissive.png",
    "format": "RGBA8888",
    "size": { "w": 384, "h": 384 }
  }
}`,
  },
] as const;

const NAV_TABS: readonly { id: ForgeTabId; step: string; label: string; sub: string }[] = [
  { id: "overview", step: "Tổng Quan", label: "Bảng Điều Khiển & Đấu Trường", sub: "Mô phỏng thực chiến, tháo giáp & soi frame" },
  { id: "batch-factory", step: "Sản Xuất Lô", label: "Xưởng Tạo Hàng Loạt (5 Tướng)", sub: "Lệnh CLI, Skill & 50 Prompt AI Roster" },
  { id: "ai-frames", step: "Công Đoạn 1", label: "Ảnh AI Gốc → Hậu Kỳ Từng Frame", sub: "So sánh 8 Frame AI #00FF00 & bản sạch" },
  { id: "paperdoll", step: "Công Đoạn 2", label: "Tách Lớp Trang Bị (Paper-Doll)", sub: "Thẻ tách rời 7 lớp giáp, mũ, khiên, kiếm" },
  { id: "motion", step: "Công Đoạn 3", label: "Hoạt Ảnh, Onion-Skin & Sprite Strip", sub: "5 đòn thế + Onion-skin + xuất dải Strip" },
  { id: "variants", step: "Công Đoạn 4", label: "Bảng Màu 20 Ô, 5 Hệ & 8 Hướng", sub: "5 hệ nguyên tố, 8 hướng quay & Prompt AI" },
  { id: "world-export", step: "Công Đoạn 5", label: "Bản Đồ, Ánh Sáng 2.5D & Xuất Engine", sub: "Autotile, Normal Map, Atlas & Godot/Unity" },
];

const BATCH_ROSTER_UNITS = [
  {
    id: "hero-paladin-knight",
    name: "Hiệp Sĩ Thánh Quang",
    title: "Thánh Kỵ Sĩ Giáp Bạc",
    classRole: "Tank / Vanguard",
    rarity: "SSR",
    element: "Thánh Quang (Solar)",
    outDir: "/assets/pixel-forge/generated",
    weaponSpec: "Đại Kiếm Thánh Quang 96×96 (Socket hand_r)",
    skills: ["Trảm Đại Kiếm Thánh Quang", "Khiên Chữ Thập Bất Diệt"],
    samplePrompt:
      "16-bit SNES/GBA pixel art RPG character sprite of Hiệp Sĩ Thánh Quang (SSR), 3/4 front-right tactical RPG view, wearing Winged silver-steel Greathelm with glowing cyan T-visor and royal blue plume, ornate plate cuirass with gold sun cross, royal blue cape, heraldic heater shield on left arm, wielding Oversized glowing golden-cyan Greatsword in right gauntlet, isolated on solid flat pure bright green chroma key background #00FF00.",
  },
  {
    id: "hero-crimson-valkyrie",
    name: "Chiến Thần Huyết Vũ",
    title: "Nữ Võ Thần Long Thương",
    classRole: "Striker / Lancer",
    rarity: "UR",
    element: "Hỏa Long (Fire)",
    outDir: "/assets/pixel-forge/batch/hero-crimson-valkyrie/generated",
    weaponSpec: "Long Thương Phá Thiên 96×96 (Socket hand_r)",
    skills: ["Long Thương Phá Thiên", "Cánh Phượng Hoàng Lửa"],
    samplePrompt:
      "16-bit SNES/GBA pixel art RPG character sprite of Chiến Thần Huyết Vũ (UR), 3/4 front-right tactical RPG view, wearing Winged crimson-gold Valkyrie diadem, obsidian dragon-scale breastplate, flowing phoenix-feather mantle, floating flame Buckler on left arm, wielding Oversized blazing Dragon-Slayer Halberd in right hand, isolated on solid flat pure bright green chroma key background #00FF00.",
  },
  {
    id: "hero-frost-archmage",
    name: "Pháp Sư Băng Vương",
    title: "Hiền Giả Tuyết Tinh",
    classRole: "Caster / Control",
    rarity: "SSR",
    element: "Băng Vương (Ice)",
    outDir: "/assets/pixel-forge/batch/hero-frost-archmage/generated",
    weaponSpec: "Quyền Trượng Tinh Hà 96×96 (Socket hand_r)",
    skills: ["Bão Tuyết Vĩnh Cửu", "Kết Giới Tinh Thể"],
    samplePrompt:
      "16-bit SNES/GBA pixel art RPG character sprite of Pháp Sư Băng Vương (SSR), 3/4 front-right tactical RPG view, wearing Tall astral frost-crystal mitre hat, silver-embroidered glacial robe, floating ice-rune grimoire on left hand, wielding Oversized celestial sapphire Aether Staff in right hand, isolated on solid flat pure bright green chroma key background #00FF00.",
  },
  {
    id: "hero-shadow-assassin",
    name: "Sát Thủ Hắc Ám",
    title: "Bóng Ma Hư Không",
    classRole: "Assassin / Burst",
    rarity: "EPIC",
    element: "Hắc Ám (Shadow)",
    outDir: "/assets/pixel-forge/batch/hero-shadow-assassin/generated",
    weaponSpec: "Lưỡi Hái Hư Không 96×96 (Socket hand_r)",
    skills: ["Trảm Hư Không", "Bước Nhảy Bóng Đêm"],
    samplePrompt:
      "16-bit SNES/GBA pixel art RPG character sprite of Sát Thủ Hắc Ám (EPIC), 3/4 front-right tactical RPG view, wearing Hooded void-stalker cowl with glowing violet eyes, dark leather & obsidian shadow-plate, tattered phantom scarf, wielding Oversized crescent Void Scythe & twin abyssal daggers, isolated on solid flat pure bright green chroma key background #00FF00.",
  },
  {
    id: "hero-emerald-ranger",
    name: "Xạ Thủ Cổ Mộc",
    title: "Người Gác Rừng Thánh",
    classRole: "Ranger / Marksman",
    rarity: "SSR",
    element: "Cổ Mộc (Emerald)",
    outDir: "/assets/pixel-forge/batch/hero-emerald-ranger/generated",
    weaponSpec: "Đại Cung Thần Mộc 96×96 (Socket hand_r)",
    skills: ["Mưa Tên Thần Mộc", "Phong Ấn Rừng Già"],
    samplePrompt:
      "16-bit SNES/GBA pixel art RPG character sprite of Xạ Thủ Cổ Mộc (SSR), 3/4 front-right tactical RPG view, wearing Golden-antlered sylvan circlet, emerald leaf-mail tunic, hooded forest cloak, enchanted quiver on back, wielding Oversized glowing World-Tree Greatbow with emerald energy arrow, isolated on solid flat pure bright green chroma key background #00FF00.",
  },
] as const;

const BATCH_CLI_COMMANDS = [
  {
    cmd: "npm run forge:batch-prompts",
    desc: "Biên dịch tự động 10 Prompt AI (#00FF00 Chroma-Key) cho từng tướng trong forge-roster.json → xuất batch-prompts.json (50 prompts).",
  },
  {
    cmd: "npm run forge:batch",
    desc: "Chạy dây chuyền sản xuất hàng loạt cho toàn bộ Roster: tách nền CIELAB, khóa Y=88, tách 7 lớp Paper-Doll, sinh 5 clip + 2.5D Normal/Emissive + đóng gói Atlas 384×384.",
  },
  {
    cmd: "npm run forge:batch-validate",
    desc: "Kiểm định tự động Quality Gate 6 cổng (100/100 điểm) cho tất cả các tướng trong lô sản xuất và xuất báo cáo batch-manifest.json.",
  },
  {
    cmd: "python scripts/pixel-forge.py batch --roster forge-roster.json",
    desc: "Lệnh Python CLI trực tiếp cho phép truyền file Roster tùy chỉnh (10, 20 hoặc 100 tướng/quái vật).",
  },
] as const;

function App() {
  const [forgeTab, setForgeTab] = useState<ForgeTabId>("overview");
  const [promptStageIdx, setPromptStageIdx] = useState(0);
  const [selectedElementIdx, setSelectedElementIdx] = useState(0);
  const [selectedDir, setSelectedDir] = useState<(typeof DIRECTIONS)[number]>("S");
  const [enabledLayerIds, setEnabledLayerIds] = useState<readonly string[]>(INITIAL_LAYERS.map((l) => l.id));
  const [showSockets, setShowSockets] = useState(false);
  const [selectedClipIdx, setSelectedClipIdx] = useState(2);
  const [showVfxOverlay, setShowVfxOverlay] = useState(true);
  const [damagedMode, setDamagedMode] = useState(false);
  const [selectedEngineIdx, setSelectedEngineIdx] = useState(0);
  const [arenaKnightX, setArenaKnightX] = useState<-1 | 0 | 1>(0);
  const [selectedSwatchIdx, setSelectedSwatchIdx] = useState(0);
  const [selectedWeaponIdx, setSelectedWeaponIdx] = useState(0);
  const [selectedBatchIdx, setSelectedBatchIdx] = useState(0);

  const currentPrompt = PROMPT_STAGES[promptStageIdx];
  const currentElement = ELEMENTS[selectedElementIdx];
  const currentClip = CLIPS[selectedClipIdx];
  const currentEngine = ENGINE_EXPORTS[selectedEngineIdx];
  const currentSwatch = MASTER_PALETTE_HEX[selectedSwatchIdx];
  const currentWeapon = WEAPON_ARSENAL[selectedWeaponIdx];
  const currentBatchUnit = BATCH_ROSTER_UNITS[selectedBatchIdx];

  const activeLayers = INITIAL_LAYERS.map((layer) => ({
    ...layer,
    src: layer.id === "50_weapon" ? currentWeapon.layerSrc : layer.src,
    label: layer.id === "50_weapon" ? `50. Vũ khí: ${currentWeapon.name} (96px)` : layer.label,
    enabled: enabledLayerIds.includes(layer.id),
  }));

  const toggleLayer = (id: string) => {
    setEnabledLayerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  return (
    <main
      className="studio-app"
      data-px-theme="ornamental"
      data-px-assets="pixel-ui-sheet"
      data-px-mode="ornamental"
      data-px-grid="4"
      data-px-density="high"
    >
      {/* Top Modern Header */}
      <header className="studio-topbar">
        <div className="studio-topbar__brand">
          <span className="studio-badge-live">● AI PIXEL FORGE STUDIO v2.0</span>
          <h1>Xưởng Chế Tác Asset &amp; Sprite Hiệp Sĩ</h1>
          <p>
            Hệ thống sản xuất đồ họa Pixel Gacha chuyên nghiệp: từ sinh ảnh AI từng frame trên nền Chroma-Key, tách nền CIELAB, bóc tách 7 lớp trang bị đến đóng gói Multi-Map Atlas cho Godot 4 &amp; Unity 6.
          </p>
        </div>

        <div className="studio-topbar__status" aria-label="Điểm kiểm định chất lượng">
          <span className="studio-topbar__status-label">KIỂM ĐỊNH CHẤT LƯỢNG (QUALITY GATE)</span>
          <strong className="studio-topbar__status-score">100 / 100 ĐẠT CHUẨN</strong>
          <small>10 Ảnh AI Gốc • 44 File Xuất Chuẩn Engine</small>
        </div>
      </header>

      {/* 6 Quality Metrics Strip */}
      <section className="studio-metrics-grid" aria-label="6 chỉ số kiểm định tự động">
        {QUALITY_GATES.map((gate) => (
          <div key={gate.id} className="studio-metric-card">
            <div className="studio-metric-card__top">
              <small>{gate.label}</small>
              <span className="studio-metric-card__score">✓ {gate.score}</span>
            </div>
            <strong>{gate.value}</strong>
            <p>{gate.desc}</p>
          </div>
        ))}
      </section>

      {/* Main Studio Workspace: Sidebar + Content Stage */}
      <div className="studio-workspace">
        <aside className="studio-sidebar" aria-label="Danh mục công đoạn chế tác">
          <div className="studio-sidebar__title">QUY TRÌNH CHẾ TÁC 5 CÔNG ĐOẠN</div>
          <nav className="studio-nav">
            {NAV_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className="studio-nav__btn"
                aria-pressed={forgeTab === tab.id}
                onClick={() => setForgeTab(tab.id)}
              >
                <span className="studio-nav__step">{tab.step}</span>
                <strong className="studio-nav__label">{tab.label}</strong>
                <small className="studio-nav__sub">{tab.sub}</small>
              </button>
            ))}
          </nav>

          <div className="studio-sidebar__summary">
            <div className="studio-sidebar__title">THÔNG SỐ NHÂN VẬT MẪU</div>
            <dl className="studio-spec-list">
              <div>
                <dt>Tên tướng</dt>
                <dd>Hiệp Sĩ Thánh Quang</dd>
              </div>
              <div>
                <dt>Mã định danh</dt>
                <dd>hero-paladin-knight</dd>
              </div>
              <div>
                <dt>Độ hiếm</dt>
                <dd>SSR (4 Sao)</dd>
              </div>
              <div>
                <dt>Khung nhân vật</dt>
                <dd>64×64 px (Thân)</dd>
              </div>
              <div>
                <dt>Khung vũ khí</dt>
                <dd>96×96 px (Đại Kiếm)</dd>
              </div>
              <div>
                <dt>Điểm neo chân</dt>
                <dd>X=48, Y=88 px</dd>
              </div>
              <div>
                <dt>Bảng màu</dt>
                <dd>20 màu chuẩn</dd>
              </div>
            </dl>
          </div>
        </aside>

        <div className="studio-content">
          {/* Pipeline 4-Step Overview Banner */}
          <section className="studio-pipeline-banner" aria-label="4 bước trong dây chuyền xử lý">
            {PIPELINE_STEPS.map((item) => (
              <div key={item.step} className="studio-pipeline-step">
                <span>{item.step}</span>
                <strong>{item.title}</strong>
                <p>{item.desc}</p>
              </div>
            ))}
          </section>

          {/* TAB 0: OVERVIEW DASHBOARD */}
          {forgeTab === "overview" && (
            <section className="studio-section" aria-label="Tổng quan sa bàn Hiệp Sĩ">
              {/* NEW FEATURE 1: LIVE IN-GAME ARENA COMBAT SIMULATOR */}
              <div className="studio-card">
                <div className="studio-card__header">
                  <div>
                    <span className="studio-eyebrow">SA BÀN MÔ PHỎNG THỰC CHIẾN TRONG GAME (IN-GAME STAGE SIMULATOR)</span>
                    <h2>Ghép Trực Tiếp Hiệp Sĩ Lên Sân Đấu Nhà Thờ Gothic (320×192 px)</h2>
                  </div>
                  <span className="studio-pill">Kiểm Tra Tương Phản Nền &amp; Vạch Chân Y=88</span>
                </div>
                <p className="studio-card__desc">
                  Kiểm tra khả năng đọc hình dáng (Silhouette Readability) của Hiệp Sĩ khi đặt trực tiếp trên bối cảnh Sân Đấu Nhà Thờ Gothic do AI sinh ra. Bạn có thể đổi đòn thế, bật/tắt kiếm khí và di chuyển vị trí đứng của Hiệp Sĩ trên sàn đấu.
                </p>

                <div className="studio-arena-sim">
                  <div className="studio-arena-stage" aria-label="Khung mô phỏng sân đấu 320x192">
                    <img
                      className="pixel-art studio-arena-bg"
                      src={`${FORGE_ROOT}/parallax-stage-composite.png`}
                      width={320}
                      height={192}
                      data-px-source-width={160}
                      data-px-source-height={96}
                      data-px-sprite-scale="2"
                      alt="Sân đấu Nhà Thờ Gothic"
                    />
                    <div
                      className="studio-arena-actor"
                      style={{
                        insetInlineStart: `${112 + arenaKnightX * 48}px`,
                        insetBlockStart: "68px",
                      }}
                    >
                      <img
                        className="pixel-art"
                        src={currentClip.frames[currentClip.timing.hitFrame] ?? currentClip.frames[0]}
                        width={96}
                        height={96}
                        data-px-source-width={96}
                        data-px-source-height={96}
                        data-px-sprite-scale="1"
                        alt={currentClip.label}
                      />
                      {selectedWeaponIdx > 0 && enabledLayerIds.includes("50_weapon") && (
                        <img
                          className="pixel-art studio-arena-weapon"
                          src={currentWeapon.layerSrc}
                          width={96}
                          height={96}
                          data-px-source-width={96}
                          data-px-source-height={96}
                          data-px-sprite-scale="1"
                          alt=""
                        />
                      )}
                      {showVfxOverlay && (
                        <img
                          className="pixel-art studio-arena-vfx"
                          src={SLASH_VFX_FRAMES[2]}
                          width={64}
                          height={64}
                          data-px-source-width={64}
                          data-px-source-height={64}
                          data-px-sprite-scale="1"
                          alt=""
                        />
                      )}
                    </div>
                  </div>

                  <div className="studio-arena-controls">
                    <div className="studio-actions" role="group" aria-label="Điều khiển vị trí Hiệp Sĩ trên sân đấu">
                      <button
                        type="button"
                        className="px-forge-btn"
                        aria-pressed={arenaKnightX === -1}
                        onClick={() => setArenaKnightX(-1)}
                      >
                        ◀ Cánh Trái (X=64)
                      </button>
                      <button
                        type="button"
                        className="px-forge-btn"
                        aria-pressed={arenaKnightX === 0}
                        onClick={() => setArenaKnightX(0)}
                      >
                        ● Trung Tâm Sân Đấu (X=112)
                      </button>
                      <button
                        type="button"
                        className="px-forge-btn"
                        aria-pressed={arenaKnightX === 1}
                        onClick={() => setArenaKnightX(1)}
                      >
                        Cánh Phải (X=160) ▶
                      </button>
                    </div>
                    <div className="studio-actions" role="group" aria-label="Chọn tư thế trên sân đấu">
                      {CLIPS.map((clip, idx) => (
                        <button
                          key={clip.id}
                          type="button"
                          className="px-forge-btn"
                          aria-pressed={selectedClipIdx === idx}
                          onClick={() => setSelectedClipIdx(idx)}
                        >
                          {clip.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="px-forge-btn"
                        aria-pressed={showVfxOverlay}
                        onClick={() => setShowVfxOverlay((prev) => !prev)}
                      >
                        {showVfxOverlay ? "★ Đang bật Kiếm Khí" : "☆ Tắt Kiếm Khí"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="studio-grid-2">
                {/* Interactive Combat Animator Card */}
                <div className="studio-card">
                  <div className="studio-card__header">
                    <div>
                      <span className="studio-eyebrow">TRÌNH DIỄN HOẠT ẢNH &amp; THƯỚC ĐO CHÂN Y=88</span>
                      <h2>Điều Khiển Chiến Đấu, Onion-Skin &amp; Tốc Độ</h2>
                    </div>
                    <span className="studio-pill">{currentClip.method}</span>
                  </div>
                  <p className="studio-card__desc">
                    Hỗ trợ bật <strong>Bóng mờ Onion-Skin</strong> (soi khung trước đó), <strong>Thước Chân Y=88</strong> (vạch đỏ ngang gót giày) và điều chỉnh tốc độ <code>0.5× / 1× / 2×</code>.
                  </p>
                  <PixelSpriteAnimator
                    clipLabel={`${currentClip.label} • ${currentWeapon.name}`}
                    frames={currentClip.frames}
                    vfxFrames={SLASH_VFX_FRAMES}
                    showVfx={showVfxOverlay}
                    frameWidth={96}
                    frameHeight={96}
                    fps={currentClip.fps}
                    timing={currentClip.timing}
                    weaponOverlaySrc={
                      selectedWeaponIdx > 0 && enabledLayerIds.includes("50_weapon")
                        ? currentWeapon.layerSrc
                        : undefined
                    }
                  />
                </div>

                {/* Interactive Paperdoll Card */}
                <div className="studio-card">
                  <div className="studio-card__header">
                    <div>
                      <span className="studio-eyebrow">ĐỔI VŨ KHÍ SOCKET HAND_R &amp; THÁO LẮP GIÁP (PAPER-DOLL)</span>
                      <h2>Hoán Đổi 5 Vũ Khí &amp; Tháo / Lắp Trang Bị</h2>
                    </div>
                    <span className="studio-pill">{currentWeapon.name} ({currentWeapon.rarity})</span>
                  </div>
                  <p className="studio-card__desc">
                    <strong>Đổi vũ khí trực tiếp:</strong> Lớp <code>50_weapon (96×96px)</code> neo tại điểm <code>hand_r (58, 50)</code> hoàn toàn độc lập với cơ thể <code>64×64px</code>. Bấm chọn từng thanh kiếm hoặc quyền trượng bên dưới để thay thế ngay trên cả nhân vật và hoạt ảnh chiến đấu!
                  </p>
                  <div className="studio-actions" role="group" aria-label="Kho vũ khí hoán đổi">
                    {WEAPON_ARSENAL.map((wp, idx) => (
                      <button
                        key={wp.id}
                        type="button"
                        className="px-forge-btn"
                        aria-pressed={selectedWeaponIdx === idx}
                        onClick={() => {
                          setSelectedWeaponIdx(idx);
                          if (!enabledLayerIds.includes("50_weapon")) {
                            setEnabledLayerIds((prev) => [...prev, "50_weapon"]);
                          }
                        }}
                      >
                        ⚔ {wp.name} ({wp.rarity})
                      </button>
                    ))}
                  </div>
                  <div className="studio-paperdoll-row">
                    <PixelPaperdoll
                      layers={activeLayers}
                      sockets={SOCKETS}
                      showSockets={showSockets}
                      scale={2}
                    />
                    <div className="studio-layer-toggles" role="group" aria-label="Tháo lắp nhanh trang bị Hiệp Sĩ">
                      <button
                        type="button"
                        className="px-forge-btn studio-layer-btn"
                        aria-pressed={enabledLayerIds.includes("40_hair")}
                        onClick={() => toggleLayer("40_hair")}
                      >
                        {enabledLayerIds.includes("40_hair") ? "✓ Đang đội Mũ Giáp Greathelm" : "○ Đã cởi Mũ Giáp (Lộ mặt)"}
                      </button>
                      <button
                        type="button"
                        className="px-forge-btn studio-layer-btn"
                        aria-pressed={enabledLayerIds.includes("30_outfit")}
                        onClick={() => toggleLayer("30_outfit")}
                      >
                        {enabledLayerIds.includes("30_outfit") ? "✓ Đang đeo Khiên & Giáp Tấm" : "○ Đã tháo Khiên & Giáp Tấm"}
                      </button>
                      <button
                        type="button"
                        className="px-forge-btn studio-layer-btn"
                        aria-pressed={enabledLayerIds.includes("50_weapon")}
                        onClick={() => toggleLayer("50_weapon")}
                      >
                        {enabledLayerIds.includes("50_weapon") ? "✓ Đang cầm Đại Kiếm 96px" : "○ Đã cất Đại Kiếm"}
                      </button>
                      <button
                        type="button"
                        className="px-forge-btn studio-layer-btn"
                        aria-pressed={enabledLayerIds.includes("60_fx")}
                        onClick={() => toggleLayer("60_fx")}
                      >
                        {enabledLayerIds.includes("60_fx") ? "✓ Đang bật Hào Quang SSR" : "○ Đã tắt Hào Quang SSR"}
                      </button>
                      <button
                        type="button"
                        className="px-forge-btn studio-layer-btn"
                        aria-pressed={showSockets}
                        onClick={() => setShowSockets((prev) => !prev)}
                      >
                        {showSockets ? "◆ Đang hiện 5 Điểm Neo Socket" : "◇ Hiện 5 Điểm Neo Socket"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Preview of All 8 AI Raw -> Clean Frames */}
              <div className="studio-card">
                <div className="studio-card__header">
                  <div>
                    <span className="studio-eyebrow">MINH CHỨNG XỬ LÝ ẢNH AI TỪNG KHUNG HÌNH</span>
                    <h2>Toàn Bộ 8 Frame Do AI Sinh (#00FF00) → Bản Đã Tách Nền &amp; Khóa Lưới Pixel</h2>
                  </div>
                  <button
                    type="button"
                    className="px-forge-btn"
                    onClick={() => setForgeTab("ai-frames")}
                  >
                    Xem chi tiết Công đoạn 1 ▶
                  </button>
                </div>
                <div className="studio-ai-pair-grid">
                  {AI_RAW_VS_CLEAN_FRAMES.map((item) => (
                    <div key={item.id} className="studio-ai-pair-card">
                      <div className="studio-ai-pair-card__head">
                        <strong>{item.label}</strong>
                        <small>{item.note}</small>
                      </div>
                      <div className="studio-ai-pair-card__stages">
                        <div className="studio-stage-box studio-stage-box--raw">
                          <span className="studio-stage-tag">1. AI Gốc (#00FF00)</span>
                          <img
                            className="pixel-art"
                            src={item.rawSrc}
                            width={96}
                            height={96}
                            data-px-source-width={96}
                            data-px-source-height={96}
                            data-px-sprite-scale="1"
                            alt={`Raw AI ${item.label}`}
                          />
                        </div>
                        <div className="studio-stage-box studio-stage-box--clean">
                          <span className="studio-stage-tag">2. Đã tách nền (96×96)</span>
                          <img
                            className="pixel-art"
                            src={item.cleanSrc}
                            width={96}
                            height={96}
                            data-px-source-width={96}
                            data-px-source-height={96}
                            data-px-sprite-scale="1"
                            alt={`Cleaned ${item.label}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* TAB 1: AI FRAMES COMPARISON */}
          {forgeTab === "ai-frames" && (
            <section className="studio-section" aria-label="So sánh trực quan từng frame AI gốc và sau hậu kỳ">
              <div className="studio-card">
                <div className="studio-card__header">
                  <div>
                    <span className="studio-eyebrow">CÔNG ĐOẠN 1: SINH ẢNH AI &amp; HẬU KỲ TÁCH NỀN</span>
                    <h2>Đối Chiếu Trực Tiếp 8 Frame AI Gốc (#00FF00) &amp; Kết Quả Hậu Kỳ</h2>
                  </div>
                  <span className="studio-pill">CIELAB Flood-Fill + Binary Alpha</span>
                </div>
                <p className="studio-card__desc">
                  Tất cả 8 khung hình bên dưới đều được hiển thị song song: bên trái là ảnh thô do AI sinh trên phông xanh lá <code>#00FF00</code>, bên phải là sprite sau khi thuật toán Python tự động lọc nền CIELAB, khử hốc xanh kẹt giữa giáp và kiếm, khử ám xanh viền (Despill) và căn chỉnh trọng tâm trên khung <code>96×96px</code>.
                </p>

                <div className="studio-ai-pair-grid">
                  {AI_RAW_VS_CLEAN_FRAMES.map((item) => (
                    <div key={item.id} className="studio-ai-pair-card">
                      <div className="studio-ai-pair-card__head">
                        <strong>{item.label}</strong>
                        <small>{item.note}</small>
                      </div>
                      <div className="studio-ai-pair-card__stages">
                        <div className="studio-stage-box studio-stage-box--raw">
                          <span className="studio-stage-tag">Ảnh AI Gốc (#00FF00)</span>
                          <img
                            className="pixel-art"
                            src={item.rawSrc}
                            width={96}
                            height={96}
                            data-px-source-width={96}
                            data-px-source-height={96}
                            data-px-sprite-scale="1"
                            alt={`Raw AI ${item.label}`}
                          />
                        </div>
                        <div className="studio-stage-box studio-stage-box--clean">
                          <span className="studio-stage-tag">Sau Hậu Kỳ (Alpha 0/255)</span>
                          <img
                            className="pixel-art"
                            src={item.cleanSrc}
                            width={96}
                            height={96}
                            data-px-source-width={96}
                            data-px-source-height={96}
                            data-px-sprite-scale="1"
                            alt={`Cleaned ${item.label}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* TAB 2: PAPERDOLL LAYER DECOMPOSITION + EXPLODED LAYER GALLERY */}
          {forgeTab === "paperdoll" && (
            <section className="studio-section" aria-label="Bàn lắp ghép 7 lớp Paper-Doll và điểm neo Sockets">
              <div className="studio-grid-2">
                <div className="studio-card">
                  <div className="studio-card__header">
                    <div>
                      <span className="studio-eyebrow">SA BÀN LẮP GHÉP ĐỒNG TÂM (64PX / 96PX)</span>
                      <h2>Kiểm Tra Từng Lớp Trang Bị &amp; Điểm Neo</h2>
                    </div>
                    <span className="studio-pill">Pivot (48, 72)</span>
                  </div>
                  <PixelPaperdoll
                    layers={activeLayers}
                    sockets={SOCKETS}
                    showSockets={showSockets}
                    scale={2}
                  />
                  <div className="studio-actions" role="group" aria-label="Đổi vũ khí trong bàn Paper-Doll">
                    {WEAPON_ARSENAL.map((wp, idx) => (
                      <button
                        key={wp.id}
                        type="button"
                        className="px-forge-btn"
                        aria-pressed={selectedWeaponIdx === idx}
                        onClick={() => {
                          setSelectedWeaponIdx(idx);
                          if (!enabledLayerIds.includes("50_weapon")) {
                            setEnabledLayerIds((prev) => [...prev, "50_weapon"]);
                          }
                        }}
                      >
                        ⚔ {wp.name} ({wp.rarity})
                      </button>
                    ))}
                  </div>
                  <div className="studio-socket-badges" aria-label="Tọa độ điểm neo Socket">
                    {SOCKETS.map((s) => (
                      <span key={s.id} className="studio-pill">
                        ◆ {s.id}: ({s.x}, {s.y}) • Z={s.zOrder}
                      </span>
                    ))}
                  </div>
                  <div className="studio-actions">
                    <button
                      type="button"
                      className="px-forge-btn"
                      aria-pressed={showSockets}
                      onClick={() => setShowSockets((prev) => !prev)}
                    >
                      {showSockets ? "◆ Đang hiện 5 điểm neo Socket" : "◇ Hiện 5 điểm neo Socket"}
                    </button>
                    <button
                      type="button"
                      className="px-forge-btn"
                      onClick={() => setEnabledLayerIds(INITIAL_LAYERS.map((l) => l.id))}
                    >
                      ↺ Bật lại toàn bộ 7 lớp
                    </button>
                  </div>
                </div>

                <div className="studio-card">
                  <div className="studio-card__header">
                    <div>
                      <span className="studio-eyebrow">ẢNH AI GỐC 2×2 CHIA 4 BỘ PHẬN</span>
                      <h2>Bảng Tách Trang Bị Gốc Do AI Sinh (#00FF00)</h2>
                    </div>
                    <span className="studio-pill">4 Quadrants</span>
                  </div>
                  <p className="studio-card__desc">
                    Từ tấm ảnh AI 2×2 bên dưới, thuật toán tự động cắt riêng từng góc phần tư (Thân giáp xích, Mũ Greathelm, Khiên chữ thập, Đại kiếm) và đồng bộ về trục tọa độ đồng tâm.
                  </p>
                  <div className="studio-stage-box">
                    <span className="studio-stage-tag">raw-knight-paperdoll-kit.png (Hiển thị thu gọn 96×96)</span>
                    <img
                      className="pixel-art"
                      src={`${FORGE_ROOT}/raw-knight-paperdoll-kit.png`}
                      width={96}
                      height={96}
                      data-px-source-width={96}
                      data-px-source-height={96}
                      data-px-sprite-scale="1"
                      alt="AI 2x2 Paperdoll Kit"
                    />
                  </div>
                </div>
              </div>

              {/* Exploded 7-Layer Visual Cards */}
              <div className="studio-card">
                <div className="studio-card__header">
                  <div>
                    <span className="studio-eyebrow">BẢNG BÓC TÁCH ĐỘC LẬP 7 LỚP RGBA (EXPLODED LAYER INSPECTOR)</span>
                    <h2>Xem Tách Rời Từng Lớp PNG &amp; Bật / Tắt Trực Tiếp</h2>
                  </div>
                  <span className="studio-pill">Z-Order 00 → 60</span>
                </div>
                <div className="studio-exploded-grid">
                  {activeLayers.map((layer) => {
                    const active = enabledLayerIds.includes(layer.id);
                    return (
                      <div key={layer.id} className="studio-exploded-card" data-active={active}>
                        <div className="studio-exploded-card__top">
                          <span className="studio-pill">Z={layer.z} • {layer.width}×{layer.height}px</span>
                          <button
                            type="button"
                            className="px-forge-btn"
                            aria-pressed={active}
                            onClick={() => toggleLayer(layer.id)}
                          >
                            {active ? "✓ Đang bật" : "○ Đã tắt"}
                          </button>
                        </div>
                        <div className="studio-stage-box">
                          <img
                            className="pixel-art"
                            src={layer.src}
                            width={layer.width}
                            height={layer.height}
                            data-px-source-width={layer.width}
                            data-px-source-height={layer.height}
                            data-px-sprite-scale="1"
                            alt={layer.label}
                          />
                        </div>
                        <strong>{layer.label}</strong>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* TAB 3: MOTION, ONION-SKIN & SPRITESHEET STRIP VIEWER */}
          {forgeTab === "motion" && (
            <section className="studio-section" aria-label="Trình diễn hoạt ảnh Crawl Killer và kỹ xảo 2 bộ đệm">
              <div className="studio-card">
                <div className="studio-card__header">
                  <div>
                    <span className="studio-eyebrow">CÔNG ĐOẠN 3: HOẠT ẢNH CHIẾN ĐẤU, ONION-SKIN &amp; CRAWL KILLER</span>
                    <h2>Kiểm Tra 5 Chuỗi Hoạt Ảnh &amp; Dải Filmstrip Từng Frame</h2>
                  </div>
                  <span className="studio-pill">{currentClip.method}</span>
                </div>
                <div className="studio-actions" role="group" aria-label="Chọn hoạt ảnh">
                  {CLIPS.map((clip, idx) => (
                    <button
                      key={clip.id}
                      type="button"
                      className="px-forge-btn"
                      aria-pressed={selectedClipIdx === idx}
                      onClick={() => setSelectedClipIdx(idx)}
                    >
                      {clip.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="px-forge-btn"
                    aria-pressed={showVfxOverlay}
                    onClick={() => setShowVfxOverlay((prev) => !prev)}
                  >
                    {showVfxOverlay ? "★ Đang bật VFX Kiếm Khí" : "☆ Tắt VFX Kiếm Khí"}
                  </button>
                </div>

                <div className="studio-grid-2">
                  <PixelSpriteAnimator
                    clipLabel={`${currentClip.label} • ${currentWeapon.name}`}
                    frames={currentClip.frames}
                    vfxFrames={SLASH_VFX_FRAMES}
                    showVfx={showVfxOverlay}
                    frameWidth={96}
                    frameHeight={96}
                    fps={currentClip.fps}
                    timing={currentClip.timing}
                    weaponOverlaySrc={
                      selectedWeaponIdx > 0 && enabledLayerIds.includes("50_weapon")
                        ? currentWeapon.layerSrc
                        : undefined
                    }
                  />

                  <PixelSpriteAnimator
                    clipLabel="Hiệu Ứng Triệu Hồi Cột Sáng SSR (Dual-Buffer VFX)"
                    frames={SUMMON_VFX_FRAMES}
                    frameWidth={64}
                    frameHeight={64}
                    fps={8}
                    timing={{ windupFrames: 1, hitFrame: 2, recoveryFrames: 1, hitStopMs: 0, screenShakePx: 0 }}
                  />
                </div>
              </div>

              {/* NEW FEATURE: SPRITESHEET STRIP EXPORT PREVIEW */}
              <div className="studio-card">
                <div className="studio-card__header">
                  <div>
                    <span className="studio-eyebrow">XUẤT DẢI SPRITESHEET NGANG (HORIZONTAL SPRITE STRIPS)</span>
                    <h2>Toàn Bộ Dải Sprite Strip Đã Đóng Gói Cho Engine</h2>
                  </div>
                  <span className="studio-pill">384×96 px / 256×64 px</span>
                </div>
                <div className="studio-strip-list">
                  {CLIPS.map((clip) => (
                    <div key={clip.id} className="studio-strip-item">
                      <div className="studio-strip-item__meta">
                        <strong>{clip.label}</strong>
                        <small>File: clip-{clip.id}-strip.png • {clip.frames.length * 96}×96 px</small>
                      </div>
                      <div className="studio-stage-box studio-stage-box--scroll">
                        <img
                          className="pixel-art"
                          src={clip.stripSrc}
                          width={clip.frames.length * 96}
                          height={96}
                          data-px-source-width={clip.frames.length * 96}
                          data-px-source-height={96}
                          data-px-sprite-scale="1"
                          alt={`Sprite strip ${clip.label}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* TAB 4: 20-COLOR PALETTE, 5 ELEMENTAL VARIANTS, DAMAGED & 8 DIRECTIONS */}
          {forgeTab === "variants" && (
            <section className="studio-section" aria-label="Hoán đổi hệ màu, giáp hư hại và xoay 8 hướng">
              {/* NEW FEATURE: 20-COLOR MASTER PALETTE INSPECTOR */}
              <div className="studio-card">
                <div className="studio-card__header">
                  <div>
                    <span className="studio-eyebrow">BẢNG MÀU CHUẨN 20 Ô MÀU (INDEXED PALETTE LUT)</span>
                    <h2>Kiểm Tra Từng Mã Màu HEX Trong Bảng Màu Hiệp Sĩ (20 / 24 Màu)</h2>
                  </div>
                  <span className="studio-pill">Đang chọn: {currentSwatch.hex} — {currentSwatch.name}</span>
                </div>
                <div className="studio-palette-grid" role="group" aria-label="Bảng 20 màu chuẩn">
                  {MASTER_PALETTE_HEX.map((swatch, idx) => (
                    <button
                      key={swatch.hex}
                      type="button"
                      className="studio-swatch-btn"
                      aria-pressed={selectedSwatchIdx === idx}
                      onClick={() => setSelectedSwatchIdx(idx)}
                    >
                      <span
                        className="studio-swatch-color"
                        style={{ backgroundColor: swatch.hex }}
                      />
                      <strong>{swatch.hex}</strong>
                      <small>{swatch.name}</small>
                    </button>
                  ))}
                </div>
              </div>

              {/* ALL 5 ELEMENTAL VARIANTS AT ONCE */}
              <div className="studio-card">
                <div className="studio-card__header">
                  <div>
                    <span className="studio-eyebrow">SO SÁNH TRỰC QUAN 5 HỆ GIÁP NGUYÊN TỐ &amp; GIÁP HƯ HẠI (-DAMAGED)</span>
                    <h2>Toàn Bộ 5 Hệ Nguyên Tố &amp; Trạng Thái Nứt Vỡ Chiến Trận (0px BBox Drift)</h2>
                  </div>
                  <button
                    type="button"
                    className="px-forge-btn"
                    aria-pressed={damagedMode}
                    onClick={() => setDamagedMode((prev) => !prev)}
                  >
                    {damagedMode ? "✓ Đang bật Giáp Hư Hại (-damaged)" : "○ So sánh Giáp Hư Hại (-damaged)"}
                  </button>
                </div>
                <div className="studio-element-grid">
                  {ELEMENTS.map((el, idx) => (
                    <div
                      key={el.id}
                      className="studio-exploded-card"
                      data-active={selectedElementIdx === idx}
                    >
                      <div className="studio-exploded-card__top">
                        <strong>{el.label}</strong>
                        <button
                          type="button"
                          className="px-forge-btn"
                          aria-pressed={selectedElementIdx === idx}
                          onClick={() => setSelectedElementIdx(idx)}
                        >
                          {selectedElementIdx === idx ? "Đang chọn" : "Chọn"}
                        </button>
                      </div>
                      <div className="studio-stage-box">
                        <img
                          className="pixel-art"
                          src={el.src}
                          width={96}
                          height={96}
                          data-px-source-width={96}
                          data-px-source-height={96}
                          data-px-sprite-scale="1"
                          alt={el.label}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="studio-exploded-card" data-active={damagedMode}>
                    <div className="studio-exploded-card__top">
                      <strong>Giáp Hư Hại (-damaged)</strong>
                      <span className="studio-pill">0px Drift</span>
                    </div>
                    <div className="studio-stage-box">
                      <img
                        className="pixel-art"
                        src={`${FORGE_ROOT}/hero-master-damaged.png`}
                        width={96}
                        height={96}
                        data-px-source-width={96}
                        data-px-source-height={96}
                        data-px-sprite-scale="1"
                        alt="Giáp hư hại -damaged"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="studio-grid-2">
                {/* ALL 8 DIRECTIONS COMPASS */}
                <div className="studio-card">
                  <div className="studio-card__header">
                    <div>
                      <span className="studio-eyebrow">LA BÀN XOAY 8 HƯỚNG (8-DIRECTION TURNAROUND)</span>
                      <h2>5 Hướng Gốc + 3 Hướng Đối Xứng (Tiết Kiệm 37.5% Chi Phí)</h2>
                    </div>
                    <span className="studio-pill">Hướng: {selectedDir}</span>
                  </div>
                  <div className="studio-compass-grid">
                    {DIRECTIONS.map((dir) => (
                      <button
                        key={dir}
                        type="button"
                        className="studio-compass-card"
                        aria-pressed={selectedDir === dir}
                        onClick={() => setSelectedDir(dir)}
                      >
                        <span className="studio-stage-tag">Hướng {dir}</span>
                        <img
                          className="pixel-art"
                          src={`${FORGE_ROOT}/hero-dir-${dir}.png`}
                          width={64}
                          height={64}
                          data-px-source-width={96}
                          data-px-source-height={96}
                          data-px-sprite-scale="1"
                          alt={`Hướng ${dir}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* PROMPT COMPILER */}
                <div className="studio-card">
                  <div className="studio-card__header">
                    <div>
                      <span className="studio-eyebrow">THƯ VIỆN PROMPT &amp; QUY TẮC KỸ THUẬT</span>
                      <h2>Cấu Hình Sinh AI &amp; Hậu Kỳ</h2>
                    </div>
                    <span className="studio-pill">04 Specs</span>
                  </div>
                  <div className="studio-actions">
                    {PROMPT_STAGES.map((stage, idx) => (
                      <button
                        key={stage.id}
                        type="button"
                        className="px-forge-btn"
                        aria-pressed={promptStageIdx === idx}
                        onClick={() => setPromptStageIdx(idx)}
                      >
                        {stage.label}
                      </button>
                    ))}
                  </div>
                  <pre className="studio-prompt-box">{currentPrompt.prompt}</pre>
                  <ul className="studio-rule-list">
                    {currentPrompt.rules.map((rule) => (
                      <li key={rule}>✓ {rule}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* TAB 5: WORLD, 2.5D LIGHTING, ATLAS & ENGINE MANIFEST CODE VIEWER */}
          {forgeTab === "world-export" && (
            <section className="studio-section" aria-label="Bản đồ, ánh sáng 2.5D, kho vật phẩm và xuất Texture Atlas">
              <div className="studio-grid-2">
                <div className="studio-card">
                  <div className="studio-card__header">
                    <div>
                      <span className="studio-eyebrow">MÔI TRƯỜNG &amp; BẢN ĐỒ CHIẾN ĐẤU</span>
                      <h2>Sân Đấu Nhà Thờ Gothic &amp; 16-Tile Wang Autotile</h2>
                    </div>
                    <span className="studio-pill">160×96 Stage</span>
                  </div>
                  <PixelTilemapView
                    autotileSheetSrc={`${FORGE_ROOT}/autotile-16-sheet.png`}
                    mapPreviewSrc={`${FORGE_ROOT}/autotile-map-preview.png`}
                    parallaxCompositeSrc={`${FORGE_ROOT}/parallax-stage-composite.png`}
                  />
                </div>

                <div className="studio-card">
                  <div className="studio-card__header">
                    <div>
                      <span className="studio-eyebrow">ÁNH SÁNG ĐỘNG HD-2D (2.5D LIGHTING)</span>
                      <h2>4 Kênh Bản Đồ Ánh Sáng Trên Cùng Khung Bao</h2>
                    </div>
                    <span className="studio-pill">Normal + Specular + Emissive</span>
                  </div>
                  <PixelLightingPreview
                    diffuseSrc={`${FORGE_ROOT}/hero-master-still.png`}
                    normalSrc={`${FORGE_ROOT}/hero-master-normal.png`}
                    specularSrc={`${FORGE_ROOT}/hero-master-specular.png`}
                    emissiveSrc={`${FORGE_ROOT}/hero-master-emissive.png`}
                  />
                </div>
              </div>

              <div className="studio-grid-2">
                <PixelGachaCard
                  name="Hiệp Sĩ Thánh Quang"
                  subtitle="Thánh Kỵ Sĩ Giáp Bạc — Khung Vũ Khí 96×96"
                  rarity="ssr"
                  elementLabel={currentElement.label.toUpperCase()}
                  spriteSrc={currentElement.src}
                  spriteWidth={96}
                  spriteHeight={96}
                  foilActive
                  stats={[
                    { label: "Khung gốc", value: "64 / 96 px" },
                    { label: "Số lớp", value: "07 RGBA" },
                    { label: "Bảng màu", value: "20 màu" },
                    { label: "Lệch BBox", value: "0 px" },
                  ]}
                />

                <div className="studio-card">
                  <div className="studio-card__header">
                    <div>
                      <span className="studio-eyebrow">KHO VŨ KHÍ &amp; THÁNH VẬT (AI LOOT ICONS)</span>
                      <h2>6 Vật Phẩm Tách Từ Bảng AI 3×2 (32×32 px)</h2>
                    </div>
                    <span className="studio-pill">06 Loot Icons</span>
                  </div>
                  <div className="studio-loot-grid">
                    {LOOT_ITEMS.map((item) => (
                      <div key={item.id} className="studio-loot-card">
                        <div className="studio-stage-box studio-stage-box--clean">
                          <img
                            className="pixel-art"
                            src={item.src}
                            width={32}
                            height={32}
                            data-px-source-width={32}
                            data-px-source-height={32}
                            data-px-sprite-scale="1"
                            alt={item.name}
                          />
                        </div>
                        <div>
                          <span className="studio-loot-rarity">{item.rarity.toUpperCase()}</span>
                          <strong>{item.name}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="studio-card">
                <div className="studio-card__header">
                  <div>
                    <span className="studio-eyebrow">ĐÓNG GÓI TEXTURE ATLAS ĐA KÊNH (MULTI-MAP PACKING)</span>
                    <h2>3 Bản Đồ Texture Atlas Đồng Bộ Tọa Độ (384×384 px)</h2>
                  </div>
                  <span className="studio-pill">Godot 4 &amp; Unity 6 Ready</span>
                </div>
                <p className="studio-card__desc">
                  Toàn bộ các lớp Paper-Doll, chuỗi hoạt ảnh chiến đấu và vật phẩm được đóng gói tự động kèm 2px extrusion padding vào 3 tấm Atlas có tọa độ khung bao trùng khớp 100%.
                </p>
                <div className="studio-atlas-grid">
                  <div className="studio-atlas-card">
                    <strong>1. Diffuse Atlas (Màu Gốc)</strong>
                    <small>forge-atlas-diffuse.png (384×384)</small>
                    <div className="studio-stage-box">
                      <img
                        className="pixel-art"
                        src={`${FORGE_ROOT}/forge-atlas-diffuse.png`}
                        width={192}
                        height={192}
                        data-px-source-width={384}
                        data-px-source-height={384}
                        data-px-sprite-scale="1"
                        alt="Diffuse Texture Atlas"
                      />
                    </div>
                  </div>
                  <div className="studio-atlas-card">
                    <strong>2. Normal Map Atlas (Ánh Sáng 2.5D)</strong>
                    <small>forge-atlas-normal.png (384×384)</small>
                    <div className="studio-stage-box">
                      <img
                        className="pixel-art"
                        src={`${FORGE_ROOT}/forge-atlas-normal.png`}
                        width={192}
                        height={192}
                        data-px-source-width={384}
                        data-px-source-height={384}
                        data-px-sprite-scale="1"
                        alt="Normal Texture Atlas"
                      />
                    </div>
                  </div>
                  <div className="studio-atlas-card">
                    <strong>3. Emissive Map Atlas (Phát Sáng)</strong>
                    <small>forge-atlas-emissive.png (384×384)</small>
                    <div className="studio-stage-box">
                      <img
                        className="pixel-art"
                        src={`${FORGE_ROOT}/forge-atlas-emissive.png`}
                        width={192}
                        height={192}
                        data-px-source-width={384}
                        data-px-source-height={384}
                        data-px-sprite-scale="1"
                        alt="Emissive Texture Atlas"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* NEW FEATURE: ENGINE MANIFEST INSPECTOR & DOWNLOADS */}
              <div className="studio-card">
                <div className="studio-card__header">
                  <div>
                    <span className="studio-eyebrow">TRÌNH XEM MÃ NGUỒN ENGINE &amp; TẢI XUỐNG TRỰC TIẾP</span>
                    <h2>Cấu Hình Tích Hợp Godot 4 (.tres), Unity 6 (.json) &amp; Aseprite</h2>
                  </div>
                  <a
                    className="px-forge-btn studio-download-link"
                    href={currentEngine.href}
                    download={currentEngine.file}
                  >
                    ⬇ Tải file {currentEngine.file}
                  </a>
                </div>
                <div className="studio-actions" role="group" aria-label="Chọn định dạng Engine">
                  {ENGINE_EXPORTS.map((exp, idx) => (
                    <button
                      key={exp.id}
                      type="button"
                      className="px-forge-btn"
                      aria-pressed={selectedEngineIdx === idx}
                      onClick={() => setSelectedEngineIdx(idx)}
                    >
                      {exp.title}
                    </button>
                  ))}
                </div>
                <pre className="studio-prompt-box">{currentEngine.snippet}</pre>
              </div>
            </section>
          )}

          {/* TAB 6: BATCH FACTORY / MASS PRODUCTION */}
          {forgeTab === "batch-factory" && (
            <section className="studio-section" aria-label="Xưởng tạo hàng loạt 5 tướng theo Roster">
              {/* CLI Commands & Skill Reference Card */}
              <div className="studio-card">
                <div className="studio-card__header">
                  <div>
                    <span className="studio-eyebrow">HỆ THỐNG LỆNH CLI &amp; SKILL TẠO HÀNG LOẠT (MASS PRODUCTION PIPELINE)</span>
                    <h2>Sản Xuất Tự Động Nhiều Tướng Từ File Cấu Hình forge-roster.json</h2>
                  </div>
                  <span className="studio-pill">5 Tướng • 50 AI Prompts • 220+ File Xuất</span>
                </div>
                <p className="studio-card__desc">
                  Toàn bộ quy trình tạo hàng loạt được đóng gói thành <strong>Skill chuyên dụng</strong> tại{" "}
                  <code>skills/pixel-asset-batch-forge/SKILL.md</code> và điều khiển qua tệp{" "}
                  <code>forge-roster.json</code>. Chỉ với 1 lệnh CLI, hệ thống tự động biên dịch 10 Prompt AI (nền{" "}
                  <code>#00FF00</code>) cho từng tướng, tách nền CIELAB, khóa gót giày <code>Y=88</code>, bóc tách 7 lớp
                  Paper-Doll, sinh 5 chuỗi hoạt ảnh + 2.5D Normal/Emissive và đóng gói Atlas <code>384×384px</code>.
                </p>

                <div className="studio-ai-pair-grid">
                  {BATCH_CLI_COMMANDS.map((item) => (
                    <div key={item.cmd} className="studio-ai-pair-card">
                      <div className="studio-ai-pair-card__head">
                        <strong>Lệnh Thực Thi (CLI / NPM Script)</strong>
                        <small>{item.desc}</small>
                      </div>
                      <pre className="studio-prompt-box">{item.cmd}</pre>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5 Batch Units Gallery */}
              <div className="studio-card">
                <div className="studio-card__header">
                  <div>
                    <span className="studio-eyebrow">DANH SÁCH 5 TƯỚNG ĐÃ XUẤT XƯỞNG HÀNG LOẠT (100/100 QUALITY GATE)</span>
                    <h2>Bấm Chọn Từng Tướng Để Kiểm Tra Bộ Asset, Hoạt Ảnh &amp; Atlas Độc Lập</h2>
                  </div>
                  <a
                    className="px-forge-btn studio-download-link"
                    href="/assets/pixel-forge/batch-manifest.json"
                    download="batch-manifest.json"
                  >
                    ⬇ Tải batch-manifest.json
                  </a>
                </div>

                <div className="studio-element-grid">
                  {BATCH_ROSTER_UNITS.map((unit, idx) => (
                    <div
                      key={unit.id}
                      className="studio-exploded-card"
                      data-active={selectedBatchIdx === idx}
                    >
                      <div className="studio-exploded-card__top">
                        <div>
                          <span className="studio-loot-rarity">{unit.rarity} • {unit.classRole}</span>
                          <strong>{unit.name}</strong>
                        </div>
                        <button
                          type="button"
                          className="px-forge-btn"
                          aria-pressed={selectedBatchIdx === idx}
                          onClick={() => setSelectedBatchIdx(idx)}
                        >
                          {selectedBatchIdx === idx ? "✓ Đang xem" : "Xem lô"}
                        </button>
                      </div>
                      <div className="studio-ai-pair-card__stages">
                        <div className="studio-stage-box">
                          <span className="studio-stage-tag">Master Still</span>
                          <img
                            className="pixel-art"
                            src={`${unit.outDir}/hero-master-still.png`}
                            width={96}
                            height={96}
                            data-px-source-width={96}
                            data-px-source-height={96}
                            data-px-sprite-scale="1"
                            alt={unit.name}
                          />
                        </div>
                        <div className="studio-stage-box">
                          <span className="studio-stage-tag">Attack F02</span>
                          <img
                            className="pixel-art"
                            src={`${unit.outDir}/clip-attack-f2.png`}
                            width={96}
                            height={96}
                            data-px-source-width={96}
                            data-px-source-height={96}
                            data-px-sprite-scale="1"
                            alt={`${unit.name} Attack`}
                          />
                        </div>
                      </div>
                      <small>{unit.title} • {unit.element}</small>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Batch Unit Deep Inspector */}
              <div className="studio-grid-2">
                <div className="studio-card">
                  <div className="studio-card__header">
                    <div>
                      <span className="studio-eyebrow">KIỂM TRA LÔ SẢN XUẤT: {currentBatchUnit.id.toUpperCase()}</span>
                      <h2>{currentBatchUnit.name} — {currentBatchUnit.title} ({currentBatchUnit.rarity})</h2>
                    </div>
                    <span className="studio-pill">PASS 100/100</span>
                  </div>
                  <PixelSpriteAnimator
                    clipLabel={`${currentBatchUnit.name} • Trảm Kích Chiến Đấu (4f)`}
                    frames={[
                      `${currentBatchUnit.outDir}/clip-attack-f0.png`,
                      `${currentBatchUnit.outDir}/clip-attack-f1.png`,
                      `${currentBatchUnit.outDir}/clip-attack-f2.png`,
                      `${currentBatchUnit.outDir}/clip-attack-f3.png`,
                    ]}
                    vfxFrames={SLASH_VFX_FRAMES}
                    showVfx={showVfxOverlay}
                    frameWidth={96}
                    frameHeight={96}
                    fps={10}
                    timing={{ windupFrames: 1, hitFrame: 2, recoveryFrames: 1, hitStopMs: 80, screenShakePx: 4 }}
                  />
                  <ul className="studio-rule-list">
                    <li>✓ Thư mục xuất: <code>public{currentBatchUnit.outDir}</code></li>
                    <li>✓ Vũ khí Socket hand_r: {currentBatchUnit.weaponSpec}</li>
                    <li>✓ Kỹ năng: {currentBatchUnit.skills.join(" • ")}</li>
                  </ul>
                </div>

                <div className="studio-card">
                  <div className="studio-card__header">
                    <div>
                      <span className="studio-eyebrow">ATLAS ĐA KÊNH &amp; MA TRẬN 10 PROMPT AI CỦA TƯỚNG</span>
                      <h2>Atlas {currentBatchUnit.name} &amp; Prompt Sinh Frame Chuẩn</h2>
                    </div>
                    <a
                      className="px-forge-btn studio-download-link"
                      href={`${currentBatchUnit.outDir}/ai-frame-prompts.json`}
                      download={`${currentBatchUnit.id}-prompts.json`}
                    >
                      ⬇ Tải 10 Prompts (.json)
                    </a>
                  </div>
                  <div className="studio-ai-pair-card__stages">
                    <div className="studio-stage-box">
                      <span className="studio-stage-tag">Diffuse Atlas (384×384)</span>
                      <img
                        className="pixel-art"
                        src={`${currentBatchUnit.outDir}/forge-atlas-diffuse.png`}
                        width={144}
                        height={144}
                        data-px-source-width={384}
                        data-px-source-height={384}
                        data-px-sprite-scale="1"
                        alt={`${currentBatchUnit.name} Diffuse Atlas`}
                      />
                    </div>
                    <div className="studio-stage-box">
                      <span className="studio-stage-tag">2.5D Normal Map (96×96)</span>
                      <img
                        className="pixel-art"
                        src={`${currentBatchUnit.outDir}/hero-master-normal.png`}
                        width={96}
                        height={96}
                        data-px-source-width={96}
                        data-px-source-height={96}
                        data-px-sprite-scale="1"
                        alt={`${currentBatchUnit.name} Normal Map`}
                      />
                    </div>
                  </div>
                  <pre className="studio-prompt-box">{currentBatchUnit.samplePrompt}</pre>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
