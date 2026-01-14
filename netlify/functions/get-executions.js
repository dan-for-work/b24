import { getStore } from "@netlify/blobs";

export async function handler() {
  const store = getStore("executions");
  const data = await store.get("executions.json", { type: "json" });

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data ?? { executions: [] })
  };
}
