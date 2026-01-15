import { bitrix } from "../services/bitrix.js";

export async function loadApplications(ctx, log) {
  const projectId = ctx.execution.project.id;

  log("debug", "loading applications", { projectId });

  const res = await bitrix.listApplications(projectId);
  const applications = res?.result?.items ?? [];

  ctx.data.applications = applications;
  ctx.execution.steps.applicationsFetched = applications.length;

  log("info", "applications loaded", {
    count: applications.length
  });

  if (applications.length === 0) {
    log("warn", "no applications found for project", { projectId });
  }
}
