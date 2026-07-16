import { StrictMode, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { PixelButton, PixelPanel } from "@pixel-ui/react";
import "@pixel-ui/core/styles.css";
import "@pixel-ui/react/styles.css";
import "@pixel-ui/themes/terminal.css";
import "./styles.css";

const seedLogs = [
  { time: "14:02:11", type: "OK", text: "relay.03 handshake complete" },
  { time: "14:02:14", type: "INFO", text: "indexing /var/telemetry/active" },
  { time: "14:02:19", type: "WARN", text: "packet drift above nominal window" },
  { time: "14:02:22", type: "OK", text: "drift correction applied" }
];

function App() {
  const [command, setCommand] = useState("status --relay 03");
  const [logs, setLogs] = useState(seedLogs);
  function run(event: FormEvent) {
    event.preventDefault();
    const clean = command.trim();
    if (!clean) return;
    setLogs((current) => [...current, { time: new Date().toLocaleTimeString("en-GB", { hour12: false }), type: "CMD", text: clean }]);
    setCommand("");
  }
  return (
    <main className="terminal px-grid-surface" data-px-theme="terminal" data-px-mode="cyber" data-px-grid="4" data-px-density="medium">
      <header className="term-nav" aria-label="Command navigation"><pre><span>&gt;</span> linewatch <a href="#console">--console</a> <a href="#logs">--logs</a> <a href="#status">--status</a><b aria-hidden="true">▮</b></pre></header>
      <section className="term-layout">
        <div className="term-main">
          <PixelPanel title="Command console" headerAction={<span className="online" id="status"><i /> ONLINE</span>}>
            <div className="console" id="console"><p>LINEWATCH NODE UTILITY 0.8.4</p><p>Type `help` to list local commands.</p><p className="result">relay.03 / latency 18ms / state nominal</p></div>
            <form className="command-form" onSubmit={run}>
              <label htmlFor="command">Command</label>
              <div className="command-row"><span aria-hidden="true">&gt;</span><input id="command" value={command} onChange={(event) => setCommand(event.target.value)} spellCheck="false" autoComplete="off" placeholder="help"/><PixelButton type="submit" tone="accent" size="sm">Run</PixelButton></div>
              <small>Local simulation only. Commands do not leave this page.</small>
            </form>
          </PixelPanel>
          <PixelPanel title="Event log" id="logs">
            <ol className="log-list" aria-live="polite">{logs.map((log, index) => <li key={`${log.time}-${index}`}><time>{log.time}</time><span data-type={log.type}>{log.type}</span><code>{log.text}</code></li>)}</ol>
          </PixelPanel>
        </div>
        <aside className="term-side">
          <PixelPanel title="Node status" density="low"><dl className="node-data"><div><dt>Address</dt><dd>relay.03</dd></div><div><dt>Latency</dt><dd>18ms</dd></div><div><dt>Queue</dt><dd>0042</dd></div><div><dt>Uptime</dt><dd>06:18:42</dd></div></dl></PixelPanel>
          <PixelPanel title="Storage"><div className="storage"><div><span>Index</span><b>72%</b></div><progress value="72" max="100">72%</progress><div><span>Buffer</span><b>31%</b></div><progress value="31" max="100">31%</progress></div></PixelPanel>
        </aside>
      </section>
      <footer className="term-foot">LINEWATCH · LOCAL NODE UTILITY · BUILD 0084 · MIT LICENSED</footer>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
