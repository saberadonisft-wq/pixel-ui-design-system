"""Data schemas and contracts for the Pixel Asset & Sprite Forge pipeline."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Literal

RarityTier = Literal["common", "rare", "epic", "ssr", "ur"]
ElementKey = Literal["solar", "fire", "ice", "shadow", "emerald"]
Direction8 = Literal["S", "SW", "W", "NW", "N", "NE", "E", "SE"]
OutlineMode = Literal["selective", "dark", "auto", "none"]
ProviderKey = Literal["codeart2d", "gemini", "openai", "fal", "comfyui", "ollama"]


@dataclass(frozen=True)
class SocketPoint:
    """Attachment point for weapons, headgear, FX, or projectiles on a frame."""

    id: str
    x: int
    y: int
    angle_deg: int = 0
    z_order: int = 50
    visible: bool = True


@dataclass(frozen=True)
class PaperdollLayerSpec:
    """Single paperdoll layer definition aligned to a shared 96x96 ground baseline."""

    id: str
    role: Literal["shadow", "body", "iris", "outfit", "hair", "weapon", "fx"]
    z_index: int
    canvas_width: int
    canvas_height: int
    pivot_x: int
    pivot_y: int
    offset_x: int = 0
    offset_y: int = 0
    tintable_greyscale: bool = False


@dataclass(frozen=True)
class ElementVariantSpec:
    """Deterministic palette remap for elemental or rarity variants."""

    id: ElementKey
    label: str
    primary_ramp: tuple[tuple[int, int, int], tuple[int, int, int], tuple[int, int, int]]
    accent_ramp: tuple[tuple[int, int, int], tuple[int, int, int], tuple[int, int, int]]
    glow_rgb: tuple[int, int, int]


@dataclass(frozen=True)
class ActionTimingMeta:
    """Combat and UI synchronization metadata (windup, hit frame, hit-stop, shake)."""

    windup_frames: int
    hit_frame: int
    recovery_frames: int
    hit_stop_ms: int
    screen_shake_px: int


@dataclass(frozen=True)
class AnimationClipSpec:
    """Sprite animation clip contract."""

    id: Literal["idle", "walk", "attack", "hurt", "victory"]
    label: str
    frames: int
    fps: int
    loop: bool
    region_masked: bool
    timing: ActionTimingMeta


@dataclass(frozen=True)
class CharacterBibleSpec:
    """Master character specification covering turnaround, expressions, skins, and paperdoll."""

    id: str
    name: str
    title: str
    rarity: RarityTier
    base_element: ElementKey
    grid_px: int = 4
    body_canvas: tuple[int, int] = (64, 64)
    weapon_canvas: tuple[int, int] = (96, 96)
    body_pivot: tuple[int, int] = (32, 62)
    weapon_pivot: tuple[int, int] = (48, 88)
    foot_baseline_y: int = 88
    max_shades_per_material: int = 3
    max_palette_colors: int = 20
    outline_mode: OutlineMode = "selective"
    ai_directions: tuple[Direction8, ...] = ("S", "SE", "E", "NW", "N")
    mirrored_directions: dict[Direction8, Direction8] = field(
        default_factory=lambda: {"SW": "SE", "W": "E", "NE": "NW"}
    )
    expressions: tuple[str, ...] = (
        "neutral",
        "determined",
        "victory",
        "hurt",
        "arcane-trance",
        "command",
    )
    skins: tuple[str, ...] = ("vanguard-armor", "astral-robe", "crimson-awakened")


@dataclass(frozen=True)
class LootItemSpec:
    """Procedural / AI icon spec for weapons, shields, potions, chests, and relics."""

    id: str
    name: str
    category: Literal["sword", "staff", "shield", "potion", "chest", "relic"]
    rarity: RarityTier
    material: str
    canvas_size: int = 32


@dataclass(frozen=True)
class TilesetSpec:
    """16-tile Wang/Blob autotile and parallax stage specification."""

    id: str
    name: str
    tile_size: int = 16
    variant_count: int = 16
    biome: Literal["obsidian-sanctum", "emerald-ruins", "aether-citadel"] = "obsidian-sanctum"
    stage_width: int = 256
    stage_height: int = 144


@dataclass(frozen=True)
class VfxSequenceSpec:
    """Dual-buffer (color + emissive) VFX sequence specification."""

    id: str
    name: str
    category: Literal["summon-ritual", "elemental-slash", "chest-burst"]
    frames: int
    fps: int
    canvas_width: int
    canvas_height: int
    timing: ActionTimingMeta


@dataclass(frozen=True)
class ForgeProjectSpec:
    """Top-level specification for the Pixel Forge asset build."""

    schema_version: int
    character: CharacterBibleSpec
    layers: tuple[PaperdollLayerSpec, ...]
    elements: tuple[ElementVariantSpec, ...]
    clips: tuple[AnimationClipSpec, ...]
    loot_items: tuple[LootItemSpec, ...]
    tileset: TilesetSpec
    vfx_sequences: tuple[VfxSequenceSpec, ...]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def default_forge_project_spec() -> ForgeProjectSpec:
    """Return the canonical Astral Paladin Knight SSR character & world forge specification."""
    character = CharacterBibleSpec(
        id="hero-paladin-knight",
        name="Hiệp Sĩ Thánh Quang",
        title="Thánh Kỵ Sĩ Giáp Bạc",
        rarity="ssr",
        base_element="solar",
        foot_baseline_y=88,
    )
    # 64x64 lower layers align at (16, 26) -> y_64=62 lands exactly on ground baseline Y=88;
    # 40_hair stays 64x64 anchored at (16, 4) -> encloses plume & helm down to shoulders cleanly.
    layers = (
        PaperdollLayerSpec("00_shadow", "shadow", 0, 64, 64, 32, 62, 16, 26, False),
        PaperdollLayerSpec("10_body", "body", 10, 64, 64, 32, 62, 16, 26, True),
        PaperdollLayerSpec("20_iris", "iris", 20, 64, 64, 32, 62, 16, 26, True),
        PaperdollLayerSpec("30_outfit", "outfit", 30, 64, 64, 32, 62, 16, 26, True),
        PaperdollLayerSpec("40_hair", "hair", 40, 64, 64, 32, 38, 16, 4, True),
        PaperdollLayerSpec("50_weapon", "weapon", 50, 96, 96, 48, 88, 0, 0, False),
        PaperdollLayerSpec("60_fx", "fx", 60, 96, 96, 48, 88, 0, 0, False),
    )
    elements = (
        ElementVariantSpec(
            id="solar",
            label="Hệ Thái Dương (Solar Gold)",
            primary_ramp=((124, 77, 18), (217, 148, 41), (255, 218, 102)),
            accent_ramp=((22, 92, 132), (56, 178, 224), (168, 244, 255)),
            glow_rgb=(255, 224, 102),
        ),
        ElementVariantSpec(
            id="fire",
            label="Hệ Hỏa Viêm (Crimson Flame)",
            primary_ramp=((116, 24, 32), (214, 58, 52), (255, 146, 72)),
            accent_ramp=((132, 72, 16), (232, 152, 36), (255, 232, 120)),
            glow_rgb=(255, 112, 64),
        ),
        ElementVariantSpec(
            id="ice",
            label="Hệ Băng Tuyết (Glacial Frost)",
            primary_ramp=((20, 68, 118), (48, 148, 216), (164, 236, 255)),
            accent_ramp=((46, 56, 124), (108, 132, 232), (212, 228, 255)),
            glow_rgb=(136, 232, 255),
        ),
        ElementVariantSpec(
            id="shadow",
            label="Hệ Hư Không (Void Eclipse)",
            primary_ramp=((52, 24, 88), (118, 56, 184), (198, 136, 255)),
            accent_ramp=((92, 20, 68), (204, 48, 132), (255, 156, 216)),
            glow_rgb=(196, 116, 255),
        ),
        ElementVariantSpec(
            id="emerald",
            label="Hệ Cổ Mộc (Verdant Rune)",
            primary_ramp=((18, 84, 52), (44, 168, 96), (142, 242, 172)),
            accent_ramp=((108, 84, 24), (204, 168, 52), (255, 236, 132)),
            glow_rgb=(112, 240, 156),
        ),
    )
    clips = (
        AnimationClipSpec(
            id="idle",
            label="Đứng nghỉ (Breathing & Cape Mask)",
            frames=4,
            fps=6,
            loop=True,
            region_masked=True,
            timing=ActionTimingMeta(0, 0, 0, 0, 0),
        ),
        AnimationClipSpec(
            id="walk",
            label="Hành quân (Gait Foot-Lock)",
            frames=4,
            fps=8,
            loop=True,
            region_masked=False,
            timing=ActionTimingMeta(0, 2, 0, 0, 0),
        ),
        AnimationClipSpec(
            id="attack",
            label="Trảm Thái Dương (Oversize 96px Slash)",
            frames=4,
            fps=10,
            loop=False,
            region_masked=False,
            timing=ActionTimingMeta(1, 2, 1, 80, 4),
        ),
        AnimationClipSpec(
            id="hurt",
            label="Đỡ Khiên Chịu Đòn (Guard Recoil)",
            frames=2,
            fps=6,
            loop=False,
            region_masked=False,
            timing=ActionTimingMeta(0, 1, 1, 64, 4),
        ),
        AnimationClipSpec(
            id="victory",
            label="Chiến thắng (Skyward Banner Pose)",
            frames=4,
            fps=8,
            loop=True,
            region_masked=True,
            timing=ActionTimingMeta(1, 2, 1, 0, 0),
        ),
    )
    loot_items = (
        LootItemSpec("loot-sunblade-ur", "Thái Dương Thần Kiếm", "sword", "ur", "solar-prismatic", 32),
        LootItemSpec("loot-aether-staff-ssr", "Quyền Trượng Tinh Hà", "staff", "ssr", "arcane-gold", 32),
        LootItemSpec("loot-fortress-shield-epic", "Khiên Chữ Thập Hiệp Sĩ", "shield", "epic", "amethyst-steel", 32),
        LootItemSpec("loot-elixir-rare", "Huyết Dược Tinh Khiết", "potion", "rare", "sapphire-glass", 32),
        LootItemSpec("loot-relic-chest-ssr", "Rương Thánh Tích SSR", "chest", "ssr", "royal-gold", 32),
        LootItemSpec("loot-core-sigil-common", "Ấn Ký Hiệp Sĩ", "relic", "common", "bronze-iron", 32),
    )
    tileset = TilesetSpec(
        id="autotile-obsidian-sanctum",
        name="Thánh Điện Hắc Diện (16-Tile Wang Autotile)",
        tile_size=16,
        variant_count=16,
        biome="obsidian-sanctum",
        stage_width=256,
        stage_height=144,
    )
    vfx_sequences = (
        VfxSequenceSpec(
            id="vfx-gacha-summon-ssr",
            name="Nghi Thức Triệu Hồi SSR (Summon Ritual)",
            category="summon-ritual",
            frames=4,
            fps=8,
            canvas_width=64,
            canvas_height=64,
            timing=ActionTimingMeta(1, 2, 1, 96, 8),
        ),
        VfxSequenceSpec(
            id="vfx-solar-slash",
            name="Kiếm Khí Thái Dương (Dual-Buffer Slash)",
            category="elemental-slash",
            frames=4,
            fps=12,
            canvas_width=64,
            canvas_height=64,
            timing=ActionTimingMeta(1, 2, 1, 64, 4),
        ),
    )
    return ForgeProjectSpec(
        schema_version=2,
        character=character,
        layers=layers,
        elements=elements,
        clips=clips,
        loot_items=loot_items,
        tileset=tileset,
        vfx_sequences=vfx_sequences,
    )
