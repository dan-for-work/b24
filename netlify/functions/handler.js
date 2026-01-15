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

async function withStep(ctx, log, stepName, fn) {
  const startedAt = Date.now();
  log("debug", `step:start:${stepName}`);

  try {
    await fn();
    log("debug", `step:end:${stepName}`, {
      durationMs: Date.now() - startedAt
    });
  } catch (e) {
    log("error", `step:fail:${stepName}`, {
      error: String(e)
    });
    throw e;
  }
}

export default async (request) => {
  let ctx;

  try {
    // =====================
    // parse request
    // =====================
    const parsed = await parseRequest(request);

    ctx = createExecutionContext(parsed);
    const log = createLogger(ctx);

    log("info", "handler started", {
      projectId: ctx.execution.project.id,
      debug: ctx.execution.debug,
      dryRun: ctx.execution.dryRun
    });

    // =====================
    // validate entity
    // =====================
    await withStep(ctx, log, "validateEntity", async () => {
      await validateEntity(ctx, log);
    });

    // =====================
    // load project
    // =====================
    await withStep(ctx, log, "loadProject", async () => {
      await loadProject(ctx, log);
    });

    if (!ctx.execution.project.selectedApplicationId) {
      log("warn", "project has no selected application", {
        projectId: ctx.execution.project.id
      });

      ctx.execution.status = "success";
      log("info", "handler finished", { status: "success" });
      return ok("nothing to do");
    }

    // =====================
    // load applications
    // =====================
    await withStep(ctx, log, "loadApplications", async () => {
      await loadApplications(ctx, log);
    });

    // =====================
    // process applications
    // =====================
    await withStep(ctx, log, "processApplications", async () => {
      await processApplications(ctx, log);
    });

    ctx.execution.status = "success";

    log("info", "handler finished", {
      status: "success",
      applicationsUpdated: ctx.execution.steps.applicationsUpdated
    });

    return ok("processed");
  } catch (e) {
    if (e instanceof SkipExecution) {
      ctx.execution.status = "skipped";

      ctx.execution.logs.push({
        ts: new Date().toISOString(),
        level: "info",
        msg: "execution skipped",
        data: { reason: e.message }
      });

      return ok(e.message);
    }

    if (ctx) {
      ctx.execution.status = "error";
      ctx.execution.error = String(e);
      ctx.execution.debugSnapshot = ctx.data;
    }

    return error("error", 500);
  } finally {
    if (ctx) {
      ctx.execution.durationMs = Date.now() - ctx.startedAt;
      await saveExecution(ctx.execution);
    }
  }
};
