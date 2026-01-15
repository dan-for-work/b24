import { bitrix } from "../services/bitrix.js";

export async function loadApplications(ctx, log) {
    log("debug", "loading applications", {
        projectId: ctx.execution.project.id
    });
    const res = await bitrix.listApplications(ctx.execution.project.id);
    const apps = res?.result?.items ?? [];

    if (apps.length === 0) {
        log("warn", "no applications found for project", {
            projectId: ctx.execution.project.id
        });
    }

    ctx.data.applications = apps;
    ctx.execution.steps.applicationsFetched = apps.length;

    log("info", "applications loaded", {
        count: apps.length
    });
}
