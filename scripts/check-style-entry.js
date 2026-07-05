import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const EXPECTED_INDEX_STYLESHEET = "./styles.css";
const EXPECTED_STYLES_IMPORTS = [
  "./styles/globals.css",
  "./styles/workspace.css",
  "./styles/components.css",
  "./styles/image-compare.css",
  "./styles/task-log.css",
  "./styles/legacy-split.css"
];
const EXPECTED_WORKSPACE_IMPORTS = [
  "./workspace-layout.css",
  "./features/auth.css",
  "./features/home.css",
  "./features/project-library.css"
];
const EXPECTED_PROJECT_LIBRARY_IMPORTS = [
  "./project-library-shell.css",
  "./project-library-cards.css",
  "./project-library-page.css"
];
const EXPECTED_LEGACY_SPLIT_IMPORTS = [
  "./legacy-base.css",
  "./features/assets.css",
  "./legacy-canvas.css",
  "./legacy-canvas-visual.css",
  "./features/chat.css",
  "./legacy-chat.css",
  "./features/node.css",
  "./legacy-overrides.css",
  "./legacy-compact-controls.css",
  "./legacy-rail-polish.css",
  "./legacy-light-refinements.css",
  "./legacy-theme-ios.css",
  "./legacy-theme-sync.css",
  "./menu-select-overrides.css"
];
const EXPECTED_LEGACY_BASE_IMPORTS = [];
const EXPECTED_LEGACY_THEME_IOS_IMPORTS = [
  "./legacy-theme-ios-base.css",
  "./legacy-theme-ios-chrome.css",
  "./legacy-theme-ios-node-media.css",
  "./legacy-theme-ios-chat-composer.css"
];
const EXPECTED_LEGACY_CHAT_IMPORTS = [
  "./legacy-chat-shell.css",
  "./legacy-chat-message.css",
  "./legacy-chat-responsive.css",
  "./legacy-chat-agent.css",
  "./legacy-chat-composer.css"
];
const EXPECTED_LEGACY_COMPACT_CONTROLS_IMPORTS = [
  "./legacy-compact-project-menu.css",
  "./legacy-compact-tool-rail.css",
  "./legacy-compact-bottom-controls.css"
];
const EXPECTED_LEGACY_THEME_SYNC_IMPORTS = [
  "./legacy-theme-sync-base.css",
  "./legacy-theme-sync-surfaces.css",
  "./legacy-theme-sync-image-edit.css",
  "./legacy-theme-sync-crop-expand.css",
  "./legacy-theme-sync-media-edit.css",
  "./legacy-theme-sync-node-media.css",
  "./legacy-theme-sync-compact-select.css",
  "./legacy-theme-sync-model-preference.css",
  "./legacy-theme-sync-credit-submit.css"
];
const EXPECTED_LEGACY_THEME_SYNC_NODE_MEDIA_IMPORTS = [
  "./legacy-theme-sync-node-media-card.css",
  "./legacy-theme-sync-node-media-ai.css",
  "./legacy-theme-sync-node-media-canvas.css"
];
const EXPECTED_LEGACY_THEME_SYNC_MODEL_PREFERENCE_IMPORTS = [
  "./legacy-theme-sync-model-preference-menu.css",
  "./legacy-theme-sync-model-preference-panel.css",
  "./legacy-theme-sync-model-preference-color-fix.css"
];
const EXPECTED_LEGACY_CANVAS_IMPORTS = [
  "./legacy-canvas-shell.css",
  "./legacy-canvas-image-edit.css",
  "./legacy-canvas-add-node.css",
  "./legacy-canvas-choice-overlays.css",
  "./legacy-canvas-world.css",
  "./legacy-canvas-video-generator.css",
  "./legacy-canvas-project-header.css",
  "./legacy-canvas-library.css"
];
const EXPECTED_LEGACY_CANVAS_CHOICE_OVERLAY_IMPORTS = [
  "./legacy-canvas-choice-viewport.css",
  "./legacy-canvas-choice-upload.css",
  "./legacy-canvas-choice-generation.css",
  "./legacy-canvas-choice-floating-suggestions.css",
  "./legacy-canvas-choice-keyframes.css"
];
const EXPECTED_LEGACY_CANVAS_WORLD_IMPORTS = [
  "./legacy-canvas-world-selection.css",
  "./legacy-canvas-world-stage.css",
  "./legacy-canvas-world-empty-state.css",
  "./legacy-canvas-world-hints.css"
];
const EXPECTED_LEGACY_CANVAS_VIDEO_GENERATOR_IMPORTS = [
  "./legacy-canvas-video-generator-shell.css",
  "./legacy-canvas-video-generator-reference.css",
  "./legacy-canvas-video-generator-controls.css"
];
const EXPECTED_LEGACY_CANVAS_PROJECT_HEADER_IMPORTS = [
  "./legacy-canvas-project-header-shell.css",
  "./legacy-canvas-project-header-title.css",
  "./legacy-canvas-project-header-status.css",
  "./legacy-canvas-project-header-return.css"
];
const EXPECTED_LEGACY_CANVAS_SHELL_IMPORTS = [
  "./legacy-canvas-shell-brand.css",
  "./legacy-canvas-shell-actions.css",
  "./legacy-canvas-shell-tool-rail.css",
  "./legacy-canvas-shell-menus.css",
  "./legacy-canvas-shell-selection.css"
];
const EXPECTED_LEGACY_CANVAS_IMAGE_EDIT_IMPORTS = [
  "./legacy-canvas-image-edit-popover.css",
  "./legacy-canvas-image-edit-generator-select.css",
  "./legacy-canvas-image-edit-compact-select.css",
  "./legacy-canvas-image-edit-footer.css"
];
const EXPECTED_LEGACY_CANVAS_VISUAL_IMPORTS = [
  "./legacy-canvas-visual-shape-tools.css",
  "./legacy-canvas-visual-media.css",
  "./legacy-canvas-visual-shell.css"
];
const EXPECTED_LEGACY_CANVAS_VISUAL_SHAPE_TOOLS_IMPORTS = [
  "./legacy-canvas-visual-selection-draw.css",
  "./legacy-canvas-visual-text-editor.css",
  "./legacy-canvas-visual-shape-toolbar.css",
  "./legacy-canvas-visual-text-toolbar.css"
];
const EXPECTED_NODE_IMPORTS = [
  "./node-base.css",
  "./node-image-edit.css",
  "./node-state.css",
  "./node-image-toolbar.css",
  "./node-image-toolbar-savebar.css",
  "./node-image-panels.css",
  "./node-stack.css",
  "./node-director.css",
  "./node-media.css",
  "./node-generation.css",
  "./node-image-generator.css",
  "./node-preview.css"
];
const EXPECTED_NODE_IMAGE_GENERATOR_IMPORTS = [
  "./node-image-generator-base.css",
  "./node-image-generator-inline-edit.css"
];
const EXPECTED_NODE_IMAGE_GENERATOR_BASE_IMPORTS = [
  "./node-image-generator-shell.css",
  "./node-image-generator-panel.css",
  "./node-image-generator-glass.css"
];
const EXPECTED_NODE_IMAGE_EDIT_IMPORTS = [
  "./node-image-edit-state.css",
  "./node-image-crop.css",
  "./node-image-expand.css"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_IMPORTS = [
  "./node-image-toolbar-base.css",
  "./node-image-toolbar-upscale.css",
  "./node-image-toolbar-menu.css"
];
const EXPECTED_NODE_IMAGE_PANELS_IMPORTS = [
  "./node-image-text-panel.css",
  "./node-image-lightbox.css"
];
const EXPECTED_NODE_STACK_IMPORTS = [
  "./node-stack-base.css",
  "./node-stack-tray.css"
];
const EXPECTED_NODE_MEDIA_IMPORTS = [
  "./node-media-shell.css",
  "./node-media-video.css",
  "./node-media-frame.css"
];
const EXPECTED_ASSET_IMPORTS = [
  "./assets-page.css",
  "./assets-board.css",
  "./assets-save.css",
  "./assets-picker.css",
  "./assets-canvas-picker.css",
  "./assets-context-menu.css",
  "./assets-pinterest.css"
];
const EXPECTED_ASSET_SAVE_IMPORTS = [
  "./assets-save-popover.css",
  "./assets-save-board-popover.css"
];
const EXPECTED_ASSET_SAVE_POPOVER_IMPORTS = [
  "./assets-save-popover-shell.css",
  "./assets-save-popover-list.css"
];
const EXPECTED_ASSET_SAVE_BOARD_POPOVER_IMPORTS = [
  "./assets-save-board-popover-shell.css",
  "./assets-save-board-popover-list.css",
  "./assets-save-board-popover-new.css"
];
const EXPECTED_ASSET_CANVAS_PICKER_IMPORTS = [
  "./assets-canvas-picker-shell.css",
  "./assets-canvas-picker-projects.css"
];
const EXPECTED_ASSET_PAGE_IMPORTS = [
  "./assets-floating-library.css",
  "./assets-page-view.css",
  "./assets-page-pinterest-legacy.css"
];
const EXPECTED_ASSET_PAGE_PINTEREST_LEGACY_IMPORTS = [
  "./assets-page-pinterest-shell-legacy.css",
  "./assets-page-pinterest-board-legacy.css",
  "./assets-page-pinterest-pin-legacy.css",
  "./assets-page-pinterest-responsive-legacy.css"
];
const EXPECTED_ASSET_PINTEREST_IMPORTS = [
  "./assets-pinterest-board.css",
  "./assets-pinterest-shell.css",
  "./assets-pinterest-board-refresh.css",
  "./assets-pinterest-pin.css",
  "./assets-pinterest-layout.css",
  "./assets-pinterest-responsive.css"
];
const EXPECTED_ASSET_PINTEREST_BOARD_IMPORTS = [
  "./assets-pinterest-board-shell-legacy.css",
  "./assets-pinterest-board-tiles-legacy.css",
  "./assets-pinterest-board-masonry-legacy.css",
  "./assets-pinterest-board-responsive-legacy.css"
];
const EXPECTED_ASSET_PINTEREST_SHELL_IMPORTS = [
  "./assets-pinterest-shell-header.css",
  "./assets-pinterest-shell-stats.css",
  "./assets-pinterest-shell-nav.css"
];
const EXPECTED_ASSET_PINTEREST_BOARD_REFRESH_IMPORTS = [
  "./assets-pinterest-board-refresh-grid.css",
  "./assets-pinterest-board-refresh-create.css",
  "./assets-pinterest-board-refresh-meta.css"
];
const EXPECTED_ASSET_PINTEREST_PIN_IMPORTS = [
  "./assets-pinterest-pin-card.css",
  "./assets-pinterest-pin-actions.css",
  "./assets-pinterest-pin-empty.css"
];
const EXPECTED_ASSET_PINTEREST_RESPONSIVE_IMPORTS = [
  "./assets-pinterest-responsive-breakpoints.css",
  "./assets-pinterest-responsive-interactions.css"
];
const EXPECTED_HOME_IMPORTS = [
  "./home-history.css",
  "./home-community.css",
  "./home-shell.css"
];
const EXPECTED_HOME_HISTORY_IMPORTS = [
  "./home-history-stack.css",
  "./home-history-section.css",
  "./home-history-cards.css"
];
const EXPECTED_HOME_COMMUNITY_IMPORTS = [
  "./home-community-channels.css",
  "./home-community-feed.css",
  "./home-community-inspiration.css"
];
const EXPECTED_HOME_SHELL_IMPORTS = [
  "./home-shell-boot.css",
  "./home-shell-prompt.css",
  "./home-shell-model.css",
  "./home-shell-transition.css"
];
const ALLOWED_UNREACHABLE_CSS = [
  "styles/legacy-node.css"
];
const EXPECTED_PROJECT_LIBRARY_SELECTORS = [
];
const EXPECTED_PROJECT_LIBRARY_SHELL_SELECTORS = [
  ".library-shell",
  ".library-title",
  ".project-grid",
  ".library-page-header",
  ".library-selection-bar",
  ".project-empty"
];
const EXPECTED_PROJECT_LIBRARY_CARDS_SELECTORS = [
  ".project-card-board",
  ".library-small-card",
  ".library-card-check",
  ".library-small-card.selected",
  ".library-new-card",
  "@media (max-width: 1200px)"
];
const EXPECTED_PROJECT_LIBRARY_PAGE_SELECTORS = [
  "body[data-view=\"library\"] .project-card-board"
];
const EXPECTED_HOME_SELECTORS = [
  "@media (max-width: 1100px)",
  "@media (max-width: 760px)",
  ".home-prompt",
  ".home-model-picker"
];
const EXPECTED_HOME_SHELL_SELECTORS = [
];
const EXPECTED_HOME_SHELL_BOOT_SELECTORS = [
  "body.app-booting",
  "@keyframes homeBootSkeleton"
];
const EXPECTED_HOME_SHELL_PROMPT_SELECTORS = [
  ".home-stage",
  ".home-prompt",
  ".home-file-preview",
  ".home-plus"
];
const EXPECTED_HOME_SHELL_MODEL_SELECTORS = [
  ".home-model-picker",
  ".home-model-menu",
  ".home-model"
];
const EXPECTED_HOME_SHELL_TRANSITION_SELECTORS = [
  ".home-send",
  "@keyframes homeSendOut",
  "@keyframes canvasEnterSoft",
  "@keyframes chatEnterSoft"
];
const EXPECTED_HOME_HISTORY_SELECTORS = [
  ".home-history",
  ".home-history-trigger",
  ".home-history-stack",
  ".home-history-open"
];
const EXPECTED_HOME_HISTORY_SECTION_SELECTORS = [
  ".home-section-head",
  ".home-section-head.compact",
  ".home-history .home-section-head strong"
];
const EXPECTED_HOME_HISTORY_CARD_SELECTORS = [
  ".home-history-grid",
  ".home-history-card",
  ".home-history-delete",
  ".project-preview-fallback"
];
const EXPECTED_HOME_COMMUNITY_SELECTORS = [
];
const EXPECTED_HOME_COMMUNITY_CHANNEL_SELECTORS = [
  ".home-community-section",
  ".home-channel-shell",
  ".home-channel-strip",
  ".home-channel-scroll"
];
const EXPECTED_HOME_COMMUNITY_FEED_SELECTORS = [
  ".home-masonry-feed",
  ".home-masonry-card",
  "@keyframes masonryPlaceholderSweep",
  ".home-back-top"
];
const EXPECTED_HOME_COMMUNITY_INSPIRATION_SELECTORS = [
  ".home-inspiration-grid",
  ".inspiration-card"
];
const EXPECTED_AUTH_IMPORTS = [
  "./auth-account.css",
  "./auth-credit-detail.css",
  "./auth-dialog.css"
];
const EXPECTED_AUTH_DIALOG_SELECTORS = [
  ".auth-dialog",
  ".auth-wechat-panel",
  ".auth-icon-methods",
  ".auth-form",
  ".auth-submit"
];
const EXPECTED_AUTH_CREDIT_DETAIL_SELECTORS = [
  ".credit-detail-dialog",
  ".credit-detail-panel",
  ".credit-profile-card",
  ".credit-transaction-item",
  "@media (max-width: 760px)"
];
const EXPECTED_AUTH_ACCOUNT_SELECTORS = [
  ".auth-entry",
  ".auth-entry-button",
  ".auth-entry.is-authenticated .auth-entry-button",
  ".auth-account-popover",
  ".auth-account-card",
  ".auth-points-row",
  ".auth-menu-list"
];
const EXPECTED_ASSET_PAGE_SELECTORS = [
  ".floating-library",
  ".upload-asset",
  ".asset-list"
];
const EXPECTED_ASSET_PAGE_VIEW_SELECTORS = [
  ".assets-page-toolbar",
  ".assets-page-list",
  "body[data-view=\"assetsPage\"] .assets-page-view",
  "body[data-view=\"assetsPage\"] .simple-page-shell"
];
const EXPECTED_ASSET_PAGE_PINTEREST_LEGACY_SELECTORS = [
  "@import url(\"./assets-page-pinterest-shell-legacy.css\")",
  "@import url(\"./assets-page-pinterest-board-legacy.css\")",
  "@import url(\"./assets-page-pinterest-pin-legacy.css\")",
  "@import url(\"./assets-page-pinterest-responsive-legacy.css\")"
];
const EXPECTED_ASSET_PAGE_PINTEREST_SHELL_LEGACY_SELECTORS = [
  ".asset-pinterest-shell",
  ".asset-pinterest-profile",
  ".asset-pinterest-profile nav button.active::after"
];
const EXPECTED_ASSET_PAGE_PINTEREST_BOARD_LEGACY_SELECTORS = [
  ".asset-pinterest-board",
  ".asset-pinterest-board-cover",
  ".asset-pinterest-section-title"
];
const EXPECTED_ASSET_PAGE_PINTEREST_PIN_LEGACY_SELECTORS = [
  ".asset-pinterest-pin.asset-item",
  ".asset-pinterest-pin-actions",
  ".asset-pinterest-empty"
];
const EXPECTED_ASSET_PAGE_PINTEREST_RESPONSIVE_LEGACY_SELECTORS = [
  "@media (max-width: 900px)",
  ".asset-pinterest-profile"
];
const EXPECTED_ASSET_BOARD_SELECTORS = [
  "@import url(\"./assets-board-shell.css\")",
  "@import url(\"./assets-board-card.css\")",
  "@import url(\"./assets-board-item.css\")"
];
const EXPECTED_ASSET_BOARD_IMPORTS = [
  "./assets-board-shell.css",
  "./assets-board-card.css",
  "./assets-board-item.css"
];
const EXPECTED_ASSET_BOARD_SHELL_SELECTORS = [
  ".asset-board-bar",
  ".asset-board-chip",
  ".asset-board-list"
];
const EXPECTED_ASSET_BOARD_CARD_SELECTORS = [
  ".asset-board-card",
  ".asset-board-cover",
  ".asset-board-main",
  ".asset-board-action"
];
const EXPECTED_ASSET_BOARD_ITEM_SELECTORS = [
  ".asset-item",
  ".asset-thumb",
  ".asset-delete",
  ".asset-empty"
];
const EXPECTED_ASSET_SAVE_SELECTORS = [
  "@import url(\"./assets-save-popover.css\")",
  "@import url(\"./assets-save-board-popover.css\")"
];
const EXPECTED_ASSET_SAVE_POPOVER_SELECTORS = [
  "@import url(\"./assets-save-popover-shell.css\")",
  "@import url(\"./assets-save-popover-list.css\")"
];
const EXPECTED_ASSET_SAVE_POPOVER_SHELL_SELECTORS = [
  ".asset-save-popover",
  ".asset-save-tabs",
  ".asset-save-new"
];
const EXPECTED_ASSET_SAVE_POPOVER_LIST_SELECTORS = [
  ".asset-save-folders",
  ".asset-save-folder",
  ".asset-save-actions"
];
const EXPECTED_ASSET_SAVE_BOARD_POPOVER_SELECTORS = [
  "@import url(\"./assets-save-board-popover-shell.css\")",
  "@import url(\"./assets-save-board-popover-list.css\")",
  "@import url(\"./assets-save-board-popover-new.css\")"
];
const EXPECTED_ASSET_SAVE_BOARD_POPOVER_SHELL_SELECTORS = [
  ".canvas-asset-board-popover",
  ".asset-save-search"
];
const EXPECTED_ASSET_SAVE_BOARD_POPOVER_LIST_SELECTORS = [
  ".asset-save-section",
  ".asset-save-board-thumb"
];
const EXPECTED_ASSET_SAVE_BOARD_POPOVER_NEW_SELECTORS = [
  ".asset-save-new-board"
];
const EXPECTED_ASSET_PICKER_SELECTORS = [
  "@import url(\"./assets-picker-popover.css\")",
  "@import url(\"./assets-picker-list.css\")",
  "@import url(\"./assets-picker-preview.css\")"
];
const EXPECTED_ASSET_PICKER_IMPORTS = [
  "./assets-picker-popover.css",
  "./assets-picker-list.css",
  "./assets-picker-preview.css"
];
const EXPECTED_ASSET_PICKER_POPOVER_IMPORTS = [
  "./assets-picker-popover-shell.css",
  "./assets-picker-popover-head.css"
];
const EXPECTED_ASSET_PICKER_LIST_IMPORTS = [
  "./assets-picker-list-item.css",
  "./assets-picker-list-empty.css"
];
const EXPECTED_ASSET_PICKER_POPOVER_SELECTORS = [
  "@import url(\"./assets-picker-popover-shell.css\")",
  "@import url(\"./assets-picker-popover-head.css\")"
];
const EXPECTED_ASSET_PICKER_POPOVER_SHELL_SELECTORS = [
  ".asset-picker-popover",
  ".asset-picker-backdrop",
  ".asset-picker-card"
];
const EXPECTED_ASSET_PICKER_POPOVER_HEAD_SELECTORS = [
  ".asset-picker-head",
  ".asset-picker-list"
];
const EXPECTED_ASSET_PICKER_LIST_SELECTORS = [
  "@import url(\"./assets-picker-list-item.css\")",
  "@import url(\"./assets-picker-list-empty.css\")"
];
const EXPECTED_ASSET_PICKER_LIST_ITEM_SELECTORS = [
  ".asset-picker-item",
  ".asset-picker-thumb",
  ".asset-picker-meta"
];
const EXPECTED_ASSET_PICKER_LIST_EMPTY_SELECTORS = [
  ".asset-picker-empty"
];
const EXPECTED_ASSET_PICKER_PREVIEW_SELECTORS = [
  ".asset-preview-overlay",
  ".asset-preview-dialog"
];
const EXPECTED_ASSET_CANVAS_PICKER_SELECTORS = [
  "@import url(\"./assets-canvas-picker-shell.css\")",
  "@import url(\"./assets-canvas-picker-projects.css\")"
];
const EXPECTED_ASSET_CANVAS_PICKER_SHELL_SELECTORS = [
  ".asset-canvas-picker",
  ".asset-canvas-picker-card",
  ".asset-canvas-picker-head",
  ".asset-canvas-picker-list"
];
const EXPECTED_ASSET_CANVAS_PICKER_PROJECTS_SELECTORS = [
  ".asset-canvas-picker-project",
  ".asset-canvas-picker-thumb",
  ".asset-canvas-picker-meta"
];
const EXPECTED_ASSET_CONTEXT_MENU_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-card-context-menu",
  "body[data-view=\"assetsPage\"] .asset-card-context-menu[hidden]",
  "body[data-view=\"assetsPage\"] .asset-card-context-icon",
  "body[data-view=\"assetsPage\"] .asset-card-context-submenu",
  "body[data-view=\"assetsPage\"] .asset-card-context-submenu-panel"
];
const EXPECTED_ASSET_PINTEREST_SELECTORS = [];
const EXPECTED_ASSET_PINTEREST_LAYOUT_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-pinterest-masonry",
  ".asset-selection-bar",
  ".asset-select-toggle"
];
const EXPECTED_ASSET_PINTEREST_SHELL_SELECTORS = [
  "@import url(\"./assets-pinterest-shell-header.css\")",
  "@import url(\"./assets-pinterest-shell-stats.css\")",
  "@import url(\"./assets-pinterest-shell-nav.css\")"
];
const EXPECTED_ASSET_PINTEREST_SHELL_HEADER_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-pinterest-shell",
  "body[data-view=\"assetsPage\"] .asset-pinterest-profile",
  "body[data-view=\"assetsPage\"] .asset-pinterest-upload"
];
const EXPECTED_ASSET_PINTEREST_SHELL_STATS_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-pinterest-stats",
  "body[data-view=\"assetsPage\"] .asset-stat-card",
  "body[data-view=\"assetsPage\"] .asset-stat-icon"
];
const EXPECTED_ASSET_PINTEREST_SHELL_NAV_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-pinterest-tabs",
  "body[data-view=\"assetsPage\"] .asset-pinterest-section-title",
  "body[data-view=\"assetsPage\"] .asset-pinterest-back"
];
const EXPECTED_ASSET_PINTEREST_BOARD_SELECTORS = [
  "@import url(\"./assets-pinterest-board-shell-legacy.css\")",
  "@import url(\"./assets-pinterest-board-tiles-legacy.css\")",
  "@import url(\"./assets-pinterest-board-masonry-legacy.css\")",
  "@import url(\"./assets-pinterest-board-responsive-legacy.css\")"
];
const EXPECTED_ASSET_PINTEREST_BOARD_SHELL_LEGACY_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-pinterest-profile",
  "body[data-view=\"assetsPage\"] .asset-pinterest-tabs",
  "body[data-view=\"assetsPage\"] .asset-pinterest-section-title",
  ".asset-pinterest-back"
];
const EXPECTED_ASSET_PINTEREST_BOARD_TILES_LEGACY_SELECTORS = [
  ".asset-pinterest-board-grid",
  ".asset-pinterest-board-cover-large",
  ".asset-pinterest-board-create-tile .asset-pinterest-board-cover-large",
  ".asset-pinterest-board-title",
  ".asset-pinterest-board-delete"
];
const EXPECTED_ASSET_PINTEREST_BOARD_MASONRY_LEGACY_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-pinterest-masonry",
  "body[data-view=\"assetsPage\"] .asset-pinterest-pin.asset-item",
  "body[data-view=\"assetsPage\"] .asset-pinterest-empty",
  ".floating-library .asset-item"
];
const EXPECTED_ASSET_PINTEREST_BOARD_RESPONSIVE_LEGACY_SELECTORS = [
  "@media (max-width: 900px)",
  "body[data-view=\"assetsPage\"] .asset-pinterest-shell",
  "body[data-view=\"assetsPage\"] .asset-pinterest-masonry"
];
const EXPECTED_ASSET_PINTEREST_BOARD_REFRESH_SELECTORS = [
  "@import url(\"./assets-pinterest-board-refresh-grid.css\")",
  "@import url(\"./assets-pinterest-board-refresh-create.css\")",
  "@import url(\"./assets-pinterest-board-refresh-meta.css\")"
];
const EXPECTED_ASSET_PINTEREST_BOARD_REFRESH_GRID_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-pinterest-board-grid",
  "body[data-view=\"assetsPage\"] .asset-pinterest-board-tile",
  "body[data-view=\"assetsPage\"] .asset-pinterest-board-cover-large",
  "body[data-view=\"assetsPage\"] .asset-board-cover-cell"
];
const EXPECTED_ASSET_PINTEREST_BOARD_REFRESH_CREATE_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-pinterest-board-create-card",
  "body[data-view=\"assetsPage\"] .asset-pinterest-board-create-card span"
];
const EXPECTED_ASSET_PINTEREST_BOARD_REFRESH_META_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-pinterest-board-title",
  "body[data-view=\"assetsPage\"] .asset-pinterest-board-delete"
];
const EXPECTED_ASSET_PINTEREST_PIN_SELECTORS = [
  "@import url(\"./assets-pinterest-pin-card.css\")",
  "@import url(\"./assets-pinterest-pin-actions.css\")",
  "@import url(\"./assets-pinterest-pin-empty.css\")"
];
const EXPECTED_ASSET_PINTEREST_PIN_CARD_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-pinterest-pin.asset-item",
  "body[data-view=\"assetsPage\"] .asset-pinterest-pin-thumb",
  "body[data-view=\"assetsPage\"] .asset-card-check",
  "body[data-view=\"assetsPage\"] .asset-image-placeholder",
  "body[data-view=\"assetsPage\"] .asset-pinterest-pin-meta"
];
const EXPECTED_ASSET_PINTEREST_PIN_ACTIONS_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-pinterest-pin-actions",
  "body[data-view=\"assetsPage\"] .asset-pinterest-pin-delete"
];
const EXPECTED_ASSET_PINTEREST_PIN_EMPTY_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-pinterest-empty",
  "body[data-view=\"assetsPage\"] .asset-pinterest-empty-actions"
];
const EXPECTED_ASSET_PINTEREST_RESPONSIVE_SELECTORS = [
  "@import url(\"./assets-pinterest-responsive-breakpoints.css\")",
  "@import url(\"./assets-pinterest-responsive-interactions.css\")"
];
const EXPECTED_ASSET_PINTEREST_RESPONSIVE_BREAKPOINTS_SELECTORS = [
  "@media (max-width: 1100px)",
  "@media (max-width: 720px)",
  "body[data-view=\"assetsPage\"] .asset-pinterest-masonry",
  "body[data-view=\"assetsPage\"] .asset-pinterest-profile"
];
const EXPECTED_ASSET_PINTEREST_RESPONSIVE_INTERACTIONS_SELECTORS = [
  "body[data-view=\"assetsPage\"] .assets-page-view",
  "body[data-view=\"assetsPage\"] .assets-page-view.active",
  "body[data-view=\"assetsPage\"] .asset-pinterest-boards-view",
  "body[data-view=\"assetsPage\"] .asset-pinterest-board-grid",
  "body[data-view=\"assetsPage\"] .asset-pinterest-pin-delete"
];
const EXPECTED_ASSET_SELECTORS = [];
const EXPECTED_CHAT_SELECTORS = [
  ".conversation-history-popover",
  ".conversation-history-popover[hidden]",
  ".conversation-history-list",
  ".conversation-history-item",
  ".conversation-history-empty"
];
const EXPECTED_LEGACY_THEME_SYNC_BASE_SELECTORS = [
  "body[data-theme=\"light\"]",
  "body[data-theme=\"dark\"]",
  "body[data-theme=\"dark\"] .canvas-area",
  ".theme-switch",
  ".theme-track",
  ".theme-orb",
  ".theme-sun"
];
const EXPECTED_LEGACY_THEME_IOS_SELECTORS = [
  "@import url(\"./legacy-theme-ios-base.css\")",
  "@import url(\"./legacy-theme-ios-chrome.css\")",
  "@import url(\"./legacy-theme-ios-node-media.css\")",
  "@import url(\"./legacy-theme-ios-chat-composer.css\")"
];
const EXPECTED_LEGACY_THEME_IOS_BASE_SELECTORS = [
  "/* iOS glass light theme */",
  ":root",
  "body",
  ".canvas-area"
];
const EXPECTED_LEGACY_THEME_IOS_CHROME_SELECTORS = [
  ".project-header",
  ".top-actions button",
  ".rail-main",
  ".add-node-menu"
];
const EXPECTED_LEGACY_THEME_IOS_NODE_MEDIA_SELECTORS = [
  ".canvas-viewport",
  ".node-card",
  ".node-card.selected",
  ".video-preview"
];
const EXPECTED_LEGACY_THEME_IOS_CHAT_COMPOSER_SELECTORS = [
  ".chat-panel",
  ".message.user",
  ".composer textarea",
  "input,"
];
const EXPECTED_LEGACY_THEME_SYNC_SURFACES_SELECTORS = [
  ".project-header",
  ".canvas-context-menu button",
  ".image-node-toolbar",
  ".asset-generation-toolbar",
  ".composer",
  "#chatModelSelect"
];
const EXPECTED_LEGACY_THEME_SYNC_IMAGE_EDIT_SELECTORS = [
  ".image-edit-popover",
  "#imageGeneratorPopover [data-generator-model]",
  "#imageGeneratorPopover .generator-select-wrap[data-generator-select-kind=\"model\"]",
  "#imageGeneratorPopover .image-generator-reference-thumb",
  "#imageEditCancel"
];
const EXPECTED_LEGACY_THEME_SYNC_SELECTORS = [];
const EXPECTED_LEGACY_THEME_SYNC_CREDIT_SUBMIT_SELECTORS = [
  ".home-send.credit-submit-button",
  "#imageEditSubmit.credit-submit-button",
  "#imageGeneratorPopover [data-generator-submit].credit-submit-button",
  ".composer-actions .send.credit-submit-button",
  ".credit-submit-cost",
  ".credit-submit-bolt",
  ".credit-submit-button.is-credit-quote-error .credit-submit-cost"
];
const EXPECTED_LEGACY_THEME_SYNC_CROP_EXPAND_SELECTORS = [
  ".canvas-context-menu button:first-child",
  ".crop-actions:not(.image-expand-actions)",
  ".image-expand-actions",
  ".crop-actions:not(.image-expand-actions) .crop-confirm",
  "body[data-theme=\"dark\"] .crop-actions:not(.image-expand-actions)"
];
const EXPECTED_LEGACY_THEME_SYNC_MEDIA_EDIT_SELECTORS = [
  ".canvas-context-menu .context-submenu-panel button:first-child",
  ".image-expand-prompt-field textarea",
  ".edit-reference-remove",
  ".node-image.cropping .image-frame",
  ".crop-box",
  ".image-expand-box",
  ".image-lightbox"
];
const EXPECTED_LEGACY_THEME_SYNC_NODE_MEDIA_SELECTORS = [
  "@import url(\"./legacy-theme-sync-node-media-card.css\")",
  "@import url(\"./legacy-theme-sync-node-media-ai.css\")",
  "@import url(\"./legacy-theme-sync-node-media-canvas.css\")"
];
const EXPECTED_LEGACY_THEME_SYNC_NODE_MEDIA_CARD_SELECTORS = [
  "body[data-theme=\"dark\"] .node-card",
  "body[data-theme=\"dark\"] .message.user",
  "body[data-theme=\"dark\"] input"
];
const EXPECTED_LEGACY_THEME_SYNC_NODE_MEDIA_AI_SELECTORS = [
  ".generation-choice-overlay",
  ".ai-suggestion-panel",
  ".director-generate-all",
  ".generation-spinner",
  "body[data-theme=\"dark\"] .generation-choice-image"
];
const EXPECTED_LEGACY_THEME_SYNC_NODE_MEDIA_CANVAS_SELECTORS = [
  "body[data-view=\"canvas\"] .node-card.node-image",
  "body[data-view=\"canvas\"] .node-card.node-loading-image .generation-frame::before",
  "body[data-view=\"canvas\"] .node-card.stack-drop-target"
];
const EXPECTED_LEGACY_THEME_SYNC_COMPACT_SELECT_SELECTORS = [
  ".native-compact-select",
  ".compact-select",
  ".compact-select-trigger",
  ".compact-select-menu",
  ".compact-select-option",
  ".image-edit-popover .compact-select-trigger",
  ".composer-actions .compact-select-trigger"
];
const EXPECTED_LEGACY_THEME_SYNC_MODEL_PREFERENCE_SELECTORS = [
  "@import url(\"./legacy-theme-sync-model-preference-menu.css\")",
  "@import url(\"./legacy-theme-sync-model-preference-panel.css\")",
  "@import url(\"./legacy-theme-sync-model-preference-color-fix.css\")"
];
const EXPECTED_LEGACY_THEME_SYNC_MODEL_PREFERENCE_MENU_SELECTORS = [
  ".home-model-menu.model-preference-menu",
  ".compact-select-menu.model-preference-menu",
  ".compact-select-menu-portal.model-preference-menu",
  ".chat-model-menu .model-preference-panel",
  ".composer-actions .compact-select[data-select-id=\"chatModelSelect\"] .compact-select-menu.model-preference-menu",
  "#imageGeneratorPopover .generator-select-wrap[data-generator-select-kind=\"model\"] .generator-select-menu.model-preference-menu"
];
const EXPECTED_LEGACY_THEME_SYNC_MODEL_PREFERENCE_PANEL_SELECTORS = [
  ".model-preference-panel",
  ".model-preference-option",
  ".model-preference-tags"
];
const EXPECTED_LEGACY_THEME_SYNC_MODEL_PREFERENCE_COLOR_FIX_SELECTORS = [
  "#imageGeneratorPopover .generator-select-menu .generator-select-option",
  ".compact-select-menu .compact-select-option"
];
const EXPECTED_LEGACY_CANVAS_SHELL_SELECTORS = [
  "@import url(\"./legacy-canvas-shell-brand.css\")",
  "@import url(\"./legacy-canvas-shell-actions.css\")",
  "@import url(\"./legacy-canvas-shell-tool-rail.css\")",
  "@import url(\"./legacy-canvas-shell-menus.css\")",
  "@import url(\"./legacy-canvas-shell-selection.css\")"
];
const EXPECTED_LEGACY_CANVAS_SHELL_BRAND_SELECTORS = [
  ".canvas-area",
  ".project-header",
  ".logo-mark"
];
const EXPECTED_LEGACY_CANVAS_SHELL_ACTIONS_SELECTORS = [
  ".top-actions",
  ".composer-actions button"
];
const EXPECTED_LEGACY_CANVAS_SHELL_TOOL_RAIL_SELECTORS = [
  ".tool-rail",
  ".rail-main",
  ".rail-btn",
  ".rail-separator"
];
const EXPECTED_LEGACY_CANVAS_SHELL_MENUS_SELECTORS = [
  ".add-node-menu",
  ".canvas-context-menu",
  ".context-submenu-panel",
  ".context-color-panel"
];
const EXPECTED_LEGACY_CANVAS_SHELL_SELECTION_SELECTORS = [
  ".selection-action-bar",
  ".selection-action-button",
  ".selection-color-swatch",
  ".selection-swatch-blue",
  "@media (max-width: 640px)"
];
const EXPECTED_LEGACY_CANVAS_IMAGE_EDIT_SELECTORS = [
  ".image-edit-popover",
  ".edit-head",
  ".edit-actions"
];
const EXPECTED_LEGACY_CANVAS_IMAGE_EDIT_GENERATOR_SELECT_SELECTORS = [
  "#imageGeneratorPopover .generator-select-wrap",
  "#imageGeneratorPopover .generator-select-menu",
  "#imageGeneratorPopover .generator-select-option"
];
const EXPECTED_LEGACY_CANVAS_IMAGE_EDIT_COMPACT_SELECT_SELECTORS = [
  ".image-edit-popover .compact-select",
  ".image-edit-popover .compact-select-trigger",
  ".image-edit-popover .compact-select-option"
];
const EXPECTED_LEGACY_CANVAS_IMAGE_EDIT_FOOTER_SELECTORS = [
  "#imageGeneratorPopover .generator-select-option:hover",
  ".edit-actions .send",
  "#imageGeneratorPopover .image-generator-reference-list",
  "#imageGeneratorPopover.generator-panel-expanded"
];
const EXPECTED_LEGACY_CANVAS_ADD_NODE_SELECTORS = [
  ".add-menu-title",
  ".add-node-menu button",
  ".add-node-menu em",
  "body[data-view=\"canvas\"] .add-node-menu",
  "body[data-view=\"canvas\"] .add-node-menu button"
];
const EXPECTED_LEGACY_CANVAS_CHOICE_OVERLAY_SELECTORS = [
  "@import url(\"./legacy-canvas-choice-viewport.css\")",
  "@import url(\"./legacy-canvas-choice-upload.css\")",
  "@import url(\"./legacy-canvas-choice-generation.css\")",
  "@import url(\"./legacy-canvas-choice-floating-suggestions.css\")",
  "@import url(\"./legacy-canvas-choice-keyframes.css\")"
];
const EXPECTED_LEGACY_CANVAS_CHOICE_VIEWPORT_SELECTORS = [
  ".canvas-viewport",
  ".canvas-viewport.dragging",
  ".canvas-viewport.selecting"
];
const EXPECTED_LEGACY_CANVAS_CHOICE_UPLOAD_SELECTORS = [
  ".app.upload-choosing .canvas-area",
  ".upload-choice-bubbles",
  ".upload-choice-bubbles.open",
  ".upload-choice-bubbles.drag-live::before"
];
const EXPECTED_LEGACY_CANVAS_CHOICE_GENERATION_SELECTORS = [
  ".generation-choice-overlay",
  ".generation-choice-overlay.open",
  ".generation-choice-close",
  ".generation-choice-image"
];
const EXPECTED_LEGACY_CANVAS_CHOICE_FLOATING_SUGGESTIONS_SELECTORS = [
  ".floating-suggestions",
  ".floating-suggestions button",
  ".floating-suggestions button:nth-child(4)",
  ".floating-suggestions button.running"
];
const EXPECTED_LEGACY_CANVAS_CHOICE_KEYFRAMES_SELECTORS = [
  "@keyframes bubbleIn",
  "@keyframes overlayFade",
  "@keyframes imageFloatIn",
  "@keyframes suggestionPop"
];
const EXPECTED_LEGACY_CANVAS_WORLD_SELECTORS = [
  "@import url(\"./legacy-canvas-world-selection.css\")",
  "@import url(\"./legacy-canvas-world-stage.css\")",
  "@import url(\"./legacy-canvas-world-empty-state.css\")",
  "@import url(\"./legacy-canvas-world-hints.css\")"
];
const EXPECTED_LEGACY_CANVAS_WORLD_SELECTION_SELECTORS = [
  ".selection-box"
];
const EXPECTED_LEGACY_CANVAS_WORLD_STAGE_SELECTORS = [
  ".canvas-world"
];
const EXPECTED_LEGACY_CANVAS_WORLD_EMPTY_STATE_SELECTORS = [
  ".empty-state",
  ".empty-state-action",
  ".empty-state-dot"
];
const EXPECTED_LEGACY_CANVAS_WORLD_HINTS_SELECTORS = [
  ".hint-line",
  ".hint-line span",
  ".quick-actions",
  ".quick-actions button:hover"
];
const EXPECTED_LEGACY_CANVAS_VIDEO_GENERATOR_SELECTORS = [
  "@import url(\"./legacy-canvas-video-generator-shell.css\")",
  "@import url(\"./legacy-canvas-video-generator-reference.css\")",
  "@import url(\"./legacy-canvas-video-generator-controls.css\")"
];
const EXPECTED_LEGACY_CANVAS_VIDEO_GENERATOR_SHELL_SELECTORS = [
  ".video-generator-popover",
  ".video-generator-popover.open",
  ".video-generator-head",
  ".video-generator-row"
];
const EXPECTED_LEGACY_CANVAS_VIDEO_GENERATOR_REFERENCE_SELECTORS = [
  ".video-generator-reference-list",
  ".video-generator-reference-thumb",
  ".video-generator-reference-thumb img",
  ".video-generator-tool"
];
const EXPECTED_LEGACY_CANVAS_VIDEO_GENERATOR_CONTROLS_SELECTORS = [
  ".video-generator-popover textarea",
  ".video-generator-model",
  ".video-generator-group",
  ".video-generator-popover .send",
  ".video-generator-status"
];
const EXPECTED_LEGACY_CANVAS_PROJECT_HEADER_SELECTORS = [
  "@import url(\"./legacy-canvas-project-header-shell.css\")",
  "@import url(\"./legacy-canvas-project-header-title.css\")",
  "@import url(\"./legacy-canvas-project-header-status.css\")",
  "@import url(\"./legacy-canvas-project-header-return.css\")"
];
const EXPECTED_LEGACY_CANVAS_PROJECT_HEADER_SHELL_SELECTORS = [
  "body[data-view=\"canvas\"] .project-header",
  "body[data-view=\"canvas\"] .project-header > div"
];
const EXPECTED_LEGACY_CANVAS_PROJECT_HEADER_TITLE_SELECTORS = [
  "body[data-view=\"canvas\"] .project-header h1",
  "body[data-view=\"canvas\"] .project-header h1:hover"
];
const EXPECTED_LEGACY_CANVAS_PROJECT_HEADER_STATUS_SELECTORS = [
  "body[data-view=\"canvas\"] .project-header p",
  "body[data-view=\"canvas\"] .project-header p.show",
  "body[data-view=\"canvas\"] .project-header p.is-success",
  "body[data-view=\"canvas\"] .project-header p.is-error",
  "body[data-view=\"canvas\"] .project-header p.is-pending"
];
const EXPECTED_LEGACY_CANVAS_PROJECT_HEADER_RETURN_SELECTORS = [
  "body[data-view=\"canvas\"] .return-to-content"
];
const EXPECTED_LEGACY_CANVAS_LIBRARY_SELECTORS = [
  ".library-head"
];
const EXPECTED_LEGACY_CANVAS_SELECTORS = [];
const EXPECTED_LEGACY_CANVAS_VISUAL_SHAPE_TOOLS_SELECTORS = [
  "@import url(\"./legacy-canvas-visual-selection-draw.css\")",
  "@import url(\"./legacy-canvas-visual-text-editor.css\")",
  "@import url(\"./legacy-canvas-visual-shape-toolbar.css\")",
  "@import url(\"./legacy-canvas-visual-text-toolbar.css\")"
];
const EXPECTED_LEGACY_CANVAS_VISUAL_SELECTION_DRAW_SELECTORS = [
  "body[data-view=\"canvas\"] .canvas-object.selected",
  "body[data-view=\"canvas\"] .draw-node",
  "body[data-view=\"canvas\"] .draw-shape"
];
const EXPECTED_LEGACY_CANVAS_VISUAL_TEXT_EDITOR_SELECTORS = [
  "body[data-view=\"canvas\"] .node-text-tool",
  "body[data-view=\"canvas\"] .canvas-text-editor",
  "body[data-view=\"canvas\"] .shape-text-editor"
];
const EXPECTED_LEGACY_CANVAS_VISUAL_SHAPE_TOOLBAR_SELECTORS = [
  ".shape-format-toolbar",
  ".shape-color-popover",
  ".shape-color-token-blue",
  ".stroke-width-control"
];
const EXPECTED_LEGACY_CANVAS_VISUAL_TEXT_TOOLBAR_SELECTORS = [
  "body[data-view=\"canvas\"] .text-format-toolbar",
  "body[data-view=\"canvas\"] .text-color-picker"
];
const EXPECTED_LEGACY_CANVAS_VISUAL_MEDIA_SELECTORS = [
  "body[data-view=\"canvas\"] .canvas-area",
  "body[data-view=\"canvas\"] .canvas-world",
  "body[data-view=\"canvas\"] .node-image",
  "body[data-view=\"canvas\"] .node-model",
  "body[data-view=\"canvas\"] .node-loading-image",
  "body[data-view=\"canvas\"] .resize-handle"
];
const EXPECTED_LEGACY_CANVAS_VISUAL_SHELL_SELECTORS = [
  ".brand-mark",
  ".brand-menu",
  ".home-side-menu",
  ".simple-page-view"
];
const EXPECTED_LEGACY_CANVAS_VISUAL_SELECTORS = [];
const EXPECTED_LEGACY_NODE_SELECTORS = [];
const EXPECTED_NODE_BASE_SELECTORS = [
  ".node-card",
  ".resize-handle",
  ".node-card.node-group",
  ".node-expand",
  ".node-download"
];
const EXPECTED_NODE_IMAGE_EDIT_SELECTORS = [
  ".node-image.cropping",
  ".node-image.expanding"
];
const EXPECTED_NODE_IMAGE_CROP_SELECTORS = [
  ".node-crop-layer",
  ".crop-box",
  ".crop-actions"
];
const EXPECTED_NODE_IMAGE_EXPAND_SELECTORS = [
  ".image-expand-box",
  ".image-expand-source",
  ".image-expand-actions",
  ".image-expand-prompt-field",
  ".image-expand-action-row"
];
const EXPECTED_NODE_STATE_SELECTORS = [
  ".node-card.node-zoomed",
  ".node-loading-image.node-zoomed",
  ".node-card.selected",
  ".source-badge",
  ".node-label",
  "@keyframes sourcePulse"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_BASE_SELECTORS = [
  ".image-node-toolbar",
  ".image-toolbar-menu",
  ".image-toolbar-main"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_UPSCALE_SELECTORS = [
  ".image-toolbar-upscale-controls",
  ".image-node-toolbar.mode-upscale .image-toolbar-main",
  ".image-toolbar-size-option",
  ".image-toolbar-generate"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_MENU_SELECTORS = [
  ".image-toolbar-label",
  ".image-toolbar-compare",
  ".image-toolbar-upscale-option",
  ".upscale-option-main",
  "body[data-theme=\"dark\"] .image-node-toolbar .image-toolbar-menu"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_SAVEBAR_SELECTORS = [
  ".canvas-asset-savebar",
  ".canvas-asset-board-select",
  ".canvas-asset-save-submit",
  ".canvas-asset-save-submit.is-saved"
];
const EXPECTED_NODE_IMAGE_TEXT_PANEL_SELECTORS = [
  ".image-text-panel",
  ".image-text-status",
  ".image-text-list"
];
const EXPECTED_NODE_IMAGE_LIGHTBOX_SELECTORS = [
  ".image-lightbox",
  ".image-lightbox-close"
];
const EXPECTED_NODE_STACK_BASE_SELECTORS = [
  ".node-card.stack-member-hidden",
  ".node-card.has-stack::after",
  ".node-card.stack-drop-target",
  ".stack-toggle"
];
const EXPECTED_NODE_STACK_TRAY_SELECTORS = [
  ".stack-tray",
  ".stack-row",
  ".stack-thumb"
];
const EXPECTED_NODE_DIRECTOR_SELECTORS = [
  ".node-director",
  ".director-head",
  ".director-refresh",
  ".director-actions",
  ".director-tile"
];
const EXPECTED_NODE_MEDIA_SHELL_SELECTORS = [
  ".node-2d",
  ".node-image",
  ".node-model",
  ".node-loading-image"
];
const EXPECTED_NODE_MEDIA_VIDEO_SELECTORS = [
  ".node-video",
  ".video-file-preview",
  ".node-video.selected"
];
const EXPECTED_NODE_MEDIA_FRAME_SELECTORS = [
  ".image-frame",
  ".image-frame img",
  ".image-file-name"
];
const EXPECTED_NODE_GENERATION_SELECTORS = [
  ".generation-frame",
  ".generation-content",
  ".generation-spinner",
  ".generation-failed .generation-frame",
  "@keyframes shimmerPreview"
];
const EXPECTED_NODE_IMAGE_GENERATOR_BASE_SELECTORS = [
  ".node-image-generator",
  ".image-generator-frame",
  ".image-generator-panel"
];
const EXPECTED_NODE_IMAGE_GENERATOR_PANEL_SELECTORS = [
  ".image-generator-panel-top",
  ".image-generator-reference-list",
  ".image-generator-bottom",
  ".image-generator-submit"
];
const EXPECTED_NODE_IMAGE_GENERATOR_GLASS_SELECTORS = [
  ".image-generator-title-icon",
  ".image-generator-stage",
  ".image-generator-submit"
];
const EXPECTED_NODE_IMAGE_GENERATOR_INLINE_EDIT_SELECTORS = [
  ".image-generator-panel.image-edit-popover-inline",
  ".image-generator-bottom.edit-actions",
  ".image-generator-submit.send",
  "@media (max-width: 760px)"
];
const EXPECTED_NODE_PREVIEW_SELECTORS = [
  ".media-preview",
  ".model-preview",
  ".model-viewer",
  ".model-viewer-mode-toggle",
  ".cube-scene",
  ".video-preview",
  ".bottom-controls",
  "@keyframes spinCube"
];
const EXPECTED_NODE_SELECTORS = [];
const EXPECTED_LEGACY_CHAT_SELECTORS = [];
const EXPECTED_LEGACY_CHAT_AGENT_SELECTORS = [
  ".agent-ui-blocks",
  ".agent-analysis-card",
  ".agent-analysis-card summary::after",
  ".agent-analysis-card:not([open]) summary::after",
  ".agent-result-card",
  ".agent-result-placeholder",
  ".agent-prompt-details",
  ".agent-assistant-summary",
  ".agent-task-status",
  ".agent-feedback"
];
const EXPECTED_LEGACY_CHAT_COMPOSER_SELECTORS = [
  ".composer",
  ".chat-panel.has-chat .composer",
  ".composer.drag-over",
  ".composer textarea",
  ".composer-actions",
  ".composer.drag-over::after",
  "#chatUploadImage",
  "#chatModelSelect",
  ".chat-image-preview",
  ".chat-image-preview span::before",
  ".composer-actions .send"
];
const EXPECTED_LEGACY_CHAT_MESSAGE_SELECTORS = [
  ".message",
  ".message.assistant",
  ".message.thinking",
  ".thinking-summary",
  ".message.thinking li.done::before",
  ".message.loading::before",
  "@keyframes spinLoading",
  ".message.user",
  ".image-message"
];
const EXPECTED_LEGACY_CHAT_SHELL_SELECTORS = [
  ".chat-panel",
  ".chat-panel.collapsed",
  ".chat-float",
  ".agent-debug-panel",
  ".window-actions",
  ".welcome",
  ".suggestions",
  ".chat-log"
];
const EXPECTED_LEGACY_CHAT_RESPONSIVE_SELECTORS = [
  "@media (max-width: 1100px)",
  "@media (max-width: 820px)",
  ".empty-state-actions",
  ".tool-rail"
];
const EXPECTED_LEGACY_COMPACT_BOTTOM_CONTROLS_SELECTORS = [
  ".bottom-controls",
  ".zoom-stepper",
  ".history-controls",
  "body[data-theme=\"light\"] .bottom-controls",
  "body[data-theme=\"light\"] .zoom-stepper"
];
const EXPECTED_LEGACY_COMPACT_TOOL_RAIL_SELECTORS = [
  ".tool-rail",
  ".rail-main",
  ".rail-main-icon",
  ".rail-items",
  ".rail-btn",
  ".rail-btn.add",
  ".rail-btn.jump",
  ".rail-separator",
  "body[data-theme=\"light\"] .tool-rail"
];
const EXPECTED_LEGACY_COMPACT_PROJECT_MENU_SELECTORS = [
  ".project-header",
  ".project-menu-trigger",
  ".project-menu-trigger::before",
  ".project-menu",
  ".project-menu.open",
  ".project-menu button",
  ".project-menu kbd"
];

const errors = [];

function readText(filePath) {
  return fs.readFileSync(path.resolve(ROOT, filePath), "utf8");
}

function stripQuery(value = "") {
  return String(value || "").split("?")[0];
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function fail(message) {
  errors.push(message);
}

function parseCssImports(filePath) {
  const text = readText(filePath);
  const imports = [];
  const importPattern = /@import\s+url\(\s*["']?([^"')]+)["']?\s*\)\s*;/g;
  let match;

  while ((match = importPattern.exec(text))) {
    imports.push(stripQuery(match[1]));
  }

  return imports;
}

function assertListEqual(label, actual, expected) {
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    fail(`${label} import order changed.\nexpected:\n${expected.join("\n")}\nactual:\n${actual.join("\n")}`);
  }
}

function assertFileExists(filePath) {
  if (!fs.existsSync(path.resolve(ROOT, filePath))) {
    fail(`${filePath} is missing`);
  }
}

function checkIndexStylesheet() {
  const html = readText("index.html");
  const stylesheetPattern = /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  const stylesheets = [];
  let match;

  while ((match = stylesheetPattern.exec(html))) {
    stylesheets.push(stripQuery(match[1]));
  }

  assertListEqual("index.html stylesheet", stylesheets, [EXPECTED_INDEX_STYLESHEET]);
}

function checkImportedFilesExist(imports, baseDir) {
  imports.forEach((specifier) => {
    const filePath = path.join(baseDir, specifier);
    assertFileExists(filePath);
  });
}

function collectCssFiles(dirPath) {
  const entries = fs.readdirSync(path.resolve(ROOT, dirPath), { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectCssFiles(entryPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".css")) {
      files.push(toPosixPath(entryPath));
    }
  }

  return files.sort();
}

function resolveCssImport(importerPath, specifier) {
  if (!specifier.startsWith(".")) return "";
  const importerDir = path.dirname(importerPath);
  const resolvedPath = path.normalize(path.join(importerDir, specifier));
  return toPosixPath(resolvedPath);
}

function buildReachableCssGraph(entryPath = "styles.css") {
  const reachable = new Set();
  const stack = [entryPath];

  while (stack.length) {
    const filePath = toPosixPath(stack.pop());
    if (reachable.has(filePath)) continue;
    reachable.add(filePath);

    for (const specifier of parseCssImports(filePath)) {
      const resolved = resolveCssImport(filePath, specifier);
      if (!resolved) continue;
      assertFileExists(resolved);
      if (!reachable.has(resolved)) stack.push(resolved);
    }
  }

  return reachable;
}

function checkCssReachability() {
  const reachable = buildReachableCssGraph();
  const allowedUnreachable = new Set(ALLOWED_UNREACHABLE_CSS);
  const cssFiles = ["styles.css", ...collectCssFiles("styles")];
  const unexpectedUnreachable = cssFiles
    .filter((filePath) => !reachable.has(filePath) && !allowedUnreachable.has(filePath));
  const importedCompatibilityShims = ALLOWED_UNREACHABLE_CSS
    .filter((filePath) => reachable.has(filePath));

  if (unexpectedUnreachable.length) {
    fail(`Unexpected unreachable CSS files:\n${unexpectedUnreachable.join("\n")}`);
  }
  if (importedCompatibilityShims.length) {
    fail(`Compatibility shim CSS files should stay outside the active entry graph:\n${importedCompatibilityShims.join("\n")}`);
  }
}

function checkFileContains(filePath, snippets) {
  const text = readText(filePath);
  snippets.forEach((snippet) => {
    if (!text.includes(snippet)) {
      fail(`${filePath} is missing expected snippet: ${snippet}`);
    }
  });
}

const stylesImports = parseCssImports("styles.css");
const workspaceImports = parseCssImports("styles/workspace.css");
const projectLibraryImports = parseCssImports("styles/features/project-library.css");
const legacySplitImports = parseCssImports("styles/legacy-split.css");
const legacyBaseImports = parseCssImports("styles/legacy-base.css");
const legacyThemeIosImports = parseCssImports("styles/legacy-theme-ios.css");
const legacyChatImports = parseCssImports("styles/legacy-chat.css");
const legacyCompactControlsImports = parseCssImports("styles/legacy-compact-controls.css");
const legacyThemeSyncImports = parseCssImports("styles/legacy-theme-sync.css");
const legacyThemeSyncNodeMediaImports = parseCssImports("styles/legacy-theme-sync-node-media.css");
const legacyThemeSyncModelPreferenceImports = parseCssImports("styles/legacy-theme-sync-model-preference.css");
const legacyCanvasImports = parseCssImports("styles/legacy-canvas.css");
const legacyCanvasChoiceOverlayImports = parseCssImports("styles/legacy-canvas-choice-overlays.css");
const legacyCanvasWorldImports = parseCssImports("styles/legacy-canvas-world.css");
const legacyCanvasVideoGeneratorImports = parseCssImports("styles/legacy-canvas-video-generator.css");
const legacyCanvasProjectHeaderImports = parseCssImports("styles/legacy-canvas-project-header.css");
const legacyCanvasShellImports = parseCssImports("styles/legacy-canvas-shell.css");
const legacyCanvasImageEditImports = parseCssImports("styles/legacy-canvas-image-edit.css");
const legacyCanvasVisualImports = parseCssImports("styles/legacy-canvas-visual.css");
const legacyCanvasVisualShapeToolsImports = parseCssImports("styles/legacy-canvas-visual-shape-tools.css");
const authImports = parseCssImports("styles/features/auth.css");
const nodeImports = parseCssImports("styles/features/node.css");
const nodeImageEditImports = parseCssImports("styles/features/node-image-edit.css");
const nodeImageToolbarImports = parseCssImports("styles/features/node-image-toolbar.css");
const nodeImagePanelsImports = parseCssImports("styles/features/node-image-panels.css");
const nodeStackImports = parseCssImports("styles/features/node-stack.css");
const nodeMediaImports = parseCssImports("styles/features/node-media.css");
const nodeImageGeneratorImports = parseCssImports("styles/features/node-image-generator.css");
const nodeImageGeneratorBaseImports = parseCssImports("styles/features/node-image-generator-base.css");
const assetImports = parseCssImports("styles/features/assets.css");
const assetBoardImports = parseCssImports("styles/features/assets-board.css");
const assetSaveImports = parseCssImports("styles/features/assets-save.css");
const assetSavePopoverImports = parseCssImports("styles/features/assets-save-popover.css");
const assetSaveBoardPopoverImports = parseCssImports("styles/features/assets-save-board-popover.css");
const assetPickerImports = parseCssImports("styles/features/assets-picker.css");
const assetPickerPopoverImports = parseCssImports("styles/features/assets-picker-popover.css");
const assetPickerListImports = parseCssImports("styles/features/assets-picker-list.css");
const assetCanvasPickerImports = parseCssImports("styles/features/assets-canvas-picker.css");
const assetPageImports = parseCssImports("styles/features/assets-page.css");
const assetPagePinterestLegacyImports = parseCssImports("styles/features/assets-page-pinterest-legacy.css");
const assetPinterestImports = parseCssImports("styles/features/assets-pinterest.css");
const assetPinterestBoardImports = parseCssImports("styles/features/assets-pinterest-board.css");
const assetPinterestShellImports = parseCssImports("styles/features/assets-pinterest-shell.css");
const assetPinterestBoardRefreshImports = parseCssImports("styles/features/assets-pinterest-board-refresh.css");
const assetPinterestPinImports = parseCssImports("styles/features/assets-pinterest-pin.css");
const assetPinterestResponsiveImports = parseCssImports("styles/features/assets-pinterest-responsive.css");
const homeImports = parseCssImports("styles/features/home.css");
const homeHistoryImports = parseCssImports("styles/features/home-history.css");
const homeCommunityImports = parseCssImports("styles/features/home-community.css");
const homeShellImports = parseCssImports("styles/features/home-shell.css");

checkIndexStylesheet();
assertListEqual("styles.css", stylesImports, EXPECTED_STYLES_IMPORTS);
assertListEqual("styles/workspace.css", workspaceImports, EXPECTED_WORKSPACE_IMPORTS);
assertListEqual("styles/features/project-library.css", projectLibraryImports, EXPECTED_PROJECT_LIBRARY_IMPORTS);
assertListEqual("styles/legacy-split.css", legacySplitImports, EXPECTED_LEGACY_SPLIT_IMPORTS);
assertListEqual("styles/legacy-base.css", legacyBaseImports, EXPECTED_LEGACY_BASE_IMPORTS);
assertListEqual("styles/legacy-theme-ios.css", legacyThemeIosImports, EXPECTED_LEGACY_THEME_IOS_IMPORTS);
assertListEqual("styles/legacy-chat.css", legacyChatImports, EXPECTED_LEGACY_CHAT_IMPORTS);
assertListEqual("styles/legacy-compact-controls.css", legacyCompactControlsImports, EXPECTED_LEGACY_COMPACT_CONTROLS_IMPORTS);
assertListEqual("styles/legacy-theme-sync.css", legacyThemeSyncImports, EXPECTED_LEGACY_THEME_SYNC_IMPORTS);
assertListEqual("styles/legacy-theme-sync-node-media.css", legacyThemeSyncNodeMediaImports, EXPECTED_LEGACY_THEME_SYNC_NODE_MEDIA_IMPORTS);
assertListEqual("styles/legacy-theme-sync-model-preference.css", legacyThemeSyncModelPreferenceImports, EXPECTED_LEGACY_THEME_SYNC_MODEL_PREFERENCE_IMPORTS);
assertListEqual("styles/legacy-canvas.css", legacyCanvasImports, EXPECTED_LEGACY_CANVAS_IMPORTS);
assertListEqual("styles/legacy-canvas-choice-overlays.css", legacyCanvasChoiceOverlayImports, EXPECTED_LEGACY_CANVAS_CHOICE_OVERLAY_IMPORTS);
assertListEqual("styles/legacy-canvas-world.css", legacyCanvasWorldImports, EXPECTED_LEGACY_CANVAS_WORLD_IMPORTS);
assertListEqual("styles/legacy-canvas-video-generator.css", legacyCanvasVideoGeneratorImports, EXPECTED_LEGACY_CANVAS_VIDEO_GENERATOR_IMPORTS);
assertListEqual("styles/legacy-canvas-project-header.css", legacyCanvasProjectHeaderImports, EXPECTED_LEGACY_CANVAS_PROJECT_HEADER_IMPORTS);
assertListEqual("styles/legacy-canvas-shell.css", legacyCanvasShellImports, EXPECTED_LEGACY_CANVAS_SHELL_IMPORTS);
assertListEqual("styles/legacy-canvas-image-edit.css", legacyCanvasImageEditImports, EXPECTED_LEGACY_CANVAS_IMAGE_EDIT_IMPORTS);
assertListEqual("styles/legacy-canvas-visual.css", legacyCanvasVisualImports, EXPECTED_LEGACY_CANVAS_VISUAL_IMPORTS);
assertListEqual("styles/legacy-canvas-visual-shape-tools.css", legacyCanvasVisualShapeToolsImports, EXPECTED_LEGACY_CANVAS_VISUAL_SHAPE_TOOLS_IMPORTS);
assertListEqual("styles/features/auth.css", authImports, EXPECTED_AUTH_IMPORTS);
assertListEqual("styles/features/node.css", nodeImports, EXPECTED_NODE_IMPORTS);
assertListEqual("styles/features/node-image-edit.css", nodeImageEditImports, EXPECTED_NODE_IMAGE_EDIT_IMPORTS);
assertListEqual("styles/features/node-image-toolbar.css", nodeImageToolbarImports, EXPECTED_NODE_IMAGE_TOOLBAR_IMPORTS);
assertListEqual("styles/features/node-image-panels.css", nodeImagePanelsImports, EXPECTED_NODE_IMAGE_PANELS_IMPORTS);
assertListEqual("styles/features/node-stack.css", nodeStackImports, EXPECTED_NODE_STACK_IMPORTS);
assertListEqual("styles/features/node-media.css", nodeMediaImports, EXPECTED_NODE_MEDIA_IMPORTS);
assertListEqual("styles/features/node-image-generator.css", nodeImageGeneratorImports, EXPECTED_NODE_IMAGE_GENERATOR_IMPORTS);
assertListEqual("styles/features/node-image-generator-base.css", nodeImageGeneratorBaseImports, EXPECTED_NODE_IMAGE_GENERATOR_BASE_IMPORTS);
assertListEqual("styles/features/assets.css", assetImports, EXPECTED_ASSET_IMPORTS);
assertListEqual("styles/features/assets-board.css", assetBoardImports, EXPECTED_ASSET_BOARD_IMPORTS);
assertListEqual("styles/features/assets-save.css", assetSaveImports, EXPECTED_ASSET_SAVE_IMPORTS);
assertListEqual("styles/features/assets-save-popover.css", assetSavePopoverImports, EXPECTED_ASSET_SAVE_POPOVER_IMPORTS);
assertListEqual("styles/features/assets-save-board-popover.css", assetSaveBoardPopoverImports, EXPECTED_ASSET_SAVE_BOARD_POPOVER_IMPORTS);
assertListEqual("styles/features/assets-picker.css", assetPickerImports, EXPECTED_ASSET_PICKER_IMPORTS);
assertListEqual("styles/features/assets-picker-popover.css", assetPickerPopoverImports, EXPECTED_ASSET_PICKER_POPOVER_IMPORTS);
assertListEqual("styles/features/assets-picker-list.css", assetPickerListImports, EXPECTED_ASSET_PICKER_LIST_IMPORTS);
assertListEqual("styles/features/assets-canvas-picker.css", assetCanvasPickerImports, EXPECTED_ASSET_CANVAS_PICKER_IMPORTS);
assertListEqual("styles/features/assets-page.css", assetPageImports, EXPECTED_ASSET_PAGE_IMPORTS);
assertListEqual("styles/features/assets-page-pinterest-legacy.css", assetPagePinterestLegacyImports, EXPECTED_ASSET_PAGE_PINTEREST_LEGACY_IMPORTS);
assertListEqual("styles/features/assets-pinterest.css", assetPinterestImports, EXPECTED_ASSET_PINTEREST_IMPORTS);
assertListEqual("styles/features/assets-pinterest-board.css", assetPinterestBoardImports, EXPECTED_ASSET_PINTEREST_BOARD_IMPORTS);
assertListEqual("styles/features/assets-pinterest-shell.css", assetPinterestShellImports, EXPECTED_ASSET_PINTEREST_SHELL_IMPORTS);
assertListEqual("styles/features/assets-pinterest-board-refresh.css", assetPinterestBoardRefreshImports, EXPECTED_ASSET_PINTEREST_BOARD_REFRESH_IMPORTS);
assertListEqual("styles/features/assets-pinterest-pin.css", assetPinterestPinImports, EXPECTED_ASSET_PINTEREST_PIN_IMPORTS);
assertListEqual("styles/features/assets-pinterest-responsive.css", assetPinterestResponsiveImports, EXPECTED_ASSET_PINTEREST_RESPONSIVE_IMPORTS);
assertListEqual("styles/features/home.css", homeImports, EXPECTED_HOME_IMPORTS);
assertListEqual("styles/features/home-history.css", homeHistoryImports, EXPECTED_HOME_HISTORY_IMPORTS);
assertListEqual("styles/features/home-community.css", homeCommunityImports, EXPECTED_HOME_COMMUNITY_IMPORTS);
assertListEqual("styles/features/home-shell.css", homeShellImports, EXPECTED_HOME_SHELL_IMPORTS);
checkImportedFilesExist(stylesImports, ".");
checkImportedFilesExist(workspaceImports, "styles");
checkImportedFilesExist(projectLibraryImports, "styles/features");
checkImportedFilesExist(legacySplitImports, "styles");
checkImportedFilesExist(legacyThemeIosImports, "styles");
checkImportedFilesExist(legacyChatImports, "styles");
checkImportedFilesExist(legacyCompactControlsImports, "styles");
checkImportedFilesExist(legacyThemeSyncImports, "styles");
checkImportedFilesExist(legacyThemeSyncNodeMediaImports, "styles");
checkImportedFilesExist(legacyThemeSyncModelPreferenceImports, "styles");
checkImportedFilesExist(legacyCanvasImports, "styles");
checkImportedFilesExist(legacyCanvasChoiceOverlayImports, "styles");
checkImportedFilesExist(legacyCanvasWorldImports, "styles");
checkImportedFilesExist(legacyCanvasVideoGeneratorImports, "styles");
checkImportedFilesExist(legacyCanvasProjectHeaderImports, "styles");
checkImportedFilesExist(legacyCanvasShellImports, "styles");
checkImportedFilesExist(legacyCanvasImageEditImports, "styles");
checkImportedFilesExist(legacyCanvasVisualImports, "styles");
checkImportedFilesExist(legacyCanvasVisualShapeToolsImports, "styles");
checkImportedFilesExist(authImports, "styles/features");
checkImportedFilesExist(nodeImports, "styles/features");
checkImportedFilesExist(nodeImageEditImports, "styles/features");
checkImportedFilesExist(nodeImageToolbarImports, "styles/features");
checkImportedFilesExist(nodeImagePanelsImports, "styles/features");
checkImportedFilesExist(nodeStackImports, "styles/features");
checkImportedFilesExist(nodeMediaImports, "styles/features");
checkImportedFilesExist(nodeImageGeneratorImports, "styles/features");
checkImportedFilesExist(nodeImageGeneratorBaseImports, "styles/features");
checkImportedFilesExist(assetImports, "styles/features");
checkImportedFilesExist(assetBoardImports, "styles/features");
checkImportedFilesExist(assetSaveImports, "styles/features");
checkImportedFilesExist(assetSavePopoverImports, "styles/features");
checkImportedFilesExist(assetSaveBoardPopoverImports, "styles/features");
checkImportedFilesExist(assetPickerImports, "styles/features");
checkImportedFilesExist(assetPickerPopoverImports, "styles/features");
checkImportedFilesExist(assetPickerListImports, "styles/features");
checkImportedFilesExist(assetCanvasPickerImports, "styles/features");
checkImportedFilesExist(assetPageImports, "styles/features");
checkImportedFilesExist(assetPagePinterestLegacyImports, "styles/features");
checkImportedFilesExist(assetPinterestImports, "styles/features");
checkImportedFilesExist(assetPinterestBoardImports, "styles/features");
checkImportedFilesExist(assetPinterestShellImports, "styles/features");
checkImportedFilesExist(assetPinterestBoardRefreshImports, "styles/features");
checkImportedFilesExist(assetPinterestPinImports, "styles/features");
checkImportedFilesExist(assetPinterestResponsiveImports, "styles/features");
checkImportedFilesExist(homeImports, "styles/features");
checkImportedFilesExist(homeHistoryImports, "styles/features");
checkImportedFilesExist(homeCommunityImports, "styles/features");
checkImportedFilesExist(homeShellImports, "styles/features");
checkCssReachability();
checkFileContains("styles/features/auth-account.css", EXPECTED_AUTH_ACCOUNT_SELECTORS);
checkFileContains("styles/features/auth-credit-detail.css", EXPECTED_AUTH_CREDIT_DETAIL_SELECTORS);
checkFileContains("styles/features/auth-dialog.css", EXPECTED_AUTH_DIALOG_SELECTORS);
checkFileContains("styles/features/assets-floating-library.css", EXPECTED_ASSET_PAGE_SELECTORS);
checkFileContains("styles/features/assets-page-view.css", EXPECTED_ASSET_PAGE_VIEW_SELECTORS);
checkFileContains("styles/features/assets-page-pinterest-legacy.css", EXPECTED_ASSET_PAGE_PINTEREST_LEGACY_SELECTORS);
checkFileContains("styles/features/assets-page-pinterest-shell-legacy.css", EXPECTED_ASSET_PAGE_PINTEREST_SHELL_LEGACY_SELECTORS);
checkFileContains("styles/features/assets-page-pinterest-board-legacy.css", EXPECTED_ASSET_PAGE_PINTEREST_BOARD_LEGACY_SELECTORS);
checkFileContains("styles/features/assets-page-pinterest-pin-legacy.css", EXPECTED_ASSET_PAGE_PINTEREST_PIN_LEGACY_SELECTORS);
checkFileContains("styles/features/assets-page-pinterest-responsive-legacy.css", EXPECTED_ASSET_PAGE_PINTEREST_RESPONSIVE_LEGACY_SELECTORS);
checkFileContains("styles/features/assets-board.css", EXPECTED_ASSET_BOARD_SELECTORS);
checkFileContains("styles/features/assets-board-shell.css", EXPECTED_ASSET_BOARD_SHELL_SELECTORS);
checkFileContains("styles/features/assets-board-card.css", EXPECTED_ASSET_BOARD_CARD_SELECTORS);
checkFileContains("styles/features/assets-board-item.css", EXPECTED_ASSET_BOARD_ITEM_SELECTORS);
checkFileContains("styles/features/assets-save.css", EXPECTED_ASSET_SAVE_SELECTORS);
checkFileContains("styles/features/assets-save-popover.css", EXPECTED_ASSET_SAVE_POPOVER_SELECTORS);
checkFileContains("styles/features/assets-save-popover-shell.css", EXPECTED_ASSET_SAVE_POPOVER_SHELL_SELECTORS);
checkFileContains("styles/features/assets-save-popover-list.css", EXPECTED_ASSET_SAVE_POPOVER_LIST_SELECTORS);
checkFileContains("styles/features/assets-save-board-popover.css", EXPECTED_ASSET_SAVE_BOARD_POPOVER_SELECTORS);
checkFileContains("styles/features/assets-save-board-popover-shell.css", EXPECTED_ASSET_SAVE_BOARD_POPOVER_SHELL_SELECTORS);
checkFileContains("styles/features/assets-save-board-popover-list.css", EXPECTED_ASSET_SAVE_BOARD_POPOVER_LIST_SELECTORS);
checkFileContains("styles/features/assets-save-board-popover-new.css", EXPECTED_ASSET_SAVE_BOARD_POPOVER_NEW_SELECTORS);
checkFileContains("styles/features/assets-picker.css", EXPECTED_ASSET_PICKER_SELECTORS);
checkFileContains("styles/features/assets-picker-popover.css", EXPECTED_ASSET_PICKER_POPOVER_SELECTORS);
checkFileContains("styles/features/assets-picker-popover-shell.css", EXPECTED_ASSET_PICKER_POPOVER_SHELL_SELECTORS);
checkFileContains("styles/features/assets-picker-popover-head.css", EXPECTED_ASSET_PICKER_POPOVER_HEAD_SELECTORS);
checkFileContains("styles/features/assets-picker-list.css", EXPECTED_ASSET_PICKER_LIST_SELECTORS);
checkFileContains("styles/features/assets-picker-list-item.css", EXPECTED_ASSET_PICKER_LIST_ITEM_SELECTORS);
checkFileContains("styles/features/assets-picker-list-empty.css", EXPECTED_ASSET_PICKER_LIST_EMPTY_SELECTORS);
checkFileContains("styles/features/assets-picker-preview.css", EXPECTED_ASSET_PICKER_PREVIEW_SELECTORS);
checkFileContains("styles/features/assets-canvas-picker.css", EXPECTED_ASSET_CANVAS_PICKER_SELECTORS);
checkFileContains("styles/features/assets-canvas-picker-shell.css", EXPECTED_ASSET_CANVAS_PICKER_SHELL_SELECTORS);
checkFileContains("styles/features/assets-canvas-picker-projects.css", EXPECTED_ASSET_CANVAS_PICKER_PROJECTS_SELECTORS);
checkFileContains("styles/features/assets-context-menu.css", EXPECTED_ASSET_CONTEXT_MENU_SELECTORS);
checkFileContains("styles/features/assets-pinterest.css", EXPECTED_ASSET_PINTEREST_SELECTORS);
checkFileContains("styles/features/assets-pinterest-shell.css", EXPECTED_ASSET_PINTEREST_SHELL_SELECTORS);
checkFileContains("styles/features/assets-pinterest-shell-header.css", EXPECTED_ASSET_PINTEREST_SHELL_HEADER_SELECTORS);
checkFileContains("styles/features/assets-pinterest-shell-stats.css", EXPECTED_ASSET_PINTEREST_SHELL_STATS_SELECTORS);
checkFileContains("styles/features/assets-pinterest-shell-nav.css", EXPECTED_ASSET_PINTEREST_SHELL_NAV_SELECTORS);
checkFileContains("styles/features/assets-pinterest-board.css", EXPECTED_ASSET_PINTEREST_BOARD_SELECTORS);
checkFileContains("styles/features/assets-pinterest-board-shell-legacy.css", EXPECTED_ASSET_PINTEREST_BOARD_SHELL_LEGACY_SELECTORS);
checkFileContains("styles/features/assets-pinterest-board-tiles-legacy.css", EXPECTED_ASSET_PINTEREST_BOARD_TILES_LEGACY_SELECTORS);
checkFileContains("styles/features/assets-pinterest-board-masonry-legacy.css", EXPECTED_ASSET_PINTEREST_BOARD_MASONRY_LEGACY_SELECTORS);
checkFileContains("styles/features/assets-pinterest-board-responsive-legacy.css", EXPECTED_ASSET_PINTEREST_BOARD_RESPONSIVE_LEGACY_SELECTORS);
checkFileContains("styles/features/assets-pinterest-board-refresh.css", EXPECTED_ASSET_PINTEREST_BOARD_REFRESH_SELECTORS);
checkFileContains("styles/features/assets-pinterest-board-refresh-grid.css", EXPECTED_ASSET_PINTEREST_BOARD_REFRESH_GRID_SELECTORS);
checkFileContains("styles/features/assets-pinterest-board-refresh-create.css", EXPECTED_ASSET_PINTEREST_BOARD_REFRESH_CREATE_SELECTORS);
checkFileContains("styles/features/assets-pinterest-board-refresh-meta.css", EXPECTED_ASSET_PINTEREST_BOARD_REFRESH_META_SELECTORS);
checkFileContains("styles/features/assets-pinterest-pin.css", EXPECTED_ASSET_PINTEREST_PIN_SELECTORS);
checkFileContains("styles/features/assets-pinterest-pin-card.css", EXPECTED_ASSET_PINTEREST_PIN_CARD_SELECTORS);
checkFileContains("styles/features/assets-pinterest-pin-actions.css", EXPECTED_ASSET_PINTEREST_PIN_ACTIONS_SELECTORS);
checkFileContains("styles/features/assets-pinterest-pin-empty.css", EXPECTED_ASSET_PINTEREST_PIN_EMPTY_SELECTORS);
checkFileContains("styles/features/assets-pinterest-layout.css", EXPECTED_ASSET_PINTEREST_LAYOUT_SELECTORS);
checkFileContains("styles/features/assets-pinterest-responsive.css", EXPECTED_ASSET_PINTEREST_RESPONSIVE_SELECTORS);
checkFileContains("styles/features/assets-pinterest-responsive-breakpoints.css", EXPECTED_ASSET_PINTEREST_RESPONSIVE_BREAKPOINTS_SELECTORS);
checkFileContains("styles/features/assets-pinterest-responsive-interactions.css", EXPECTED_ASSET_PINTEREST_RESPONSIVE_INTERACTIONS_SELECTORS);
checkFileContains("styles/features/assets.css", EXPECTED_ASSET_SELECTORS);
checkFileContains("styles/features/chat.css", EXPECTED_CHAT_SELECTORS);
checkFileContains("styles/legacy-theme-ios.css", EXPECTED_LEGACY_THEME_IOS_SELECTORS);
checkFileContains("styles/legacy-theme-ios-base.css", EXPECTED_LEGACY_THEME_IOS_BASE_SELECTORS);
checkFileContains("styles/legacy-theme-ios-chrome.css", EXPECTED_LEGACY_THEME_IOS_CHROME_SELECTORS);
checkFileContains("styles/legacy-theme-ios-node-media.css", EXPECTED_LEGACY_THEME_IOS_NODE_MEDIA_SELECTORS);
checkFileContains("styles/legacy-theme-ios-chat-composer.css", EXPECTED_LEGACY_THEME_IOS_CHAT_COMPOSER_SELECTORS);
checkFileContains("styles/legacy-theme-sync-base.css", EXPECTED_LEGACY_THEME_SYNC_BASE_SELECTORS);
checkFileContains("styles/legacy-theme-sync-surfaces.css", EXPECTED_LEGACY_THEME_SYNC_SURFACES_SELECTORS);
checkFileContains("styles/legacy-theme-sync-image-edit.css", EXPECTED_LEGACY_THEME_SYNC_IMAGE_EDIT_SELECTORS);
checkFileContains("styles/legacy-theme-sync-crop-expand.css", EXPECTED_LEGACY_THEME_SYNC_CROP_EXPAND_SELECTORS);
checkFileContains("styles/legacy-theme-sync-media-edit.css", EXPECTED_LEGACY_THEME_SYNC_MEDIA_EDIT_SELECTORS);
checkFileContains("styles/legacy-theme-sync-node-media.css", EXPECTED_LEGACY_THEME_SYNC_NODE_MEDIA_SELECTORS);
checkFileContains("styles/legacy-theme-sync-node-media-card.css", EXPECTED_LEGACY_THEME_SYNC_NODE_MEDIA_CARD_SELECTORS);
checkFileContains("styles/legacy-theme-sync-node-media-ai.css", EXPECTED_LEGACY_THEME_SYNC_NODE_MEDIA_AI_SELECTORS);
checkFileContains("styles/legacy-theme-sync-node-media-canvas.css", EXPECTED_LEGACY_THEME_SYNC_NODE_MEDIA_CANVAS_SELECTORS);
checkFileContains("styles/legacy-theme-sync-compact-select.css", EXPECTED_LEGACY_THEME_SYNC_COMPACT_SELECT_SELECTORS);
checkFileContains("styles/legacy-theme-sync-model-preference.css", EXPECTED_LEGACY_THEME_SYNC_MODEL_PREFERENCE_SELECTORS);
checkFileContains("styles/legacy-theme-sync-model-preference-menu.css", EXPECTED_LEGACY_THEME_SYNC_MODEL_PREFERENCE_MENU_SELECTORS);
checkFileContains("styles/legacy-theme-sync-model-preference-panel.css", EXPECTED_LEGACY_THEME_SYNC_MODEL_PREFERENCE_PANEL_SELECTORS);
checkFileContains("styles/legacy-theme-sync-model-preference-color-fix.css", EXPECTED_LEGACY_THEME_SYNC_MODEL_PREFERENCE_COLOR_FIX_SELECTORS);
checkFileContains("styles/legacy-theme-sync-credit-submit.css", EXPECTED_LEGACY_THEME_SYNC_CREDIT_SUBMIT_SELECTORS);
checkFileContains("styles/legacy-theme-sync.css", EXPECTED_LEGACY_THEME_SYNC_SELECTORS);
checkFileContains("styles/legacy-canvas-shell.css", EXPECTED_LEGACY_CANVAS_SHELL_SELECTORS);
checkFileContains("styles/legacy-canvas-shell-brand.css", EXPECTED_LEGACY_CANVAS_SHELL_BRAND_SELECTORS);
checkFileContains("styles/legacy-canvas-shell-actions.css", EXPECTED_LEGACY_CANVAS_SHELL_ACTIONS_SELECTORS);
checkFileContains("styles/legacy-canvas-shell-tool-rail.css", EXPECTED_LEGACY_CANVAS_SHELL_TOOL_RAIL_SELECTORS);
checkFileContains("styles/legacy-canvas-shell-menus.css", EXPECTED_LEGACY_CANVAS_SHELL_MENUS_SELECTORS);
checkFileContains("styles/legacy-canvas-shell-selection.css", EXPECTED_LEGACY_CANVAS_SHELL_SELECTION_SELECTORS);
checkFileContains("styles/legacy-canvas-image-edit-popover.css", EXPECTED_LEGACY_CANVAS_IMAGE_EDIT_SELECTORS);
checkFileContains("styles/legacy-canvas-image-edit-generator-select.css", EXPECTED_LEGACY_CANVAS_IMAGE_EDIT_GENERATOR_SELECT_SELECTORS);
checkFileContains("styles/legacy-canvas-image-edit-compact-select.css", EXPECTED_LEGACY_CANVAS_IMAGE_EDIT_COMPACT_SELECT_SELECTORS);
checkFileContains("styles/legacy-canvas-image-edit-footer.css", EXPECTED_LEGACY_CANVAS_IMAGE_EDIT_FOOTER_SELECTORS);
checkFileContains("styles/legacy-canvas-add-node.css", EXPECTED_LEGACY_CANVAS_ADD_NODE_SELECTORS);
checkFileContains("styles/legacy-canvas-choice-overlays.css", EXPECTED_LEGACY_CANVAS_CHOICE_OVERLAY_SELECTORS);
checkFileContains("styles/legacy-canvas-choice-viewport.css", EXPECTED_LEGACY_CANVAS_CHOICE_VIEWPORT_SELECTORS);
checkFileContains("styles/legacy-canvas-choice-upload.css", EXPECTED_LEGACY_CANVAS_CHOICE_UPLOAD_SELECTORS);
checkFileContains("styles/legacy-canvas-choice-generation.css", EXPECTED_LEGACY_CANVAS_CHOICE_GENERATION_SELECTORS);
checkFileContains("styles/legacy-canvas-choice-floating-suggestions.css", EXPECTED_LEGACY_CANVAS_CHOICE_FLOATING_SUGGESTIONS_SELECTORS);
checkFileContains("styles/legacy-canvas-choice-keyframes.css", EXPECTED_LEGACY_CANVAS_CHOICE_KEYFRAMES_SELECTORS);
checkFileContains("styles/legacy-canvas-world.css", EXPECTED_LEGACY_CANVAS_WORLD_SELECTORS);
checkFileContains("styles/legacy-canvas-world-selection.css", EXPECTED_LEGACY_CANVAS_WORLD_SELECTION_SELECTORS);
checkFileContains("styles/legacy-canvas-world-stage.css", EXPECTED_LEGACY_CANVAS_WORLD_STAGE_SELECTORS);
checkFileContains("styles/legacy-canvas-world-empty-state.css", EXPECTED_LEGACY_CANVAS_WORLD_EMPTY_STATE_SELECTORS);
checkFileContains("styles/legacy-canvas-world-hints.css", EXPECTED_LEGACY_CANVAS_WORLD_HINTS_SELECTORS);
checkFileContains("styles/legacy-canvas-video-generator.css", EXPECTED_LEGACY_CANVAS_VIDEO_GENERATOR_SELECTORS);
checkFileContains("styles/legacy-canvas-video-generator-shell.css", EXPECTED_LEGACY_CANVAS_VIDEO_GENERATOR_SHELL_SELECTORS);
checkFileContains("styles/legacy-canvas-video-generator-reference.css", EXPECTED_LEGACY_CANVAS_VIDEO_GENERATOR_REFERENCE_SELECTORS);
checkFileContains("styles/legacy-canvas-video-generator-controls.css", EXPECTED_LEGACY_CANVAS_VIDEO_GENERATOR_CONTROLS_SELECTORS);
checkFileContains("styles/legacy-canvas-project-header.css", EXPECTED_LEGACY_CANVAS_PROJECT_HEADER_SELECTORS);
checkFileContains("styles/legacy-canvas-project-header-shell.css", EXPECTED_LEGACY_CANVAS_PROJECT_HEADER_SHELL_SELECTORS);
checkFileContains("styles/legacy-canvas-project-header-title.css", EXPECTED_LEGACY_CANVAS_PROJECT_HEADER_TITLE_SELECTORS);
checkFileContains("styles/legacy-canvas-project-header-status.css", EXPECTED_LEGACY_CANVAS_PROJECT_HEADER_STATUS_SELECTORS);
checkFileContains("styles/legacy-canvas-project-header-return.css", EXPECTED_LEGACY_CANVAS_PROJECT_HEADER_RETURN_SELECTORS);
checkFileContains("styles/legacy-canvas-library.css", EXPECTED_LEGACY_CANVAS_LIBRARY_SELECTORS);
checkFileContains("styles/legacy-canvas-visual-shape-tools.css", EXPECTED_LEGACY_CANVAS_VISUAL_SHAPE_TOOLS_SELECTORS);
checkFileContains("styles/legacy-canvas-visual-selection-draw.css", EXPECTED_LEGACY_CANVAS_VISUAL_SELECTION_DRAW_SELECTORS);
checkFileContains("styles/legacy-canvas-visual-text-editor.css", EXPECTED_LEGACY_CANVAS_VISUAL_TEXT_EDITOR_SELECTORS);
checkFileContains("styles/legacy-canvas-visual-shape-toolbar.css", EXPECTED_LEGACY_CANVAS_VISUAL_SHAPE_TOOLBAR_SELECTORS);
checkFileContains("styles/legacy-canvas-visual-text-toolbar.css", EXPECTED_LEGACY_CANVAS_VISUAL_TEXT_TOOLBAR_SELECTORS);
checkFileContains("styles/legacy-canvas-visual-media.css", EXPECTED_LEGACY_CANVAS_VISUAL_MEDIA_SELECTORS);
checkFileContains("styles/legacy-canvas-visual-shell.css", EXPECTED_LEGACY_CANVAS_VISUAL_SHELL_SELECTORS);
checkFileContains("styles/features/home.css", EXPECTED_HOME_SELECTORS);
checkFileContains("styles/features/home-shell.css", EXPECTED_HOME_SHELL_SELECTORS);
checkFileContains("styles/features/home-shell-boot.css", EXPECTED_HOME_SHELL_BOOT_SELECTORS);
checkFileContains("styles/features/home-shell-prompt.css", EXPECTED_HOME_SHELL_PROMPT_SELECTORS);
checkFileContains("styles/features/home-shell-model.css", EXPECTED_HOME_SHELL_MODEL_SELECTORS);
checkFileContains("styles/features/home-shell-transition.css", EXPECTED_HOME_SHELL_TRANSITION_SELECTORS);
checkFileContains("styles/features/home-history-stack.css", EXPECTED_HOME_HISTORY_SELECTORS);
checkFileContains("styles/features/home-history-section.css", EXPECTED_HOME_HISTORY_SECTION_SELECTORS);
checkFileContains("styles/features/home-history-cards.css", EXPECTED_HOME_HISTORY_CARD_SELECTORS);
checkFileContains("styles/features/home-community.css", EXPECTED_HOME_COMMUNITY_SELECTORS);
checkFileContains("styles/features/home-community-channels.css", EXPECTED_HOME_COMMUNITY_CHANNEL_SELECTORS);
checkFileContains("styles/features/home-community-feed.css", EXPECTED_HOME_COMMUNITY_FEED_SELECTORS);
checkFileContains("styles/features/home-community-inspiration.css", EXPECTED_HOME_COMMUNITY_INSPIRATION_SELECTORS);
checkFileContains("styles/features/node-base.css", EXPECTED_NODE_BASE_SELECTORS);
checkFileContains("styles/features/node-image-edit-state.css", EXPECTED_NODE_IMAGE_EDIT_SELECTORS);
checkFileContains("styles/features/node-image-crop.css", EXPECTED_NODE_IMAGE_CROP_SELECTORS);
checkFileContains("styles/features/node-image-expand.css", EXPECTED_NODE_IMAGE_EXPAND_SELECTORS);
checkFileContains("styles/features/node-state.css", EXPECTED_NODE_STATE_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-base.css", EXPECTED_NODE_IMAGE_TOOLBAR_BASE_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-upscale.css", EXPECTED_NODE_IMAGE_TOOLBAR_UPSCALE_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-menu.css", EXPECTED_NODE_IMAGE_TOOLBAR_MENU_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-savebar.css", EXPECTED_NODE_IMAGE_TOOLBAR_SAVEBAR_SELECTORS);
checkFileContains("styles/features/node-image-text-panel.css", EXPECTED_NODE_IMAGE_TEXT_PANEL_SELECTORS);
checkFileContains("styles/features/node-image-lightbox.css", EXPECTED_NODE_IMAGE_LIGHTBOX_SELECTORS);
checkFileContains("styles/features/node-stack-base.css", EXPECTED_NODE_STACK_BASE_SELECTORS);
checkFileContains("styles/features/node-stack-tray.css", EXPECTED_NODE_STACK_TRAY_SELECTORS);
checkFileContains("styles/features/node-director.css", EXPECTED_NODE_DIRECTOR_SELECTORS);
checkFileContains("styles/features/node-media-shell.css", EXPECTED_NODE_MEDIA_SHELL_SELECTORS);
checkFileContains("styles/features/node-media-video.css", EXPECTED_NODE_MEDIA_VIDEO_SELECTORS);
checkFileContains("styles/features/node-media-frame.css", EXPECTED_NODE_MEDIA_FRAME_SELECTORS);
checkFileContains("styles/features/node-generation.css", EXPECTED_NODE_GENERATION_SELECTORS);
checkFileContains("styles/features/node-image-generator-shell.css", EXPECTED_NODE_IMAGE_GENERATOR_BASE_SELECTORS);
checkFileContains("styles/features/node-image-generator-panel.css", EXPECTED_NODE_IMAGE_GENERATOR_PANEL_SELECTORS);
checkFileContains("styles/features/node-image-generator-glass.css", EXPECTED_NODE_IMAGE_GENERATOR_GLASS_SELECTORS);
checkFileContains("styles/features/node-image-generator-inline-edit.css", EXPECTED_NODE_IMAGE_GENERATOR_INLINE_EDIT_SELECTORS);
checkFileContains("styles/features/node-preview.css", EXPECTED_NODE_PREVIEW_SELECTORS);
checkFileContains("styles/features/node.css", EXPECTED_NODE_SELECTORS);
checkFileContains("styles/features/project-library.css", EXPECTED_PROJECT_LIBRARY_SELECTORS);
checkFileContains("styles/features/project-library-shell.css", EXPECTED_PROJECT_LIBRARY_SHELL_SELECTORS);
checkFileContains("styles/features/project-library-cards.css", EXPECTED_PROJECT_LIBRARY_CARDS_SELECTORS);
checkFileContains("styles/features/project-library-page.css", EXPECTED_PROJECT_LIBRARY_PAGE_SELECTORS);
checkFileContains("styles/legacy-canvas.css", EXPECTED_LEGACY_CANVAS_SELECTORS);
checkFileContains("styles/legacy-canvas-visual.css", EXPECTED_LEGACY_CANVAS_VISUAL_SELECTORS);
checkFileContains("styles/legacy-node.css", EXPECTED_LEGACY_NODE_SELECTORS);
checkFileContains("styles/legacy-chat.css", EXPECTED_LEGACY_CHAT_SELECTORS);
checkFileContains("styles/legacy-chat-agent.css", EXPECTED_LEGACY_CHAT_AGENT_SELECTORS);
checkFileContains("styles/legacy-chat-composer.css", EXPECTED_LEGACY_CHAT_COMPOSER_SELECTORS);
checkFileContains("styles/legacy-chat-message.css", EXPECTED_LEGACY_CHAT_MESSAGE_SELECTORS);
checkFileContains("styles/legacy-chat-shell.css", EXPECTED_LEGACY_CHAT_SHELL_SELECTORS);
checkFileContains("styles/legacy-chat-responsive.css", EXPECTED_LEGACY_CHAT_RESPONSIVE_SELECTORS);
checkFileContains("styles/legacy-compact-bottom-controls.css", EXPECTED_LEGACY_COMPACT_BOTTOM_CONTROLS_SELECTORS);
checkFileContains("styles/legacy-compact-project-menu.css", EXPECTED_LEGACY_COMPACT_PROJECT_MENU_SELECTORS);
checkFileContains("styles/legacy-compact-tool-rail.css", EXPECTED_LEGACY_COMPACT_TOOL_RAIL_SELECTORS);

if (errors.length > 0) {
  console.error("Style entry check failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Style entry checks passed.");
