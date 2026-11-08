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

    raw_chroma_prompt = (
        f"[STAGE 01: 10-FRAME CHROMA-KEY & LUT SPEC] Character: {char.name} ({char.title}), rarity={char.rarity.upper()}, "
        f"element={char.base_element}. Author 10 synchronized AI source plates on solid #00FF00 pure green chroma background "
        f"(7 character keyframes + 2x2 modular equipment kit + 3x2 RPG loot sheet + HD-2D cathedral arena). "
        f"Run CIELAB Delta-E chroma removal BEFORE shared {char.max_palette_colors}-color Master Palette quantization, "
        f"locking boots strictly to baseline Y={char.foot_baseline_y} on a {char.weapon_canvas[0]}x{char.weapon_canvas[1]} canvas."
    )

    paperdoll_prompt = (
        f"[STAGE 02: CONCENTRIC PAPERDOLL 7-LAYER & GREYSCALE TINT SPEC] Decompose {char.name} into 7 bit-exact RGBA layers "
        f"sharing ground baseline Y={char.foot_baseline_y}: lower layers (00_shadow, 10_body, 20_iris, 30_outfit) on "
        f"{char.body_canvas[0]}x{char.body_canvas[1]} at offset (16,26), headgear (40_hair) at (16,4), and oversized "
        f"combat layers (50_weapon, 60_fx) on {char.weapon_canvas[0]}x{char.weapon_canvas[1]} with 4 runtime greyscale tint masks."
    )

    motion_prompt = (
        "[STAGE 03: 5-CLIP MOTION, CRAWL KILLER & DUAL-BUFFER VFX SPEC] Generate 5 combat clips (idle, walk, attack, hurt, victory) "
        "plus unarmed swap variants and 25 pre-baked socket weapon poses. Apply Region-Masked Idle, Temporal Hysteresis "
        "(commit_frames=2, max_hold=3), Hit-Stop / Screen-Shake timing metadata, and Dual-Buffer VFX (color + emissive)."
    )

    bible_prompt = (
        f"[STAGE 04: CHARACTER BIBLE 23-PANEL & COMPASS TURNAROUND SPEC] Subject: {char.name}. Assemble 23 synchronized panels: "
        f"8-way spatial turnaround (5 source views {', '.join(char.ai_directions)} + 3 mirror flips "
        f"{', '.join(char.mirrored_directions.keys())} saving 37.5% cost), "
        f"6 portrait expressions ({', '.join(char.expressions)}), 5 action keyposes, "
        f"3 ascension skins ({', '.join(char.skins)}), and 1 SD chibi form, plus a '-damaged' variant (bbox delta <=1px)."
    )

    world_prompt = (
        f"[STAGE 05: WANG 16-AUTOTILE, SEAMLESS PARALLAX & 2.5D LIGHTING SPEC] Biome: {spec.tileset.name} ({spec.tileset.biome}). "
        f"Construct a 16-tile Wang/Blob autotile set ({spec.tileset.tile_size}x{spec.tileset.tile_size}px per tile) "
        "paired with a seamless 3-layer 256x144 parallax stage (sky_far, ruins_mid, arena_ground) and 2.5D SDF normal/specular/emissive maps."
    )

    atlas_prompt = (
        f"[STAGE 06: MULTI-MAP EXTRUDED ATLAS & ENGINE EXPORT SPEC] Pack trimmed character clips, 8 directions, 7 paper-doll layers, "
        "full 4-frame VFX sequences, damaged state, and 6 loot icons into synchronized Diffuse/Normal/Emissive power-of-two atlases "
        "with 2px edge extrusion, exporting valid Godot 4 SpriteFrames (.tres), Unity 6 SpriteAtlas (.json), and Aseprite frameTags (.json)."
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
        "schemaVersion": 2,
        "selectedProvider": preferred_provider,
        "availableProviders": detect_available_providers(),
        "negativePrompt": negative_prompt,
        "stages": {
            "stage1RawChroma": {
                "title": "Công Đoạn 1: Ảnh AI Gốc 10 Khung & Khử Nền CIELAB",
                "prompt": raw_chroma_prompt,
                "constraints": [
                    f"10 tấm AI gốc (#00FF00): 7 keyframe nhân vật + Kit 2×2 + Loot 3×2 + Sàn đấu 256×144",
                    f"Khóa bàn chân: Y = {char.foot_baseline_y}px | Tối đa {char.max_palette_colors} màu Master LUT",
                    "Chroma Key CIELAB chạy TRƯỚC khi lượng tử hóa bảng màu | Binary Alpha {0, 255}",
                ],
            },
            "stage2Paperdoll": {
                "title": "Công Đoạn 2: Paper-Doll 7 Lớp, 5 Socket & Nhuộm Greyscale",
                "prompt": paperdoll_prompt,
                "constraints": [
                    "7 lớp RGBA: 00_shadow, 10_body, 20_iris, 30_outfit, 40_hair (64×64), 50_weapon & 60_fx (96×96)",
                    "4 mặt nạ Greyscale (10_body, 20_iris, 30_outfit, 40_hair) nhuộm màu runtime không lem",
                ],
            },
            "stage3Motion": {
                "title": "Công Đoạn 3: Hoạt Ảnh 5 Clip, Hit-Stop & VFX Kép",
                "prompt": motion_prompt,
                "constraints": [
                    "5 clip chiến đấu + bản Unarmed tay không + 25 pose vũ khí xoay góc integer",
                    "Crawl Killer (commit=2, max_hold=3), Hit-Stop & Screen-Shake + Dual-Buffer VFX (Color/Emissive)",
                ],
            },
            "stage4Bible": {
                "title": "Công Đoạn 4: Character Bible 23 Ô, La Bàn 8 Hướng & Gacha",
                "prompt": bible_prompt,
                "constraints": [
                    "La bàn 8 hướng chuẩn không gian (S, SE, E, NW, N + lật gương SW, W, NE tiết kiệm 37,5%)",
                    "6 biểu cảm chân dung (48×48) + 3 Skin tiến hóa (96×96) + 1 Chibi SD (64×64) + Giáp hư hại (<=1px)",
                ],
            },
            "stage5World": {
                "title": "Công Đoạn 5: Thế Giới Wang 16-Autotile, Parallax & Ánh Sáng 2.5D",
                "prompt": world_prompt,
                "constraints": [
                    "16 biến thể bitmask (0..15) đồng bộ trực tiếp với gridLayout của Sân Thánh Đường",
                    "3 lớp Parallax cuộn liền mạch không hở viền đen + 3 bản đồ ánh sáng 2.5D (_normal, _specular, _emissive)",
                ],
            },
            "stage6Atlas": {
                "title": "Công Đoạn 6: Đóng Gói Multi-Map Atlas & Xuất Engine",
                "prompt": atlas_prompt,
                "constraints": [
                    "Đóng gói Alpha-Trimmed + 2px Edge Extrusion trên đủ 3 kênh Diffuse / Normal / Emissive",
                    "Xuất chuẩn Godot 4 SpriteFrames (.tres SubResource AtlasTexture), Unity 6 (.json) & Aseprite (.json)",
                ],
            },
        },
        "lootPrompts": loot_prompts,
    }
