export async function parseRequest(request) {
  const body = new URLSearchParams(await request.text());

  return {
    entityTypeId: body.get("data[FIELDS][ENTITY_TYPE_ID]"),
    projectId: body.get("data[FIELDS][ID]"),
    debug: body.get("debug") === "1",
    dryRun: body.get("dryRun") === "1"
  };
}
