# Pixel UI Design System & AI Pixel Forge Studio

Một monorepo độc lập để AI và frontend developer thiết kế, triển khai, chế tác tài nguyên đồ họa (Sprite, Paper-Doll, Animation, Autotile, Multi-Map Atlas) và kiểm định giao diện Pixel-Art / Pixel Gacha chuyên nghiệp.

Dự án phân biệt rõ **pixel-art UI** với retro-inspired UI, low-resolution game UI, fantasy RPG UI và dashboard hiện đại dùng màu retro. “Font pixel + border + glow” không đủ: primitive phải có grid contract, silhouette bậc thang, shade bands, sprite language, hard state và validation xác định.

---

## 1. Khởi chạy nhanh (Quick Start)

Yêu cầu **Node.js 20+**, **npm 10+** và **Python 3.11+ (Pillow, NumPy)**.

```bash
npm install

# Tách asset khung UI 9-slice và biên dịch toàn bộ tài nguyên Pixel Forge
npm run assets:pixel-ui
npm run forge:build
npm run forge:batch

# Mở bàn làm việc trực quan AI Pixel Forge Studio (/pixel-asset-demo)
npm run dev
```

Xem chi tiết tại:
- [docs/pixel-forge-pipeline.md](docs/pixel-forge-pipeline.md): Kiến trúc dây chuyền sản xuất AI Frame-by-Frame, tách nền CIELAB, khóa gót chân `Y=88`, 7 lớp Paper-Doll (`64×64` + `96×96`), 5 đòn thế hoạt ảnh (*Crawl Killer*), 16-Tile Wang Autotile, 2.5D Normal/Specular/Emissive và Multi-Map Atlas (`384×384`) cho **Godot 4**, **Unity 6** & **Aseprite**.
- [docs/pixel-asset-demo.md](docs/pixel-asset-demo.md): Quy trình trích xuất PNG chín mảnh (nine-slice), kiểm định alpha nhị phân `{0, 255}` và tích hợp React.

---

## 2. Cấu trúc Monorepo

- `skills/pixel-ui-design-system/`: Skill chính cho kiến trúc giao diện Pixel UI (7 style families, hệ lưới `2/4/8px`, nine-slice, responsive & accessibility).
- `skills/pixel-asset-batch-forge/`: Skill chuyên dụng cho xưởng sản xuất hàng loạt (Batch Roster) nhiều tướng/vũ khí/bản đồ qua `forge-roster.json`.
- `skills/pixel-forge-ai-gen/` (cùng `.agents/skills/pixel-forge-ai-gen/` & `.cursor/rules/pixel-forge-ai-gen.mdc`): Skill lệnh liên IDE (**Antigravity**, **Cursor**, **Codex / Claude Code**) nhận khối lệnh `[PIXEL-FORGE-IDE-TASK]` sao chép từ giao diện Studio, tự động đăng ký tướng, sinh ảnh `#00FF00` lưu đúng `raw_ai/`, chạy `build-unit` và đẩy sự kiện HMR tức thời (`< 90ms`) qua **Vite Two-Way Bridge** (`scripts/vite-forge-bridge.mjs`).
- `packages/core/`: Canonical semantic tokens (`tokens.css`), foundation CSS, pixel geometry utilities và primitive styles.
- `packages/react/`: Bộ React primitives cho frame, nine-slice (`PixelOrnateFrame`, `PixelAssetFrame`), action, field, table, overlay, game UI (`PixelSprite`, `PixelSlot`, `PixelMeter`) và bộ công cụ Pixel Forge (`PixelPaperdoll`, `PixelSpriteAnimator`, `PixelGachaCard`, `PixelTilemapView`, `PixelLightingPreview`, `PixelAtlasInspector`, `PixelChromaLab`).
- `packages/themes/`: Tám preset (`ornamental`, `sci-fi`, `fantasy`, `cyberpunk`, `terminal`, `arcade`, `industrial`, `minimal`) cùng bộ token `pixel-assets.css`.
- `scripts/pixel_forge/`: Engine Python xử lý hậu kỳ ảnh AI (`#00FF00` CIELAB flood-fill + despill), chuẩn hóa lưới pixel, tách 7 lớp trang bị, lọc nhấp nháy *Crawl Killer*, gạch 16-Autotile theo 5 hệ nguyên tố, đóng gói Atlas + trọn bộ `forge-engine-bundle.zip` và chấm điểm Quality Gate `100/100`.
- `examples/pixel-asset-demo/`: Ứng dụng **AI Pixel Forge Studio v2.0** tích hợp sa bàn thực chiến đối kháng **1v1 PvP / Bia Tập**, kéo thả ảnh PNG `#00FF00` trực tiếp vào 10 ô Raw AI, bàn thử nghiệm tách nền `PixelChromaLab`, trình soi tọa độ `PixelAtlasInspector`, xuất JSON bản đồ Autotile và xưởng sản xuất 5/5 tướng `100% ai-native`.
- `docs/`: Tài liệu kiến trúc ([architecture.md](docs/architecture.md)), hợp đồng component ([component-contract.md](docs/component-contract.md)) và quy chuẩn chất lượng thị giác ([visual-quality.md](docs/visual-quality.md)).

