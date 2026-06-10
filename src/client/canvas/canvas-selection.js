export function createSelectionState() {
  const selectedIds = new Set();
  return {
    select(id, additive = false) {
      if (!additive) selectedIds.clear();
      if (id) selectedIds.add(id);
      return Array.from(selectedIds);
    },
    clear() {
      selectedIds.clear();
    },
    has(id) {
      return selectedIds.has(id);
    },
    list() {
      return Array.from(selectedIds);
    }
  };
}
