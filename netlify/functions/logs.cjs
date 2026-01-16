const { getStore } = require("@netlify/blobs");

module.exports = async () => {
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