---

## 3. Các lệnh CLI & NPM Scripts

| Lệnh | Mô tả |
| :--- | :--- |
| `npm run dev` / `npm run dev:asset-demo` | Khởi chạy dev server cho **AI Pixel Forge Studio** (`/pixel-asset-demo`). |
| `npm run assets:pixel-ui` | Đo đạc, cắt và tách nền bộ khung UI từ `pixel-ui-sheet.png`. |
| `npm run forge:build` | Chạy dây chuyền chế tác cho tướng mẫu (`hero-paladin-knight`) và bản đồ sân đấu. |
| `npm run forge:prompts` | Biên dịch gói câu lệnh AI chuẩn hóa ra `forge-prompts.json`. |
| `npm run forge:validate` | Kiểm định nhanh 6 cổng Quality Gate (`100/100`) trên thư mục `generated/`. |
| `npm run forge:batch-prompts` | Biên dịch ma trận 50 Prompt AI (`#00FF00` Chroma-Key) cho 5 tướng trong `forge-roster.json`. |
| `npm run forge:batch` | Sản xuất hàng loạt toàn bộ Roster trong `forge-roster.json` (220+ file xuất). |
| `npm run forge:batch-validate` | Kiểm định tự động Quality Gate `100/100` cho toàn bộ các tướng trong lô sản xuất. |
| `npm run forge:register -- --spec-file <json>` | Đăng ký hoặc cập nhật tướng mới vào `forge-roster.json` và khởi tạo thư mục `raw_ai/`. |
| `npm run forge:unit -- --unit <hero-id>` | Biên dịch siêu tốc (`< 2s`) 1 tướng từ ảnh AI `#00FF00` trong `raw_ai/`, đóng gói `.zip` và đẩy Vite HMR lên Web UI. |
| `npm run forge:delete -- --unit <hero-id> --purge-files` | Xóa tướng tùy chỉnh khỏi `forge-roster.json` (bảo vệ 5 tướng cốt lõi) và đồng bộ lại `batch-manifest.json`. |
| `npm run lint` | Kiểm tra ESLint (`--max-warnings=0`). |
| `npm run type-check` | Kiểm tra kiểu dữ liệu TypeScript (`tsc -b`). |
| `npm run build` | Build toàn bộ packages và ứng dụng demo. |
| `npm run validate:pixel` | Kiểm tra quy tắc lưới pixel, cấm icon ngoại lai và bắt buộc dùng semantic tokens. |
| `npm run test:visual` | Chạy Puppeteer kiểm tra responsive (`320`, `375`, `414`, `768`, `1440`), touch target `>= 44px` và căn chỉnh sprite nguyên. |

---

## 4. Chọn Theme & Tích hợp React

Import foundation và một theme, sau đó đặt `data-px-mode` và `data-px-theme` trên vùng giao diện:

```tsx
import "@pixel-ui/core/styles.css";
import "@pixel-ui/react/styles.css";
import "@pixel-ui/themes/ornamental.css";
import { PixelButton, PixelPanel } from "@pixel-ui/react";

export function Actions() {
  return (
    <main data-px-mode="ornamental" data-px-theme="ornamental">
      <PixelPanel theme="sci-fi" density="medium" tone="accent">
        <PixelButton variant="solid" tone="accent" size="md">
          Launch scan
        </PixelButton>
      </PixelPanel>
    </main>
  );
}
```

Các theme chia sẻ cùng semantic tokens; thay theme không yêu cầu sửa component CSS. Xem thêm [docs/component-contract.md](docs/component-contract.md).

---

## 5. Quy trình Kiểm định bắt buộc trước khi hoàn tất

```bash
npm run lint
npm run type-check
npm run build
npm run validate:pixel
npm run forge:validate
npm run forge:batch-validate
npm run test:visual
```
