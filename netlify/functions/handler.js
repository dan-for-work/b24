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
const { getStore } = require("@netlify/blobs");

const LOG_STORE = "logs";

function createBlobLogger(executionId) {
  const store = getStore(LOG_STORE);
  const lines = [];

  function write(level, message) {
    const ts = new Date().toISOString().replace("T", " ").replace("Z", "");
    const line = `${ts} [${level}] [${executionId}] ${message}`;
    lines.push(line);
    console.log(line);
  }

  return {
    info:  (m) => write("INFO", m),
    debug: (m) => write("DEBUG", m),
    warn:  (m) => write("WARN", m),
    error: (m) => write("ERROR", m),

    async flush() {
      const key = `${executionId}.log`;
      await store.set(key, lines.join("\n"), {
        contentType: "text/plain"
      });
    }
  };
}

// =====================
// HANDLER (v3)
// =====================
export default async (request) => {
  const startedAt = Date.now();
  const executionId = `exec_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const logger = createBlobLogger(executionId);

  logger.info("Webhook handler started");

  try {
    // --- read request
    const bodyText = await request.text();
    logger.debug(`Raw request body received (${bodyText.length} chars)`);

    const body = new URLSearchParams(bodyText);

    const entityTypeId = body.get("data[FIELDS][ENTITY_TYPE_ID]");
    const projectId = body.get("data[FIELDS][ID]");

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

    const durationMs = Date.now() - startedAt;

    logger.info(
      `Processing finished successfully. Failed applications: ${failedCount}`
    );
    logger.info(`Execution time: ${durationMs} ms`);
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
