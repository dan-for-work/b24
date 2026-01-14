import { getStore } from "@netlify/blobs";

// =====================
// CONSTANTS
// =====================
const STORE_NAME = "executions";
const STORE_KEY = "executions.json";

const PROJECT_ENTITY_TYPE_ID = "1372";
const APPLICATION_ENTITY_TYPE_ID = 1376;
const FAIL_STAGE = "DT1376_246:FAIL";

// =====================
// STORE HELPERS
// =====================
async function loadStore() {
  const store = getStore(STORE_NAME);
  const raw = await store.get(STORE_KEY, { type: "json" });

  if (!raw) {
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      executions: []
    };
  }

  return raw;
}

async function saveExecution(execution) {
  const store = getStore(STORE_NAME);
  const data = await loadStore();

  data.executions.push(execution);
  data.updatedAt = new Date().toISOString();
  data.executions = data.executions.slice(-200);

  await store.set(STORE_KEY, data);
}

// =====================
// HANDLER (v2)
// =====================
export default async (request) => {
  const startedAt = Date.now();

  const bodyText = await request.text();
  const body = new URLSearchParams(bodyText);

  const entityTypeId = body.get("data[FIELDS][ENTITY_TYPE_ID]");
  const projectId = body.get("data[FIELDS][ID]");

  const execution = {
    id: `exec_${new Date().toISOString()}_${Math.random()
      .toString(16)
      .slice(2)}`,
    ts: new Date().toISOString(),
    status: "running",
    durationMs: null,

    project: {
      entityTypeId,
      id: projectId,
      title: null,
      selectedApplicationId: null
    },

    steps: {
      projectLoaded: false,
      applicationChanged: false,
      applicationsFetched: 0,
      applicationsUpdated: 0
    },

    applications: {
      selected: null,
      failed: []
    },

    logs: [],
    error: null
  };

  const log = (msg) => {
    const line = `[${new Date().toISOString()}] ${msg}`;
    execution.logs.push(line);
    console.log(line);
  };

  try {
    log("handler started");

    // --- filter entity
    if (entityTypeId !== PROJECT_ENTITY_TYPE_ID) {
      log(`skip: entityTypeId=${entityTypeId}`);
      execution.status = "skipped";
      execution.durationMs = Date.now() - startedAt;
      await saveExecution(execution);
      return ok("not a project");
    }

    // --- load project
    const projectRes = await callRest("crm.item.get", {
      entityTypeId: PROJECT_ENTITY_TYPE_ID,
      id: projectId
    });

    const project = projectRes?.result?.item;

    if (!project) {
      log(`project not found: ${projectId}`);
      execution.status = "error";
      execution.error = "project not found";
      execution.durationMs = Date.now() - startedAt;
      await saveExecution(execution);
      return ok("project not found");
    }

    execution.project.title = project.title;
    execution.project.selectedApplicationId = project.parentId1376;
    execution.steps.projectLoaded = true;

    log(`project loaded: ${projectId} (${project.title})`);

    // --- check selected application
    if (!project.parentId1376) {
      log("no selected application — nothing to do");
      execution.status = "success";
      execution.durationMs = Date.now() - startedAt;
      await saveExecution(execution);
      return ok("no application set");
    }

    execution.steps.applicationChanged = true;

    // --- load applications
    const appsRes = await callRest("crm.item.list", {
      entityTypeId: APPLICATION_ENTITY_TYPE_ID,
      filter: { parentId1372: projectId },
      select: ["id", "stageId"]
    });

    const applications = appsRes?.result?.items ?? [];
    execution.steps.applicationsFetched = applications.length;

    log(`applications found: ${applications.length}`);

    // --- process applications
    for (const appl of applications) {
      if (String(appl.id) === String(project.parentId1376)) {
        execution.applications.selected = {
          id: appl.id,
          stageId: appl.stageId
        };
        continue;
      }

      if (appl.stageId === FAIL_STAGE) continue;

      await callRest("crm.item.update", {
        entityTypeId: APPLICATION_ENTITY_TYPE_ID,
        id: appl.id,
        fields: { stageId: FAIL_STAGE }
      });

      execution.applications.failed.push({
        id: appl.id,
        from: appl.stageId,
        to: FAIL_STAGE
      });

      execution.steps.applicationsUpdated++;
      log(`application failed: ${appl.id}`);
    }

    execution.status = "success";
    execution.durationMs = Date.now() - startedAt;

    log(
      `done: failed=${execution.steps.applicationsUpdated}, total=${applications.length}`
    );

    await saveExecution(execution);
    return ok("processed");
  } catch (e) {
    log(`ERROR: ${String(e)}`);
    execution.status = "error";
    execution.error = String(e);
    execution.durationMs = Date.now() - startedAt;

    await saveExecution(execution);
    return error("error", 500);
  }
};

// =====================
// HELPERS
// =====================
async function callRest(method, data) {
  const url = `${process.env.BITRIX_WEBHOOK}${method}.json`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  return res.json();
}

function ok(message) {
  return new Response(message, { status: 200 });
}

function error(message, status = 500) {
  return new Response(message, { status });
}
