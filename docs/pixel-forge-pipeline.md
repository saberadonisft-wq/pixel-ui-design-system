# Dây Chuyền Sản Xuất Pixel Asset, Sprite, Paper-Doll, Hoạt Ảnh & Bản Đồ (End-to-End Pixel Forge)

Tài liệu này mô tả kiến trúc và quy trình vận hành hệ thống **Pixel Forge** (`scripts/pixel_forge/` và `@pixel-ui/react`) theo **6 Công Đoạn Chuẩn Hóa (Canonical 6-Stage Pipeline)** để sản xuất tài nguyên đồ họa game Pixel & Gacha chuyên nghiệp: từ Raw AI Chroma-Key, Tách 7 Lớp Paper-Doll & 4 Mặt Nạ Nhuộm Màu, Hoạt Ảnh & Kỹ Xảo Dual-Buffer, Kinh Thánh Nhân Vật 23 Khung, Bản Đồ 16-Autotile / Parallax / Ánh Sáng 2.5D đến Đóng Gói Multi-Map Atlas & Xuất Engine.

## 1. Các Lệnh CLI Chính

```bash
# Chạy toàn bộ dây chuyền cho tướng chính (Hiệp Sĩ Thánh Quang)
npm run forge:build

# Sản xuất hàng loạt toàn bộ 5 tướng trong Roster (Valkyrie, Archmage, Assassin, Ranger, Paladin)
npm run forge:batch

# Biên dịch gói Prompt 6 công đoạn ra public/assets/pixel-forge/generated/forge-prompts.json
npm run forge:prompts

# Chạy kiểm định chất lượng (Quality Gate 100/100) cho tướng chính và toàn đội hình Batch
npm run forge:validate
npm run forge:batch-validate

# Đăng ký tướng mới, biên dịch nóng 1 tướng, hoặc xóa tướng thử nghiệm từ IDE Skill / Web Bridge
python scripts/pixel-forge.py register-unit --spec-file .tmp/register-unit.json
python scripts/pixel-forge.py build-unit --unit hero-thunder-shogun
python scripts/pixel-forge.py delete-unit --unit hero-thunder-shogun --purge-files

# Kiểm tra kỷ luật Pixel UI & mở bàn làm việc trực quan Pixel Forge Studio + UI Kit
npm run validate:pixel
npm run dev:asset-demo
```

## 2. Kiến Trúc 6 Công Đoạn Chuẩn Hóa (`scripts/pixel_forge/`)

1. **Stage 1 — Tách Nền CIELAB, Lượng Tử Hóa Bảng Màu Chung & Khóa Chân (`ai_frame_pipeline.py`, `grid_cleaner.py`, `prompt_compiler.py`)**:
   - Biên dịch gói câu lệnh 6 công đoạn (`stage1RawChroma` → `stage6Atlas`) và tự động phát hiện khóa môi trường (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `FAL_KEY`, `COMFYUI_URL`, `OLLAMA_HOST`, hoặc fallback thủ tục `codeart2d`).
   - Tách nền kết nối biên trong không gian màu `CIELAB` (`chroma_key_cielab_frame`) kết hợp khử lỗ thủng xanh lá nội bộ nhưng bảo toàn ánh sáng phép thuật/mắt phát quang, khóa kênh alpha nhị phân `{0, 255}`.
   - Căn chỉnh đường cơ sở bàn chân (`footBaselineY = 88`), xuất trọn bộ **10 khung Raw AI đối chiếu** (8 khung nhân vật/kit + bảng 6 vật phẩm `raw-knight-loot-sheet.png` + sân đấu `raw-knight-arena-stage.png`), các khung tay không `unarmed` và ma trận **25 tư thế vũ khí** (5 vũ khí × 5 tư thế) đã lượng tử hóa về bảng màu chung `<= 19` màu.

2. **Stage 2 — Tách 7 Lớp Paper-Doll Đồng Tâm, 5 Điểm Neo & 4 Mặt Nạ Greyscale (`paperdoll_builder.py`)**:
   - Tách 7 lớp RGBA đồng tâm: `00_shadow`, `10_body`, `20_iris`, `30_outfit`, `40_hair` trên khung `64×64` và `50_weapon`, `60_fx` trên khung mở rộng `96×96` để vũ khí cán dài không bao giờ bị cắt mũi.
   - Xuất đầy đủ **4 mặt nạ trắng xám (Greyscale Tint Masks)**: `mask-10_body_greyscale.png`, `mask-20_iris_greyscale.png`, `mask-30_outfit_greyscale.png`, `mask-40_hair_greyscale.png` phục vụ nhuộm màu tự do bằng bảng màu tùy chỉnh ở runtime.
   - Xuất biến thể chiến损 `hero-master-damaged.png` (`damagedBboxDeltaPx = 0px`) và 5 điểm neo `sockets` (`hand_r`, `hand_l`, `head`, `back`, `muzzle`).

