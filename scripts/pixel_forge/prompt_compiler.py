"""Prompt Compiler & Multi-Provider Router for Pixel Asset & Sprite Forge."""

from __future__ import annotations

import os
from typing import Any

from .schema import ForgeProjectSpec, ProviderKey


def detect_available_providers() -> list[dict[str, Any]]:
    """Inspect environment variables to report active AI providers and offline fallbacks."""
    return [
        {
            "id": "codeart2d",
            "label": "Deterministic Procedural Forge (codeart2d Offline)",
            "status": "ready",
            "cost": "0 credit (100% Local CPU)",
            "capabilities": ["master-still", "paperdoll-7-layer", "animation-5-clips", "autotile-16", "vfx-dual-buffer", "normals-25d"],
        },
        {
            "id": "gemini",
            "label": "Google Gemini Imagen / Nano Banana Pro",
            "status": "configured" if os.environ.get("GEMINI_API_KEY") else "standby (set GEMINI_API_KEY)",
            "cost": "API metered (up to 14 reference images)",
            "capabilities": ["master-still", "character-bible", "turnaround-5dir", "sprite-edit"],
        },
        {
            "id": "openai",
            "label": "OpenAI GPT-Image (Native Alpha + Reference Sheet)",
            "status": "configured" if os.environ.get("OPENAI_API_KEY") else "standby (set OPENAI_API_KEY)",
            "cost": "API metered (up to 16 reference images)",
            "capabilities": ["master-still", "loot-sheet", "ui-9slice-kit"],
        },
        {
            "id": "fal",
            "label": "fal.ai (LTX-2.5 / Wan 2.2 / MiniMax H3 Video-to-Sprite)",
            "status": "configured" if os.environ.get("FAL_KEY") else "standby (set FAL_KEY)",
            "cost": "API metered (I2V motion loop)",
            "capabilities": ["i2v-motion", "loop-interpolation"],
        },
        {
            "id": "comfyui",
            "label": "Local ComfyUI + Character LoRA & Crawl Killer Nodepack",
            "status": "configured" if os.environ.get("COMFYUI_URL") else "standby (http://127.0.0.1:8188)",
            "cost": "0 credit (Local GPU >=24GB VRAM)",
            "capabilities": ["character-bible-23", "cosmetic-inpaint", "h3-crawl-killer"],
        },
        {
            "id": "ollama",
            "label": "Local Ollama + Texel Studio Agent (Bresenham / Voronoi)",
            "status": "configured" if os.environ.get("OLLAMA_HOST") else "standby (http://127.0.0.1:11434)",
            "cost": "0 credit (Local LLM)",
            "capabilities": ["loot-icons", "wang-autotile-16"],
        },
    ]


