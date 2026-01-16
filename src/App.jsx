import { useEffect, useState } from "react";
import { fetchExecutions } from "./api";

function levelColor(level) {
  switch (level) {
    case "error": return "text-red-400";
    case "warn": return "text-yellow-400";
    case "debug": return "text-blue-400";
    default: return "text-green-400";
  }
}

export default function App() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchExecutions().then(setData);
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      {/* Sidebar */}
      <aside className="w-96 border-r border-zinc-800 p-4 overflow-y-auto">
        <h1 className="text-xl font-semibold mb-4">Executions</h1>

        <ul className="space-y-2">
          {data.records.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => setSelected(r)}
                className={`w-full text-left p-3 rounded-lg border transition
                  ${
                    selected?.id === r.id
                      ? "bg-zinc-800 border-zinc-600"
                      : "bg-zinc-900 border-zinc-800 hover:border-zinc-600"
                  }`}
              >
                <div className="text-sm font-mono text-zinc-300 truncate">
                  {r.id}
                </div>

                <div className="text-xs font-mono text-zinc-300 truncate">
                  {new Date(r.startedAt).toLocaleDateString()} {new Date(r.startedAt).toLocaleTimeString()}
                </div>

                <div className="text-xs text-zinc-500">
                  Object: {r.objectId} · Entity: {r.entityTypeId}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 overflow-y-auto">
        {!selected ? (
          <div className="text-zinc-500">
            Select an execution to view details
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">
                Execution details
              </h2>

              <div className="grid grid-cols-2 gap-4 text-sm text-zinc-400">
                <div>
                  <span className="text-zinc-500">Execution ID</span><br />
                  <span className="font-mono text-zinc-200">
                    {selected.id}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-500">Object</span><br />
                  {selected.objectId}
                </div>

                <div>
                  <span className="text-zinc-500">Started</span><br />
                  {selected.startedAt}
                </div>

                <div>
                  <span className="text-zinc-500">Finished</span><br />
                  {selected.finishedAt}
                </div>
              </div>
            </div>

            {/* Logs */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Logs</h3>

              <div className="bg-black border border-zinc-800 rounded-lg overflow-hidden">
                <pre className="text-sm font-mono p-4 overflow-x-auto">
                  {selected.logs.map((l, i) => (
                    <div key={i} className="whitespace-pre-wrap">
                      <span className="text-zinc-500">
                        [{l.time}]
                      </span>{" "}
                      <span className={levelColor(l.level)}>
                        [{l.level.toUpperCase()}]
                      </span>{" "}
                      <span>{l.message}</span>
                    </div>
                  ))}
                </pre>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
