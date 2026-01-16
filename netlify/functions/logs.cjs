const { getStore } = require("@netlify/blobs");

export default async () => {
  const store = getStore("logs-json");

  const data =
    (await store.get("executions.json", { type: "json" })) || {
      records: []
    };

  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json"
    }
  });
};
