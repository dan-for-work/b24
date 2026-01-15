import { bitrix } from "../services/bitrix.js";

const FAIL_STAGE = "DT1376_246:FAIL";

export async function processApplications(ctx, log) {
  const selectedId = ctx.execution.project.selectedApplicationId;

  for (const appl of ctx.data.applications) {
    if (String(appl.id) === String(selectedId)) {
      ctx.execution.applications.selected = appl;
      continue;
    }

    if (appl.stageId === FAIL_STAGE) continue;

    if (!ctx.execution.dryRun) {
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
}
