export async function safeCall(step, log, fn) {
  try {
    log("debug", `step:start:${step}`);
    const res = await fn();
    log("debug", `step:ok:${step}`);
    return res;
  } catch (e) {
    log("error", `step:fail:${step}`, {
      error: String(e),
      stack: e?.stack
    });
    throw e;
  }
}
