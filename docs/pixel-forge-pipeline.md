# Dây Chuyền Sản Xuất Pixel Asset, Sprite, Paper-Doll, Hoạt Ảnh & Bản Đồ (End-to-End Pixel Forge)

Tài liệu này mô tả kiến trúc và cách vận hành hệ thống **Pixel Forge** (`scripts/pixel_forge/` và `@pixel-ui/react`) để sản xuất tài nguyên đồ họa game Pixel & Gacha chuyên nghiệp từ khâu tạo Prompt, tách nền/khóa lưới, tách lớp Paper-Doll, tạo hoạt ảnh & VFX, sinh bản đồ Autotile/Parallax, tạo bản đồ ánh sáng 2.5D đến đóng gói Multi-Map Texture Atlas.

## 1. Các Lệnh CLI Chính

```bash
# Chạy toàn bộ dây chuyền: tạo Prompt, 7 lớp Paperdoll, 5 Clip hoạt ảnh, VFX, 16-Autotile, Normal Map & Atlas
npm run forge:build

# Chỉ biên dịch gói Prompt chuẩn hóa ra public/assets/pixel-forge/generated/forge-prompts.json
npm run forge:prompts

# Chạy kiểm định chất lượng (Quality Gate 100/100) và xuất Contact Sheet 2×
npm run forge:validate

# Mở bàn làm việc trực quan Pixel Forge Workbench
npm run dev:asset-demo
```

## 2. Kiến Trúc 6 Công Đoạn (`scripts/pixel_forge/`)

1. **Đặc tả & Biên dịch Prompt (`schema.py`, `prompt_compiler.py`)**:
   - Biên dịch đặc tả `ForgeProjectSpec` thành gói câu lệnh có cấu trúc (`forge-prompts.json`) cho 5 giai đoạn: *Master Still (`hibit` 8×8)*, *Character Bible 23 khung*, *Paper-Doll 7 lớp*, *Hoạt ảnh & Crawl Killer*, và *Bản đồ Wang 16-Autotile*.
   - Tự động phát hiện khóa API môi trường (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `FAL_KEY`, `COMFYUI_URL`, `OLLAMA_HOST`) và tích hợp sẵn bộ sinh thủ tục tất định `codeart2d` chạy 100% offline.
2. **Tách nền CIELAB, Chuẩn hóa lưới & Nhân bản nguyên tố (`grid_cleaner.py`)**:
   - `chroma_key_cielab`: Tách nền kết nối biên trong không gian màu cảm nhận thị giác CIELAB **trước** khi thu nhỏ hoặc lượng tử hóa màu, khóa kênh alpha nhị phân `{0, 255}`.
   - `hibit_majority_downscale`: Thu nhỏ theo thuật toán bỏ phiếu đa số 8×8 kết hợp bảo toàn điểm sáng mắt/mũi kiếm 1px (`preserve_glints`).
   - `apply_selective_outline`: Kẻ viền 1px tự động được lượng tử hóa về 3 sắc độ mực chuẩn (ấm, lạnh, tối trung tính) để giữ tổng số màu nhân vật `<= 19` màu.
   - `recolor_image_by_element`: Nhân bản tất định sang 5 hệ nguyên tố (`solar`, `fire`, `ice`, `shadow`, `emerald`).
3. **Tách 7 Lớp Paper-Doll Đồng Tâm & Điểm Neo Sockets (`paperdoll_builder.py`)**:
   - Tách riêng 7 lớp RGBA: `00_shadow`, `10_body`, `20_iris` (tròng mắt độc lập), `30_outfit`, `40_hair` trên khung `64×64` (pivot `32, 56`) và `50_weapon`, `60_fx` trên khung mở rộng `96×96` (pivot `48, 72`) để đại kiếm không bao giờ bị cắt mất mũi khi vung.
   - Xuất kèm mặt nạ trắng xám `mask-10_body_greyscale.png`, `mask-20_iris_greyscale.png`, biến thể bị thương `hero-master-damaged.png` (độ lệch khung bao `0px`), 8 hướng xoay (5 hướng gốc + 3 hướng lật đối xứng tiết kiệm 37,5% chi phí), 5 điểm neo `sockets` (`hand_r`, `hand_l`, `head`, `back`, `muzzle`) và 6 biểu tượng vật phẩm `32×32` phân theo cấp độ hiếm (`UR`, `SSR`, `EPIC`, `RARE`, `COMMON`).
4. **Hoạt Ảnh, Bộ Lọc Crawl Killer & Kỹ Xảo 2 Bộ Đệm (`motion_engine.py`)**:
   - Sinh 5 chu kỳ hoạt ảnh (`idle`, `walk`, `attack`, `hurt`, `victory`) kèm thông số diễn xuất (`windupFrames`, `hitFrame`, `recoveryFrames`, `hitStopMs`, `screenShakePx`).
   - Áp dụng bộ lọc trễ thời gian `temporal_hysteresis_filter` (`commit_frames = 2`, `max_hold = 3`) để khử hiện tượng bò viền và `lock_foot_contact_and_centroid` để khóa bàn chân tại đường cơ sở.
   - Sinh hiệu ứng 2 bộ đệm (`_color` + `_emissive`) cho `vfx-gacha-summon-ssr` và `vfx-solar-slash` tuân thủ 22 quy tắc Pixel Craft.
5. **Bản Đồ 16-Tile Wang Autotile, Parallax & Bản Đồ Ánh Sáng 2.5D (`world_and_atlas.py`)**:
   - Sinh bảng 16 ô gạch bitmask 4 hướng (`autotile-16-sheet.png` `64×64`), bản đồ phòng Thánh Điện ghép tự động (`autotile-map-preview.png` `160×96`) và sân đấu Parallax 3 lớp (`parallax-stage-composite.png` `160×96`).
   - Suy luận bộ 3 bản đồ ánh sáng động 2.5D: `hero-master-normal.png`, `hero-master-specular.png`, `hero-master-emissive.png`.
   - Đóng gói **Multi-Map Texture Atlas** (`384×384px`) đồng bộ tọa độ giữa `forge-atlas-diffuse.png`, `forge-atlas-normal.png`, `forge-atlas-emissive.png` và xuất 4 cấu hình:
     - `forge-manifest.json` (`@pixel-ui/react`)
     - `forge-atlas.aseprite.json` (Aseprite)
     - `forge-sprites.godot.tres` (Godot 4)
     - `forge-atlas.unity.json` (Unity 6 URP 2D).
6. **Kiểm Định Tự Động & Primitives React (`validate_forge.py`, `packages/react/src/PixelForge.tsx`)**:
   - Chấm điểm Quality Gate `100/100` và kết xuất bảng `contact-sheet-forge-dark.png` / `contact-sheet-forge-light.png`.
   - Cung cấp 5 component React dùng chung: `PixelPaperdoll`, `PixelSpriteAnimator`, `PixelGachaCard`, `PixelTilemapView`, `PixelLightingPreview`.
