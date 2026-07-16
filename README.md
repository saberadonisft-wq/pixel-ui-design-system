# Pixel UI Design System

## Raster asset proof of concept

The `/pixel-asset-demo` example extracts real PNG artwork from a supplied asset board and composes it into responsive nine-slice frames, raster icons, semantic controls, and live Vietnamese content.

```sh
npm run assets:pixel-ui
npm run dev:asset-demo
npm run test:asset-demo
```

See [docs/pixel-asset-demo.md](docs/pixel-asset-demo.md) for crop coordinates, background removal, component APIs, render captures, and known source limitations.

Một monorepo độc lập để AI và frontend developer thiết kế, triển khai và kiểm tra giao diện pixel-art có cấu trúc. Dự án phân biệt pixel-art UI với retro-inspired UI, low-resolution game UI, fantasy RPG UI và dashboard hiện đại dùng màu retro. “Font pixel + border + glow” không đủ: primitive phải có grid contract, silhouette bậc thang, shade bands, sprite language, hard state và validation xác định.

## Cài đặt

Yêu cầu Node.js 20+ và npm 10+.

```bash
npm install
npm run dev
```

`npm run dev` mở demo Ornamental Pixel Game UI toàn chiều rộng. Chạy từng demo:

```bash
npm run dev:sci-fi
npm run dev:fantasy
npm run dev:terminal
npm run dev:lab
```

## Cấu trúc

- `skills/pixel-ui-design-system/`: custom skill, references, templates và checklist.
- `packages/core/`: canonical token, foundation CSS, pixel geometry utilities và primitive styles.
- `packages/react/`: primitive React cho frame, action, content, field, table và overlay.
- `packages/themes/`: tám preset, gồm ornamental và các preset sci-fi, fantasy, cyberpunk, terminal, arcade, industrial, minimal.
- `examples/`: ba product demo và một Component Lab dùng chung packages, gồm slot, segmented meter, counter và currency primitives.
- `docs/`: kiến trúc, component contract và quy trình review.

## Dùng skill

Đọc `skills/pixel-ui-design-system/SKILL.md` trước khi tạo UI. Chọn theo thứ tự: style family → category → render mode → grid → sprite scale → density/detail → palette/type/light → primitives. Bảy family được tách rõ; Ornamental được ưu tiên khi reference có khung trang trí lớn, cạnh sáng cứng, hardware cơ khí, nút premium và pixel type cỡ lớn. Tactical không còn là fallback mặc định.

Ví dụ prompt:

```text
Use $pixel-ui-design-system to build a responsive industrial control dashboard.
Use a 4px grid, medium density, and React primitives from @pixel-ui/react.
```

## Chọn theme

Import foundation và một theme, sau đó đặt `data-px-mode` và `data-px-theme` trên vùng giao diện:

```tsx
import "@pixel-ui/core/styles.css";
import "@pixel-ui/react/styles.css";
import "@pixel-ui/themes/ornamental.css";

export function Journey() {
  return <main data-px-mode="ornamental" data-px-theme="ornamental">...</main>;
}
```

Các theme chia sẻ cùng semantic tokens. Thay theme không yêu cầu sửa component CSS.

## Tạo component mới

1. Chọn primitive gần nhất; component lớn phải compose từ primitive.
2. Giữ geometry theo `--px-grid`; chỉ dùng `--px-half-grid` cho border/divider đã khai báo.
3. Dùng layer model theo family. Ornamental dùng silhouette → material → accent ramp → calm center và formal nine-slice cho frame phức tạp.
4. Hoàn thiện default, hover, active, focus-visible, selected, disabled và loading.
5. Render ở bốn chiều rộng mobile bắt buộc rồi chạy checklist.

Xem [component contract](docs/component-contract.md) để biết quy ước API.

## Tích hợp React

```tsx
import { PixelButton, PixelPanel } from "@pixel-ui/react";

export function Actions() {
  return (
    <PixelPanel theme="sci-fi" density="medium" tone="accent">
      <PixelButton variant="solid" tone="accent" size="md">
        Launch scan
      </PixelButton>
    </PixelPanel>
  );
}
```

## Quy tắc asset

Không crop screenshot, không dùng ảnh tham chiếu làm background, không bake text vào ảnh, không kéo giãn sprite và không dùng một ảnh lớn thay cho giao diện. Icon dùng SVG/CSS, `viewBox`, `currentColor`, đúng grid 16/24/32 và không dùng emoji.

## Kiểm tra

```bash
npm run lint
npm run type-check
npm run build
npm run validate:skill
npm run validate:pixel
npm run test:visual
```

## Ví dụ

- Sci-fi HUD: navigation tabs, wallet panel, icon action và launch action.
- Fantasy UI: full-width scenic world, 64px companion sprite, 48px keepsakes, calm content panels và discrete reactions.
- Terminal UI: terminal window, command input, status badge và log panel.
- Component Lab: chuyển trực tiếp 7 theme và 3 density để kiểm tra toàn bộ primitive, trạng thái, form, table, toast, tooltip và modal.
