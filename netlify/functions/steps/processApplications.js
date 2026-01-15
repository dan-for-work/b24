import { bitrix } from "../services/bitrix.js";

const FAIL_STAGE = "DT1376_246:FAIL";

export async function processApplications(ctx, log) {
    log("info", "processing applications", {
        total: ctx.data.applications.length,
        selectedApplicationId: selectedId
    });
    const selectedId = ctx.execution.project.selectedApplicationId;

    for (const appl of ctx.data.applications) {
        if (String(appl.id) === String(selectedId)) {
            log("debug", "selected application detected", {
                id: appl.id,
                stageId: appl.stageId
            });
            ctx.execution.applications.selected = appl;
            continue;
        }

        if (appl.stageId === FAIL_STAGE) {
            log("debug", "application already failed", {
                id: appl.id
            });
            continue;
        }

        if (!ctx.execution.dryRun) {
            log("info", "failing application", {
                id: appl.id,
                from: appl.stageId,
                to: FAIL_STAGE
            });
            await bitrix.failApplication(appl.id);
        }

        ctx.execution.applications.failed.push({
            id: appl.id,
            from: appl.stageId,
            to: FAIL_STAGE
        });
    }

    ctx.execution.steps.applicationsUpdated =
        ctx.execution.applications.failed.length;
    log("info", "applications processed", {
        failed: ctx.execution.steps.applicationsUpdated,
        total: ctx.data.applications.length
    });

}
