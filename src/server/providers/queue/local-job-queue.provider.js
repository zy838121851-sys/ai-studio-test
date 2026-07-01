export function createLocalJobQueue() {
  const activeJobs = new Set();

  return {
    scheduleUnique(key, task) {
      const cleanKey = String(key || "").trim();
      if (!cleanKey || typeof task !== "function" || activeJobs.has(cleanKey)) return false;
      activeJobs.add(cleanKey);
      void Promise.resolve()
        .then(task)
        .finally(() => {
          activeJobs.delete(cleanKey);
        });
      return true;
    },

    isActive(key) {
      return activeJobs.has(String(key || "").trim());
    }
  };
}

export const localJobQueue = createLocalJobQueue();
