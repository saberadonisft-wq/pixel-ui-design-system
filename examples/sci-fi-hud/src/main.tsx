import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { PixelButton, PixelIconButton, PixelPanel, PixelTab } from "@pixel-ui/react";
import "@pixel-ui/core/styles.css";
import "@pixel-ui/react/styles.css";
import "@pixel-ui/themes/sci-fi.css";
import "./styles.css";

function RadarIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12h4m8 0h4M12 4v4m0 8v4"/><rect x="8" y="8" width="8" height="8"/><path d="m12 12 5-5"/></svg>;
}

function App() {
  const [tab, setTab] = useState("Overview");
  return (
    <main className="hud px-grid-surface" data-px-theme="sci-fi" data-px-density="high">
      <header className="hud-nav">
        <div className="brand"><span className="brand-mark" aria-hidden="true" />ORBIT LEDGER</div>
        <nav className="px-tablist" role="tablist" aria-label="HUD sections">
          {["Overview", "Assets", "Routes"].map((item) => <PixelTab key={item} selected={tab === item} onClick={() => setTab(item)} controls="hud-view">{item}</PixelTab>)}
        </nav>
        <PixelIconButton label="Run radar scan" tone="accent"><RadarIcon /></PixelIconButton>
      </header>

      <section className="hud-layout" id="hud-view" role="tabpanel" aria-label={tab}>
        <div className="hud-primary">
          <div className="sector-map" aria-label="Stylized sector map">
            <div className="crosshair" aria-hidden="true"><span /></div>
            <p className="sector-id px-data">SECTOR K-12 / {tab.toUpperCase()}</p>
            <div className="telemetry"><span>VECTOR</span><strong>084.21</strong><span>DRIFT</span><strong>0.008</strong></div>
          </div>
          <PixelPanel title="Flight directive" tone="neutral" density="medium">
            <p className="directive">Align with relay K-12 and verify the encrypted cargo channel before burn.</p>
            <div className="actions"><PixelButton variant="outline">Hold vector</PixelButton><PixelButton tone="accent">Launch scan</PixelButton></div>
          </PixelPanel>
        </div>

        <aside className="hud-side">
          <PixelPanel title="Wallet" headerAction={<span className="status-chip"><i /> SYNCED</span>}>
            <div className="balance"><span>AVAILABLE CREDIT</span><strong>84,920.44</strong><small>CR / AURELIA NET</small></div>
            <dl className="ledger"><div><dt>Escrow</dt><dd>12,400.00</dd></div><div><dt>Fuel reserve</dt><dd>06,120.18</dd></div></dl>
          </PixelPanel>
          <PixelPanel title="System status" density="low">
            <ul className="systems"><li><span>Navigation</span><b data-state="good">Nominal</b></li><li><span>Thermal loop</span><b data-state="warn">Elevated</b></li><li><span>Relay cipher</span><b data-state="good">Locked</b></li></ul>
          </PixelPanel>
        </aside>
      </section>
      <footer className="hud-footer px-data">OL/HUD 0.1 · GRID 04 · LOCAL SIMULATION · NO EXTERNAL ASSETS</footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
