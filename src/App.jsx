import { useEffect, useState } from "react";
import { fetchExecutions } from "./api";

export default function App() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchExecutions().then(setData);
  }, []);

  if (!data) return <div>Loading…</div>;

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>Executions</h1>

      <ul>
        {data.records.map((r) => (
          <li key={r.id}>
            <button onClick={() => setSelected(r)}>
              {r.id} — {r.objectId}
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <>
          <h2>Execution details</h2>
          <p>
            <b>Entity:</b> {selected.entityTypeId}<br />
            <b>Object ID:</b> {selected.objectId}<br />
            <b>Started:</b> {selected.startedAt}<br />
            <b>Finished:</b> {selected.finishedAt}
          </p>

          <h3>Logs</h3>
          <pre style={{ background: "#111", color: "#0f0", padding: 10 }}>
            {selected.logs.map((l, i) =>
              `[${l.time}] [${l.level}] ${l.message}\n`
            )}
          </pre>
        </>
      )}
    </div>
  );
}
