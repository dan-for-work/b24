// =====================
// CONSTANTS
// =====================
const TEXT_LOG_STORE = "logs-text";
const JSON_LOG_STORE = "logs-json";
const JSON_LOG_KEY = "executions.json";

const PROJECT_ENTITY_TYPE_ID = "1372";
const APPLICATION_ENTITY_TYPE_ID = 1376;
const FAIL_STAGE = "DT1376_246:FAIL";

// =====================
// STORE HELPERS
// =====================
import { getStore } from "@netlify/blobs";

function createExecutionLogger({ executionId, objectId, entityTypeId }) {
  const textStore = getStore(TEXT_LOG_STORE);
  const jsonStore = getStore(JSON_LOG_STORE);

  const startedAt = new Date().toISOString();
  const textLines = [];
  const jsonLogs = [];

  function write(level, message) {
    const time = new Date().toISOString();

    // console
    console.log(`[${level.toUpperCase()}] ${message}`);

    // text log
    const textLine = `${time} [${level.toUpperCase()}] ${message}`;
    textLines.push(textLine);

    // json log
    jsonLogs.push({
      level,
      time,
      message
    });
  }

  async function flush() {
    const finishedAt = new Date().toISOString();

    // --- save text log
    await textStore.set(
      `${executionId}.log`,
      textLines.join("\n"),
      { contentType: "text/plain" }
    );

    // --- load existing json
    const existing =
      (await jsonStore.get(JSON_LOG_KEY, { type: "json" })) || {
        version: 1,
        updatedAt: null,
        records: []
      };

    // --- append record
    existing.records.push({
      id: executionId,
      objectId,
      entityTypeId,
      startedAt,
      finishedAt,
      logs: jsonLogs
    });

    // ограничение на размер (например, последние 200 запусков)
    existing.records = existing.records.slice(-200);
    existing.updatedAt = finishedAt;

    await jsonStore.set(
      JSON_LOG_KEY,
      JSON.stringify(existing, null, 2),
      { contentType: "application/json" }
    );
  }

  return {
    info:  (m) => write("info", m),
    debug: (m) => write("debug", m),
    warn:  (m) => write("warn", m),
    error: (m) => write("error", m),
    flush
  };
}

// =====================
// HANDLER (v3)
// =====================
export default async (request) => {
  const executionId = `exec_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const bodyText = await request.text();
  const body = new URLSearchParams(bodyText);

  const entityTypeId = body.get("data[FIELDS][ENTITY_TYPE_ID]");
  const projectId = body.get("data[FIELDS][ID]");
  
  const logger = createExecutionLogger({
    executionId,
    objectId: projectId,
    entityTypeId
  });
  
  
  try {
    logger.info("Webhook handler started");
    
    logger.debug(`Raw request body received (${bodyText.length} chars)`);
    logger.debug(
      `Parsed fields: ENTITY_TYPE_ID=${entityTypeId}, PROJECT_ID=${projectId}`
    );

    // --- filter entity
    if (entityTypeId !== PROJECT_ENTITY_TYPE_ID) {
      logger.info(
        `Entity type ${entityTypeId} is not a project. Processing skipped.`
      );
      return ok("not a project");
    }

    logger.info(`Processing project with ID=${projectId}`);

    // --- load project
    logger.info("Loading project from Bitrix24");

    const projectRes = await callRest("crm.item.get", {
      entityTypeId: PROJECT_ENTITY_TYPE_ID,
      id: projectId
    });

    const project = projectRes?.result?.item;

    if (!project) {
      logger.error(`Project not found in Bitrix24 (ID=${projectId})`);
      return ok("project not found");
    }

    logger.info(
      `Project loaded successfully: TITLE="${project.title}"`
    );

    const selectedApplicationId = project.parentId1376;

    if (!selectedApplicationId) {
      logger.info(
        "Project has no selected application. No further actions required."
      );
      return ok("no application set");
    }

    logger.info(
      `Selected application detected: APPLICATION_ID=${selectedApplicationId}`
    );

    // --- load applications
    logger.info("Loading all applications linked to the project");

    const appsRes = await callRest("crm.item.list", {
      entityTypeId: APPLICATION_ENTITY_TYPE_ID,
      filter: { parentId1372: projectId },
      select: ["id", "stageId"]
    });

    const applications = appsRes?.result?.items ?? [];

    logger.info(
      `Total applications found: ${applications.length}`
    );

    let failedCount = 0;

    // --- process applications
    for (const appl of applications) {
      logger.debug(
        `Processing application ID=${appl.id}, STAGE=${appl.stageId}`
      );

      if (String(appl.id) === String(selectedApplicationId)) {
        logger.debug(
          `Application ${appl.id} is selected — skipping`
        );
        continue;
      }

      if (appl.stageId === FAIL_STAGE) {
        logger.debug(
          `Application ${appl.id} already in FAIL stage — skipping`
        );
        continue;
      }

      logger.info(
        `Failing application ${appl.id}: ${appl.stageId} → ${FAIL_STAGE}`
      );

      await callRest("crm.item.update", {
        entityTypeId: APPLICATION_ENTITY_TYPE_ID,
        id: appl.id,
        fields: { stageId: FAIL_STAGE }
      });

      failedCount++;
    }

    logger.info(
      `Processing finished successfully. Failed applications: ${failedCount}`
    );
    await logger.flush();
    return ok("processed");

  } catch (e) {
    logger.error(`Unhandled exception: ${e.stack || e}`);
    await logger.flush();
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
