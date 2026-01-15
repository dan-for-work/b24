import { bitrix } from "../services/bitrix.js";

const FAIL_STAGE = "DT1376_246:FAIL";

export async function processApplications(ctx, log) {
  const selectedId = ctx.execution.project.selectedApplicationId;
  const apps = ctx.data.applications;

  log("info", "processing applications", {
    total: apps.length,
    selectedApplicationId: selectedId,
    dryRun: ctx.execution.dryRun
  });

  for (const appl of apps) {
    if (String(appl.id) === String(selectedId)) {
      ctx.execution.applications.selected = appl;
      log("debug", "selected application detected", {
        id: appl.id,
        stageId: appl.stageId
      });
      continue;
    }

    if (appl.stageId === FAIL_STAGE) {
      log("debug", "application already failed", {
        id: appl.id
      });
      continue;
    }

    if (ctx.execution.dryRun) {
      log("info", "dry-run: application would be failed", {
        id: appl.id,
        from: appl.stageId,
        to: FAIL_STAGE
      });
    } else {
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
    total: apps.length
  });
}
