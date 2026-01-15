const PROJECT_ENTITY_TYPE_ID = "1372";
const APPLICATION_ENTITY_TYPE_ID = 1376;
const FAIL_STAGE = "DT1376_246:FAIL";

async function call(method, data) {
  const url = `${process.env.BITRIX_WEBHOOK}${method}.json`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  return res.json();
}

export const bitrix = {
  getProject(id) {
    return call("crm.item.get", {
      entityTypeId: PROJECT_ENTITY_TYPE_ID,
      id
    });
  },

  listApplications(projectId) {
    return call("crm.item.list", {
      entityTypeId: APPLICATION_ENTITY_TYPE_ID,
      filter: { parentId1372: projectId },
      select: ["id", "stageId"]
    });
  },

  failApplication(id) {
    return call("crm.item.update", {
      entityTypeId: APPLICATION_ENTITY_TYPE_ID,
      id,
      fields: { stageId: FAIL_STAGE }
    });
  }
};
