import { SkipExecution } from "../utils/errors.js";

const PROJECT_ENTITY_TYPE_ID = "1372";

export async function validateEntity(ctx, log) {
  log("debug", "validating entity", {
    entityTypeId: ctx.execution.project.entityTypeId
  });

  if (ctx.execution.project.entityTypeId !== PROJECT_ENTITY_TYPE_ID) {
    log("info", "execution skipped: not a project", {
      entityTypeId: ctx.execution.project.entityTypeId
    });
    throw new SkipExecution("not a project");
  }
}
