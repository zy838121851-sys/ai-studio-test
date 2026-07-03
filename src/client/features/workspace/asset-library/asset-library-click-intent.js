export function getAssetListClickIntent({
  event,
  list
} = {}) {
  const target = event?.target;
  if (!target?.closest) return null;

  const menuAction = target.closest("[data-asset-menu-action]");
  if (menuAction) {
    const menu = menuAction.closest("[data-asset-context-menu]");
    return {
      type: "menu-action",
      menuAction,
      menu,
      assetId: menu?.dataset.assetId || "",
      action: menuAction.dataset.assetMenuAction
    };
  }

  const assetSelectModeButton = target.closest("[data-asset-select-mode]");
  if (assetSelectModeButton) return { type: "select-mode", button: assetSelectModeButton };

  const assetSelectAllButton = target.closest("[data-asset-select-all]");
  if (assetSelectAllButton) return { type: "select-all", button: assetSelectAllButton };

  const assetBulkDeleteButton = target.closest("[data-asset-bulk-delete]");
  if (assetBulkDeleteButton) return { type: "bulk-delete", button: assetBulkDeleteButton };

  const assetSelectButton = target.closest("[data-asset-select]");
  if (assetSelectButton) {
    return {
      type: "select-asset",
      button: assetSelectButton,
      assetId: assetSelectButton.dataset.assetSelect
    };
  }

  const deleteButton = target.closest("[data-delete-asset]");
  if (deleteButton) {
    return {
      type: "delete-asset",
      button: deleteButton,
      assetId: deleteButton.dataset.deleteAsset
    };
  }

  const previewButton = target.closest("[data-preview-asset]");
  if (previewButton) {
    return {
      type: "preview-asset",
      button: previewButton,
      assetId: previewButton.dataset.previewAsset
    };
  }

  const isPageList = Boolean(list?.classList?.contains("assets-page-list"));

  const uploadButton = target.closest("[data-upload-asset]");
  if (uploadButton) return { type: "upload", button: uploadButton, isPageList };

  const insertButton = target.closest("[data-insert-asset]");
  if (insertButton) {
    return {
      type: "insert-asset",
      button: insertButton,
      assetId: insertButton.dataset.insertAsset,
      isPageList
    };
  }

  const moveButton = target.closest("[data-move-asset]");
  if (moveButton) return { type: "move-asset", button: moveButton, isPageList };

  const pageAssetCard = isPageList ? target.closest(".asset-pinterest-pin.asset-item[data-id]") : null;
  if (pageAssetCard) {
    return {
      type: "page-asset-card",
      card: pageAssetCard,
      assetId: pageAssetCard.dataset.id,
      isPageList
    };
  }

  const pageModeButton = target.closest("[data-asset-page-mode]");
  if (pageModeButton) {
    return {
      type: "page-mode",
      button: pageModeButton,
      mode: pageModeButton.dataset.assetPageMode || "boards",
      isPageList
    };
  }

  const createCollectionButton = target.closest("[data-create-asset-collection]");
  if (createCollectionButton) return { type: "create-collection", button: createCollectionButton, isPageList };

  const collectionButton = target.closest("[data-select-asset-collection]");
  if (collectionButton) {
    return {
      type: "select-collection",
      button: collectionButton,
      collectionId: collectionButton.dataset.selectAssetCollection || "",
      isPageList
    };
  }

  const renameButton = target.closest("[data-rename-asset-collection]");
  if (renameButton) {
    return {
      type: "rename-collection",
      button: renameButton,
      collectionId: renameButton.dataset.renameAssetCollection,
      isPageList
    };
  }

  const deleteCollectionButton = target.closest("[data-delete-asset-collection]");
  if (deleteCollectionButton) {
    return {
      type: "delete-collection",
      button: deleteCollectionButton,
      collectionId: deleteCollectionButton.dataset.deleteAssetCollection,
      isPageList
    };
  }

  const card = target.closest(".asset-item[data-id]");
  const assetId = !isPageList ? card?.dataset.id : "";
  return assetId ? { type: "asset-card", card, assetId, isPageList } : null;
}
