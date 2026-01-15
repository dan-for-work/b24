import { getStore } from "@netlify/blobs";

const STORE_NAME = "executions";
const STORE_KEY = "executions.json";

export async function loadStore() {
    const store = getStore(STORE_NAME);
    const raw = await store.get(STORE_KEY, { type: "json" });

    if (!raw) {
        return {
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: null,
            executions: []
        };
    }

    return raw;
}

export async function saveExecution(execution) {
    log("debug", "saving execution", {
        executionId: ctx.execution.id,
        status: ctx.execution.status
    });

    const store = getStore(STORE_NAME);
    const data = await loadStore();

    data.executions.push(execution);
    data.updatedAt = new Date().toISOString();
    data.executions = data.executions.slice(-200);

    await store.set(
        STORE_KEY,
        JSON.stringify(data, null, 2),
        { contentType: "application/json" }
    );
}
