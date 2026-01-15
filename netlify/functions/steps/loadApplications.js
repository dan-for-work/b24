import { bitrix } from "../services/bitrix.js";

export async function loadApplications(ctx, log) {
  const res = await bitrix.listApplications(ctx.execution.project.id);
  const apps = res?.result?.items ?? [];

  ctx.data.applications = apps;
  ctx.execution.steps.applicationsFetched = apps.length;

  log("info", "applications loaded", {
    count: apps.length
  });
}
