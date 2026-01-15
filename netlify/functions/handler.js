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

        log("debug", "step:start:validateEntity");
        await validateEntity(ctx, log);
        log("debug", "step:end:validateEntity");
        log("debug", "step:start:loadProject");
        await loadProject(ctx, log);
        log("debug", "step:end:loadProject");

        if (!ctx.execution.project.selectedApplicationId) {
            log("info", "no selected application — nothing to do");
            ctx.execution.status = "success";
            return ok("nothing to do");
        }

        log("debug", "step:start:loadApplications");
        await loadApplications(ctx, log);
        log("debug", "step:end:loadApplications");
        log("debug", "step:start:processApplications");
        await processApplications(ctx, log);
        log("debug", "step:end:processApplications");

        ctx.execution.status = "success";

        log("info", "handler finished", {
            status: ctx.execution.status,
            applicationsUpdated: ctx.execution.steps.applicationsUpdated
        });
        return ok("processed");
    } catch (e) {
        log("error", "handler failed", {
            error: String(e),
            step: ctx.execution.steps
        });
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
            await saveExecution(ctx.execution, log);
        }
    }
};
