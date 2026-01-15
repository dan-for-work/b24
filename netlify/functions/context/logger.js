export function createLogger(ctx) {
  return (level, msg, data = null) => {
    ctx.execution.logs.push({
      ts: new Date().toISOString(),
      level,
      msg,
      data
    });

    if (ctx.execution.debug || level === "error") {
      console.log(level, msg, data ?? "");
    }
  };
}