def compile_prompt_pack(spec: ForgeProjectSpec, preferred_provider: ProviderKey = "codeart2d") -> dict[str, Any]:
    """Compile structured prompts and negative constraints for every stage of the pipeline."""
    char = spec.character
    negative_prompt = (
        "anti-aliasing, blurry edges, sub-pixel rendering, mixels, inconsistent pixel grid, "
        "soft gradients, airbrush shading, lens flare, Gaussian blur, semi-transparent halo, "
        "pillow shading, baked text, watermark, cropped weapon tip, floating feet"
    )

    master_still_prompt = (
        f"[HIBIT MASTER STILL SPEC] Character: {char.name} ({char.title}), rarity={char.rarity.upper()}, "
        f"element={char.base_element}. Render flat unoutlined cel-shaded regions with strictly <= "
        f"{char.max_shades_per_material} discrete shades per material for 8x8 majority-vote downscaling "
        f"to a {char.body_canvas[0]}x{char.body_canvas[1]} logical canvas. "
        f"Top-left directional lighting. Lock both feet on horizontal baseline Y={char.foot_baseline_y} "
        f"(pivot={char.body_pivot[0]},{char.body_pivot[1]}). Solid chroma key background (#00FF00) with "
        f"zero color spill. Leave >=8px silhouette padding around extremities."
    )

    bible_prompt = (
        f"[CHARACTER BIBLE 23-PANEL SPEC] Subject: {char.name}. Generate a synchronized 23-panel design sheet: "
        f"5 orthographic turnaround views ({', '.join(char.ai_directions)}; derive {', '.join(char.mirrored_directions.keys())} "
        f"via deterministic horizontal mirror flip to save 37.5% generation cost), "
        f"6 dialogue expressions ({', '.join(char.expressions)}), 3 combat action keyposes, "
        f"3 ascension skins ({', '.join(char.skins)}), 1 chibi form, and a '-damaged' variant whose bounding box "
        f"deviates by <=1px from the base pose."
    )

    paperdoll_prompt = (
        f"[CONCENTRIC PAPERDOLL 7-LAYER SPEC] Decompose {char.name} into 7 bit-exact RGBA layers sharing a "
        f"concentric ground pivot: body layers (00_shadow, 10_body greyscale-tintable, 20_iris green-key isolated, "
        f"30_outfit, 40_hair) on {char.body_canvas[0]}x{char.body_canvas[1]} canvas (pivot={char.body_pivot}), and "
        f"oversized equipment layers (50_weapon, 60_fx) on {char.weapon_canvas[0]}x{char.weapon_canvas[1]} canvas "
        f"(pivot={char.weapon_pivot}) so broadswords and polearms never clip during swing arcs."
    )

    motion_prompt = (
        "[I2V & REGION-MASK MOTION SPEC] Generate 5 game-ready clips (idle, walk, attack, hurt, victory). "
        "For 'idle', apply anatomical breathing and cape oscillation strictly inside region masks while preserving "
        "resting torso pixels 100% byte-identical. For 'walk' and 'attack', run CIELAB chroma key BEFORE palette "
        "quantization, enforce Temporal Hysteresis (Crawl Killer: commit_frames=2, max_hold=3 starvation escape), "
        f"and lock contact foot to Y={char.foot_baseline_y} with Alpha-Weighted Centroid stabilization."
    )

    world_prompt = (
        f"[WANG 16-AUTOTILE & PARALLAX SPEC] Biome: {spec.tileset.name} ({spec.tileset.biome}). "
        f"Construct a 16-tile Wang/Blob autotile set ({spec.tileset.tile_size}x{spec.tileset.tile_size}px per tile) "
        "with crisp stepped stone/rune transitions, paired with a 3-layer parallax battle stage (sky_far, ruins_mid, "
        "arena_ground) using a disciplined 14-color palette and 2.5D normal/specular/emissive maps."
    )

    loot_prompts = [
        {
            "id": item.id,
            "name": item.name,
            "rarity": item.rarity,
            "category": item.category,
            "canvas": f"{item.canvas_size}x{item.canvas_size}",
            "prompt": (
                f"[LOOT ICON {item.canvas_size}x{item.canvas_size}] {item.name} ({item.category}), "
                f"rarity={item.rarity.upper()}, material={item.material}. Centered inventory icon with "
                "1px selective dark outline, top-left specular glint, binary alpha (0/255), <=12 colors."
            ),
        }
        for item in spec.loot_items
    ]

    return {
        "schemaVersion": 1,
        "selectedProvider": preferred_provider,
        "availableProviders": detect_available_providers(),
        "negativePrompt": negative_prompt,
        "stages": {
            "masterStill": {
                "title": "1. Master Still (Chế độ hibit 8×8 Majority-Vote)",
                "prompt": master_still_prompt,
                "constraints": [
                    f"Canvas: {char.body_canvas[0]}×{char.body_canvas[1]}px (Pivot: {char.body_pivot[0]}, {char.body_pivot[1]})",
                    f"Foot Baseline Lock: Y = {char.foot_baseline_y}px",
                    f"Max shades per material: {char.max_shades_per_material} | Max palette: {char.max_palette_colors} colors",
                    "Chroma Key BEFORE Quantize | Binary Alpha {0, 255}",
                ],
            },
            "characterBible": {
                "title": "2. Character Bible 23 Khung & 8 Hướng Đối Xứng",
                "prompt": bible_prompt,
                "constraints": [
                    "5 hướng sinh gốc (S, SW, W, NW, N) + 3 hướng lật gương (SE, E, NE) → tiết kiệm 37,5% chi phí",
                    "6 biểu cảm hội thoại + 3 Skin tiến hóa + 1 Chibi + biến thể -damaged lệch khung bao <= 1px",
                ],
            },
            "paperdoll": {
                "title": "3. Paper-Doll 7 Lớp & Khung Vũ Khí Quá Khổ 96×96",
                "prompt": paperdoll_prompt,
                "constraints": [
                    "7 lớp RGBA: 00_shadow, 10_body, 20_iris, 30_outfit, 40_hair, 50_weapon (96×96), 60_fx (96×96)",
                    "Tách riêng tròng mắt (Iris Key) và lớp cơ sở trắng xám để đổi màu runtime không lem",
                ],
            },
            "motion": {
                "title": "4. Hoạt Ảnh, Khử Bò Viền (Crawl Killer) & Khóa Bàn Chân",
                "prompt": motion_prompt,
                "constraints": [
                    "Temporal Hysteresis: commit_frames = 2, max_hold = 3 (chống nhấp nháy viền)",
                    "Region-Masked Idle: giữ nguyên 100% byte vùng thân đứng yên",
                    "Dual-Buffer VFX: kênh color + kênh emissive_light tách biệt kèm metadata act",
                ],
            },
            "world": {
                "title": "5. Bản Đồ 16-Tile Wang Autotile, Parallax & 2.5D Normals",
                "prompt": world_prompt,
                "constraints": [
                    "16 biến thể bitmask (0..15) ghép liền mạch không vết nối",
                    "3 lớp Parallax Battle Stage + bộ 3 bản đồ ánh sáng (_normal, _specular, _emissive)",
                ],
            },
        },
        "lootPrompts": loot_prompts,
    }
