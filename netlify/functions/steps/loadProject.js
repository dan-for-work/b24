import { bitrix } from "../services/bitrix.js";

export async function loadProject(ctx, log) {
  const res = await bitrix.getProject(ctx.execution.project.id);
  const project = res?.result?.item;

  if (!project) {
    throw new Error("project not found");
  }

  ctx.data.project = project;
  ctx.execution.project.title = project.title;
  ctx.execution.project.selectedApplicationId = project.parentId1376;

  log("info", "project loaded", {
    id: project.id,
    title: project.title
  });
}
