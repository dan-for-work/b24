export function createExecutionContext({
  entityTypeId,
  projectId,
  debug,
  dryRun
}) {
  return {
    startedAt: Date.now(),

    execution: {
      id: `exec_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      ts: new Date().toISOString(),
      status: "running",
      durationMs: null,

      debug,
      dryRun,
      error: null,

      project: {
        entityTypeId,
        id: projectId,
        title: null,
        selectedApplicationId: null
      },

      steps: {
        applicationsFetched: 0,
        applicationsUpdated: 0
      },

      applications: {
        selected: null,
        failed: []
      },

      logs: [],
      debugSnapshot: null
    },

    data: {
      project: null,
      applications: []
    }
  };
}
