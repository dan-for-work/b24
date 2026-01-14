import { getStore } from "@netlify/blobs";

export default async (request) => {
  const store = getStore("executions");
  const data = await store.get("executions.json", { type: "json" });

  return new Response(
    JSON.stringify(data ?? { executions: [] }),
    {
      headers: { "Content-Type": "application/json" }
    }
  );
};
