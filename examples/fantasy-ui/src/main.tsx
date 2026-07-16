import { StrictMode, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import {
  PixelOrnateButton,
  PixelOrnateFrame,
  type PixelOrnateTone
} from "@pixel-ui/react";
import "@pixel-ui/core/styles.css";
import "@pixel-ui/react/styles.css";
import "@pixel-ui/themes/ornamental.css";
import "./styles.css";

type IconKind = "security" | "logout" | "currency" | "deposit" | "market" | "research" | "capital" | "intelligence";

function GameIcon({ kind }: { kind: IconKind }) {
  let art: ReactElement;

  if (kind === "security") {
    art = <><g fill="var(--orn-deep)"><rect x="10" y="5" width="28" height="5" /><rect x="6" y="9" width="36" height="22" /><rect x="10" y="31" width="28" height="5" /><rect x="15" y="36" width="18" height="5" /><rect x="20" y="41" width="8" height="4" /></g><g fill="var(--orn-base)"><rect x="11" y="8" width="26" height="5" /><rect x="10" y="13" width="28" height="16" /><rect x="14" y="29" width="20" height="5" /><rect x="19" y="34" width="10" height="5" /></g><g fill="var(--orn-bright)"><rect x="11" y="8" width="26" height="4" /><rect x="10" y="12" width="5" height="14" /></g><g fill="var(--orn-hi)"><rect x="18" y="22" width="5" height="5" /><rect x="22" y="26" width="5" height="5" /><rect x="26" y="18" width="5" height="9" /></g></>;
  } else if (kind === "logout") {
    art = <><g fill="var(--orn-deep)"><rect x="5" y="5" width="27" height="5" /><rect x="5" y="5" width="5" height="38" /><rect x="5" y="38" width="27" height="5" /><rect x="22" y="19" width="20" height="12" /><rect x="34" y="13" width="6" height="24" /></g><g fill="var(--orn-base)"><rect x="10" y="10" width="17" height="28" /><rect x="18" y="22" width="19" height="7" /><rect x="31" y="17" width="6" height="17" /></g><g fill="var(--orn-bright)"><rect x="10" y="10" width="17" height="5" /><rect x="10" y="10" width="5" height="28" /><rect x="16" y="20" width="18" height="6" /></g><g fill="var(--orn-hi)"><rect x="15" y="15" width="5" height="18" /><rect x="28" y="18" width="5" height="5" /></g></>;
  } else if (kind === "currency") {
    art = <><g fill="var(--orn-deep)"><rect x="5" y="8" width="24" height="5" /><rect x="2" y="13" width="30" height="22" /><rect x="6" y="35" width="24" height="5" /><rect x="20" y="16" width="24" height="5" /><rect x="17" y="21" width="29" height="18" /><rect x="21" y="39" width="21" height="5" /></g><g fill="var(--orn-shadow)"><rect x="7" y="12" width="19" height="24" /><rect x="22" y="20" width="19" height="20" /></g><g fill="var(--orn-base)"><rect x="8" y="10" width="18" height="5" /><rect x="5" y="15" width="24" height="17" /><rect x="9" y="32" width="17" height="5" /><rect x="24" y="18" width="16" height="5" /><rect x="20" y="23" width="23" height="13" /><rect x="24" y="36" width="16" height="5" /></g><g fill="var(--orn-bright)"><rect x="9" y="12" width="14" height="4" /><rect x="7" y="16" width="4" height="12" /><rect x="24" y="20" width="13" height="4" /><rect x="22" y="24" width="4" height="9" /></g><g fill="var(--orn-hi)"><rect x="14" y="18" width="6" height="12" /><rect x="29" y="26" width="6" height="8" /></g></>;
  } else if (kind === "deposit") {
    art = <><g fill="var(--orn-deep)"><rect x="17" y="3" width="16" height="42" /><rect x="3" y="17" width="42" height="16" /></g><g fill="var(--orn-shadow)"><rect x="21" y="7" width="12" height="34" /><rect x="7" y="21" width="34" height="12" /></g><g fill="var(--orn-base)"><rect x="17" y="5" width="12" height="38" /><rect x="5" y="17" width="38" height="12" /></g><g fill="var(--orn-bright)"><rect x="17" y="5" width="6" height="32" /><rect x="5" y="17" width="32" height="6" /></g><g fill="var(--orn-hi)"><rect x="19" y="7" width="4" height="12" /><rect x="7" y="19" width="12" height="4" /></g></>;
  } else if (kind === "market") {
    art = <><g fill="var(--orn-deep)"><rect x="3" y="3" width="19" height="19" /><rect x="26" y="3" width="19" height="19" /><rect x="3" y="26" width="19" height="19" /><rect x="26" y="26" width="19" height="19" /></g><g fill="var(--orn-shadow)"><rect x="8" y="8" width="14" height="14" /><rect x="31" y="8" width="14" height="14" /><rect x="8" y="31" width="14" height="14" /><rect x="31" y="31" width="14" height="14" /></g><g fill="var(--orn-base)"><rect x="5" y="5" width="14" height="14" /><rect x="28" y="5" width="14" height="14" /><rect x="5" y="28" width="14" height="14" /><rect x="28" y="28" width="14" height="14" /></g><g fill="var(--orn-bright)"><rect x="7" y="7" width="10" height="4" /><rect x="30" y="7" width="10" height="4" /><rect x="7" y="30" width="10" height="4" /><rect x="30" y="30" width="10" height="4" /></g><g fill="var(--orn-hi)"><rect x="7" y="7" width="4" height="4" /><rect x="30" y="7" width="4" height="4" /><rect x="7" y="30" width="4" height="4" /><rect x="30" y="30" width="4" height="4" /></g></>;
  } else if (kind === "research") {
    art = <><g fill="var(--orn-deep)"><rect x="2" y="22" width="10" height="8" /><rect x="10" y="13" width="8" height="17" /><rect x="16" y="4" width="9" height="36" /><rect x="23" y="18" width="8" height="12" /><rect x="29" y="25" width="17" height="8" /></g><g fill="var(--orn-shadow)"><rect x="4" y="25" width="10" height="6" /><rect x="12" y="16" width="6" height="15" /><rect x="18" y="8" width="7" height="31" /><rect x="25" y="21" width="6" height="10" /><rect x="31" y="28" width="14" height="6" /></g><g fill="var(--orn-base)"><rect x="2" y="19" width="10" height="7" /><rect x="10" y="10" width="7" height="16" /><rect x="15" y="3" width="8" height="34" /><rect x="22" y="16" width="7" height="10" /><rect x="28" y="22" width="18" height="7" /></g><g fill="var(--orn-bright)"><rect x="2" y="19" width="8" height="4" /><rect x="10" y="10" width="4" height="13" /><rect x="15" y="3" width="4" height="25" /><rect x="22" y="16" width="4" height="7" /><rect x="28" y="22" width="14" height="4" /></g><rect x="17" y="5" width="3" height="12" fill="var(--orn-hi)" /></>;
  } else if (kind === "capital") {
    art = <><g fill="var(--orn-deep)"><rect x="4" y="8" width="12" height="32" /><rect x="18" y="4" width="12" height="36" /><rect x="32" y="8" width="12" height="32" /><rect x="2" y="36" width="44" height="9" /></g><g fill="var(--orn-shadow)"><rect x="9" y="13" width="9" height="26" /><rect x="23" y="9" width="9" height="30" /><rect x="37" y="13" width="7" height="26" /><rect x="6" y="39" width="38" height="6" /></g><g fill="var(--orn-base)"><rect x="5" y="7" width="10" height="30" /><rect x="19" y="3" width="10" height="34" /><rect x="33" y="7" width="10" height="30" /><rect x="3" y="35" width="42" height="7" /></g><g fill="var(--orn-bright)"><rect x="5" y="7" width="10" height="5" /><rect x="19" y="3" width="10" height="5" /><rect x="33" y="7" width="10" height="5" /><rect x="3" y="35" width="34" height="4" /></g><g fill="var(--orn-hi)"><rect x="8" y="17" width="4" height="8" /><rect x="22" y="13" width="4" height="8" /><rect x="36" y="17" width="4" height="8" /></g><g fill="var(--orn-deep)"><rect x="19" y="25" width="10" height="15" /><rect x="22" y="22" width="4" height="5" /></g></>;
  } else {
    art = <><g fill="var(--orn-deep)"><rect x="14" y="4" width="20" height="5" /><rect x="8" y="9" width="32" height="30" /><rect x="14" y="39" width="20" height="5" /><rect x="2" y="12" width="8" height="7" /><rect x="2" y="29" width="8" height="7" /><rect x="38" y="12" width="8" height="7" /><rect x="38" y="29" width="8" height="7" /></g><g fill="var(--orn-shadow)"><rect x="13" y="12" width="27" height="27" /><rect x="18" y="8" width="16" height="5" /></g><g fill="var(--orn-base)"><rect x="15" y="6" width="18" height="5" /><rect x="10" y="11" width="28" height="26" /><rect x="15" y="37" width="18" height="5" /><rect x="3" y="13" width="9" height="4" /><rect x="3" y="30" width="9" height="4" /><rect x="36" y="13" width="9" height="4" /><rect x="36" y="30" width="9" height="4" /></g><g fill="var(--orn-bright)"><rect x="15" y="8" width="14" height="4" /><rect x="12" y="13" width="5" height="18" /><rect x="5" y="13" width="7" height="3" /><rect x="38" y="13" width="7" height="3" /></g><g fill="var(--orn-hi)"><rect x="20" y="16" width="8" height="4" /><rect x="16" y="20" width="16" height="8" /><rect x="20" y="28" width="8" height="4" /></g><rect x="22" y="21" width="4" height="6" fill="var(--orn-deep)" /></>;
  }

  return <svg viewBox="0 0 48 48" shapeRendering="crispEdges" focusable="false" aria-hidden="true">{art}</svg>;
}

function ChevronIcon() {
  return <svg viewBox="0 0 16 16" shapeRendering="crispEdges" focusable="false" aria-hidden="true"><rect x="2" y="5" width="4" height="4" fill="currentColor" /><rect x="6" y="9" width="4" height="4" fill="currentColor" /><rect x="10" y="5" width="4" height="4" fill="currentColor" /></svg>;
}

const modules: ReadonlyArray<{
  label: string;
  tone: PixelOrnateTone;
  ornament: "mechanical" | "reinforced" | "arcane" | "intelligence";
  icon: IconKind;
  description: string;
  action: string;
  capabilities: readonly string[];
}> = [
  { label: "Thị Trường", tone: "market", ornament: "mechanical", icon: "market", description: "Truy cập khu giao dịch và quản lý tài sản với một bề mặt dữ liệu rõ ràng, tách biệt khỏi khung điều hướng.", action: "Mở khu giao dịch", capabilities: ["Sổ lệnh", "Kho tài sản", "Lịch sử giao dịch"] },
  { label: "Xưởng Nghiên Cứu", tone: "research", ornament: "reinforced", icon: "research", description: "Mở các nhánh nâng cấp, theo dõi hàng đợi và chuẩn bị nguyên liệu cho công nghệ tiếp theo.", action: "Mở xưởng nghiên cứu", capabilities: ["Cây công nghệ", "Hàng đợi nâng cấp", "Kho nguyên liệu"] },
  { label: "Pháo Đài Vốn", tone: "capital", ornament: "arcane", icon: "capital", description: "Bảo vệ nguồn vốn và tổ chức các lớp phòng thủ chiến lược trong một khu vực vận hành riêng.", action: "Kiểm tra pháo đài", capabilities: ["Lớp phòng thủ", "Kho dự trữ", "Kế hoạch chiến lược"] },
  { label: "Lõi Trí Tuệ", tone: "intelligence", ornament: "intelligence", icon: "intelligence", description: "Điều phối dữ liệu, luồng suy luận và các năng lực trí tuệ bằng hệ thống hiển thị có nhịp độ bình tĩnh.", action: "Mở lõi trí tuệ", capabilities: ["Luồng dữ liệu", "Mô hình suy luận", "Kênh điều phối"] }
];

function App() {
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState("Hệ thống sẵn sàng.");
  const current = modules[active];

  return (
    <main className="ornamental-demo" data-px-theme="ornamental" data-px-mode="ornamental" data-px-grid="4" data-px-density="high">
      <h1 className="sr-only">Bảng điều khiển Saber</h1>
      <div className="ornamental-shell">
        <PixelOrnateFrame className="account-frame" tone="gold" ornament="currency" detail="hero" family="account" aria-label="Tài khoản và tiền ảo">
          <div className="account-layout">
            <section className="account-identity" aria-label="Tài khoản Saber">
              <span>Tài khoản</span>
              <strong>Saber</strong>
            </section>

            <div className="account-tools" aria-label="Tiện ích tài khoản">
              <PixelOrnateButton className="account-tool" tone="gold" detail="restrained" family="compact" icon={<GameIcon kind="security" />} onClick={() => setStatus("Đã mở lớp bảo mật tài khoản.")} aria-label="Bảo mật tài khoản">
                <span className="sr-only">Bảo mật</span>
              </PixelOrnateButton>
              <PixelOrnateButton className="account-tool" tone="gold" detail="restrained" family="compact" icon={<GameIcon kind="logout" />} onClick={() => setStatus("Đã chọn cổng đăng xuất.")} aria-label="Đăng xuất">
                <span className="sr-only">Đăng xuất</span>
              </PixelOrnateButton>
            </div>

            <output className="currency-display" aria-label="TIỀN ẢO: 600.000.000 đồng">
              <span className="currency-icon" aria-hidden="true"><GameIcon kind="currency" /></span>
              <span className="currency-copy"><small>TIỀN ẢO</small><strong>600.000.000 đ</strong></span>
            </output>

            <PixelOrnateButton className="deposit-action" tone="currency" ornament="currency" detail="standard" family="primary" icon={<GameIcon kind="deposit" />} onClick={() => setStatus("Đã mở cổng nạp tiền ảo.")}>
              Nạp
            </PixelOrnateButton>
          </div>
        </PixelOrnateFrame>

        <nav className="module-nav" aria-label="Điều hướng hệ thống">
          {modules.map((module, index) => (
            <PixelOrnateButton
              key={module.label}
              tone={module.tone}
              ornament={module.ornament}
              family="navigation"
              icon={<GameIcon kind={module.icon} />}
              marker={<ChevronIcon />}
              selected={active === index}
              onClick={() => {
                setActive(index);
                setStatus("Đã chọn " + module.label + ".");
              }}
            >
              {module.label}
            </PixelOrnateButton>
          ))}
        </nav>

        <PixelOrnateFrame className="module-readout" tone={current.tone} ornament={current.ornament} detail="standard" family="content">
          <section className="content-panel" aria-live="polite">
            <header className="content-header">
              <span className="readout-icon" aria-hidden="true"><GameIcon kind={current.icon} /></span>
              <div>
                <h2>{current.label}</h2>
                <p>{current.description}</p>
              </div>
            </header>
            <div className="content-body">
              <div className="capability-list">
                <h3>Khu vực vận hành</h3>
                <ul>{current.capabilities.map((item) => <li key={item}><i aria-hidden="true" />{item}</li>)}</ul>
              </div>
              <div className="content-workspace">
                <div className="data-bay" aria-label={"Không gian dữ liệu " + current.label}>
                  <span className="data-bay__blocks" aria-hidden="true"><i /><i /><i /><i /><i /></span>
                  <strong>Không gian dữ liệu sẵn sàng</strong>
                  <small>Nội dung chi tiết sẽ sử dụng bề mặt yên tĩnh này.</small>
                </div>
                <PixelOrnateButton className="content-action" tone={current.tone} ornament={current.ornament} detail="restrained" family="compact" onClick={() => setStatus(current.action + ".")}>
                  {current.action}
                </PixelOrnateButton>
              </div>
            </div>
            <p className="system-status" role="status">{status}</p>
          </section>
        </PixelOrnateFrame>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