3. **Stage 3 — Hoạt Ảnh 5 Chu Kỳ, Bộ Lọc Crawl Killer & Kỹ Xảo Dual-Buffer (`motion_engine.py`)**:
   - Sinh 5 chu kỳ hoạt ảnh (`idle`, `walk`, `attack`, `hurt`, `victory`) kèm bản `unarmedFrames`, thẻ tư thế `framePoseTags`, và thông số diễn xuất thật (`windupFrames`, `hitFrame`, `recoveryFrames`, `hitStopMs`, `screenShakePx`).
   - Áp dụng bộ lọc trễ thời gian `temporal_hysteresis_filter` + mặt nạ vùng thở `Region-Mask` để triệt tiêu hiện tượng bò viền (pixel crawl).
   - Sinh kỹ xảo 2 bộ đệm (`_color` + `_emissive`) cho `vfx-gacha-summon-ssr` và `vfx-solar-slash`, chấm điểm thực tế qua hàm `evaluate_vfx_craft_checks` (22 tiêu chí Pixel Craft).

4. **Stage 4 — Kinh Thánh Nhân Vật 23 Khung, La Bàn 8 Hướng, 5 Nguyên Tố & Gacha/Loot (`ai_frame_pipeline.py`, `paperdoll_builder.py`)**:
   - Hoàn thiện trọn bộ **23 khung Character Bible**:
     - **8 hướng xoay (`S`, `SE`, `E`, `NE`, `N`, `NW`, `W`, `SW`)**: sửa chuẩn đối xứng gương `SW = flip(SE)`, `W = flip(E)`, `NE = flip(NW)`, dựng mặt lưng `N`/`NW` trực tiếp từ silhouette thật của tướng kèm metadata nguồn gốc `directionMeta`.
     - **6 biểu cảm chân dung `48×48`** (`neutral`, `determined`, `victory`, `hurt`, `arcane-trance`, `command`).
     - **3 trang phục tiến hóa `96×96`** (`vanguard-armor`, `astral-robe`, `crimson-awakened`).
     - **5 biến thể nguyên tố** (`solar`, `fire`, `ice`, `shadow`, `emerald`) và **1 Chibi SD 2-đầu `64×64`** (`hero-chibi.png`).
   - Xuất 6 biểu tượng vật phẩm `32×32` phân biệt rõ vũ khí khởi đầu (`Đại Kiếm Thánh Quang` SSR) và thần khí rơi thưởng (`Thái Dương Thần Kiếm` UR).

5. **Stage 5 — Bản Đồ 16-Tile Wang Autotile Theo 5 Hệ Nguyên Tố, Parallax Khép Kín & Ánh Sáng Động 2.5D (`world_and_atlas.py`)**:
   - Sinh bảng 16 ô gạch bitmask 4 hướng (`autotile-16-sheet.png`) mang sắc thái đá/viền riêng theo 5 hệ nguyên tố (`solar`, `fire`, `ice`, `shadow`, `emerald`), xuất JSON ma trận bitmask trực tiếp từ `PixelTilemapView`, đồng bộ bản đồ phòng đấu `gridLayout` (`8×12`) và sân đấu Parallax 3 lớp (`256×144`).
   - Suy luận bộ 3 bản đồ ánh sáng động 2.5D (`normal`, `specular`, `emissive`) với vùng đen lì bảo vệ kim loại không tự phát sáng nhầm.

6. **Stage 6 — Đóng Gói Multi-Map Atlas Cắt Alpha, Gói Bundle `.zip`, Cầu Nối Vite 2 Chiều & Nhà Máy 5/5 Tướng AI-Native (`world_and_atlas.py`, `batch_runner.py`, `vite-forge-bridge.mjs`)**:
   - Cắt sát khung bao Alpha (`alpha-trim`), khử trùng lặp (`deduplicatedCount`) và đóng gói có đùn viền `2px` (`extrude = 2px`) toàn bộ các khung vào `forge-atlas-diffuse.png`, `forge-atlas-normal.png`, `forge-atlas-emissive.png`, hiển thị trực quan qua `<PixelAtlasInspector>` (soi tọa độ `region`, `margin`, `pivot` ở `2×`).
   - Xuất đồng bộ 4 cấu hình (`forge-manifest.json`, `forge-atlas.aseprite.json`, `forge-sprites.godot.tres`, `forge-atlas.unity.json`) cùng gói nén 1-click **`forge-engine-bundle.zip`** (kèm `README-IMPORT.txt`).
   - **Cầu nối Vite 2 Chiều (`/__pixel-forge/*`) & 5/5 Tướng `ai-native`**: Toàn bộ 5 tướng cốt lõi (`Paladin`, `Valkyrie`, `Archmage`, `Assassin`, `Ranger`) đều đạt `assetProvenance = "ai-native"` (`100/100 PASS`), hỗ trợ kéo thả PNG `#00FF00` trực tiếp lên 10 ô Stage 01, thử khử nền `PixelChromaLab`, đối kháng **1v1 Combat Sandbox** trên Sa bàn và đẩy sự kiện WebSocket HMR `pixel-forge:updated` (`< 90ms`) ngay khi IDE lưu file xong.
