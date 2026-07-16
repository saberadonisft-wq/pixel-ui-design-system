import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import type { PixelDensity, PixelTheme } from "@pixel-ui/core";
import { PixelBadge, PixelButton, PixelCard, PixelCheckbox, PixelCounter, PixelCurrency, PixelDivider, PixelIconButton, PixelInput, PixelMeter, PixelModal, PixelPanel, PixelProgress, PixelRadio, PixelSelect, PixelSlot, PixelStatus, PixelSwitch, PixelTable, PixelTextarea, PixelToast, PixelToolbar, PixelTooltip, PixelWindow } from "@pixel-ui/react";
import "@pixel-ui/core/styles.css";
import "@pixel-ui/react/styles.css";
import "@pixel-ui/themes/ornamental.css";
import "@pixel-ui/themes/sci-fi.css";
import "@pixel-ui/themes/fantasy.css";
import "@pixel-ui/themes/cyberpunk.css";
import "@pixel-ui/themes/terminal.css";
import "@pixel-ui/themes/arcade.css";
import "@pixel-ui/themes/industrial.css";
import "@pixel-ui/themes/minimal.css";
import "./styles.css";

const themes: PixelTheme[] = ["ornamental", "sci-fi", "fantasy", "cyberpunk", "terminal", "arcade", "industrial", "minimal"];
const densities: PixelDensity[] = ["low", "medium", "high"];

function CrossIcon() { return <svg viewBox="0 0 16 16" shapeRendering="crispEdges" fill="currentColor" aria-hidden="true"><path d="M1 1H7V7H1ZM9 1H15V7H9ZM1 9H7V15H1ZM9 9H15V15H9Z"/></svg>; }

function App() {
  const [theme, setTheme] = useState<PixelTheme>("sci-fi");
  const [density, setDensity] = useState<PixelDensity>("medium");
  const [modalOpen, setModalOpen] = useState(false);
  const [notifications, setNotifications] = useState(true);
  return <main className="lab px-grid-surface" data-px-theme={theme} data-px-mode="data-dashboard" data-px-grid="4" data-px-density={density}>
    <a className="skip-link" href="#lab-content">Skip to components</a>
    <header className="lab-head"><div><p>PIXEL UI / LIVE CONTRACT</p><h1>Component Lab</h1><span>Eight themes. One semantic API.</span></div><div className="lab-controls"><PixelSelect label="Theme" value={theme} onChange={(event) => setTheme(event.target.value as PixelTheme)}>{themes.map((name) => <option key={name}>{name}</option>)}</PixelSelect><PixelSelect label="Density" value={density} onChange={(event) => setDensity(event.target.value as PixelDensity)}>{densities.map((name) => <option key={name}>{name}</option>)}</PixelSelect></div></header>

    <div className="lab-grid" id="lab-content">
      <PixelWindow title="Actions and states" actions={<PixelBadge tone="accent">{theme}</PixelBadge>}>
        <PixelToolbar label="Component actions"><PixelButton tone="accent">Primary action</PixelButton><PixelButton variant="outline" selected>Selected</PixelButton><PixelButton disabled>Disabled</PixelButton><PixelButton loading>Loading</PixelButton><PixelTooltip content="Grid-aligned tool action"><PixelIconButton label="Open grid tool"><CrossIcon /></PixelIconButton></PixelTooltip></PixelToolbar>
        <div className="state-row"><PixelBadge>Neutral</PixelBadge><PixelBadge tone="success">Stable</PixelBadge><PixelBadge tone="warning">Review</PixelBadge><PixelBadge tone="danger">Blocked</PixelBadge></div>
      </PixelWindow>

      <PixelPanel title="Form controls">
        <div className="form-grid"><PixelInput label="Callsign" helper="Use 3–12 visible characters." defaultValue="Kestrel-7"/><PixelInput label="Relay key" error="The key expired. Generate a new relay key." defaultValue="AX-004"/><PixelSelect label="Operation mode" helper="Changes local display density." defaultValue="observe"><option value="observe">Observe</option><option value="command">Command</option></PixelSelect><PixelTextarea label="Operator note" helper="Stored in this local preview only." placeholder="Add context for the next shift"/></div>
        <PixelDivider />
        <div className="choice-grid"><PixelCheckbox label="Pin telemetry" defaultChecked/><PixelRadio name="channel" label="Channel alpha" defaultChecked/><PixelRadio name="channel" label="Channel beta"/><PixelSwitch label="Notifications" checked={notifications} onChange={(event) => setNotifications(event.target.checked)}/></div>
      </PixelPanel>

      <PixelCard><PixelStatus tone="success" label="All systems nominal"/><h2>Reusable content card</h2><p>Cards inherit the active frame, token, density, and state language without screen-specific CSS.</p><PixelProgress label="Token coverage" value={92}/></PixelCard>

      <PixelPanel title="Data display">
        <PixelTable caption="Primitive coverage"><thead><tr><th scope="col">Group</th><th scope="col">Count</th><th scope="col">State</th></tr></thead><tbody><tr><td>Structure</td><td>06</td><td><PixelStatus tone="success" label="Ready"/></td></tr><tr><td>Input</td><td>06</td><td><PixelStatus tone="success" label="Ready"/></td></tr><tr><td>Feedback</td><td>05</td><td><PixelStatus tone="warning" label="Review"/></td></tr></tbody></PixelTable>
      </PixelPanel>

      <PixelPanel title="Game primitives">
        <div className="game-row"><PixelSlot itemLabel="Signal crystal" quantity={4} selected><CrossIcon /></PixelSlot><PixelMeter kind="health" label="Hull" value={7} max={10}/><PixelCounter label="Keys" value={3}/><PixelCurrency label="Credits" amount={2480}/></div>
      </PixelPanel>

      <PixelPanel title="Feedback surfaces">
        <PixelToast tone="danger" action={<PixelButton size="sm" variant="outline">Retry</PixelButton>}>Relay connection failed. Check the local endpoint and retry.</PixelToast>
        <PixelButton onClick={() => setModalOpen(true)}>Open modal</PixelButton>
      </PixelPanel>
    </div>
    <PixelModal open={modalOpen} title="Confirm local action" onClose={() => setModalOpen(false)}><p>This dialog uses the native dialog element, keyboard escape, focus trapping, and a theme-driven pixel frame.</p><div className="modal-actions"><PixelButton variant="outline" onClick={() => setModalOpen(false)}>Cancel</PixelButton><PixelButton tone="accent" onClick={() => setModalOpen(false)}>Confirm</PixelButton></div></PixelModal>
    <footer className="lab-foot">COMPONENT LAB · GRID 04 · LIVE THEME CONTRACT</footer>
  </main>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
