# Pixel UI Design System

Một monorepo độc lập để AI và frontend developer thiết kế, triển khai và kiểm tra giao diện pixel-art có cấu trúc. Dự án không coi “font pixel + border + glow” là pixel UI: mọi primitive đều có silhouette, nhiều lớp frame, hard highlight/shadow, geometry theo grid và trạng thái tương tác rõ ràng.

## Cài đặt

Yêu cầu Node.js 20+ và npm 10+.

```bash
npm install
npm run dev
```

`npm run dev` mở Sci-fi HUD. Chạy từng demo:

```bash
npm run dev:sci-fi
npm run dev:fantasy
npm run dev:terminal
npm run dev:lab
```

## Cấu trúc

- `skills/pixel-ui-design-system/`: custom skill, references, templates và checklist.
- `packages/core/`: token, foundation CSS, geometry utilities và primitive styles.
- `packages/react/`: primitive React cho frame, action, content, field, table và overlay.
- `packages/themes/`: bảy preset sci-fi, fantasy, cyberpunk, terminal, arcade, industrial và minimal.
- `examples/`: ba product demo và một Component Lab dùng chung packages.
- `docs/`: kiến trúc, component contract và quy trình review.

## Dùng skill

Đọc `skills/pixel-ui-design-system/SKILL.md` trước khi tạo UI. Chọn theo thứ tự: product → preset → grid → density → tokens → primitives. Dựng và review một primitive mẫu trước khi mở rộng màn hình.

Ví dụ prompt:

```text
Use $pixel-ui-design-system to build a responsive industrial control dashboard.
Use a 4px grid, medium density, and React primitives from @pixel-ui/react.
```

## Chọn theme

Import foundation và một theme, sau đó đặt `data-px-theme` trên vùng giao diện:

```tsx
import "@pixel-ui/core/styles.css";
import "@pixel-ui/react/styles.css";
import "@pixel-ui/themes/sci-fi.css";

export function Hud() {
  return <main data-px-theme="sci-fi">...</main>;
}
```

Các theme chia sẻ cùng semantic tokens. Thay theme không yêu cầu sửa component CSS.

## Tạo component mới

1. Chọn primitive gần nhất; component lớn phải compose từ primitive.
2. Giữ kích thước theo `--px-grid`, chỉ lệch 1px khi optical alignment thật sự cần.
3. Dùng layer model trong skill; không dừng ở `background + border + text`.
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
npm run test:visual
```

## Ví dụ

- Sci-fi HUD: navigation tabs, wallet panel, icon action và launch action.
- Fantasy UI: inventory, item cards, gold counter và equip action.
- Terminal UI: terminal window, command input, status badge và log panel.
- Component Lab: chuyển trực tiếp 7 theme và 3 density để kiểm tra toàn bộ primitive, trạng thái, form, table, toast, tooltip và modal.
