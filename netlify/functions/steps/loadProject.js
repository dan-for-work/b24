import { bitrix } from "../services/bitrix.js";

export async function loadProject(ctx, log) {
  const projectId = ctx.execution.project.id;

  log("debug", "loading project", { projectId });

  const res = await bitrix.getProject(projectId);
  const project = res?.result?.item;

  if (!project) {
    log("error", "project not found", { projectId });
    throw new Error("project not found");
  }

  ctx.data.project = project;
  ctx.execution.project.title = project.title;
  ctx.execution.project.selectedApplicationId = project.parentId1376;

  log("info", "project loaded", {
    id: project.id,
    title: project.title,
    selectedApplicationId: project.parentId1376
  });
}
