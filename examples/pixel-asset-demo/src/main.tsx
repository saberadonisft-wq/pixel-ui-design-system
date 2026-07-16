import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  PixelAssetFrame,
  PixelCompactFrame,
  PixelContentPanel,
  PixelDepositButton,
  PixelIcon,
  PixelNavigationItem,
  type PixelAssetTone,
  type PixelIconAsset,
} from "@pixel-ui/react";
import "@pixel-ui/core/styles.css";
import "@pixel-ui/react/asset-styles.css";
import "@pixel-ui/themes/pixel-assets.css";
import "./styles.css";

type ModuleDefinition = {
  label: string;
  tone: Exclude<PixelAssetTone, "currency">;
  icon: PixelIconAsset;
  description: string;
  action: string;
  rows: readonly { label: string; value: string; state: string }[];
};

const modules: readonly ModuleDefinition[] = [
  {
    label: "Thị Trường",
    tone: "market",
    icon: "market-coins",
    description: "Theo dõi tài sản, lệnh đang mở và nhịp giao dịch trong một bề mặt raster co giãn.",
    action: "Mở sổ lệnh",
    rows: [
      { label: "Sổ lệnh", value: "128 lệnh", state: "ĐANG MỞ" },
      { label: "Kho tài sản", value: "42 danh mục", state: "ĐÃ ĐỒNG BỘ" },
      { label: "Thanh khoản", value: "98,4%", state: "ỔN ĐỊNH" },
    ],
  },
  {
    label: "Xưởng Nghiên Cứu",
    tone: "research",
    icon: "research-pulse",
    description: "Điều phối nhánh nâng cấp, nguyên liệu và hàng đợi công nghệ mà không raster hóa nội dung.",
    action: "Mở cây công nghệ",
    rows: [
      { label: "Cây công nghệ", value: "17 nhánh", state: "SẴN SÀNG" },
      { label: "Hàng đợi", value: "03 dự án", state: "ĐANG CHẠY" },
      { label: "Nguyên liệu", value: "84 kiện", state: "ĐỦ" },
    ],
  },
  {
    label: "Pháo Đài Vốn",
    tone: "capital",
    icon: "capital-shield",
    description: "Tổ chức nguồn vốn và lớp phòng thủ với trạng thái được biểu đạt bằng cả chữ lẫn hình dạng.",
    action: "Kiểm tra phòng thủ",
    rows: [
      { label: "Lớp phòng thủ", value: "08 lớp", state: "ĐÃ GÀI" },
      { label: "Kho dự trữ", value: "76%", state: "AN TOÀN" },
      { label: "Kế hoạch", value: "05 phương án", state: "ĐÃ DUYỆT" },
    ],
  },
  {
    label: "Lõi Trí Tuệ",
    tone: "intelligence",
    icon: "intelligence-core",
    description: "Quan sát luồng suy luận và kênh điều phối bằng các biểu tượng raster nguyên vẹn ở tỷ lệ 1×.",
    action: "Mở luồng dữ liệu",
    rows: [
      { label: "Luồng dữ liệu", value: "24 kênh", state: "TRỰC TUYẾN" },
      { label: "Mô hình", value: "06 lõi", state: "ĐỒNG BỘ" },
      { label: "Điều phối", value: "12 tác vụ", state: "ỔN ĐỊNH" },
    ],
  },
];

function App() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [message, setMessage] = useState("Hệ thống vận hành bình thường.");
  const current = modules[activeIndex];

  return (
    <main className="asset-demo" data-px-theme="ornamental" data-px-assets="pixel-ui-sheet" data-px-mode="ornamental" data-px-grid="4" data-px-density="high">
      <div className="asset-shell">
        <header>
          <p className="proof-label">ASSET-FIRST / PNG + DOM</p>
          <h1>Bảng điều khiển Saber</h1>
        </header>

        <PixelAssetFrame className="account-frame" tone="market" family="account">
          <section className="account-layout" aria-label="Tài khoản và tiền ảo">
            <div className="account-identity">
              <small>TÀI KHOẢN</small>
              <strong>Saber</strong>
            </div>

            <div className="account-tools" aria-label="Tiện ích tài khoản">
              <PixelCompactFrame
                asset="security"
                label="Bảo mật tài khoản"
                onClick={() => setMessage("Đã mở lớp bảo mật tài khoản.")}
              />
              <PixelCompactFrame
                asset="logout"
                label="Đăng xuất"
                onClick={() => setMessage("Đã chọn cổng đăng xuất.")}
              />
            </div>

            <PixelAssetFrame className="balance-frame" tone="currency" family="compact">
              <output className="balance" aria-label="TIỀN ẢO: 600.000.000 đồng">
                <PixelIcon asset="market-coins" alt="" />
                <span>
                  <small>TIỀN ẢO</small>
                  <strong>600.000.000 đ</strong>
                </span>
              </output>
            </PixelAssetFrame>

            <PixelDepositButton onClick={() => setMessage("Đã mở cổng nạp tiền ảo.")}>
              Nạp
            </PixelDepositButton>
          </section>
        </PixelAssetFrame>

        <nav className="module-nav" aria-label="Điều hướng hệ thống">
          {modules.map((module, index) => (
            <PixelNavigationItem
              key={module.label}
              tone={module.tone}
              icon={module.icon}
              selected={activeIndex === index}
              onClick={() => {
                setActiveIndex(index);
                setMessage(`Đã chọn ${module.label}.`);
              }}
            >
              {module.label}
            </PixelNavigationItem>
          ))}
        </nav>

        <PixelContentPanel className="main-panel" tone={current.tone} titleId="active-section-title">
          <div className="panel-layout">
            <header className="panel-header">
              <PixelIcon asset={current.icon} alt="" />
              <div>
                <p className="proof-label">KHUNG 9 LÁT / NỘI DUNG ĐỘNG</p>
                <h2 id="active-section-title">{current.label}</h2>
                <p>{current.description}</p>
              </div>
            </header>

            <div className="panel-grid">
              <section className="content-rows" aria-labelledby="operations-title">
                <div className="section-heading">
                  <h3 id="operations-title">Khu vực vận hành</h3>
                  <span>03 MỤC</span>
                </div>
                <ol>
                  {current.rows.map((row, index) => (
                    <li key={row.label}>
                      <span className="row-index" aria-hidden="true">0{index + 1}</span>
                      <span className="row-label">{row.label}</span>
                      <strong>{row.value}</strong>
                      <small><span aria-hidden="true">■</span> {row.state}</small>
                    </li>
                  ))}
                </ol>
                <PixelDepositButton className="section-action" onClick={() => setMessage(`${current.action}.`)}>
                  {current.action}
                </PixelDepositButton>
              </section>

              <PixelAssetFrame className="status-frame" tone="intelligence" family="compact">
                <aside className="status-card" aria-labelledby="status-title">
                  <PixelIcon asset="status-shield" alt="" />
                  <div>
                    <p className="proof-label">TRẠNG THÁI</p>
                    <h3 id="status-title">Liên kết an toàn</h3>
                    <p role="status">{message}</p>
                  </div>
                  <dl>
                    <div><dt>Alpha</dt><dd>0 / 255</dd></div>
                    <div><dt>Tỷ lệ</dt><dd>1× raster</dd></div>
                    <div><dt>Lát góc</dt><dd>16 px</dd></div>
                  </dl>
                </aside>
              </PixelAssetFrame>
            </div>
          </div>
        </PixelContentPanel>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
