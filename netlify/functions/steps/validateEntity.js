import { SkipExecution } from "../utils/errors.js";

const PROJECT_ENTITY_TYPE_ID = "1372";

export async function validateEntity(ctx, log) {
  if (ctx.execution.project.entityTypeId !== PROJECT_ENTITY_TYPE_ID) {
    log("info", "skip: not a project");
    throw new SkipExecution("not a project");
  }
}
