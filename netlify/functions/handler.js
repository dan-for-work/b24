import { createExecutionContext } from "./context/createExecution.js";
import { createLogger } from "./context/logger.js";

import { parseRequest } from "./steps/parseRequest.js";
import { validateEntity } from "./steps/validateEntity.js";
import { loadProject } from "./steps/loadProject.js";
import { loadApplications } from "./steps/loadApplications.js";
import { processApplications } from "./steps/processApplications.js";

import { saveExecution } from "./store/executionsStore.js";
import { SkipExecution } from "./utils/errors.js";
import { ok, error } from "./utils/response.js";

export default async (request) => {
  let ctx;

  try {
    const parsed = await parseRequest(request);
    ctx = createExecutionContext(parsed);
    const log = createLogger(ctx);

    await validateEntity(ctx, log);
    await loadProject(ctx, log);

    if (!ctx.execution.project.selectedApplicationId) {
      log("info", "no selected application — nothing to do");
      ctx.execution.status = "success";
      return ok("nothing to do");
    }

    await loadApplications(ctx, log);
    await processApplications(ctx, log);

    ctx.execution.status = "success";
    return ok("processed");
  } catch (e) {
    if (e instanceof SkipExecution) {
      ctx.execution.status = "skipped";
      return ok(e.message);
    }

    ctx.execution.status = "error";
    ctx.execution.error = String(e);
    ctx.execution.debugSnapshot = ctx.data;
    return error("error", 500);
  } finally {
    if (ctx) {
      ctx.execution.durationMs = Date.now() - ctx.startedAt;
      await saveExecution(ctx.execution);
    }
  }
};
