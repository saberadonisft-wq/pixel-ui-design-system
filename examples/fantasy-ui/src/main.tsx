import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { PixelButton, PixelIconButton, PixelPanel, PixelTab } from "@pixel-ui/react";
import "@pixel-ui/core/styles.css";
import "@pixel-ui/react/styles.css";
import "@pixel-ui/themes/fantasy.css";
import "./styles.css";

const items = [
  { name: "Sunsteel blade", kind: "WEAPON", glyph: "blade", note: "42 power" },
  { name: "Ashen ward", kind: "RELIC", glyph: "ward", note: "+18 guard" },
  { name: "Moon salt", kind: "MATERIAL", glyph: "salt", note: "x12" },
  { name: "Ember flask", kind: "ELIXIR", glyph: "flask", note: "x04" }
];

function ItemGlyph({ type }: { type: string }) {
  const paths: Record<string, string> = { blade: "M5 19 18 6l-2-2L3 17v2h2Zm9-13 3 3m-9 8 2 2", ward: "M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Zm0 4v9", salt: "M7 5h10v4l-3 3v7h-4v-7L7 9V5Z", flask: "M9 3h6m-5 0v7l-4 7c-1 2 0 4 2 4h8c2 0 3-2 2-4l-4-7V3m-5 12h8" };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><path d={paths[type]} /></svg>;
}

function App() {
  const [active, setActive] = useState(0);
  const [category, setCategory] = useState("All");
  return (
    <main className="fantasy" data-px-theme="fantasy" data-px-density="high">
      <header className="fantasy-head"><div><p className="realm">EMBERWILD / VAULT 07</p><h1>Wayfarer’s inventory</h1></div><div className="gold" aria-label="Gold balance"><span aria-hidden="true" /> <strong>2,480</strong><small>GOLD</small></div></header>
      <nav className="px-tablist category-tabs" role="tablist" aria-label="Inventory category">{["All", "Arms", "Relics"].map((name) => <PixelTab key={name} selected={category === name} onClick={() => setCategory(name)}>{name}</PixelTab>)}</nav>
      <section className="inventory-layout">
        <PixelPanel title="Satchel" headerAction={<span className="capacity px-data">18 / 24</span>}>
          <div className="item-grid" role="listbox" aria-label={`${category} inventory items`}>
            {items.map((item, index) => <PixelButton key={item.name} className="item-card" variant="outline" selected={active === index} aria-selected={active === index} role="option" onClick={() => setActive(index)}><span className="item-glyph"><ItemGlyph type={item.glyph}/></span><span className="item-copy"><small>{item.kind}</small><strong>{item.name}</strong><em>{item.note}</em></span></PixelButton>)}
          </div>
        </PixelPanel>
        <aside className="detail-stack">
          <PixelPanel title="Item record" tone="accent">
            <div className="hero-glyph"><ItemGlyph type={items[active].glyph}/></div>
            <div><p className="item-kind">{items[active].kind}</p><h2 className="item-name">{items[active].name}</h2><p className="item-lore">Forged beyond the basalt pass. Its edge remembers each oath made beside a watchfire.</p></div>
            <dl className="stats"><div><dt>Quality</dt><dd>Tempered</dd></div><div><dt>Weight</dt><dd>3.2</dd></div><div><dt>Value</dt><dd>680</dd></div></dl>
            <div className="detail-actions"><PixelIconButton label="Mark as favorite" variant="outline"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 3 3 6 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1 3-6Z"/></svg></PixelIconButton><PixelButton tone="accent">Equip item</PixelButton></div>
          </PixelPanel>
        </aside>
      </section>
      <footer className="fantasy-foot px-data">VAULT INDEX 07 · FOUR ITEMS SHOWN · KEYBOARD READY</footer>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
