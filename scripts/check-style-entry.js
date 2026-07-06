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
const EXPECTED_IMAGE_COMPARE_IMPORTS = [
  "./image-compare-shell.css",
  "./image-compare-controls.css",
  "./image-compare-slider.css",
  "./image-compare-modes.css"
];
const EXPECTED_TASK_LOG_IMPORTS = [
  "./task-log-shell.css",
  "./task-log-table.css",
  "./task-log-modal.css",
  "./task-log-output.css",
  "./task-log-responsive.css"
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
const EXPECTED_PROJECT_LIBRARY_PAGE_IMPORTS = [
  "./project-library-page-layout.css",
  "./project-library-page-cards.css",
  "./project-library-page-new-card.css",
  "./project-library-page-card-content.css",
  "./project-library-page-responsive.css"
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
const EXPECTED_LEGACY_COMPACT_TOOL_RAIL_IMPORTS = [
  "./legacy-compact-tool-rail-shell.css",
  "./legacy-compact-tool-rail-items.css",
  "./legacy-compact-tool-rail-light.css"
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
const EXPECTED_LEGACY_THEME_SYNC_MODEL_PREFERENCE_PANEL_IMPORTS = [
  "./legacy-theme-sync-model-preference-panel-shell.css",
  "./legacy-theme-sync-model-preference-panel-tabs.css",
  "./legacy-theme-sync-model-preference-panel-list.css",
  "./legacy-theme-sync-model-preference-panel-option.css",
  "./legacy-theme-sync-model-preference-panel-meta.css"
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
const EXPECTED_LEGACY_CANVAS_VISUAL_SHELL_IMPORTS = [
  "./legacy-canvas-visual-shell-brand-menu.css",
  "./legacy-canvas-visual-shell-home-menu.css",
  "./legacy-canvas-visual-shell-simple-page.css"
];
const EXPECTED_LEGACY_CANVAS_VISUAL_SHAPE_TOOLS_IMPORTS = [
  "./legacy-canvas-visual-selection-draw.css",
  "./legacy-canvas-visual-text-editor.css",
  "./legacy-canvas-visual-shape-toolbar.css",
  "./legacy-canvas-visual-text-toolbar.css"
];
const EXPECTED_TASK_LOG_SHELL_SELECTORS = [
  "body[data-view=\"space\"] .profile-view",
  "#taskLogPage.task-log-page",
  ".task-log-heading",
  ".task-log-refresh",
  ".task-log-panel",
  ".task-log-toolbar",
  ".task-log-control"
];
const EXPECTED_TASK_LOG_TABLE_SELECTORS = [
  ".task-log-table-wrap",
  ".task-log-table",
  ".task-log-type",
  ".task-log-task-id",
  ".task-log-icon-button",
  ".task-log-status",
  ".task-log-action",
  ".task-log-footer",
  ".task-log-pagination"
];
const EXPECTED_TASK_LOG_MODAL_SELECTORS = [
  ".task-log-modal[hidden]",
  ".task-log-modal",
  ".task-log-modal-backdrop",
  ".task-log-modal-card",
  ".task-log-detail-body",
  ".task-log-detail-grid",
  ".task-log-failure",
  ".task-log-muted"
];
const EXPECTED_TASK_LOG_OUTPUT_SELECTORS = [
  ".task-log-output-preview",
  ".task-log-output-item",
  ".task-log-output-image",
  ".task-log-output-video"
];
const EXPECTED_TASK_LOG_RESPONSIVE_SELECTORS = [
  "@media (max-width: 900px)",
  "#taskLogPage.task-log-page",
  ".task-log-heading",
  ".task-log-detail-grid"
];
const EXPECTED_IMAGE_COMPARE_SELECTORS = [
  "@import url(\"./image-compare-shell.css\")",
  "@import url(\"./image-compare-controls.css\")",
  "@import url(\"./image-compare-slider.css\")",
  "@import url(\"./image-compare-modes.css\")"
];
const EXPECTED_IMAGE_COMPARE_SHELL_SELECTORS = [
  ".image-compare-modal",
  ".image-compare-backdrop",
  ".image-compare-card",
  ".image-compare-header",
  ".image-compare-close"
];
const EXPECTED_IMAGE_COMPARE_CONTROLS_SELECTORS = [
  ".image-compare-tabs",
  ".image-compare-titlebar",
  ".image-compare-titlebar button"
];
const EXPECTED_IMAGE_COMPARE_SLIDER_SELECTORS = [
  ".image-compare-stage",
  ".image-compare-slider",
  ".image-compare-before",
  ".image-compare-divider",
  ".image-compare-range"
];
const EXPECTED_IMAGE_COMPARE_MODES_SELECTORS = [
  ".image-compare-side-by-side",
  ".image-compare-overlay",
  ".image-compare-overlay-after",
  "@media (max-width: 720px)"
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
const EXPECTED_NODE_BASE_IMPORTS = [
  "./node-base-card.css",
  "./node-base-group.css",
  "./node-base-resize.css",
  "./node-base-actions.css"
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
const EXPECTED_NODE_IMAGE_GENERATOR_PANEL_IMPORTS = [
  "./node-image-generator-panel-shell.css",
  "./node-image-generator-panel-references.css",
  "./node-image-generator-panel-textarea.css",
  "./node-image-generator-panel-controls.css",
  "./node-image-generator-panel-actions.css"
];
const EXPECTED_NODE_IMAGE_GENERATOR_SHELL_IMPORTS = [
  "./node-image-generator-shell-node.css",
  "./node-image-generator-shell-head.css",
  "./node-image-generator-shell-frame.css",
  "./node-image-generator-shell-panel.css",
  "./node-image-generator-shell-actions.css",
  "./node-image-generator-shell-drop.css"
];
const EXPECTED_NODE_IMAGE_GENERATOR_GLASS_IMPORTS = [
  "./node-image-generator-glass-head.css",
  "./node-image-generator-glass-stage.css",
  "./node-image-generator-glass-panel.css",
  "./node-image-generator-glass-references.css",
  "./node-image-generator-glass-controls.css",
  "./node-image-generator-glass-state.css"
];
const EXPECTED_NODE_IMAGE_GENERATOR_INLINE_EDIT_IMPORTS = [
  "./node-image-generator-inline-shell.css",
  "./node-image-generator-inline-references.css",
  "./node-image-generator-inline-textarea.css",
  "./node-image-generator-inline-actions.css",
  "./node-image-generator-inline-responsive.css"
];
const EXPECTED_NODE_IMAGE_EDIT_IMPORTS = [
  "./node-image-edit-state.css",
  "./node-image-crop.css",
  "./node-image-expand.css"
];
const EXPECTED_NODE_IMAGE_CROP_IMPORTS = [
  "./node-image-crop-overlay.css",
  "./node-image-crop-handles.css",
  "./node-image-crop-actions.css"
];
const EXPECTED_NODE_IMAGE_EXPAND_IMPORTS = [
  "./node-image-expand-overlay.css",
  "./node-image-expand-handles.css",
  "./node-image-expand-actions.css",
  "./node-image-expand-state.css"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_IMPORTS = [
  "./node-image-toolbar-base.css",
  "./node-image-toolbar-upscale.css",
  "./node-image-toolbar-menu.css"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_BASE_IMPORTS = [
  "./node-image-toolbar-base-shell.css",
  "./node-image-toolbar-base-menu.css",
  "./node-image-toolbar-base-state.css",
  "./node-image-toolbar-base-buttons.css",
  "./node-image-toolbar-base-main.css"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_UPSCALE_IMPORTS = [
  "./node-image-toolbar-upscale-mode.css",
  "./node-image-toolbar-upscale-size.css",
  "./node-image-toolbar-upscale-generate.css"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_MENU_IMPORTS = [
  "./node-image-toolbar-menu-base.css",
  "./node-image-toolbar-menu-surface.css",
  "./node-image-toolbar-menu-upscale.css",
  "./node-image-toolbar-menu-dark.css"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_MENU_UPSCALE_IMPORTS = [
  "./node-image-toolbar-menu-upscale-card.css",
  "./node-image-toolbar-menu-upscale-hover.css",
  "./node-image-toolbar-menu-upscale-content.css",
  "./node-image-toolbar-menu-upscale-badge.css"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_MENU_DARK_IMPORTS = [
  "./node-image-toolbar-menu-dark-upscale.css",
  "./node-image-toolbar-menu-dark-surface.css",
  "./node-image-toolbar-menu-dark-buttons.css",
  "./node-image-toolbar-menu-dark-size.css"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_SAVEBAR_IMPORTS = [
  "./node-image-toolbar-savebar-shell.css",
  "./node-image-toolbar-savebar-board.css",
  "./node-image-toolbar-savebar-submit.css"
];
const EXPECTED_NODE_IMAGE_PANELS_IMPORTS = [
  "./node-image-text-panel.css",
  "./node-image-lightbox.css"
];
const EXPECTED_NODE_IMAGE_TEXT_PANEL_IMPORTS = [
  "./node-image-text-panel-shell.css",
  "./node-image-text-panel-list.css",
  "./node-image-text-panel-footer.css"
];
const EXPECTED_NODE_IMAGE_LIGHTBOX_IMPORTS = [
  "./node-image-lightbox-overlay.css",
  "./node-image-lightbox-figure.css",
  "./node-image-lightbox-close.css"
];
const EXPECTED_NODE_STACK_IMPORTS = [
  "./node-stack-base.css",
  "./node-stack-tray.css"
];
const EXPECTED_NODE_STACK_BASE_IMPORTS = [
  "./node-stack-base-hidden.css",
  "./node-stack-base-depth.css",
  "./node-stack-base-drop.css",
  "./node-stack-base-toggle.css"
];
const EXPECTED_NODE_STACK_TRAY_IMPORTS = [
  "./node-stack-tray-shell.css",
  "./node-stack-tray-row.css",
  "./node-stack-tray-thumb.css",
  "./node-stack-tray-meta.css"
];
const EXPECTED_NODE_DIRECTOR_IMPORTS = [
  "./node-director-shell.css",
  "./node-director-head.css",
  "./node-director-actions.css",
  "./node-director-tile.css"
];
const EXPECTED_NODE_MEDIA_IMPORTS = [
  "./node-media-shell.css",
  "./node-media-video.css",
  "./node-media-frame.css"
];
const EXPECTED_NODE_MEDIA_SHELL_IMPORTS = [
  "./node-media-shell-2d.css",
  "./node-media-shell-dark.css",
  "./node-media-shell-card.css",
  "./node-media-shell-selected.css"
];
const EXPECTED_NODE_MEDIA_VIDEO_IMPORTS = [
  "./node-media-video-shell.css",
  "./node-media-video-hidden-text.css",
  "./node-media-video-preview.css"
];
const EXPECTED_NODE_MEDIA_FRAME_IMPORTS = [
  "./node-media-frame-selected.css",
  "./node-media-frame-file-name.css",
  "./node-media-frame-image.css"
];
const EXPECTED_NODE_GENERATION_IMPORTS = [
  "./node-generation-frame.css",
  "./node-generation-content.css",
  "./node-generation-state.css",
  "./node-generation-keyframes.css"
];
const EXPECTED_NODE_PREVIEW_IMPORTS = [
  "./node-preview-media.css",
  "./node-preview-model.css",
  "./node-preview-cube-video.css",
  "./node-preview-bottom-controls.css"
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
const EXPECTED_ASSET_CANVAS_PICKER_SHELL_IMPORTS = [
  "./assets-canvas-picker-shell-frame.css",
  "./assets-canvas-picker-shell-head.css"
];
const EXPECTED_ASSET_CANVAS_PICKER_PROJECTS_IMPORTS = [
  "./assets-canvas-picker-projects-row.css",
  "./assets-canvas-picker-projects-meta.css"
];
const EXPECTED_ASSET_CONTEXT_MENU_IMPORTS = [
  "./assets-context-menu-shell.css",
  "./assets-context-menu-items.css",
  "./assets-context-menu-submenu.css"
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
const EXPECTED_ASSET_PAGE_PINTEREST_BOARD_LEGACY_IMPORTS = [
  "./assets-page-pinterest-board-grid-legacy.css",
  "./assets-page-pinterest-board-cover-legacy.css",
  "./assets-page-pinterest-board-meta-legacy.css"
];
const EXPECTED_ASSET_PAGE_PINTEREST_PIN_LEGACY_IMPORTS = [
  "./assets-page-pinterest-pin-shell-legacy.css",
  "./assets-page-pinterest-pin-card-legacy.css",
  "./assets-page-pinterest-pin-actions-legacy.css",
  "./assets-page-pinterest-pin-empty-legacy.css"
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
const EXPECTED_ASSET_PINTEREST_BOARD_TILES_LEGACY_IMPORTS = [
  "./assets-pinterest-board-tiles-grid-legacy.css",
  "./assets-pinterest-board-tiles-cover-legacy.css",
  "./assets-pinterest-board-tiles-meta-legacy.css"
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
const EXPECTED_ASSET_PINTEREST_BOARD_REFRESH_GRID_IMPORTS = [
  "./assets-pinterest-board-refresh-grid-layout.css",
  "./assets-pinterest-board-refresh-grid-cover.css",
  "./assets-pinterest-board-refresh-grid-cells.css",
  "./assets-pinterest-board-refresh-grid-empty.css"
];
const EXPECTED_ASSET_PINTEREST_PIN_IMPORTS = [
  "./assets-pinterest-pin-card.css",
  "./assets-pinterest-pin-actions.css",
  "./assets-pinterest-pin-empty.css"
];
const EXPECTED_ASSET_PINTEREST_PIN_CARD_IMPORTS = [
  "./assets-pinterest-pin-card-shell.css",
  "./assets-pinterest-pin-card-thumb.css",
  "./assets-pinterest-pin-card-meta.css"
];
const EXPECTED_ASSET_PINTEREST_RESPONSIVE_IMPORTS = [
  "./assets-pinterest-responsive-breakpoints.css",
  "./assets-pinterest-responsive-interactions.css"
];
const EXPECTED_ASSET_PINTEREST_RESPONSIVE_INTERACTIONS_IMPORTS = [
  "./assets-pinterest-responsive-interactions-page.css",
  "./assets-pinterest-responsive-interactions-board.css",
  "./assets-pinterest-responsive-interactions-pin.css",
  "./assets-pinterest-responsive-interactions-breakpoints.css"
];
const EXPECTED_HOME_IMPORTS = [
  "./home-history.css",
  "./home-community.css",
  "./home-shell.css",
  "./home-responsive-tablet.css",
  "./home-responsive-mobile.css"
];
const EXPECTED_HOME_HISTORY_IMPORTS = [
  "./home-history-stack.css",
  "./home-history-section.css",
  "./home-history-cards.css"
];
const EXPECTED_HOME_HISTORY_STACK_IMPORTS = [
  "./home-history-stack-shell.css",
  "./home-history-stack-preview.css",
  "./home-history-stack-open.css"
];
const EXPECTED_HOME_HISTORY_SECTION_IMPORTS = [
  "./home-history-section-layout.css",
  "./home-history-section-head.css"
];
const EXPECTED_HOME_HISTORY_SECTION_HEAD_IMPORTS = [
  "./home-history-section-head-base.css",
  "./home-history-section-head-nav.css",
  "./home-history-section-head-action.css"
];
const EXPECTED_HOME_HISTORY_CARDS_IMPORTS = [
  "./home-history-cards-base.css",
  "./home-history-cards-delete.css",
  "./home-history-cards-preview.css",
  "./home-history-cards-meta.css"
];
const EXPECTED_HOME_COMMUNITY_IMPORTS = [
  "./home-community-channels.css",
  "./home-community-feed.css",
  "./home-community-inspiration.css"
];
const EXPECTED_HOME_COMMUNITY_CHANNEL_IMPORTS = [
  "./home-community-channels-shell.css",
  "./home-community-channels-strip.css",
  "./home-community-channels-scroll.css"
];
const EXPECTED_HOME_COMMUNITY_CHANNEL_STRIP_IMPORTS = [
  "./home-community-channels-strip-shell.css",
  "./home-community-channels-strip-button.css",
  "./home-community-channels-strip-tone.css"
];
const EXPECTED_HOME_COMMUNITY_FEED_IMPORTS = [
  "./home-community-feed-masonry.css",
  "./home-community-feed-back-top.css"
];
const EXPECTED_HOME_COMMUNITY_INSPIRATION_IMPORTS = [
  "./home-community-inspiration-grid.css",
  "./home-community-inspiration-card.css"
];
const EXPECTED_HOME_SHELL_IMPORTS = [
  "./home-shell-boot.css",
  "./home-shell-prompt.css",
  "./home-shell-model.css",
  "./home-shell-transition.css"
];
const EXPECTED_HOME_SHELL_PROMPT_IMPORTS = [
  "./home-shell-prompt-stage.css",
  "./home-shell-prompt-form.css",
  "./home-shell-prompt-files.css",
  "./home-shell-prompt-controls.css"
];
const EXPECTED_HOME_SHELL_MODEL_IMPORTS = [
  "./home-shell-model-picker.css",
  "./home-shell-model-menu.css",
  "./home-shell-model-native.css"
];
const ALLOWED_UNREACHABLE_CSS = [
  "styles/legacy-node.css"
];
const EXPECTED_PROJECT_LIBRARY_SELECTORS = [
];
const EXPECTED_PROJECT_LIBRARY_SHELL_IMPORTS = [
  "./project-library-shell-layout.css",
  "./project-library-shell-header.css",
  "./project-library-shell-selection.css",
  "./project-library-shell-empty.css"
];
const EXPECTED_PROJECT_LIBRARY_CARDS_IMPORTS = [
  "./project-library-cards-base.css",
  "./project-library-cards-selection.css",
  "./project-library-cards-content.css",
  "./project-library-cards-responsive.css"
];
const EXPECTED_PROJECT_LIBRARY_SHELL_SELECTORS = [
  "@import url(\"./project-library-shell-layout.css\")",
  "@import url(\"./project-library-shell-header.css\")",
  "@import url(\"./project-library-shell-selection.css\")",
  "@import url(\"./project-library-shell-empty.css\")"
];
const EXPECTED_PROJECT_LIBRARY_SHELL_LAYOUT_SELECTORS = [
  ".library-shell",
  ".library-title",
  ".project-grid"
];
const EXPECTED_PROJECT_LIBRARY_SHELL_HEADER_SELECTORS = [
  ".library-page-header",
  ".library-page-header small"
];
const EXPECTED_PROJECT_LIBRARY_SHELL_SELECTION_SELECTORS = [
  ".library-selection-bar",
  ".library-select-toggle.active",
  ".library-selection-bar button.danger"
];
const EXPECTED_PROJECT_LIBRARY_SHELL_EMPTY_SELECTORS = [
  ".project-empty"
];
const EXPECTED_PROJECT_LIBRARY_CARDS_SELECTORS = [
  "@import url(\"./project-library-cards-base.css\")",
  "@import url(\"./project-library-cards-selection.css\")",
  "@import url(\"./project-library-cards-content.css\")",
  "@import url(\"./project-library-cards-responsive.css\")"
];
const EXPECTED_PROJECT_LIBRARY_CARDS_BASE_SELECTORS = [
  ".project-card-board",
  ".library-new-card",
  ".library-small-card"
];
const EXPECTED_PROJECT_LIBRARY_CARDS_SELECTION_SELECTORS = [
  ".library-card-check",
  ".library-small-card.selected",
  ".library-small-card.selected .library-card-check"
];
const EXPECTED_PROJECT_LIBRARY_CARDS_CONTENT_SELECTORS = [
  ".library-new-card",
  ".library-small-card img",
  ".library-small-card strong"
];
const EXPECTED_PROJECT_LIBRARY_CARDS_RESPONSIVE_SELECTORS = [
  "@media (max-width: 1200px)"
];
const EXPECTED_PROJECT_LIBRARY_PAGE_SELECTORS = [
  "@import url(\"./project-library-page-layout.css\")",
  "@import url(\"./project-library-page-cards.css\")",
  "@import url(\"./project-library-page-new-card.css\")",
  "@import url(\"./project-library-page-card-content.css\")",
  "@import url(\"./project-library-page-responsive.css\")"
];
const EXPECTED_PROJECT_LIBRARY_PAGE_LAYOUT_SELECTORS = [
  "body[data-view=\"library\"] .library-nav",
  "body[data-view=\"library\"] .library-shell",
  "body[data-view=\"library\"] .project-grid.mode-grid",
  "body[data-view=\"library\"] .library-page-header",
  "body[data-view=\"library\"] .library-selection-bar",
  "body[data-view=\"library\"] .project-card-board"
];
const EXPECTED_PROJECT_LIBRARY_PAGE_CARDS_SELECTORS = [
  "body[data-view=\"library\"] .library-new-card,",
  "body[data-view=\"library\"] .library-small-card.selected > button:not(.library-card-check)",
  "body[data-view=\"library\"] .library-small-card.selected > button:not(.library-card-check):hover"
];
const EXPECTED_PROJECT_LIBRARY_PAGE_NEW_CARD_SELECTORS = [
  "body[data-view=\"library\"] .library-new-card",
  "body[data-view=\"library\"] .library-new-card span",
  "body[data-view=\"library\"] .library-new-card strong",
  "body[data-view=\"library\"] .library-new-card small"
];
const EXPECTED_PROJECT_LIBRARY_PAGE_CARD_CONTENT_SELECTORS = [
  "body[data-view=\"library\"] .library-small-card div",
  "body[data-view=\"library\"] .library-small-card strong",
  "body[data-view=\"library\"] .library-small-card small"
];
const EXPECTED_PROJECT_LIBRARY_PAGE_RESPONSIVE_SELECTORS = [
  "@media (max-width: 900px)",
  "body[data-view=\"library\"] .project-card-board",
  "@keyframes librarySlideUp"
];
const EXPECTED_HOME_SELECTORS = [
  "@import url(\"./home-history.css\")",
  "@import url(\"./home-community.css\")",
  "@import url(\"./home-shell.css\")",
  "@import url(\"./home-responsive-tablet.css\")",
  "@import url(\"./home-responsive-mobile.css\")"
];
const EXPECTED_HOME_RESPONSIVE_TABLET_SELECTORS = [
  "@media (max-width: 1100px)",
  ".home-history",
  ".home-community-section",
  ".home-inspiration-grid",
  ".home-masonry-feed"
];
const EXPECTED_HOME_RESPONSIVE_MOBILE_SELECTORS = [
  "@media (max-width: 760px)",
  ".home-stage",
  ".home-prompt",
  ".home-model",
  ".home-model-picker"
];
const EXPECTED_HOME_SHELL_SELECTORS = [
];
const EXPECTED_HOME_SHELL_BOOT_SELECTORS = [
  "body.app-booting",
  "@keyframes homeBootSkeleton"
];
const EXPECTED_HOME_SHELL_PROMPT_SELECTORS = [
  "@import url(\"./home-shell-prompt-stage.css\")",
  "@import url(\"./home-shell-prompt-form.css\")",
  "@import url(\"./home-shell-prompt-files.css\")",
  "@import url(\"./home-shell-prompt-controls.css\")"
];
const EXPECTED_HOME_SHELL_PROMPT_STAGE_SELECTORS = [
  ".home-stage",
  ".home-title"
];
const EXPECTED_HOME_SHELL_PROMPT_FORM_SELECTORS = [
  ".home-prompt",
  ".home-prompt.has-files"
];
const EXPECTED_HOME_SHELL_PROMPT_FILES_SELECTORS = [
  ".home-file-preview",
  ".home-file-thumb",
  ".home-file-thumb button"
];
const EXPECTED_HOME_SHELL_PROMPT_CONTROLS_SELECTORS = [
  ".home-plus"
];
const EXPECTED_HOME_SHELL_MODEL_SELECTORS = [
  "@import url(\"./home-shell-model-picker.css\")",
  "@import url(\"./home-shell-model-menu.css\")",
  "@import url(\"./home-shell-model-native.css\")"
];
const EXPECTED_HOME_SHELL_MODEL_PICKER_SELECTORS = [
  ".home-model-picker",
  ".home-model-button",
  ".home-model-picker.open .home-model-button i"
];
const EXPECTED_HOME_SHELL_MODEL_MENU_SELECTORS = [
  ".home-model-menu",
  ".home-model-option-content",
  ".home-model-menu button.active"
];
const EXPECTED_HOME_SHELL_MODEL_NATIVE_SELECTORS = [
  ".home-model"
];
const EXPECTED_HOME_SHELL_TRANSITION_SELECTORS = [
  ".home-send",
  "@keyframes homeSendOut",
  "@keyframes canvasEnterSoft",
  "@keyframes chatEnterSoft"
];
const EXPECTED_HOME_HISTORY_SELECTORS = [
  "@import url(\"./home-history-stack-shell.css\")",
  "@import url(\"./home-history-stack-preview.css\")",
  "@import url(\"./home-history-stack-open.css\")"
];
const EXPECTED_HOME_HISTORY_STACK_SHELL_SELECTORS = [
  ".home-history",
  ".home-history-trigger"
];
const EXPECTED_HOME_HISTORY_STACK_PREVIEW_SELECTORS = [
  ".home-history-stack",
  ".home-history-stack i",
  ".home-history-stack img"
];
const EXPECTED_HOME_HISTORY_STACK_OPEN_SELECTORS = [
  ".home-history-open"
];
const EXPECTED_HOME_HISTORY_SECTION_SELECTORS = [
  "@import url(\"./home-history-section-layout.css\")",
  "@import url(\"./home-history-section-head.css\")"
];
const EXPECTED_HOME_HISTORY_SECTION_LAYOUT_SELECTORS = [
  ".home-history"
];
const EXPECTED_HOME_HISTORY_SECTION_HEAD_SELECTORS = [
  "@import url(\"./home-history-section-head-base.css\")",
  "@import url(\"./home-history-section-head-nav.css\")",
  "@import url(\"./home-history-section-head-action.css\")"
];
const EXPECTED_HOME_HISTORY_SECTION_HEAD_BASE_SELECTORS = [
  ".home-section-head",
  ".home-section-head.compact"
];
const EXPECTED_HOME_HISTORY_SECTION_HEAD_NAV_SELECTORS = [
  ".home-section-head nav",
  ".home-section-head nav button.active"
];
const EXPECTED_HOME_HISTORY_SECTION_HEAD_ACTION_SELECTORS = [
  ".home-history .home-section-head strong"
];
const EXPECTED_HOME_HISTORY_CARD_SELECTORS = [
  "@import url(\"./home-history-cards-base.css\")",
  "@import url(\"./home-history-cards-delete.css\")",
  "@import url(\"./home-history-cards-preview.css\")",
  "@import url(\"./home-history-cards-meta.css\")"
];
const EXPECTED_HOME_HISTORY_CARD_BASE_SELECTORS = [
  ".home-history-grid",
  ".home-history-card",
  ".home-history-card.is-create > button:not(.home-history-delete)"
];
const EXPECTED_HOME_HISTORY_CARD_DELETE_SELECTORS = [
  ".home-history-delete",
  ".home-history-delete span::after"
];
const EXPECTED_HOME_HISTORY_CARD_PREVIEW_SELECTORS = [
  ".home-history-thumb",
  ".project-preview-image",
  ".project-preview-image[hidden]",
  ".project-preview-fallback"
];
const EXPECTED_HOME_HISTORY_CARD_META_SELECTORS = [
  ".home-history-card.is-create .home-history-thumb",
  ".home-history-create-icon",
  ".home-history-card small"
];
const EXPECTED_HOME_COMMUNITY_SELECTORS = [
];
const EXPECTED_HOME_COMMUNITY_CHANNEL_SELECTORS = [
  "@import url(\"./home-community-channels-shell.css\")",
  "@import url(\"./home-community-channels-strip.css\")",
  "@import url(\"./home-community-channels-scroll.css\")"
];
const EXPECTED_HOME_COMMUNITY_CHANNEL_SHELL_SELECTORS = [
  ".home-community-section",
  ".home-channel-shell.is-floating",
  ".home-channel-shell::before"
];
const EXPECTED_HOME_COMMUNITY_CHANNEL_STRIP_SELECTORS = [
  "@import url(\"./home-community-channels-strip-shell.css\")",
  "@import url(\"./home-community-channels-strip-button.css\")",
  "@import url(\"./home-community-channels-strip-tone.css\")"
];
const EXPECTED_HOME_COMMUNITY_CHANNEL_STRIP_SHELL_SELECTORS = [
  ".home-channel-strip",
  ".home-channel-strip::-webkit-scrollbar"
];
const EXPECTED_HOME_COMMUNITY_CHANNEL_STRIP_BUTTON_SELECTORS = [
  ".home-channel-strip button",
  ".home-channel-all",
  ".home-channel-all span::before"
];
const EXPECTED_HOME_COMMUNITY_CHANNEL_STRIP_TONE_SELECTORS = [
  ".home-channel-strip i",
  ".home-channel-tone-xr",
  ".home-channel-tone-abstract"
];
const EXPECTED_HOME_COMMUNITY_CHANNEL_SCROLL_SELECTORS = [
  ".home-channel-scroll"
];
const EXPECTED_HOME_COMMUNITY_FEED_SELECTORS = [
  "@import url(\"./home-community-feed-masonry.css\")",
  "@import url(\"./home-community-feed-back-top.css\")"
];
const EXPECTED_HOME_COMMUNITY_FEED_MASONRY_SELECTORS = [
  ".home-masonry-feed",
  ".home-masonry-card",
  ".home-masonry-loading.show",
  "@keyframes masonryPlaceholderSweep"
];
const EXPECTED_HOME_COMMUNITY_FEED_BACK_TOP_SELECTORS = [
  ".home-back-top",
  ".home-back-top span::before",
  ".home-back-top.show"
];
const EXPECTED_HOME_COMMUNITY_INSPIRATION_SELECTORS = [
  "@import url(\"./home-community-inspiration-grid.css\")",
  "@import url(\"./home-community-inspiration-card.css\")"
];
const EXPECTED_HOME_COMMUNITY_INSPIRATION_GRID_SELECTORS = [
  ".home-inspiration-grid",
  ".home-inspiration-grid.feed"
];
const EXPECTED_HOME_COMMUNITY_INSPIRATION_CARD_SELECTORS = [
  ".inspiration-card",
  ".inspiration-card::before",
  ".inspiration-card span"
];
const EXPECTED_AUTH_IMPORTS = [
  "./auth-account.css",
  "./auth-credit-detail.css",
  "./auth-dialog.css"
];
const EXPECTED_AUTH_ACCOUNT_IMPORTS = [
  "./auth-account-entry.css",
  "./auth-account-popover.css",
  "./auth-account-menu.css"
];
const EXPECTED_AUTH_CREDIT_DETAIL_IMPORTS = [
  "./auth-credit-detail-shell.css",
  "./auth-credit-detail-profile.css",
  "./auth-credit-detail-transactions.css",
  "./auth-credit-detail-responsive.css"
];
const EXPECTED_AUTH_DIALOG_IMPORTS = [
  "./auth-dialog-menu.css",
  "./auth-dialog-shell.css",
  "./auth-dialog-wechat.css",
  "./auth-dialog-methods.css",
  "./auth-dialog-form.css"
];
const EXPECTED_AUTH_DIALOG_SELECTORS = [
  "@import url(\"./auth-dialog-menu.css\")",
  "@import url(\"./auth-dialog-shell.css\")",
  "@import url(\"./auth-dialog-wechat.css\")",
  "@import url(\"./auth-dialog-methods.css\")",
  "@import url(\"./auth-dialog-form.css\")"
];
const EXPECTED_AUTH_DIALOG_MENU_SELECTORS = [
  ".auth-menu-list button:disabled",
  ".auth-menu-icon"
];
const EXPECTED_AUTH_DIALOG_SHELL_SELECTORS = [
  ".auth-dialog",
  ".auth-dialog-backdrop",
  ".auth-dialog-panel",
  ".auth-dialog-close"
];
const EXPECTED_AUTH_DIALOG_WECHAT_SELECTORS = [
  ".auth-wechat-panel",
  ".auth-wechat-card",
  ".auth-wechat-qr",
  ".auth-legal"
];
const EXPECTED_AUTH_DIALOG_METHODS_SELECTORS = [
  ".auth-icon-methods",
  ".auth-mode-switch",
  ".auth-code-button:disabled"
];
const EXPECTED_AUTH_DIALOG_FORM_SELECTORS = [
  ".auth-form",
  ".auth-message",
  ".auth-submit"
];
const EXPECTED_AUTH_CREDIT_DETAIL_SELECTORS = [
  "@import url(\"./auth-credit-detail-shell.css\")",
  "@import url(\"./auth-credit-detail-profile.css\")",
  "@import url(\"./auth-credit-detail-transactions.css\")",
  "@import url(\"./auth-credit-detail-responsive.css\")"
];
const EXPECTED_AUTH_CREDIT_DETAIL_SHELL_SELECTORS = [
  ".credit-detail-dialog",
  ".credit-detail-panel",
  ".credit-detail-tabs",
  ".credit-detail-tab.active"
];
const EXPECTED_AUTH_CREDIT_DETAIL_PROFILE_SELECTORS = [
  ".credit-profile-card",
  ".credit-profile-avatar",
  ".credit-info-card",
  ".credit-info-list"
];
const EXPECTED_AUTH_CREDIT_DETAIL_TRANSACTIONS_SELECTORS = [
  ".credit-transaction-item",
  ".credit-transaction-amount.is-positive",
  ".credit-detail-status"
];
const EXPECTED_AUTH_CREDIT_DETAIL_RESPONSIVE_SELECTORS = [
  "@media (max-width: 760px)"
];
const EXPECTED_AUTH_ACCOUNT_SELECTORS = [
  "@import url(\"./auth-account-entry.css\")",
  "@import url(\"./auth-account-popover.css\")",
  "@import url(\"./auth-account-menu.css\")"
];
const EXPECTED_AUTH_ACCOUNT_ENTRY_SELECTORS = [
  ".auth-entry",
  ".auth-entry-button",
  ".auth-entry.is-authenticated .auth-entry-button"
];
const EXPECTED_AUTH_ACCOUNT_POPOVER_SELECTORS = [
  ".auth-account-popover",
  ".auth-account-card",
  ".auth-account-avatar",
  ".auth-upgrade-button"
];
const EXPECTED_AUTH_ACCOUNT_MENU_SELECTORS = [
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
  "@import url(\"./assets-page-pinterest-board-grid-legacy.css\")",
  "@import url(\"./assets-page-pinterest-board-cover-legacy.css\")",
  "@import url(\"./assets-page-pinterest-board-meta-legacy.css\")"
];
const EXPECTED_ASSET_PAGE_PINTEREST_BOARD_GRID_LEGACY_SELECTORS = [
  ".asset-pinterest-board",
  ".asset-pinterest-boards"
];
const EXPECTED_ASSET_PAGE_PINTEREST_BOARD_COVER_LEGACY_SELECTORS = [
  ".asset-pinterest-board-cover",
  ".asset-pinterest-board-create .asset-pinterest-board-cover"
];
const EXPECTED_ASSET_PAGE_PINTEREST_BOARD_META_LEGACY_SELECTORS = [
  ".asset-pinterest-board-meta",
  ".asset-pinterest-section-title"
];
const EXPECTED_ASSET_PAGE_PINTEREST_PIN_LEGACY_SELECTORS = [
  "@import url(\"./assets-page-pinterest-pin-shell-legacy.css\")",
  "@import url(\"./assets-page-pinterest-pin-card-legacy.css\")",
  "@import url(\"./assets-page-pinterest-pin-actions-legacy.css\")",
  "@import url(\"./assets-page-pinterest-pin-empty-legacy.css\")"
];
const EXPECTED_ASSET_PAGE_PINTEREST_PIN_SHELL_LEGACY_SELECTORS = [
  ".asset-pinterest-masonry",
  ".asset-pinterest-pin.asset-item"
];
const EXPECTED_ASSET_PAGE_PINTEREST_PIN_CARD_LEGACY_SELECTORS = [
  ".asset-pinterest-pin-thumb",
  ".asset-pinterest-pin-meta"
];
const EXPECTED_ASSET_PAGE_PINTEREST_PIN_ACTIONS_LEGACY_SELECTORS = [
  ".asset-pinterest-pin-actions",
  ".asset-pinterest-pin:hover .asset-pinterest-pin-actions",
  ".asset-pinterest-pin-actions button"
];
const EXPECTED_ASSET_PAGE_PINTEREST_PIN_EMPTY_LEGACY_SELECTORS = [
  ".asset-pinterest-empty",
  ".asset-pinterest-empty strong"
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
const EXPECTED_ASSET_PICKER_PREVIEW_IMPORTS = [
  "./assets-picker-preview-overlay.css",
  "./assets-picker-preview-dialog.css"
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
  "@import url(\"./assets-picker-preview-overlay.css\")",
  "@import url(\"./assets-picker-preview-dialog.css\")"
];
const EXPECTED_ASSET_PICKER_PREVIEW_OVERLAY_SELECTORS = [
  ".asset-preview-overlay",
  ".asset-preview-backdrop"
];
const EXPECTED_ASSET_PICKER_PREVIEW_DIALOG_SELECTORS = [
  ".asset-preview-dialog"
];
const EXPECTED_ASSET_CANVAS_PICKER_SELECTORS = [
  "@import url(\"./assets-canvas-picker-shell.css\")",
  "@import url(\"./assets-canvas-picker-projects.css\")"
];
const EXPECTED_ASSET_CANVAS_PICKER_SHELL_SELECTORS = [
  "@import url(\"./assets-canvas-picker-shell-frame.css\")",
  "@import url(\"./assets-canvas-picker-shell-head.css\")"
];
const EXPECTED_ASSET_CANVAS_PICKER_SHELL_FRAME_SELECTORS = [
  ".asset-canvas-picker",
  ".asset-canvas-picker-backdrop",
  ".asset-canvas-picker-card"
];
const EXPECTED_ASSET_CANVAS_PICKER_SHELL_HEAD_SELECTORS = [
  ".asset-canvas-picker-head",
  ".asset-canvas-picker-list"
];
const EXPECTED_ASSET_CANVAS_PICKER_PROJECTS_SELECTORS = [
  "@import url(\"./assets-canvas-picker-projects-row.css\")",
  "@import url(\"./assets-canvas-picker-projects-meta.css\")"
];
const EXPECTED_ASSET_CANVAS_PICKER_PROJECTS_ROW_SELECTORS = [
  ".asset-canvas-picker-project",
  ".asset-canvas-picker-thumb"
];
const EXPECTED_ASSET_CANVAS_PICKER_PROJECTS_META_SELECTORS = [
  ".asset-canvas-picker-meta"
];
const EXPECTED_ASSET_CONTEXT_MENU_SELECTORS = [
  "@import url(\"./assets-context-menu-shell.css\")",
  "@import url(\"./assets-context-menu-items.css\")",
  "@import url(\"./assets-context-menu-submenu.css\")"
];
const EXPECTED_ASSET_CONTEXT_MENU_SHELL_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-card-context-menu",
  "body[data-view=\"assetsPage\"] .asset-card-context-menu[hidden]"
];
const EXPECTED_ASSET_CONTEXT_MENU_ITEMS_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-card-context-icon",
  "body[data-view=\"assetsPage\"] .asset-card-context-arrow"
];
const EXPECTED_ASSET_CONTEXT_MENU_SUBMENU_SELECTORS = [
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
  "@import url(\"./assets-pinterest-board-tiles-grid-legacy.css\")",
  "@import url(\"./assets-pinterest-board-tiles-cover-legacy.css\")",
  "@import url(\"./assets-pinterest-board-tiles-meta-legacy.css\")"
];
const EXPECTED_ASSET_PINTEREST_BOARD_TILES_GRID_LEGACY_SELECTORS = [
  ".asset-pinterest-board-grid",
  ".asset-pinterest-board-tile"
];
const EXPECTED_ASSET_PINTEREST_BOARD_TILES_COVER_LEGACY_SELECTORS = [
  ".asset-pinterest-board-cover-large",
  ".asset-pinterest-board-create-tile .asset-pinterest-board-cover-large",
  ".asset-pinterest-board-cover-large > span:only-child"
];
const EXPECTED_ASSET_PINTEREST_BOARD_TILES_META_LEGACY_SELECTORS = [
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
  "@import url(\"./assets-pinterest-board-refresh-grid-layout.css\")",
  "@import url(\"./assets-pinterest-board-refresh-grid-cover.css\")",
  "@import url(\"./assets-pinterest-board-refresh-grid-cells.css\")",
  "@import url(\"./assets-pinterest-board-refresh-grid-empty.css\")"
];
const EXPECTED_ASSET_PINTEREST_BOARD_REFRESH_GRID_LAYOUT_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-pinterest-board-grid",
  "body[data-view=\"assetsPage\"] .asset-pinterest-board-tile",
  "body[data-view=\"assetsPage\"] .asset-pinterest-board-tile:hover"
];
const EXPECTED_ASSET_PINTEREST_BOARD_REFRESH_GRID_COVER_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-pinterest-board-cover-large",
  "body[data-view=\"assetsPage\"] .asset-pinterest-board-cover-large.has-cover-count-1",
  "body[data-view=\"assetsPage\"] .asset-pinterest-board-cover-large::before"
];
const EXPECTED_ASSET_PINTEREST_BOARD_REFRESH_GRID_CELLS_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-board-cover-cell"
];
const EXPECTED_ASSET_PINTEREST_BOARD_REFRESH_GRID_EMPTY_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-pinterest-board-cover-large.is-empty"
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
  "@import url(\"./assets-pinterest-pin-card-shell.css\")",
  "@import url(\"./assets-pinterest-pin-card-thumb.css\")",
  "@import url(\"./assets-pinterest-pin-card-meta.css\")"
];
const EXPECTED_ASSET_PINTEREST_PIN_CARD_SHELL_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-pinterest-pin.asset-item",
  "body[data-view=\"assetsPage\"] .asset-card-check",
  "body[data-view=\"assetsPage\"] .asset-pinterest-pin.selected .asset-card-check"
];
const EXPECTED_ASSET_PINTEREST_PIN_CARD_THUMB_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-pinterest-pin-thumb",
  "body[data-view=\"assetsPage\"] .asset-image-placeholder",
  "body[data-view=\"assetsPage\"] .asset-pinterest-pin-thumb.is-broken .asset-image-placeholder"
];
const EXPECTED_ASSET_PINTEREST_PIN_CARD_META_SELECTORS = [
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
  "@import url(\"./assets-pinterest-responsive-interactions-page.css\")",
  "@import url(\"./assets-pinterest-responsive-interactions-board.css\")",
  "@import url(\"./assets-pinterest-responsive-interactions-pin.css\")",
  "@import url(\"./assets-pinterest-responsive-interactions-breakpoints.css\")"
];
const EXPECTED_ASSET_PINTEREST_RESPONSIVE_INTERACTIONS_PAGE_SELECTORS = [
  "body[data-view=\"assetsPage\"] .assets-page-view",
  "body[data-view=\"assetsPage\"] .assets-page-view.active"
];
const EXPECTED_ASSET_PINTEREST_RESPONSIVE_INTERACTIONS_BOARD_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-pinterest-boards-view",
  "body[data-view=\"assetsPage\"] .asset-pinterest-board-grid",
  "body[data-view=\"assetsPage\"] .asset-pinterest-board-title"
];
const EXPECTED_ASSET_PINTEREST_RESPONSIVE_INTERACTIONS_PIN_SELECTORS = [
  "body[data-view=\"assetsPage\"] .asset-pinterest-pin-actions",
  "body[data-view=\"assetsPage\"] .asset-pinterest-pin-delete"
];
const EXPECTED_ASSET_PINTEREST_RESPONSIVE_INTERACTIONS_BREAKPOINTS_SELECTORS = [
  "@media (max-width: 1100px)",
  "@media (max-width: 720px)"
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
  "@import url(\"./legacy-theme-sync-model-preference-panel-shell.css\")",
  "@import url(\"./legacy-theme-sync-model-preference-panel-tabs.css\")",
  "@import url(\"./legacy-theme-sync-model-preference-panel-list.css\")",
  "@import url(\"./legacy-theme-sync-model-preference-panel-option.css\")",
  "@import url(\"./legacy-theme-sync-model-preference-panel-meta.css\")"
];
const EXPECTED_LEGACY_THEME_SYNC_MODEL_PREFERENCE_PANEL_SHELL_SELECTORS = [
  ".model-preference-panel",
  ".model-preference-header",
  ".model-preference-auto"
];
const EXPECTED_LEGACY_THEME_SYNC_MODEL_PREFERENCE_PANEL_TABS_SELECTORS = [
  ".model-preference-tabs",
  ".model-preference-tabs button",
  ".model-preference-tabs button.active"
];
const EXPECTED_LEGACY_THEME_SYNC_MODEL_PREFERENCE_PANEL_LIST_SELECTORS = [
  ".model-preference-list",
  ".model-preference-section",
  ".model-preference-section h4"
];
const EXPECTED_LEGACY_THEME_SYNC_MODEL_PREFERENCE_PANEL_OPTION_SELECTORS = [
  ".model-preference-option",
  ".model-preference-icon",
  ".model-preference-state",
  ".model-preference-option.selected .model-preference-state"
];
const EXPECTED_LEGACY_THEME_SYNC_MODEL_PREFERENCE_PANEL_META_SELECTORS = [
  ".model-preference-default",
  ".model-preference-description",
  ".model-preference-tags",
  ".model-preference-empty"
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
  "@import url(\"./legacy-canvas-visual-shell-brand-menu.css\")",
  "@import url(\"./legacy-canvas-visual-shell-home-menu.css\")",
  "@import url(\"./legacy-canvas-visual-shell-simple-page.css\")"
];
const EXPECTED_LEGACY_CANVAS_VISUAL_SHELL_BRAND_MENU_SELECTORS = [
  ".brand-mark",
  ".brand-menu"
];
const EXPECTED_LEGACY_CANVAS_VISUAL_SHELL_HOME_MENU_SELECTORS = [
  ".home-side-menu",
  "body[data-view=\"canvas\"] .home-side-menu"
];
const EXPECTED_LEGACY_CANVAS_VISUAL_SHELL_SIMPLE_PAGE_SELECTORS = [
  ".simple-page-view"
];
const EXPECTED_LEGACY_CANVAS_VISUAL_SELECTORS = [];
const EXPECTED_LEGACY_NODE_SELECTORS = [];
const EXPECTED_NODE_BASE_SELECTORS = [];
const EXPECTED_NODE_BASE_CARD_SELECTORS = [
  ".node-card",
  ".resize-handle",
  ".node-card.selected .resize-handle",
  ".node-card.node-locked"
];
const EXPECTED_NODE_BASE_GROUP_SELECTORS = [
  ".node-card.node-group",
  ".canvas-group-label",
  ".canvas-group-fill"
];
const EXPECTED_NODE_BASE_RESIZE_SELECTORS = [
  ".resize-nw",
  ".resize-se"
];
const EXPECTED_NODE_BASE_ACTIONS_SELECTORS = [
  ".node-expand",
  ".node-download"
];
const EXPECTED_NODE_IMAGE_EDIT_SELECTORS = [
  ".node-image.cropping",
  ".node-image.expanding"
];
const EXPECTED_NODE_IMAGE_CROP_SELECTORS = [
  "@import url(\"./node-image-crop-overlay.css\")",
  "@import url(\"./node-image-crop-handles.css\")",
  "@import url(\"./node-image-crop-actions.css\")"
];
const EXPECTED_NODE_IMAGE_CROP_OVERLAY_SELECTORS = [
  ".node-image.cropping .image-frame",
  ".node-crop-layer",
  ".crop-box",
  ".crop-box::before"
];
const EXPECTED_NODE_IMAGE_CROP_HANDLES_SELECTORS = [
  ".crop-corner",
  ".crop-edge",
  ".crop-nw",
  ".crop-ne",
  ".crop-sw",
  ".crop-se",
  ".crop-n",
  ".crop-s",
  ".crop-w",
  ".crop-e"
];
const EXPECTED_NODE_IMAGE_CROP_ACTIONS_SELECTORS = [
  ".crop-actions",
  ".crop-actions button",
  ".crop-actions button[data-crop-action=\"cancel\"]",
  ".crop-actions button[data-crop-ratio]",
  ".crop-actions button[data-crop-action=\"reset\"]",
  ".crop-actions .crop-confirm"
];
const EXPECTED_NODE_IMAGE_EXPAND_SELECTORS = [
  "@import url(\"./node-image-expand-overlay.css\")",
  "@import url(\"./node-image-expand-handles.css\")",
  "@import url(\"./node-image-expand-actions.css\")",
  "@import url(\"./node-image-expand-state.css\")"
];
const EXPECTED_NODE_IMAGE_EXPAND_OVERLAY_SELECTORS = [
  ".image-expand-box",
  ".image-expand-source"
];
const EXPECTED_NODE_IMAGE_EXPAND_HANDLES_SELECTORS = [
  ".expand-corner",
  ".expand-edge",
  ".expand-nw",
  ".expand-ne",
  ".expand-sw",
  ".expand-se",
  ".expand-n",
  ".expand-s",
  ".expand-w",
  ".expand-e"
];
const EXPECTED_NODE_IMAGE_EXPAND_ACTIONS_SELECTORS = [
  ".image-expand-actions",
  ".image-expand-prompt-field",
  ".image-expand-prompt-field textarea",
  ".image-expand-action-row",
  ".image-expand-action-row .image-expand-action-divider",
  ".image-expand-action-row button[data-expand-action=\"cancel\"]",
  ".image-expand-action-row button[data-expand-action=\"reset\"]"
];
const EXPECTED_NODE_IMAGE_EXPAND_STATE_SELECTORS = [
  ".image-expand-box.is-confirming",
  ".image-expand-box.is-confirming .image-expand-actions",
  ".image-expand-box.is-confirming .image-expand-actions .crop-confirm"
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
  "@import url(\"./node-image-toolbar-base-shell.css\")",
  "@import url(\"./node-image-toolbar-base-menu.css\")",
  "@import url(\"./node-image-toolbar-base-state.css\")",
  "@import url(\"./node-image-toolbar-base-buttons.css\")",
  "@import url(\"./node-image-toolbar-base-main.css\")"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_BASE_SHELL_SELECTORS = [
  ".image-node-toolbar"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_BASE_MENU_SELECTORS = [
  ".image-toolbar-menu",
  ".image-node-toolbar.menu-open .image-toolbar-menu",
  ".image-toolbar-menu button",
  ".image-toolbar-menu button:hover",
  ".image-toolbar-menu span",
  ".image-toolbar-menu small"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_BASE_STATE_SELECTORS = [
  ".node-image.selected .image-node-toolbar"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_BASE_BUTTONS_SELECTORS = [
  ".image-node-toolbar button",
  ".image-node-toolbar button:hover",
  ".image-node-toolbar .toolbar-strong"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_BASE_MAIN_SELECTORS = [
  ".image-toolbar-main"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_UPSCALE_SELECTORS = [
  "@import url(\"./node-image-toolbar-upscale-mode.css\")",
  "@import url(\"./node-image-toolbar-upscale-size.css\")",
  "@import url(\"./node-image-toolbar-upscale-generate.css\")"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_UPSCALE_MODE_SELECTORS = [
  ".image-toolbar-upscale-controls",
  ".image-node-toolbar.mode-upscale .image-toolbar-main",
  ".image-node-toolbar.mode-upscale .image-toolbar-upscale-controls",
  ".image-node-toolbar .image-toolbar-upscale-controls button"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_UPSCALE_SIZE_SELECTORS = [
  ".image-toolbar-size-option",
  ".image-toolbar-size-option.selected"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_UPSCALE_GENERATE_SELECTORS = [
  ".image-toolbar-generate"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_MENU_SELECTORS = [
  "@import url(\"./node-image-toolbar-menu-base.css\")",
  "@import url(\"./node-image-toolbar-menu-surface.css\")",
  "@import url(\"./node-image-toolbar-menu-upscale.css\")",
  "@import url(\"./node-image-toolbar-menu-dark.css\")"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_MENU_BASE_SELECTORS = [
  ".image-node-toolbar svg",
  ".image-toolbar-label",
  ".image-toolbar-compare",
  ".toolbar-separator"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_MENU_SURFACE_SELECTORS = [
  ".image-node-toolbar .image-toolbar-menu",
  ".image-node-toolbar .image-toolbar-menu::before",
  ".image-node-toolbar.menu-open .image-toolbar-menu"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_MENU_UPSCALE_SELECTORS = [
  "@import url(\"./node-image-toolbar-menu-upscale-card.css\")",
  "@import url(\"./node-image-toolbar-menu-upscale-hover.css\")",
  "@import url(\"./node-image-toolbar-menu-upscale-content.css\")",
  "@import url(\"./node-image-toolbar-menu-upscale-badge.css\")"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_MENU_UPSCALE_CARD_SELECTORS = [
  ".image-toolbar-upscale-option",
  ".image-toolbar-upscale-option::after",
  ".image-toolbar-upscale-option.is-premium"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_MENU_UPSCALE_HOVER_SELECTORS = [
  ".image-node-toolbar .image-toolbar-menu button:hover",
  ".image-toolbar-upscale-option:hover"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_MENU_UPSCALE_CONTENT_SELECTORS = [
  ".upscale-option-main",
  ".image-node-toolbar .image-toolbar-menu strong",
  ".image-node-toolbar .image-toolbar-menu small"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_MENU_UPSCALE_BADGE_SELECTORS = [
  ".image-node-toolbar .image-toolbar-menu em"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_MENU_DARK_SELECTORS = [
  "@import url(\"./node-image-toolbar-menu-dark-upscale.css\")",
  "@import url(\"./node-image-toolbar-menu-dark-surface.css\")",
  "@import url(\"./node-image-toolbar-menu-dark-buttons.css\")",
  "@import url(\"./node-image-toolbar-menu-dark-size.css\")"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_MENU_DARK_UPSCALE_SELECTORS = [
  "body[data-theme=\"dark\"] .image-node-toolbar .image-toolbar-menu button.image-toolbar-upscale-option",
  "body[data-theme=\"dark\"] .image-node-toolbar .image-toolbar-menu button.image-toolbar-upscale-option:hover",
  "body[data-theme=\"dark\"] .image-node-toolbar .image-toolbar-menu em"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_MENU_DARK_SURFACE_SELECTORS = [
  "body[data-theme=\"dark\"] .image-node-toolbar .image-toolbar-menu",
  "body[data-theme=\"dark\"] .image-node-toolbar .image-toolbar-menu::before"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_MENU_DARK_BUTTONS_SELECTORS = [
  "body[data-theme=\"dark\"] .image-node-toolbar .image-toolbar-menu button",
  "body[data-theme=\"dark\"] .image-node-toolbar .image-toolbar-menu button:hover"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_MENU_DARK_SIZE_SELECTORS = [
  "body[data-theme=\"dark\"] .image-node-toolbar .image-toolbar-upscale-controls .image-toolbar-size-option",
  "body[data-theme=\"dark\"] .image-node-toolbar .image-toolbar-upscale-controls .image-toolbar-size-option.selected",
  "body[data-theme=\"dark\"] .image-node-toolbar .image-toolbar-menu small"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_SAVEBAR_SELECTORS = [
  "@import url(\"./node-image-toolbar-savebar-shell.css\")",
  "@import url(\"./node-image-toolbar-savebar-board.css\")",
  "@import url(\"./node-image-toolbar-savebar-submit.css\")"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_SAVEBAR_SHELL_SELECTORS = [
  ".canvas-asset-savebar",
  ".node-image:hover .canvas-asset-savebar",
  ".node-image.selected .canvas-asset-savebar",
  ".canvas-asset-savebar:focus-within"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_SAVEBAR_BOARD_SELECTORS = [
  ".canvas-asset-board-select",
  ".canvas-asset-board-select span",
  ".canvas-asset-board-select svg"
];
const EXPECTED_NODE_IMAGE_TOOLBAR_SAVEBAR_SUBMIT_SELECTORS = [
  ".canvas-asset-save-submit",
  ".canvas-asset-save-submit:hover",
  ".canvas-asset-save-submit.is-saved"
];
const EXPECTED_NODE_IMAGE_TEXT_PANEL_SELECTORS = [
  "@import url(\"./node-image-text-panel-shell.css\")",
  "@import url(\"./node-image-text-panel-list.css\")",
  "@import url(\"./node-image-text-panel-footer.css\")"
];
const EXPECTED_NODE_IMAGE_TEXT_PANEL_SHELL_SELECTORS = [
  ".image-text-panel",
  ".image-text-panel.open",
  ".image-text-panel header",
  ".image-text-status"
];
const EXPECTED_NODE_IMAGE_TEXT_PANEL_LIST_SELECTORS = [
  ".image-text-list"
];
const EXPECTED_NODE_IMAGE_TEXT_PANEL_FOOTER_SELECTORS = [
  ".image-text-panel footer",
  ".image-text-panel footer button",
  ".image-text-panel footer [data-text-edit-apply]",
  ".image-text-panel.loading footer [data-text-edit-apply]"
];
const EXPECTED_NODE_IMAGE_LIGHTBOX_SELECTORS = [
  "@import url(\"./node-image-lightbox-overlay.css\")",
  "@import url(\"./node-image-lightbox-figure.css\")",
  "@import url(\"./node-image-lightbox-close.css\")"
];
const EXPECTED_NODE_IMAGE_LIGHTBOX_OVERLAY_SELECTORS = [
  ".image-lightbox",
  ".image-lightbox.open"
];
const EXPECTED_NODE_IMAGE_LIGHTBOX_FIGURE_SELECTORS = [
  ".image-lightbox figure",
  ".image-lightbox.open figure",
  ".image-lightbox img",
  ".image-lightbox figcaption"
];
const EXPECTED_NODE_IMAGE_LIGHTBOX_CLOSE_SELECTORS = [
  ".image-lightbox-close"
];
const EXPECTED_NODE_STACK_BASE_SELECTORS = [
  "@import url(\"./node-stack-base-hidden.css\")",
  "@import url(\"./node-stack-base-depth.css\")",
  "@import url(\"./node-stack-base-drop.css\")",
  "@import url(\"./node-stack-base-toggle.css\")"
];
const EXPECTED_NODE_STACK_BASE_HIDDEN_SELECTORS = [
  ".node-card.stack-member-hidden"
];
const EXPECTED_NODE_STACK_BASE_DEPTH_SELECTORS = [
  ".node-card.has-stack::after",
  ".node-card.has-stack::before"
];
const EXPECTED_NODE_STACK_BASE_DROP_SELECTORS = [
  ".node-card.stack-drop-target",
  ".node-card.stack-drop-target::after"
];
const EXPECTED_NODE_STACK_BASE_TOGGLE_SELECTORS = [
  ".stack-toggle"
];
const EXPECTED_NODE_STACK_TRAY_SELECTORS = [
  "@import url(\"./node-stack-tray-shell.css\")",
  "@import url(\"./node-stack-tray-row.css\")",
  "@import url(\"./node-stack-tray-thumb.css\")",
  "@import url(\"./node-stack-tray-meta.css\")"
];
const EXPECTED_NODE_STACK_TRAY_SHELL_SELECTORS = [
  ".stack-tray",
  ".node-card.stack-expanded .stack-tray"
];
const EXPECTED_NODE_STACK_TRAY_ROW_SELECTORS = [
  ".stack-row",
  ".stack-row:hover"
];
const EXPECTED_NODE_STACK_TRAY_THUMB_SELECTORS = [
  ".stack-thumb",
  ".stack-thumb img"
];
const EXPECTED_NODE_STACK_TRAY_META_SELECTORS = [
  ".stack-row strong",
  ".stack-row small"
];
const EXPECTED_NODE_DIRECTOR_SELECTORS = [
  "@import url(\"./node-director-shell.css\")",
  "@import url(\"./node-director-head.css\")",
  "@import url(\"./node-director-actions.css\")",
  "@import url(\"./node-director-tile.css\")"
];
const EXPECTED_NODE_DIRECTOR_SHELL_SELECTORS = [
  ".node-director",
  ".node-director.selected"
];
const EXPECTED_NODE_DIRECTOR_HEAD_SELECTORS = [
  ".director-head",
  ".director-refresh",
  ".director-refresh:hover"
];
const EXPECTED_NODE_DIRECTOR_ACTIONS_SELECTORS = [
  ".director-actions"
];
const EXPECTED_NODE_DIRECTOR_TILE_SELECTORS = [
  ".director-tile",
  ".director-tile::after",
  ".director-tile:hover",
  ".director-tile:hover::after",
  ".director-tile small",
  ".director-tile span",
  ".director-tile b",
  ".director-tile.running"
];
const EXPECTED_NODE_MEDIA_SHELL_SELECTORS = [
  "@import url(\"./node-media-shell-2d.css\")",
  "@import url(\"./node-media-shell-dark.css\")",
  "@import url(\"./node-media-shell-card.css\")",
  "@import url(\"./node-media-shell-selected.css\")"
];
const EXPECTED_NODE_MEDIA_SHELL_2D_SELECTORS = [
  ".node-2d"
];
const EXPECTED_NODE_MEDIA_SHELL_DARK_SELECTORS = [
  ".node-3d",
  ".node-video",
  ".node-3d p",
  ".node-video p",
  ".node-model p"
];
const EXPECTED_NODE_MEDIA_SHELL_CARD_SELECTORS = [
  ".node-image",
  ".node-model",
  ".node-loading-image"
];
const EXPECTED_NODE_MEDIA_SHELL_SELECTED_SELECTORS = [
  ".node-image.selected",
  ".node-model.selected",
  ".node-loading-image.selected"
];
const EXPECTED_NODE_MEDIA_VIDEO_SELECTORS = [
  "@import url(\"./node-media-video-shell.css\")",
  "@import url(\"./node-media-video-hidden-text.css\")",
  "@import url(\"./node-media-video-preview.css\")"
];
const EXPECTED_NODE_MEDIA_VIDEO_SHELL_SELECTORS = [
  ".node-video",
  ".node-video.selected"
];
const EXPECTED_NODE_MEDIA_VIDEO_HIDDEN_TEXT_SELECTORS = [
  ".node-video .node-label",
  ".node-video h3",
  ".node-video p"
];
const EXPECTED_NODE_MEDIA_VIDEO_PREVIEW_SELECTORS = [
  ".node-video .video-file-preview",
  ".node-video.selected .video-file-preview"
];
const EXPECTED_NODE_MEDIA_FRAME_SELECTORS = [
  "@import url(\"./node-media-frame-selected.css\")",
  "@import url(\"./node-media-frame-file-name.css\")",
  "@import url(\"./node-media-frame-image.css\")"
];
const EXPECTED_NODE_MEDIA_FRAME_SELECTED_SELECTORS = [
  ".node-image.selected .image-frame",
  ".node-model.selected .model-viewer",
  ".node-loading-image.selected .image-frame"
];
const EXPECTED_NODE_MEDIA_FRAME_FILE_NAME_SELECTORS = [
  ".image-file-name"
];
const EXPECTED_NODE_MEDIA_FRAME_IMAGE_SELECTORS = [
  ".image-frame",
  ".image-frame img"
];
const EXPECTED_NODE_GENERATION_SELECTORS = [
  "@import url(\"./node-generation-frame.css\")",
  "@import url(\"./node-generation-content.css\")",
  "@import url(\"./node-generation-state.css\")",
  "@import url(\"./node-generation-keyframes.css\")"
];
const EXPECTED_NODE_GENERATION_FRAME_SELECTORS = [
  ".generation-frame",
  ".generation-frame::before"
];
const EXPECTED_NODE_GENERATION_CONTENT_SELECTORS = [
  ".generation-content",
  ".generation-spinner",
  ".generation-frame strong",
  ".generation-frame span"
];
const EXPECTED_NODE_GENERATION_STATE_SELECTORS = [
  ".generation-failed .generation-frame",
  ".generation-failed .generation-spinner"
];
const EXPECTED_NODE_GENERATION_KEYFRAMES_SELECTORS = [
  "@keyframes shimmerPreview"
];
const EXPECTED_NODE_IMAGE_GENERATOR_BASE_SELECTORS = [
  "@import url(\"./node-image-generator-shell-node.css\")",
  "@import url(\"./node-image-generator-shell-head.css\")",
  "@import url(\"./node-image-generator-shell-frame.css\")",
  "@import url(\"./node-image-generator-shell-panel.css\")",
  "@import url(\"./node-image-generator-shell-actions.css\")",
  "@import url(\"./node-image-generator-shell-drop.css\")"
];
const EXPECTED_NODE_IMAGE_GENERATOR_SHELL_NODE_SELECTORS = [
  ".node-image-generator",
  ".node-image-generator.selected"
];
const EXPECTED_NODE_IMAGE_GENERATOR_SHELL_HEAD_SELECTORS = [
  ".image-generator-head",
  ".image-generator-head strong",
  ".image-generator-head span"
];
const EXPECTED_NODE_IMAGE_GENERATOR_SHELL_FRAME_SELECTORS = [
  ".image-generator-frame",
  ".node-image-generator.selected .image-generator-frame",
  ".image-generator-placeholder",
  ".image-generator-result",
  ".image-generator-loading",
  ".image-generator-loading[hidden]"
];
const EXPECTED_NODE_IMAGE_GENERATOR_SHELL_PANEL_SELECTORS = [
  ".image-generator-panel",
  ".image-generator-reference",
  ".has-generator-reference .image-generator-reference",
  ".image-generator-panel textarea",
  ".image-generator-panel textarea:focus"
];
const EXPECTED_NODE_IMAGE_GENERATOR_SHELL_ACTIONS_SELECTORS = [
  ".image-generator-actions",
  ".image-generator-actions button",
  ".image-generator-actions [data-generator-submit]",
  ".image-generator-actions button:disabled"
];
const EXPECTED_NODE_IMAGE_GENERATOR_SHELL_DROP_SELECTORS = [
  ".node-image-generator.generator-drop-active .image-generator-frame"
];
const EXPECTED_NODE_IMAGE_GENERATOR_PANEL_SELECTORS = [
  "@import url(\"./node-image-generator-panel-shell.css\")",
  "@import url(\"./node-image-generator-panel-references.css\")",
  "@import url(\"./node-image-generator-panel-textarea.css\")",
  "@import url(\"./node-image-generator-panel-controls.css\")",
  "@import url(\"./node-image-generator-panel-actions.css\")"
];
const EXPECTED_NODE_IMAGE_GENERATOR_PANEL_SHELL_SELECTORS = [
  ".image-generator-panel",
  ".image-generator-panel-top",
  ".image-generator-bottom"
];
const EXPECTED_NODE_IMAGE_GENERATOR_PANEL_REFERENCES_SELECTORS = [
  ".image-generator-reference-list",
  ".image-generator-reference-thumb",
  ".image-generator-add-reference",
  ".image-generator-reference-thumb img",
  ".image-generator-expand-panel"
];
const EXPECTED_NODE_IMAGE_GENERATOR_PANEL_TEXTAREA_SELECTORS = [
  ".image-generator-panel textarea",
  ".generator-panel-expanded .image-generator-panel textarea",
  ".image-generator-panel textarea:focus",
  ".image-generator-panel textarea::placeholder"
];
const EXPECTED_NODE_IMAGE_GENERATOR_PANEL_CONTROLS_SELECTORS = [
  ".image-generator-bottom",
  ".image-generator-bottom select",
  ".image-generator-bottom [data-generator-model]",
  ".image-generator-cancel"
];
const EXPECTED_NODE_IMAGE_GENERATOR_PANEL_ACTIONS_SELECTORS = [
  ".image-generator-submit",
  ".image-generator-bottom button:disabled",
  ".image-generator-bottom select:disabled",
  ".image-generator-add-reference:disabled"
];
const EXPECTED_NODE_IMAGE_GENERATOR_GLASS_SELECTORS = [
  "@import url(\"./node-image-generator-glass-head.css\")",
  "@import url(\"./node-image-generator-glass-stage.css\")",
  "@import url(\"./node-image-generator-glass-panel.css\")",
  "@import url(\"./node-image-generator-glass-references.css\")",
  "@import url(\"./node-image-generator-glass-controls.css\")",
  "@import url(\"./node-image-generator-glass-state.css\")"
];
const EXPECTED_NODE_IMAGE_GENERATOR_GLASS_HEAD_SELECTORS = [
  ".node-image-generator",
  ".image-generator-head",
  ".image-generator-title-icon",
  ".image-generator-head strong",
  ".image-generator-head > span:last-child"
];
const EXPECTED_NODE_IMAGE_GENERATOR_GLASS_STAGE_SELECTORS = [
  ".image-generator-stage",
  ".image-generator-frame",
  ".node-image-generator.selected .image-generator-frame",
  ".image-generator-placeholder",
  ".image-generator-placeholder svg"
];
const EXPECTED_NODE_IMAGE_GENERATOR_GLASS_PANEL_SELECTORS = [
  ".image-generator-panel"
];
const EXPECTED_NODE_IMAGE_GENERATOR_GLASS_REFERENCES_SELECTORS = [
  ".image-generator-reference-thumb",
  ".image-generator-add-reference",
  ".image-generator-expand-panel"
];
const EXPECTED_NODE_IMAGE_GENERATOR_GLASS_CONTROLS_SELECTORS = [
  ".image-generator-panel textarea",
  ".image-generator-bottom select",
  ".image-generator-bottom [data-generator-model]",
  ".image-generator-cancel"
];
const EXPECTED_NODE_IMAGE_GENERATOR_GLASS_STATE_SELECTORS = [
  ".image-generator-submit",
  ".node-image-generator.generator-drop-active .image-generator-frame"
];
const EXPECTED_NODE_IMAGE_GENERATOR_INLINE_EDIT_SELECTORS = [
  "@import url(\"./node-image-generator-inline-shell.css\")",
  "@import url(\"./node-image-generator-inline-references.css\")",
  "@import url(\"./node-image-generator-inline-textarea.css\")",
  "@import url(\"./node-image-generator-inline-actions.css\")",
  "@import url(\"./node-image-generator-inline-responsive.css\")"
];
const EXPECTED_NODE_IMAGE_GENERATOR_INLINE_SHELL_SELECTORS = [
  ".image-generator-panel.image-edit-popover-inline",
  ".image-generator-panel .image-generator-panel-top"
];
const EXPECTED_NODE_IMAGE_GENERATOR_INLINE_REFERENCES_SELECTORS = [
  ".image-generator-reference-list",
  ".image-generator-reference-thumb",
  ".image-generator-add-reference",
  ".image-generator-reference-thumb img",
  ".image-generator-expand-panel"
];
const EXPECTED_NODE_IMAGE_GENERATOR_INLINE_TEXTAREA_SELECTORS = [
  ".image-generator-panel textarea",
  ".generator-panel-expanded .image-generator-panel textarea",
  ".image-generator-panel textarea:focus",
  ".image-generator-panel textarea::placeholder"
];
const EXPECTED_NODE_IMAGE_GENERATOR_INLINE_ACTIONS_SELECTORS = [
  ".image-generator-bottom.edit-actions",
  ".image-generator-bottom.edit-actions > span",
  ".image-generator-bottom.edit-actions select",
  ".image-generator-cancel",
  ".image-generator-submit.send",
];
const EXPECTED_NODE_IMAGE_GENERATOR_INLINE_RESPONSIVE_SELECTORS = [
  "@media (max-width: 760px)"
];
const EXPECTED_NODE_PREVIEW_SELECTORS = [
  "@import url(\"./node-preview-media.css\")",
  "@import url(\"./node-preview-model.css\")",
  "@import url(\"./node-preview-cube-video.css\")",
  "@import url(\"./node-preview-bottom-controls.css\")"
];
const EXPECTED_NODE_PREVIEW_MEDIA_SELECTORS = [
  ".media-preview",
  ".image-preview",
  ".video-file-preview"
];
const EXPECTED_NODE_PREVIEW_MODEL_SELECTORS = [
  ".model-preview",
  ".model-viewer",
  ".model-viewer-mode-toggle"
];
const EXPECTED_NODE_PREVIEW_CUBE_VIDEO_SELECTORS = [
  ".cube-scene",
  ".video-preview",
  "@keyframes spinCube"
];
const EXPECTED_NODE_PREVIEW_BOTTOM_CONTROLS_SELECTORS = [
  ".bottom-controls",
  ".bottom-controls button",
  ".bottom-controls input"
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
  "@import url(\"./legacy-compact-tool-rail-shell.css\")",
  "@import url(\"./legacy-compact-tool-rail-items.css\")",
  "@import url(\"./legacy-compact-tool-rail-light.css\")"
];
const EXPECTED_LEGACY_COMPACT_TOOL_RAIL_SHELL_SELECTORS = [
  ".tool-rail",
  ".rail-main",
  ".rail-main-icon"
];
const EXPECTED_LEGACY_COMPACT_TOOL_RAIL_ITEMS_SELECTORS = [
  ".rail-items",
  ".rail-btn",
  ".rail-btn.add",
  ".rail-btn.jump",
  ".rail-separator"
];
const EXPECTED_LEGACY_COMPACT_TOOL_RAIL_LIGHT_SELECTORS = [
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
const imageCompareImports = parseCssImports("styles/image-compare.css");
const taskLogImports = parseCssImports("styles/task-log.css");
const workspaceImports = parseCssImports("styles/workspace.css");
const projectLibraryImports = parseCssImports("styles/features/project-library.css");
const projectLibraryShellImports = parseCssImports("styles/features/project-library-shell.css");
const projectLibraryCardsImports = parseCssImports("styles/features/project-library-cards.css");
const projectLibraryPageImports = parseCssImports("styles/features/project-library-page.css");
const legacySplitImports = parseCssImports("styles/legacy-split.css");
const legacyBaseImports = parseCssImports("styles/legacy-base.css");
const legacyThemeIosImports = parseCssImports("styles/legacy-theme-ios.css");
const legacyChatImports = parseCssImports("styles/legacy-chat.css");
const legacyCompactControlsImports = parseCssImports("styles/legacy-compact-controls.css");
const legacyCompactToolRailImports = parseCssImports("styles/legacy-compact-tool-rail.css");
const legacyThemeSyncImports = parseCssImports("styles/legacy-theme-sync.css");
const legacyThemeSyncNodeMediaImports = parseCssImports("styles/legacy-theme-sync-node-media.css");
const legacyThemeSyncModelPreferenceImports = parseCssImports("styles/legacy-theme-sync-model-preference.css");
const legacyThemeSyncModelPreferencePanelImports = parseCssImports("styles/legacy-theme-sync-model-preference-panel.css");
const legacyCanvasImports = parseCssImports("styles/legacy-canvas.css");
const legacyCanvasChoiceOverlayImports = parseCssImports("styles/legacy-canvas-choice-overlays.css");
const legacyCanvasWorldImports = parseCssImports("styles/legacy-canvas-world.css");
const legacyCanvasVideoGeneratorImports = parseCssImports("styles/legacy-canvas-video-generator.css");
const legacyCanvasProjectHeaderImports = parseCssImports("styles/legacy-canvas-project-header.css");
const legacyCanvasShellImports = parseCssImports("styles/legacy-canvas-shell.css");
const legacyCanvasImageEditImports = parseCssImports("styles/legacy-canvas-image-edit.css");
const legacyCanvasVisualImports = parseCssImports("styles/legacy-canvas-visual.css");
const legacyCanvasVisualShellImports = parseCssImports("styles/legacy-canvas-visual-shell.css");
const legacyCanvasVisualShapeToolsImports = parseCssImports("styles/legacy-canvas-visual-shape-tools.css");
const authImports = parseCssImports("styles/features/auth.css");
const authAccountImports = parseCssImports("styles/features/auth-account.css");
const authCreditDetailImports = parseCssImports("styles/features/auth-credit-detail.css");
const authDialogImports = parseCssImports("styles/features/auth-dialog.css");
const nodeImports = parseCssImports("styles/features/node.css");
const nodeBaseImports = parseCssImports("styles/features/node-base.css");
const nodeImageEditImports = parseCssImports("styles/features/node-image-edit.css");
const nodeImageCropImports = parseCssImports("styles/features/node-image-crop.css");
const nodeImageExpandImports = parseCssImports("styles/features/node-image-expand.css");
const nodeImageToolbarImports = parseCssImports("styles/features/node-image-toolbar.css");
const nodeImageToolbarBaseImports = parseCssImports("styles/features/node-image-toolbar-base.css");
const nodeImageToolbarUpscaleImports = parseCssImports("styles/features/node-image-toolbar-upscale.css");
const nodeImageToolbarMenuImports = parseCssImports("styles/features/node-image-toolbar-menu.css");
const nodeImageToolbarMenuUpscaleImports = parseCssImports("styles/features/node-image-toolbar-menu-upscale.css");
const nodeImageToolbarMenuDarkImports = parseCssImports("styles/features/node-image-toolbar-menu-dark.css");
const nodeImageToolbarSavebarImports = parseCssImports("styles/features/node-image-toolbar-savebar.css");
const nodeImagePanelsImports = parseCssImports("styles/features/node-image-panels.css");
const nodeImageTextPanelImports = parseCssImports("styles/features/node-image-text-panel.css");
const nodeImageLightboxImports = parseCssImports("styles/features/node-image-lightbox.css");
const nodeStackImports = parseCssImports("styles/features/node-stack.css");
const nodeStackBaseImports = parseCssImports("styles/features/node-stack-base.css");
const nodeStackTrayImports = parseCssImports("styles/features/node-stack-tray.css");
const nodeDirectorImports = parseCssImports("styles/features/node-director.css");
const nodeMediaImports = parseCssImports("styles/features/node-media.css");
const nodeMediaShellImports = parseCssImports("styles/features/node-media-shell.css");
const nodeMediaVideoImports = parseCssImports("styles/features/node-media-video.css");
const nodeMediaFrameImports = parseCssImports("styles/features/node-media-frame.css");
const nodeGenerationImports = parseCssImports("styles/features/node-generation.css");
const nodePreviewImports = parseCssImports("styles/features/node-preview.css");
const nodeImageGeneratorImports = parseCssImports("styles/features/node-image-generator.css");
const nodeImageGeneratorBaseImports = parseCssImports("styles/features/node-image-generator-base.css");
const nodeImageGeneratorPanelImports = parseCssImports("styles/features/node-image-generator-panel.css");
const nodeImageGeneratorShellImports = parseCssImports("styles/features/node-image-generator-shell.css");
const nodeImageGeneratorGlassImports = parseCssImports("styles/features/node-image-generator-glass.css");
const nodeImageGeneratorInlineEditImports = parseCssImports("styles/features/node-image-generator-inline-edit.css");
const assetImports = parseCssImports("styles/features/assets.css");
const assetBoardImports = parseCssImports("styles/features/assets-board.css");
const assetSaveImports = parseCssImports("styles/features/assets-save.css");
const assetSavePopoverImports = parseCssImports("styles/features/assets-save-popover.css");
const assetSaveBoardPopoverImports = parseCssImports("styles/features/assets-save-board-popover.css");
const assetPickerImports = parseCssImports("styles/features/assets-picker.css");
const assetPickerPopoverImports = parseCssImports("styles/features/assets-picker-popover.css");
const assetPickerListImports = parseCssImports("styles/features/assets-picker-list.css");
const assetPickerPreviewImports = parseCssImports("styles/features/assets-picker-preview.css");
const assetCanvasPickerImports = parseCssImports("styles/features/assets-canvas-picker.css");
const assetCanvasPickerShellImports = parseCssImports("styles/features/assets-canvas-picker-shell.css");
const assetCanvasPickerProjectsImports = parseCssImports("styles/features/assets-canvas-picker-projects.css");
const assetContextMenuImports = parseCssImports("styles/features/assets-context-menu.css");
const assetPageImports = parseCssImports("styles/features/assets-page.css");
const assetPagePinterestLegacyImports = parseCssImports("styles/features/assets-page-pinterest-legacy.css");
const assetPagePinterestBoardLegacyImports = parseCssImports("styles/features/assets-page-pinterest-board-legacy.css");
const assetPagePinterestPinLegacyImports = parseCssImports("styles/features/assets-page-pinterest-pin-legacy.css");
const assetPinterestImports = parseCssImports("styles/features/assets-pinterest.css");
const assetPinterestBoardImports = parseCssImports("styles/features/assets-pinterest-board.css");
const assetPinterestBoardTilesLegacyImports = parseCssImports("styles/features/assets-pinterest-board-tiles-legacy.css");
const assetPinterestShellImports = parseCssImports("styles/features/assets-pinterest-shell.css");
const assetPinterestBoardRefreshImports = parseCssImports("styles/features/assets-pinterest-board-refresh.css");
const assetPinterestBoardRefreshGridImports = parseCssImports("styles/features/assets-pinterest-board-refresh-grid.css");
const assetPinterestPinImports = parseCssImports("styles/features/assets-pinterest-pin.css");
const assetPinterestPinCardImports = parseCssImports("styles/features/assets-pinterest-pin-card.css");
const assetPinterestResponsiveImports = parseCssImports("styles/features/assets-pinterest-responsive.css");
const assetPinterestResponsiveInteractionsImports = parseCssImports("styles/features/assets-pinterest-responsive-interactions.css");
const homeImports = parseCssImports("styles/features/home.css");
const homeHistoryImports = parseCssImports("styles/features/home-history.css");
const homeHistoryStackImports = parseCssImports("styles/features/home-history-stack.css");
const homeHistorySectionImports = parseCssImports("styles/features/home-history-section.css");
const homeHistorySectionHeadImports = parseCssImports("styles/features/home-history-section-head.css");
const homeHistoryCardsImports = parseCssImports("styles/features/home-history-cards.css");
const homeCommunityImports = parseCssImports("styles/features/home-community.css");
const homeCommunityChannelImports = parseCssImports("styles/features/home-community-channels.css");
const homeCommunityChannelStripImports = parseCssImports("styles/features/home-community-channels-strip.css");
const homeCommunityFeedImports = parseCssImports("styles/features/home-community-feed.css");
const homeCommunityInspirationImports = parseCssImports("styles/features/home-community-inspiration.css");
const homeShellImports = parseCssImports("styles/features/home-shell.css");
const homeShellPromptImports = parseCssImports("styles/features/home-shell-prompt.css");
const homeShellModelImports = parseCssImports("styles/features/home-shell-model.css");

checkIndexStylesheet();
assertListEqual("styles.css", stylesImports, EXPECTED_STYLES_IMPORTS);
assertListEqual("styles/image-compare.css", imageCompareImports, EXPECTED_IMAGE_COMPARE_IMPORTS);
assertListEqual("styles/task-log.css", taskLogImports, EXPECTED_TASK_LOG_IMPORTS);
assertListEqual("styles/workspace.css", workspaceImports, EXPECTED_WORKSPACE_IMPORTS);
assertListEqual("styles/features/project-library.css", projectLibraryImports, EXPECTED_PROJECT_LIBRARY_IMPORTS);
assertListEqual("styles/features/project-library-shell.css", projectLibraryShellImports, EXPECTED_PROJECT_LIBRARY_SHELL_IMPORTS);
assertListEqual("styles/features/project-library-cards.css", projectLibraryCardsImports, EXPECTED_PROJECT_LIBRARY_CARDS_IMPORTS);
assertListEqual("styles/features/project-library-page.css", projectLibraryPageImports, EXPECTED_PROJECT_LIBRARY_PAGE_IMPORTS);
assertListEqual("styles/legacy-split.css", legacySplitImports, EXPECTED_LEGACY_SPLIT_IMPORTS);
assertListEqual("styles/legacy-base.css", legacyBaseImports, EXPECTED_LEGACY_BASE_IMPORTS);
assertListEqual("styles/legacy-theme-ios.css", legacyThemeIosImports, EXPECTED_LEGACY_THEME_IOS_IMPORTS);
assertListEqual("styles/legacy-chat.css", legacyChatImports, EXPECTED_LEGACY_CHAT_IMPORTS);
assertListEqual("styles/legacy-compact-controls.css", legacyCompactControlsImports, EXPECTED_LEGACY_COMPACT_CONTROLS_IMPORTS);
assertListEqual("styles/legacy-compact-tool-rail.css", legacyCompactToolRailImports, EXPECTED_LEGACY_COMPACT_TOOL_RAIL_IMPORTS);
assertListEqual("styles/legacy-theme-sync.css", legacyThemeSyncImports, EXPECTED_LEGACY_THEME_SYNC_IMPORTS);
assertListEqual("styles/legacy-theme-sync-node-media.css", legacyThemeSyncNodeMediaImports, EXPECTED_LEGACY_THEME_SYNC_NODE_MEDIA_IMPORTS);
assertListEqual("styles/legacy-theme-sync-model-preference.css", legacyThemeSyncModelPreferenceImports, EXPECTED_LEGACY_THEME_SYNC_MODEL_PREFERENCE_IMPORTS);
assertListEqual("styles/legacy-theme-sync-model-preference-panel.css", legacyThemeSyncModelPreferencePanelImports, EXPECTED_LEGACY_THEME_SYNC_MODEL_PREFERENCE_PANEL_IMPORTS);
assertListEqual("styles/legacy-canvas.css", legacyCanvasImports, EXPECTED_LEGACY_CANVAS_IMPORTS);
assertListEqual("styles/legacy-canvas-choice-overlays.css", legacyCanvasChoiceOverlayImports, EXPECTED_LEGACY_CANVAS_CHOICE_OVERLAY_IMPORTS);
assertListEqual("styles/legacy-canvas-world.css", legacyCanvasWorldImports, EXPECTED_LEGACY_CANVAS_WORLD_IMPORTS);
assertListEqual("styles/legacy-canvas-video-generator.css", legacyCanvasVideoGeneratorImports, EXPECTED_LEGACY_CANVAS_VIDEO_GENERATOR_IMPORTS);
assertListEqual("styles/legacy-canvas-project-header.css", legacyCanvasProjectHeaderImports, EXPECTED_LEGACY_CANVAS_PROJECT_HEADER_IMPORTS);
assertListEqual("styles/legacy-canvas-shell.css", legacyCanvasShellImports, EXPECTED_LEGACY_CANVAS_SHELL_IMPORTS);
assertListEqual("styles/legacy-canvas-image-edit.css", legacyCanvasImageEditImports, EXPECTED_LEGACY_CANVAS_IMAGE_EDIT_IMPORTS);
assertListEqual("styles/legacy-canvas-visual.css", legacyCanvasVisualImports, EXPECTED_LEGACY_CANVAS_VISUAL_IMPORTS);
assertListEqual("styles/legacy-canvas-visual-shell.css", legacyCanvasVisualShellImports, EXPECTED_LEGACY_CANVAS_VISUAL_SHELL_IMPORTS);
assertListEqual("styles/legacy-canvas-visual-shape-tools.css", legacyCanvasVisualShapeToolsImports, EXPECTED_LEGACY_CANVAS_VISUAL_SHAPE_TOOLS_IMPORTS);
assertListEqual("styles/features/auth.css", authImports, EXPECTED_AUTH_IMPORTS);
assertListEqual("styles/features/auth-account.css", authAccountImports, EXPECTED_AUTH_ACCOUNT_IMPORTS);
assertListEqual("styles/features/auth-credit-detail.css", authCreditDetailImports, EXPECTED_AUTH_CREDIT_DETAIL_IMPORTS);
assertListEqual("styles/features/auth-dialog.css", authDialogImports, EXPECTED_AUTH_DIALOG_IMPORTS);
assertListEqual("styles/features/node.css", nodeImports, EXPECTED_NODE_IMPORTS);
assertListEqual("styles/features/node-base.css", nodeBaseImports, EXPECTED_NODE_BASE_IMPORTS);
assertListEqual("styles/features/node-image-edit.css", nodeImageEditImports, EXPECTED_NODE_IMAGE_EDIT_IMPORTS);
assertListEqual("styles/features/node-image-crop.css", nodeImageCropImports, EXPECTED_NODE_IMAGE_CROP_IMPORTS);
assertListEqual("styles/features/node-image-expand.css", nodeImageExpandImports, EXPECTED_NODE_IMAGE_EXPAND_IMPORTS);
assertListEqual("styles/features/node-image-toolbar.css", nodeImageToolbarImports, EXPECTED_NODE_IMAGE_TOOLBAR_IMPORTS);
assertListEqual("styles/features/node-image-toolbar-base.css", nodeImageToolbarBaseImports, EXPECTED_NODE_IMAGE_TOOLBAR_BASE_IMPORTS);
assertListEqual("styles/features/node-image-toolbar-upscale.css", nodeImageToolbarUpscaleImports, EXPECTED_NODE_IMAGE_TOOLBAR_UPSCALE_IMPORTS);
assertListEqual("styles/features/node-image-toolbar-menu.css", nodeImageToolbarMenuImports, EXPECTED_NODE_IMAGE_TOOLBAR_MENU_IMPORTS);
assertListEqual("styles/features/node-image-toolbar-menu-upscale.css", nodeImageToolbarMenuUpscaleImports, EXPECTED_NODE_IMAGE_TOOLBAR_MENU_UPSCALE_IMPORTS);
assertListEqual("styles/features/node-image-toolbar-menu-dark.css", nodeImageToolbarMenuDarkImports, EXPECTED_NODE_IMAGE_TOOLBAR_MENU_DARK_IMPORTS);
assertListEqual("styles/features/node-image-toolbar-savebar.css", nodeImageToolbarSavebarImports, EXPECTED_NODE_IMAGE_TOOLBAR_SAVEBAR_IMPORTS);
assertListEqual("styles/features/node-image-panels.css", nodeImagePanelsImports, EXPECTED_NODE_IMAGE_PANELS_IMPORTS);
assertListEqual("styles/features/node-image-text-panel.css", nodeImageTextPanelImports, EXPECTED_NODE_IMAGE_TEXT_PANEL_IMPORTS);
assertListEqual("styles/features/node-image-lightbox.css", nodeImageLightboxImports, EXPECTED_NODE_IMAGE_LIGHTBOX_IMPORTS);
assertListEqual("styles/features/node-stack.css", nodeStackImports, EXPECTED_NODE_STACK_IMPORTS);
assertListEqual("styles/features/node-stack-base.css", nodeStackBaseImports, EXPECTED_NODE_STACK_BASE_IMPORTS);
assertListEqual("styles/features/node-stack-tray.css", nodeStackTrayImports, EXPECTED_NODE_STACK_TRAY_IMPORTS);
assertListEqual("styles/features/node-director.css", nodeDirectorImports, EXPECTED_NODE_DIRECTOR_IMPORTS);
assertListEqual("styles/features/node-media.css", nodeMediaImports, EXPECTED_NODE_MEDIA_IMPORTS);
assertListEqual("styles/features/node-media-shell.css", nodeMediaShellImports, EXPECTED_NODE_MEDIA_SHELL_IMPORTS);
assertListEqual("styles/features/node-media-video.css", nodeMediaVideoImports, EXPECTED_NODE_MEDIA_VIDEO_IMPORTS);
assertListEqual("styles/features/node-media-frame.css", nodeMediaFrameImports, EXPECTED_NODE_MEDIA_FRAME_IMPORTS);
assertListEqual("styles/features/node-generation.css", nodeGenerationImports, EXPECTED_NODE_GENERATION_IMPORTS);
assertListEqual("styles/features/node-preview.css", nodePreviewImports, EXPECTED_NODE_PREVIEW_IMPORTS);
assertListEqual("styles/features/node-image-generator.css", nodeImageGeneratorImports, EXPECTED_NODE_IMAGE_GENERATOR_IMPORTS);
assertListEqual("styles/features/node-image-generator-base.css", nodeImageGeneratorBaseImports, EXPECTED_NODE_IMAGE_GENERATOR_BASE_IMPORTS);
assertListEqual("styles/features/node-image-generator-panel.css", nodeImageGeneratorPanelImports, EXPECTED_NODE_IMAGE_GENERATOR_PANEL_IMPORTS);
assertListEqual("styles/features/node-image-generator-shell.css", nodeImageGeneratorShellImports, EXPECTED_NODE_IMAGE_GENERATOR_SHELL_IMPORTS);
assertListEqual("styles/features/node-image-generator-glass.css", nodeImageGeneratorGlassImports, EXPECTED_NODE_IMAGE_GENERATOR_GLASS_IMPORTS);
assertListEqual("styles/features/node-image-generator-inline-edit.css", nodeImageGeneratorInlineEditImports, EXPECTED_NODE_IMAGE_GENERATOR_INLINE_EDIT_IMPORTS);
assertListEqual("styles/features/assets.css", assetImports, EXPECTED_ASSET_IMPORTS);
assertListEqual("styles/features/assets-board.css", assetBoardImports, EXPECTED_ASSET_BOARD_IMPORTS);
assertListEqual("styles/features/assets-save.css", assetSaveImports, EXPECTED_ASSET_SAVE_IMPORTS);
assertListEqual("styles/features/assets-save-popover.css", assetSavePopoverImports, EXPECTED_ASSET_SAVE_POPOVER_IMPORTS);
assertListEqual("styles/features/assets-save-board-popover.css", assetSaveBoardPopoverImports, EXPECTED_ASSET_SAVE_BOARD_POPOVER_IMPORTS);
assertListEqual("styles/features/assets-picker.css", assetPickerImports, EXPECTED_ASSET_PICKER_IMPORTS);
assertListEqual("styles/features/assets-picker-popover.css", assetPickerPopoverImports, EXPECTED_ASSET_PICKER_POPOVER_IMPORTS);
assertListEqual("styles/features/assets-picker-list.css", assetPickerListImports, EXPECTED_ASSET_PICKER_LIST_IMPORTS);
assertListEqual("styles/features/assets-picker-preview.css", assetPickerPreviewImports, EXPECTED_ASSET_PICKER_PREVIEW_IMPORTS);
assertListEqual("styles/features/assets-canvas-picker.css", assetCanvasPickerImports, EXPECTED_ASSET_CANVAS_PICKER_IMPORTS);
assertListEqual("styles/features/assets-canvas-picker-shell.css", assetCanvasPickerShellImports, EXPECTED_ASSET_CANVAS_PICKER_SHELL_IMPORTS);
assertListEqual("styles/features/assets-canvas-picker-projects.css", assetCanvasPickerProjectsImports, EXPECTED_ASSET_CANVAS_PICKER_PROJECTS_IMPORTS);
assertListEqual("styles/features/assets-context-menu.css", assetContextMenuImports, EXPECTED_ASSET_CONTEXT_MENU_IMPORTS);
assertListEqual("styles/features/assets-page.css", assetPageImports, EXPECTED_ASSET_PAGE_IMPORTS);
assertListEqual("styles/features/assets-page-pinterest-legacy.css", assetPagePinterestLegacyImports, EXPECTED_ASSET_PAGE_PINTEREST_LEGACY_IMPORTS);
assertListEqual("styles/features/assets-page-pinterest-board-legacy.css", assetPagePinterestBoardLegacyImports, EXPECTED_ASSET_PAGE_PINTEREST_BOARD_LEGACY_IMPORTS);
assertListEqual("styles/features/assets-page-pinterest-pin-legacy.css", assetPagePinterestPinLegacyImports, EXPECTED_ASSET_PAGE_PINTEREST_PIN_LEGACY_IMPORTS);
assertListEqual("styles/features/assets-pinterest.css", assetPinterestImports, EXPECTED_ASSET_PINTEREST_IMPORTS);
assertListEqual("styles/features/assets-pinterest-board.css", assetPinterestBoardImports, EXPECTED_ASSET_PINTEREST_BOARD_IMPORTS);
assertListEqual("styles/features/assets-pinterest-board-tiles-legacy.css", assetPinterestBoardTilesLegacyImports, EXPECTED_ASSET_PINTEREST_BOARD_TILES_LEGACY_IMPORTS);
assertListEqual("styles/features/assets-pinterest-shell.css", assetPinterestShellImports, EXPECTED_ASSET_PINTEREST_SHELL_IMPORTS);
assertListEqual("styles/features/assets-pinterest-board-refresh.css", assetPinterestBoardRefreshImports, EXPECTED_ASSET_PINTEREST_BOARD_REFRESH_IMPORTS);
assertListEqual("styles/features/assets-pinterest-board-refresh-grid.css", assetPinterestBoardRefreshGridImports, EXPECTED_ASSET_PINTEREST_BOARD_REFRESH_GRID_IMPORTS);
assertListEqual("styles/features/assets-pinterest-pin.css", assetPinterestPinImports, EXPECTED_ASSET_PINTEREST_PIN_IMPORTS);
assertListEqual("styles/features/assets-pinterest-pin-card.css", assetPinterestPinCardImports, EXPECTED_ASSET_PINTEREST_PIN_CARD_IMPORTS);
assertListEqual("styles/features/assets-pinterest-responsive.css", assetPinterestResponsiveImports, EXPECTED_ASSET_PINTEREST_RESPONSIVE_IMPORTS);
assertListEqual("styles/features/assets-pinterest-responsive-interactions.css", assetPinterestResponsiveInteractionsImports, EXPECTED_ASSET_PINTEREST_RESPONSIVE_INTERACTIONS_IMPORTS);
assertListEqual("styles/features/home.css", homeImports, EXPECTED_HOME_IMPORTS);
assertListEqual("styles/features/home-history.css", homeHistoryImports, EXPECTED_HOME_HISTORY_IMPORTS);
assertListEqual("styles/features/home-history-stack.css", homeHistoryStackImports, EXPECTED_HOME_HISTORY_STACK_IMPORTS);
assertListEqual("styles/features/home-history-section.css", homeHistorySectionImports, EXPECTED_HOME_HISTORY_SECTION_IMPORTS);
assertListEqual("styles/features/home-history-section-head.css", homeHistorySectionHeadImports, EXPECTED_HOME_HISTORY_SECTION_HEAD_IMPORTS);
assertListEqual("styles/features/home-history-cards.css", homeHistoryCardsImports, EXPECTED_HOME_HISTORY_CARDS_IMPORTS);
assertListEqual("styles/features/home-community.css", homeCommunityImports, EXPECTED_HOME_COMMUNITY_IMPORTS);
assertListEqual("styles/features/home-community-channels.css", homeCommunityChannelImports, EXPECTED_HOME_COMMUNITY_CHANNEL_IMPORTS);
assertListEqual("styles/features/home-community-channels-strip.css", homeCommunityChannelStripImports, EXPECTED_HOME_COMMUNITY_CHANNEL_STRIP_IMPORTS);
assertListEqual("styles/features/home-community-feed.css", homeCommunityFeedImports, EXPECTED_HOME_COMMUNITY_FEED_IMPORTS);
assertListEqual("styles/features/home-community-inspiration.css", homeCommunityInspirationImports, EXPECTED_HOME_COMMUNITY_INSPIRATION_IMPORTS);
assertListEqual("styles/features/home-shell.css", homeShellImports, EXPECTED_HOME_SHELL_IMPORTS);
assertListEqual("styles/features/home-shell-prompt.css", homeShellPromptImports, EXPECTED_HOME_SHELL_PROMPT_IMPORTS);
assertListEqual("styles/features/home-shell-model.css", homeShellModelImports, EXPECTED_HOME_SHELL_MODEL_IMPORTS);
checkImportedFilesExist(stylesImports, ".");
checkImportedFilesExist(imageCompareImports, "styles");
checkImportedFilesExist(taskLogImports, "styles");
checkImportedFilesExist(workspaceImports, "styles");
checkImportedFilesExist(projectLibraryImports, "styles/features");
checkImportedFilesExist(projectLibraryShellImports, "styles/features");
checkImportedFilesExist(projectLibraryCardsImports, "styles/features");
checkImportedFilesExist(projectLibraryPageImports, "styles/features");
checkImportedFilesExist(legacySplitImports, "styles");
checkImportedFilesExist(legacyThemeIosImports, "styles");
checkImportedFilesExist(legacyChatImports, "styles");
checkImportedFilesExist(legacyCompactControlsImports, "styles");
checkImportedFilesExist(legacyCompactToolRailImports, "styles");
checkImportedFilesExist(legacyThemeSyncImports, "styles");
checkImportedFilesExist(legacyThemeSyncNodeMediaImports, "styles");
checkImportedFilesExist(legacyThemeSyncModelPreferenceImports, "styles");
checkImportedFilesExist(legacyThemeSyncModelPreferencePanelImports, "styles");
checkImportedFilesExist(legacyCanvasImports, "styles");
checkImportedFilesExist(legacyCanvasChoiceOverlayImports, "styles");
checkImportedFilesExist(legacyCanvasWorldImports, "styles");
checkImportedFilesExist(legacyCanvasVideoGeneratorImports, "styles");
checkImportedFilesExist(legacyCanvasProjectHeaderImports, "styles");
checkImportedFilesExist(legacyCanvasShellImports, "styles");
checkImportedFilesExist(legacyCanvasImageEditImports, "styles");
checkImportedFilesExist(legacyCanvasVisualImports, "styles");
checkImportedFilesExist(legacyCanvasVisualShellImports, "styles");
checkImportedFilesExist(legacyCanvasVisualShapeToolsImports, "styles");
checkImportedFilesExist(authImports, "styles/features");
checkImportedFilesExist(authAccountImports, "styles/features");
checkImportedFilesExist(authCreditDetailImports, "styles/features");
checkImportedFilesExist(authDialogImports, "styles/features");
checkImportedFilesExist(nodeImports, "styles/features");
checkImportedFilesExist(nodeBaseImports, "styles/features");
checkImportedFilesExist(nodeImageEditImports, "styles/features");
checkImportedFilesExist(nodeImageCropImports, "styles/features");
checkImportedFilesExist(nodeImageExpandImports, "styles/features");
checkImportedFilesExist(nodeImageToolbarImports, "styles/features");
checkImportedFilesExist(nodeImageToolbarBaseImports, "styles/features");
checkImportedFilesExist(nodeImageToolbarUpscaleImports, "styles/features");
checkImportedFilesExist(nodeImageToolbarMenuImports, "styles/features");
checkImportedFilesExist(nodeImageToolbarMenuUpscaleImports, "styles/features");
checkImportedFilesExist(nodeImageToolbarMenuDarkImports, "styles/features");
checkImportedFilesExist(nodeImageToolbarSavebarImports, "styles/features");
checkImportedFilesExist(nodeImagePanelsImports, "styles/features");
checkImportedFilesExist(nodeImageTextPanelImports, "styles/features");
checkImportedFilesExist(nodeImageLightboxImports, "styles/features");
checkImportedFilesExist(nodeStackImports, "styles/features");
checkImportedFilesExist(nodeStackBaseImports, "styles/features");
checkImportedFilesExist(nodeStackTrayImports, "styles/features");
checkImportedFilesExist(nodeDirectorImports, "styles/features");
checkImportedFilesExist(nodeMediaImports, "styles/features");
checkImportedFilesExist(nodeMediaShellImports, "styles/features");
checkImportedFilesExist(nodeMediaVideoImports, "styles/features");
checkImportedFilesExist(nodeMediaFrameImports, "styles/features");
checkImportedFilesExist(nodeGenerationImports, "styles/features");
checkImportedFilesExist(nodePreviewImports, "styles/features");
checkImportedFilesExist(nodeImageGeneratorImports, "styles/features");
checkImportedFilesExist(nodeImageGeneratorBaseImports, "styles/features");
checkImportedFilesExist(nodeImageGeneratorPanelImports, "styles/features");
checkImportedFilesExist(nodeImageGeneratorShellImports, "styles/features");
checkImportedFilesExist(nodeImageGeneratorGlassImports, "styles/features");
checkImportedFilesExist(nodeImageGeneratorInlineEditImports, "styles/features");
checkImportedFilesExist(assetImports, "styles/features");
checkImportedFilesExist(assetBoardImports, "styles/features");
checkImportedFilesExist(assetSaveImports, "styles/features");
checkImportedFilesExist(assetSavePopoverImports, "styles/features");
checkImportedFilesExist(assetSaveBoardPopoverImports, "styles/features");
checkImportedFilesExist(assetPickerImports, "styles/features");
checkImportedFilesExist(assetPickerPopoverImports, "styles/features");
checkImportedFilesExist(assetPickerListImports, "styles/features");
checkImportedFilesExist(assetPickerPreviewImports, "styles/features");
checkImportedFilesExist(assetCanvasPickerImports, "styles/features");
checkImportedFilesExist(assetCanvasPickerShellImports, "styles/features");
checkImportedFilesExist(assetCanvasPickerProjectsImports, "styles/features");
checkImportedFilesExist(assetContextMenuImports, "styles/features");
checkImportedFilesExist(assetPageImports, "styles/features");
checkImportedFilesExist(assetPagePinterestLegacyImports, "styles/features");
checkImportedFilesExist(assetPagePinterestBoardLegacyImports, "styles/features");
checkImportedFilesExist(assetPagePinterestPinLegacyImports, "styles/features");
checkImportedFilesExist(assetPinterestImports, "styles/features");
checkImportedFilesExist(assetPinterestBoardImports, "styles/features");
checkImportedFilesExist(assetPinterestBoardTilesLegacyImports, "styles/features");
checkImportedFilesExist(assetPinterestShellImports, "styles/features");
checkImportedFilesExist(assetPinterestBoardRefreshImports, "styles/features");
checkImportedFilesExist(assetPinterestBoardRefreshGridImports, "styles/features");
checkImportedFilesExist(assetPinterestPinImports, "styles/features");
checkImportedFilesExist(assetPinterestPinCardImports, "styles/features");
checkImportedFilesExist(assetPinterestResponsiveImports, "styles/features");
checkImportedFilesExist(assetPinterestResponsiveInteractionsImports, "styles/features");
checkImportedFilesExist(homeImports, "styles/features");
checkImportedFilesExist(homeHistoryImports, "styles/features");
checkImportedFilesExist(homeHistoryStackImports, "styles/features");
checkImportedFilesExist(homeHistorySectionImports, "styles/features");
checkImportedFilesExist(homeHistorySectionHeadImports, "styles/features");
checkImportedFilesExist(homeHistoryCardsImports, "styles/features");
checkImportedFilesExist(homeCommunityImports, "styles/features");
checkImportedFilesExist(homeCommunityChannelImports, "styles/features");
checkImportedFilesExist(homeCommunityChannelStripImports, "styles/features");
checkImportedFilesExist(homeCommunityFeedImports, "styles/features");
checkImportedFilesExist(homeCommunityInspirationImports, "styles/features");
checkImportedFilesExist(homeShellImports, "styles/features");
checkImportedFilesExist(homeShellPromptImports, "styles/features");
checkImportedFilesExist(homeShellModelImports, "styles/features");
checkCssReachability();
checkFileContains("styles/image-compare.css", EXPECTED_IMAGE_COMPARE_SELECTORS);
checkFileContains("styles/image-compare-shell.css", EXPECTED_IMAGE_COMPARE_SHELL_SELECTORS);
checkFileContains("styles/image-compare-controls.css", EXPECTED_IMAGE_COMPARE_CONTROLS_SELECTORS);
checkFileContains("styles/image-compare-slider.css", EXPECTED_IMAGE_COMPARE_SLIDER_SELECTORS);
checkFileContains("styles/image-compare-modes.css", EXPECTED_IMAGE_COMPARE_MODES_SELECTORS);
checkFileContains("styles/task-log-shell.css", EXPECTED_TASK_LOG_SHELL_SELECTORS);
checkFileContains("styles/task-log-table.css", EXPECTED_TASK_LOG_TABLE_SELECTORS);
checkFileContains("styles/task-log-modal.css", EXPECTED_TASK_LOG_MODAL_SELECTORS);
checkFileContains("styles/task-log-output.css", EXPECTED_TASK_LOG_OUTPUT_SELECTORS);
checkFileContains("styles/task-log-responsive.css", EXPECTED_TASK_LOG_RESPONSIVE_SELECTORS);
checkFileContains("styles/features/auth-account.css", EXPECTED_AUTH_ACCOUNT_SELECTORS);
checkFileContains("styles/features/auth-account-entry.css", EXPECTED_AUTH_ACCOUNT_ENTRY_SELECTORS);
checkFileContains("styles/features/auth-account-popover.css", EXPECTED_AUTH_ACCOUNT_POPOVER_SELECTORS);
checkFileContains("styles/features/auth-account-menu.css", EXPECTED_AUTH_ACCOUNT_MENU_SELECTORS);
checkFileContains("styles/features/auth-credit-detail.css", EXPECTED_AUTH_CREDIT_DETAIL_SELECTORS);
checkFileContains("styles/features/auth-credit-detail-shell.css", EXPECTED_AUTH_CREDIT_DETAIL_SHELL_SELECTORS);
checkFileContains("styles/features/auth-credit-detail-profile.css", EXPECTED_AUTH_CREDIT_DETAIL_PROFILE_SELECTORS);
checkFileContains("styles/features/auth-credit-detail-transactions.css", EXPECTED_AUTH_CREDIT_DETAIL_TRANSACTIONS_SELECTORS);
checkFileContains("styles/features/auth-credit-detail-responsive.css", EXPECTED_AUTH_CREDIT_DETAIL_RESPONSIVE_SELECTORS);
checkFileContains("styles/features/auth-dialog.css", EXPECTED_AUTH_DIALOG_SELECTORS);
checkFileContains("styles/features/auth-dialog-menu.css", EXPECTED_AUTH_DIALOG_MENU_SELECTORS);
checkFileContains("styles/features/auth-dialog-shell.css", EXPECTED_AUTH_DIALOG_SHELL_SELECTORS);
checkFileContains("styles/features/auth-dialog-wechat.css", EXPECTED_AUTH_DIALOG_WECHAT_SELECTORS);
checkFileContains("styles/features/auth-dialog-methods.css", EXPECTED_AUTH_DIALOG_METHODS_SELECTORS);
checkFileContains("styles/features/auth-dialog-form.css", EXPECTED_AUTH_DIALOG_FORM_SELECTORS);
checkFileContains("styles/features/assets-floating-library.css", EXPECTED_ASSET_PAGE_SELECTORS);
checkFileContains("styles/features/assets-page-view.css", EXPECTED_ASSET_PAGE_VIEW_SELECTORS);
checkFileContains("styles/features/assets-page-pinterest-legacy.css", EXPECTED_ASSET_PAGE_PINTEREST_LEGACY_SELECTORS);
checkFileContains("styles/features/assets-page-pinterest-shell-legacy.css", EXPECTED_ASSET_PAGE_PINTEREST_SHELL_LEGACY_SELECTORS);
checkFileContains("styles/features/assets-page-pinterest-board-legacy.css", EXPECTED_ASSET_PAGE_PINTEREST_BOARD_LEGACY_SELECTORS);
checkFileContains("styles/features/assets-page-pinterest-board-grid-legacy.css", EXPECTED_ASSET_PAGE_PINTEREST_BOARD_GRID_LEGACY_SELECTORS);
checkFileContains("styles/features/assets-page-pinterest-board-cover-legacy.css", EXPECTED_ASSET_PAGE_PINTEREST_BOARD_COVER_LEGACY_SELECTORS);
checkFileContains("styles/features/assets-page-pinterest-board-meta-legacy.css", EXPECTED_ASSET_PAGE_PINTEREST_BOARD_META_LEGACY_SELECTORS);
checkFileContains("styles/features/assets-page-pinterest-pin-legacy.css", EXPECTED_ASSET_PAGE_PINTEREST_PIN_LEGACY_SELECTORS);
checkFileContains("styles/features/assets-page-pinterest-pin-shell-legacy.css", EXPECTED_ASSET_PAGE_PINTEREST_PIN_SHELL_LEGACY_SELECTORS);
checkFileContains("styles/features/assets-page-pinterest-pin-card-legacy.css", EXPECTED_ASSET_PAGE_PINTEREST_PIN_CARD_LEGACY_SELECTORS);
checkFileContains("styles/features/assets-page-pinterest-pin-actions-legacy.css", EXPECTED_ASSET_PAGE_PINTEREST_PIN_ACTIONS_LEGACY_SELECTORS);
checkFileContains("styles/features/assets-page-pinterest-pin-empty-legacy.css", EXPECTED_ASSET_PAGE_PINTEREST_PIN_EMPTY_LEGACY_SELECTORS);
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
checkFileContains("styles/features/assets-picker-preview-overlay.css", EXPECTED_ASSET_PICKER_PREVIEW_OVERLAY_SELECTORS);
checkFileContains("styles/features/assets-picker-preview-dialog.css", EXPECTED_ASSET_PICKER_PREVIEW_DIALOG_SELECTORS);
checkFileContains("styles/features/assets-canvas-picker.css", EXPECTED_ASSET_CANVAS_PICKER_SELECTORS);
checkFileContains("styles/features/assets-canvas-picker-shell.css", EXPECTED_ASSET_CANVAS_PICKER_SHELL_SELECTORS);
checkFileContains("styles/features/assets-canvas-picker-shell-frame.css", EXPECTED_ASSET_CANVAS_PICKER_SHELL_FRAME_SELECTORS);
checkFileContains("styles/features/assets-canvas-picker-shell-head.css", EXPECTED_ASSET_CANVAS_PICKER_SHELL_HEAD_SELECTORS);
checkFileContains("styles/features/assets-canvas-picker-projects.css", EXPECTED_ASSET_CANVAS_PICKER_PROJECTS_SELECTORS);
checkFileContains("styles/features/assets-canvas-picker-projects-row.css", EXPECTED_ASSET_CANVAS_PICKER_PROJECTS_ROW_SELECTORS);
checkFileContains("styles/features/assets-canvas-picker-projects-meta.css", EXPECTED_ASSET_CANVAS_PICKER_PROJECTS_META_SELECTORS);
checkFileContains("styles/features/assets-context-menu.css", EXPECTED_ASSET_CONTEXT_MENU_SELECTORS);
checkFileContains("styles/features/assets-context-menu-shell.css", EXPECTED_ASSET_CONTEXT_MENU_SHELL_SELECTORS);
checkFileContains("styles/features/assets-context-menu-items.css", EXPECTED_ASSET_CONTEXT_MENU_ITEMS_SELECTORS);
checkFileContains("styles/features/assets-context-menu-submenu.css", EXPECTED_ASSET_CONTEXT_MENU_SUBMENU_SELECTORS);
checkFileContains("styles/features/assets-pinterest.css", EXPECTED_ASSET_PINTEREST_SELECTORS);
checkFileContains("styles/features/assets-pinterest-shell.css", EXPECTED_ASSET_PINTEREST_SHELL_SELECTORS);
checkFileContains("styles/features/assets-pinterest-shell-header.css", EXPECTED_ASSET_PINTEREST_SHELL_HEADER_SELECTORS);
checkFileContains("styles/features/assets-pinterest-shell-stats.css", EXPECTED_ASSET_PINTEREST_SHELL_STATS_SELECTORS);
checkFileContains("styles/features/assets-pinterest-shell-nav.css", EXPECTED_ASSET_PINTEREST_SHELL_NAV_SELECTORS);
checkFileContains("styles/features/assets-pinterest-board.css", EXPECTED_ASSET_PINTEREST_BOARD_SELECTORS);
checkFileContains("styles/features/assets-pinterest-board-shell-legacy.css", EXPECTED_ASSET_PINTEREST_BOARD_SHELL_LEGACY_SELECTORS);
checkFileContains("styles/features/assets-pinterest-board-tiles-legacy.css", EXPECTED_ASSET_PINTEREST_BOARD_TILES_LEGACY_SELECTORS);
checkFileContains("styles/features/assets-pinterest-board-tiles-grid-legacy.css", EXPECTED_ASSET_PINTEREST_BOARD_TILES_GRID_LEGACY_SELECTORS);
checkFileContains("styles/features/assets-pinterest-board-tiles-cover-legacy.css", EXPECTED_ASSET_PINTEREST_BOARD_TILES_COVER_LEGACY_SELECTORS);
checkFileContains("styles/features/assets-pinterest-board-tiles-meta-legacy.css", EXPECTED_ASSET_PINTEREST_BOARD_TILES_META_LEGACY_SELECTORS);
checkFileContains("styles/features/assets-pinterest-board-masonry-legacy.css", EXPECTED_ASSET_PINTEREST_BOARD_MASONRY_LEGACY_SELECTORS);
checkFileContains("styles/features/assets-pinterest-board-responsive-legacy.css", EXPECTED_ASSET_PINTEREST_BOARD_RESPONSIVE_LEGACY_SELECTORS);
checkFileContains("styles/features/assets-pinterest-board-refresh.css", EXPECTED_ASSET_PINTEREST_BOARD_REFRESH_SELECTORS);
checkFileContains("styles/features/assets-pinterest-board-refresh-grid.css", EXPECTED_ASSET_PINTEREST_BOARD_REFRESH_GRID_SELECTORS);
checkFileContains("styles/features/assets-pinterest-board-refresh-grid-layout.css", EXPECTED_ASSET_PINTEREST_BOARD_REFRESH_GRID_LAYOUT_SELECTORS);
checkFileContains("styles/features/assets-pinterest-board-refresh-grid-cover.css", EXPECTED_ASSET_PINTEREST_BOARD_REFRESH_GRID_COVER_SELECTORS);
checkFileContains("styles/features/assets-pinterest-board-refresh-grid-cells.css", EXPECTED_ASSET_PINTEREST_BOARD_REFRESH_GRID_CELLS_SELECTORS);
checkFileContains("styles/features/assets-pinterest-board-refresh-grid-empty.css", EXPECTED_ASSET_PINTEREST_BOARD_REFRESH_GRID_EMPTY_SELECTORS);
checkFileContains("styles/features/assets-pinterest-board-refresh-create.css", EXPECTED_ASSET_PINTEREST_BOARD_REFRESH_CREATE_SELECTORS);
checkFileContains("styles/features/assets-pinterest-board-refresh-meta.css", EXPECTED_ASSET_PINTEREST_BOARD_REFRESH_META_SELECTORS);
checkFileContains("styles/features/assets-pinterest-pin.css", EXPECTED_ASSET_PINTEREST_PIN_SELECTORS);
checkFileContains("styles/features/assets-pinterest-pin-card.css", EXPECTED_ASSET_PINTEREST_PIN_CARD_SELECTORS);
checkFileContains("styles/features/assets-pinterest-pin-card-shell.css", EXPECTED_ASSET_PINTEREST_PIN_CARD_SHELL_SELECTORS);
checkFileContains("styles/features/assets-pinterest-pin-card-thumb.css", EXPECTED_ASSET_PINTEREST_PIN_CARD_THUMB_SELECTORS);
checkFileContains("styles/features/assets-pinterest-pin-card-meta.css", EXPECTED_ASSET_PINTEREST_PIN_CARD_META_SELECTORS);
checkFileContains("styles/features/assets-pinterest-pin-actions.css", EXPECTED_ASSET_PINTEREST_PIN_ACTIONS_SELECTORS);
checkFileContains("styles/features/assets-pinterest-pin-empty.css", EXPECTED_ASSET_PINTEREST_PIN_EMPTY_SELECTORS);
checkFileContains("styles/features/assets-pinterest-layout.css", EXPECTED_ASSET_PINTEREST_LAYOUT_SELECTORS);
checkFileContains("styles/features/assets-pinterest-responsive.css", EXPECTED_ASSET_PINTEREST_RESPONSIVE_SELECTORS);
checkFileContains("styles/features/assets-pinterest-responsive-breakpoints.css", EXPECTED_ASSET_PINTEREST_RESPONSIVE_BREAKPOINTS_SELECTORS);
checkFileContains("styles/features/assets-pinterest-responsive-interactions.css", EXPECTED_ASSET_PINTEREST_RESPONSIVE_INTERACTIONS_SELECTORS);
checkFileContains("styles/features/assets-pinterest-responsive-interactions-page.css", EXPECTED_ASSET_PINTEREST_RESPONSIVE_INTERACTIONS_PAGE_SELECTORS);
checkFileContains("styles/features/assets-pinterest-responsive-interactions-board.css", EXPECTED_ASSET_PINTEREST_RESPONSIVE_INTERACTIONS_BOARD_SELECTORS);
checkFileContains("styles/features/assets-pinterest-responsive-interactions-pin.css", EXPECTED_ASSET_PINTEREST_RESPONSIVE_INTERACTIONS_PIN_SELECTORS);
checkFileContains("styles/features/assets-pinterest-responsive-interactions-breakpoints.css", EXPECTED_ASSET_PINTEREST_RESPONSIVE_INTERACTIONS_BREAKPOINTS_SELECTORS);
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
checkFileContains("styles/legacy-theme-sync-model-preference-panel-shell.css", EXPECTED_LEGACY_THEME_SYNC_MODEL_PREFERENCE_PANEL_SHELL_SELECTORS);
checkFileContains("styles/legacy-theme-sync-model-preference-panel-tabs.css", EXPECTED_LEGACY_THEME_SYNC_MODEL_PREFERENCE_PANEL_TABS_SELECTORS);
checkFileContains("styles/legacy-theme-sync-model-preference-panel-list.css", EXPECTED_LEGACY_THEME_SYNC_MODEL_PREFERENCE_PANEL_LIST_SELECTORS);
checkFileContains("styles/legacy-theme-sync-model-preference-panel-option.css", EXPECTED_LEGACY_THEME_SYNC_MODEL_PREFERENCE_PANEL_OPTION_SELECTORS);
checkFileContains("styles/legacy-theme-sync-model-preference-panel-meta.css", EXPECTED_LEGACY_THEME_SYNC_MODEL_PREFERENCE_PANEL_META_SELECTORS);
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
checkFileContains("styles/legacy-canvas-visual-shell-brand-menu.css", EXPECTED_LEGACY_CANVAS_VISUAL_SHELL_BRAND_MENU_SELECTORS);
checkFileContains("styles/legacy-canvas-visual-shell-home-menu.css", EXPECTED_LEGACY_CANVAS_VISUAL_SHELL_HOME_MENU_SELECTORS);
checkFileContains("styles/legacy-canvas-visual-shell-simple-page.css", EXPECTED_LEGACY_CANVAS_VISUAL_SHELL_SIMPLE_PAGE_SELECTORS);
checkFileContains("styles/features/home.css", EXPECTED_HOME_SELECTORS);
checkFileContains("styles/features/home-responsive-tablet.css", EXPECTED_HOME_RESPONSIVE_TABLET_SELECTORS);
checkFileContains("styles/features/home-responsive-mobile.css", EXPECTED_HOME_RESPONSIVE_MOBILE_SELECTORS);
checkFileContains("styles/features/home-shell.css", EXPECTED_HOME_SHELL_SELECTORS);
checkFileContains("styles/features/home-shell-boot.css", EXPECTED_HOME_SHELL_BOOT_SELECTORS);
checkFileContains("styles/features/home-shell-prompt.css", EXPECTED_HOME_SHELL_PROMPT_SELECTORS);
checkFileContains("styles/features/home-shell-prompt-stage.css", EXPECTED_HOME_SHELL_PROMPT_STAGE_SELECTORS);
checkFileContains("styles/features/home-shell-prompt-form.css", EXPECTED_HOME_SHELL_PROMPT_FORM_SELECTORS);
checkFileContains("styles/features/home-shell-prompt-files.css", EXPECTED_HOME_SHELL_PROMPT_FILES_SELECTORS);
checkFileContains("styles/features/home-shell-prompt-controls.css", EXPECTED_HOME_SHELL_PROMPT_CONTROLS_SELECTORS);
checkFileContains("styles/features/home-shell-model.css", EXPECTED_HOME_SHELL_MODEL_SELECTORS);
checkFileContains("styles/features/home-shell-model-picker.css", EXPECTED_HOME_SHELL_MODEL_PICKER_SELECTORS);
checkFileContains("styles/features/home-shell-model-menu.css", EXPECTED_HOME_SHELL_MODEL_MENU_SELECTORS);
checkFileContains("styles/features/home-shell-model-native.css", EXPECTED_HOME_SHELL_MODEL_NATIVE_SELECTORS);
checkFileContains("styles/features/home-shell-transition.css", EXPECTED_HOME_SHELL_TRANSITION_SELECTORS);
checkFileContains("styles/features/home-history-stack.css", EXPECTED_HOME_HISTORY_SELECTORS);
checkFileContains("styles/features/home-history-stack-shell.css", EXPECTED_HOME_HISTORY_STACK_SHELL_SELECTORS);
checkFileContains("styles/features/home-history-stack-preview.css", EXPECTED_HOME_HISTORY_STACK_PREVIEW_SELECTORS);
checkFileContains("styles/features/home-history-stack-open.css", EXPECTED_HOME_HISTORY_STACK_OPEN_SELECTORS);
checkFileContains("styles/features/home-history-section.css", EXPECTED_HOME_HISTORY_SECTION_SELECTORS);
checkFileContains("styles/features/home-history-section-layout.css", EXPECTED_HOME_HISTORY_SECTION_LAYOUT_SELECTORS);
checkFileContains("styles/features/home-history-section-head.css", EXPECTED_HOME_HISTORY_SECTION_HEAD_SELECTORS);
checkFileContains("styles/features/home-history-section-head-base.css", EXPECTED_HOME_HISTORY_SECTION_HEAD_BASE_SELECTORS);
checkFileContains("styles/features/home-history-section-head-nav.css", EXPECTED_HOME_HISTORY_SECTION_HEAD_NAV_SELECTORS);
checkFileContains("styles/features/home-history-section-head-action.css", EXPECTED_HOME_HISTORY_SECTION_HEAD_ACTION_SELECTORS);
checkFileContains("styles/features/home-history-cards.css", EXPECTED_HOME_HISTORY_CARD_SELECTORS);
checkFileContains("styles/features/home-history-cards-base.css", EXPECTED_HOME_HISTORY_CARD_BASE_SELECTORS);
checkFileContains("styles/features/home-history-cards-delete.css", EXPECTED_HOME_HISTORY_CARD_DELETE_SELECTORS);
checkFileContains("styles/features/home-history-cards-preview.css", EXPECTED_HOME_HISTORY_CARD_PREVIEW_SELECTORS);
checkFileContains("styles/features/home-history-cards-meta.css", EXPECTED_HOME_HISTORY_CARD_META_SELECTORS);
checkFileContains("styles/features/home-community.css", EXPECTED_HOME_COMMUNITY_SELECTORS);
checkFileContains("styles/features/home-community-channels.css", EXPECTED_HOME_COMMUNITY_CHANNEL_SELECTORS);
checkFileContains("styles/features/home-community-channels-shell.css", EXPECTED_HOME_COMMUNITY_CHANNEL_SHELL_SELECTORS);
checkFileContains("styles/features/home-community-channels-strip.css", EXPECTED_HOME_COMMUNITY_CHANNEL_STRIP_SELECTORS);
checkFileContains("styles/features/home-community-channels-strip-shell.css", EXPECTED_HOME_COMMUNITY_CHANNEL_STRIP_SHELL_SELECTORS);
checkFileContains("styles/features/home-community-channels-strip-button.css", EXPECTED_HOME_COMMUNITY_CHANNEL_STRIP_BUTTON_SELECTORS);
checkFileContains("styles/features/home-community-channels-strip-tone.css", EXPECTED_HOME_COMMUNITY_CHANNEL_STRIP_TONE_SELECTORS);
checkFileContains("styles/features/home-community-channels-scroll.css", EXPECTED_HOME_COMMUNITY_CHANNEL_SCROLL_SELECTORS);
checkFileContains("styles/features/home-community-feed.css", EXPECTED_HOME_COMMUNITY_FEED_SELECTORS);
checkFileContains("styles/features/home-community-feed-masonry.css", EXPECTED_HOME_COMMUNITY_FEED_MASONRY_SELECTORS);
checkFileContains("styles/features/home-community-feed-back-top.css", EXPECTED_HOME_COMMUNITY_FEED_BACK_TOP_SELECTORS);
checkFileContains("styles/features/home-community-inspiration.css", EXPECTED_HOME_COMMUNITY_INSPIRATION_SELECTORS);
checkFileContains("styles/features/home-community-inspiration-grid.css", EXPECTED_HOME_COMMUNITY_INSPIRATION_GRID_SELECTORS);
checkFileContains("styles/features/home-community-inspiration-card.css", EXPECTED_HOME_COMMUNITY_INSPIRATION_CARD_SELECTORS);
checkFileContains("styles/features/node-base.css", EXPECTED_NODE_BASE_SELECTORS);
checkFileContains("styles/features/node-base-card.css", EXPECTED_NODE_BASE_CARD_SELECTORS);
checkFileContains("styles/features/node-base-group.css", EXPECTED_NODE_BASE_GROUP_SELECTORS);
checkFileContains("styles/features/node-base-resize.css", EXPECTED_NODE_BASE_RESIZE_SELECTORS);
checkFileContains("styles/features/node-base-actions.css", EXPECTED_NODE_BASE_ACTIONS_SELECTORS);
checkFileContains("styles/features/node-image-edit-state.css", EXPECTED_NODE_IMAGE_EDIT_SELECTORS);
checkFileContains("styles/features/node-image-crop.css", EXPECTED_NODE_IMAGE_CROP_SELECTORS);
checkFileContains("styles/features/node-image-crop-overlay.css", EXPECTED_NODE_IMAGE_CROP_OVERLAY_SELECTORS);
checkFileContains("styles/features/node-image-crop-handles.css", EXPECTED_NODE_IMAGE_CROP_HANDLES_SELECTORS);
checkFileContains("styles/features/node-image-crop-actions.css", EXPECTED_NODE_IMAGE_CROP_ACTIONS_SELECTORS);
checkFileContains("styles/features/node-image-expand.css", EXPECTED_NODE_IMAGE_EXPAND_SELECTORS);
checkFileContains("styles/features/node-image-expand-overlay.css", EXPECTED_NODE_IMAGE_EXPAND_OVERLAY_SELECTORS);
checkFileContains("styles/features/node-image-expand-handles.css", EXPECTED_NODE_IMAGE_EXPAND_HANDLES_SELECTORS);
checkFileContains("styles/features/node-image-expand-actions.css", EXPECTED_NODE_IMAGE_EXPAND_ACTIONS_SELECTORS);
checkFileContains("styles/features/node-image-expand-state.css", EXPECTED_NODE_IMAGE_EXPAND_STATE_SELECTORS);
checkFileContains("styles/features/node-state.css", EXPECTED_NODE_STATE_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-base.css", EXPECTED_NODE_IMAGE_TOOLBAR_BASE_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-base-shell.css", EXPECTED_NODE_IMAGE_TOOLBAR_BASE_SHELL_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-base-menu.css", EXPECTED_NODE_IMAGE_TOOLBAR_BASE_MENU_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-base-state.css", EXPECTED_NODE_IMAGE_TOOLBAR_BASE_STATE_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-base-buttons.css", EXPECTED_NODE_IMAGE_TOOLBAR_BASE_BUTTONS_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-base-main.css", EXPECTED_NODE_IMAGE_TOOLBAR_BASE_MAIN_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-upscale.css", EXPECTED_NODE_IMAGE_TOOLBAR_UPSCALE_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-upscale-mode.css", EXPECTED_NODE_IMAGE_TOOLBAR_UPSCALE_MODE_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-upscale-size.css", EXPECTED_NODE_IMAGE_TOOLBAR_UPSCALE_SIZE_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-upscale-generate.css", EXPECTED_NODE_IMAGE_TOOLBAR_UPSCALE_GENERATE_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-menu.css", EXPECTED_NODE_IMAGE_TOOLBAR_MENU_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-menu-base.css", EXPECTED_NODE_IMAGE_TOOLBAR_MENU_BASE_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-menu-surface.css", EXPECTED_NODE_IMAGE_TOOLBAR_MENU_SURFACE_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-menu-upscale.css", EXPECTED_NODE_IMAGE_TOOLBAR_MENU_UPSCALE_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-menu-upscale-card.css", EXPECTED_NODE_IMAGE_TOOLBAR_MENU_UPSCALE_CARD_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-menu-upscale-hover.css", EXPECTED_NODE_IMAGE_TOOLBAR_MENU_UPSCALE_HOVER_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-menu-upscale-content.css", EXPECTED_NODE_IMAGE_TOOLBAR_MENU_UPSCALE_CONTENT_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-menu-upscale-badge.css", EXPECTED_NODE_IMAGE_TOOLBAR_MENU_UPSCALE_BADGE_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-menu-dark.css", EXPECTED_NODE_IMAGE_TOOLBAR_MENU_DARK_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-menu-dark-upscale.css", EXPECTED_NODE_IMAGE_TOOLBAR_MENU_DARK_UPSCALE_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-menu-dark-surface.css", EXPECTED_NODE_IMAGE_TOOLBAR_MENU_DARK_SURFACE_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-menu-dark-buttons.css", EXPECTED_NODE_IMAGE_TOOLBAR_MENU_DARK_BUTTONS_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-menu-dark-size.css", EXPECTED_NODE_IMAGE_TOOLBAR_MENU_DARK_SIZE_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-savebar.css", EXPECTED_NODE_IMAGE_TOOLBAR_SAVEBAR_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-savebar-shell.css", EXPECTED_NODE_IMAGE_TOOLBAR_SAVEBAR_SHELL_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-savebar-board.css", EXPECTED_NODE_IMAGE_TOOLBAR_SAVEBAR_BOARD_SELECTORS);
checkFileContains("styles/features/node-image-toolbar-savebar-submit.css", EXPECTED_NODE_IMAGE_TOOLBAR_SAVEBAR_SUBMIT_SELECTORS);
checkFileContains("styles/features/node-image-text-panel.css", EXPECTED_NODE_IMAGE_TEXT_PANEL_SELECTORS);
checkFileContains("styles/features/node-image-text-panel-shell.css", EXPECTED_NODE_IMAGE_TEXT_PANEL_SHELL_SELECTORS);
checkFileContains("styles/features/node-image-text-panel-list.css", EXPECTED_NODE_IMAGE_TEXT_PANEL_LIST_SELECTORS);
checkFileContains("styles/features/node-image-text-panel-footer.css", EXPECTED_NODE_IMAGE_TEXT_PANEL_FOOTER_SELECTORS);
checkFileContains("styles/features/node-image-lightbox.css", EXPECTED_NODE_IMAGE_LIGHTBOX_SELECTORS);
checkFileContains("styles/features/node-image-lightbox-overlay.css", EXPECTED_NODE_IMAGE_LIGHTBOX_OVERLAY_SELECTORS);
checkFileContains("styles/features/node-image-lightbox-figure.css", EXPECTED_NODE_IMAGE_LIGHTBOX_FIGURE_SELECTORS);
checkFileContains("styles/features/node-image-lightbox-close.css", EXPECTED_NODE_IMAGE_LIGHTBOX_CLOSE_SELECTORS);
checkFileContains("styles/features/node-stack-base.css", EXPECTED_NODE_STACK_BASE_SELECTORS);
checkFileContains("styles/features/node-stack-base-hidden.css", EXPECTED_NODE_STACK_BASE_HIDDEN_SELECTORS);
checkFileContains("styles/features/node-stack-base-depth.css", EXPECTED_NODE_STACK_BASE_DEPTH_SELECTORS);
checkFileContains("styles/features/node-stack-base-drop.css", EXPECTED_NODE_STACK_BASE_DROP_SELECTORS);
checkFileContains("styles/features/node-stack-base-toggle.css", EXPECTED_NODE_STACK_BASE_TOGGLE_SELECTORS);
checkFileContains("styles/features/node-stack-tray.css", EXPECTED_NODE_STACK_TRAY_SELECTORS);
checkFileContains("styles/features/node-stack-tray-shell.css", EXPECTED_NODE_STACK_TRAY_SHELL_SELECTORS);
checkFileContains("styles/features/node-stack-tray-row.css", EXPECTED_NODE_STACK_TRAY_ROW_SELECTORS);
checkFileContains("styles/features/node-stack-tray-thumb.css", EXPECTED_NODE_STACK_TRAY_THUMB_SELECTORS);
checkFileContains("styles/features/node-stack-tray-meta.css", EXPECTED_NODE_STACK_TRAY_META_SELECTORS);
checkFileContains("styles/features/node-director.css", EXPECTED_NODE_DIRECTOR_SELECTORS);
checkFileContains("styles/features/node-director-shell.css", EXPECTED_NODE_DIRECTOR_SHELL_SELECTORS);
checkFileContains("styles/features/node-director-head.css", EXPECTED_NODE_DIRECTOR_HEAD_SELECTORS);
checkFileContains("styles/features/node-director-actions.css", EXPECTED_NODE_DIRECTOR_ACTIONS_SELECTORS);
checkFileContains("styles/features/node-director-tile.css", EXPECTED_NODE_DIRECTOR_TILE_SELECTORS);
checkFileContains("styles/features/node-media-shell.css", EXPECTED_NODE_MEDIA_SHELL_SELECTORS);
checkFileContains("styles/features/node-media-shell-2d.css", EXPECTED_NODE_MEDIA_SHELL_2D_SELECTORS);
checkFileContains("styles/features/node-media-shell-dark.css", EXPECTED_NODE_MEDIA_SHELL_DARK_SELECTORS);
checkFileContains("styles/features/node-media-shell-card.css", EXPECTED_NODE_MEDIA_SHELL_CARD_SELECTORS);
checkFileContains("styles/features/node-media-shell-selected.css", EXPECTED_NODE_MEDIA_SHELL_SELECTED_SELECTORS);
checkFileContains("styles/features/node-media-video.css", EXPECTED_NODE_MEDIA_VIDEO_SELECTORS);
checkFileContains("styles/features/node-media-video-shell.css", EXPECTED_NODE_MEDIA_VIDEO_SHELL_SELECTORS);
checkFileContains("styles/features/node-media-video-hidden-text.css", EXPECTED_NODE_MEDIA_VIDEO_HIDDEN_TEXT_SELECTORS);
checkFileContains("styles/features/node-media-video-preview.css", EXPECTED_NODE_MEDIA_VIDEO_PREVIEW_SELECTORS);
checkFileContains("styles/features/node-media-frame.css", EXPECTED_NODE_MEDIA_FRAME_SELECTORS);
checkFileContains("styles/features/node-media-frame-selected.css", EXPECTED_NODE_MEDIA_FRAME_SELECTED_SELECTORS);
checkFileContains("styles/features/node-media-frame-file-name.css", EXPECTED_NODE_MEDIA_FRAME_FILE_NAME_SELECTORS);
checkFileContains("styles/features/node-media-frame-image.css", EXPECTED_NODE_MEDIA_FRAME_IMAGE_SELECTORS);
checkFileContains("styles/features/node-generation.css", EXPECTED_NODE_GENERATION_SELECTORS);
checkFileContains("styles/features/node-generation-frame.css", EXPECTED_NODE_GENERATION_FRAME_SELECTORS);
checkFileContains("styles/features/node-generation-content.css", EXPECTED_NODE_GENERATION_CONTENT_SELECTORS);
checkFileContains("styles/features/node-generation-state.css", EXPECTED_NODE_GENERATION_STATE_SELECTORS);
checkFileContains("styles/features/node-generation-keyframes.css", EXPECTED_NODE_GENERATION_KEYFRAMES_SELECTORS);
checkFileContains("styles/features/node-image-generator-shell.css", EXPECTED_NODE_IMAGE_GENERATOR_BASE_SELECTORS);
checkFileContains("styles/features/node-image-generator-shell-node.css", EXPECTED_NODE_IMAGE_GENERATOR_SHELL_NODE_SELECTORS);
checkFileContains("styles/features/node-image-generator-shell-head.css", EXPECTED_NODE_IMAGE_GENERATOR_SHELL_HEAD_SELECTORS);
checkFileContains("styles/features/node-image-generator-shell-frame.css", EXPECTED_NODE_IMAGE_GENERATOR_SHELL_FRAME_SELECTORS);
checkFileContains("styles/features/node-image-generator-shell-panel.css", EXPECTED_NODE_IMAGE_GENERATOR_SHELL_PANEL_SELECTORS);
checkFileContains("styles/features/node-image-generator-shell-actions.css", EXPECTED_NODE_IMAGE_GENERATOR_SHELL_ACTIONS_SELECTORS);
checkFileContains("styles/features/node-image-generator-shell-drop.css", EXPECTED_NODE_IMAGE_GENERATOR_SHELL_DROP_SELECTORS);
checkFileContains("styles/features/node-image-generator-panel.css", EXPECTED_NODE_IMAGE_GENERATOR_PANEL_SELECTORS);
checkFileContains("styles/features/node-image-generator-panel-shell.css", EXPECTED_NODE_IMAGE_GENERATOR_PANEL_SHELL_SELECTORS);
checkFileContains("styles/features/node-image-generator-panel-references.css", EXPECTED_NODE_IMAGE_GENERATOR_PANEL_REFERENCES_SELECTORS);
checkFileContains("styles/features/node-image-generator-panel-textarea.css", EXPECTED_NODE_IMAGE_GENERATOR_PANEL_TEXTAREA_SELECTORS);
checkFileContains("styles/features/node-image-generator-panel-controls.css", EXPECTED_NODE_IMAGE_GENERATOR_PANEL_CONTROLS_SELECTORS);
checkFileContains("styles/features/node-image-generator-panel-actions.css", EXPECTED_NODE_IMAGE_GENERATOR_PANEL_ACTIONS_SELECTORS);
checkFileContains("styles/features/node-image-generator-glass.css", EXPECTED_NODE_IMAGE_GENERATOR_GLASS_SELECTORS);
checkFileContains("styles/features/node-image-generator-glass-head.css", EXPECTED_NODE_IMAGE_GENERATOR_GLASS_HEAD_SELECTORS);
checkFileContains("styles/features/node-image-generator-glass-stage.css", EXPECTED_NODE_IMAGE_GENERATOR_GLASS_STAGE_SELECTORS);
checkFileContains("styles/features/node-image-generator-glass-panel.css", EXPECTED_NODE_IMAGE_GENERATOR_GLASS_PANEL_SELECTORS);
checkFileContains("styles/features/node-image-generator-glass-references.css", EXPECTED_NODE_IMAGE_GENERATOR_GLASS_REFERENCES_SELECTORS);
checkFileContains("styles/features/node-image-generator-glass-controls.css", EXPECTED_NODE_IMAGE_GENERATOR_GLASS_CONTROLS_SELECTORS);
checkFileContains("styles/features/node-image-generator-glass-state.css", EXPECTED_NODE_IMAGE_GENERATOR_GLASS_STATE_SELECTORS);
checkFileContains("styles/features/node-image-generator-inline-edit.css", EXPECTED_NODE_IMAGE_GENERATOR_INLINE_EDIT_SELECTORS);
checkFileContains("styles/features/node-image-generator-inline-shell.css", EXPECTED_NODE_IMAGE_GENERATOR_INLINE_SHELL_SELECTORS);
checkFileContains("styles/features/node-image-generator-inline-references.css", EXPECTED_NODE_IMAGE_GENERATOR_INLINE_REFERENCES_SELECTORS);
checkFileContains("styles/features/node-image-generator-inline-textarea.css", EXPECTED_NODE_IMAGE_GENERATOR_INLINE_TEXTAREA_SELECTORS);
checkFileContains("styles/features/node-image-generator-inline-actions.css", EXPECTED_NODE_IMAGE_GENERATOR_INLINE_ACTIONS_SELECTORS);
checkFileContains("styles/features/node-image-generator-inline-responsive.css", EXPECTED_NODE_IMAGE_GENERATOR_INLINE_RESPONSIVE_SELECTORS);
checkFileContains("styles/features/node-preview.css", EXPECTED_NODE_PREVIEW_SELECTORS);
checkFileContains("styles/features/node-preview-media.css", EXPECTED_NODE_PREVIEW_MEDIA_SELECTORS);
checkFileContains("styles/features/node-preview-model.css", EXPECTED_NODE_PREVIEW_MODEL_SELECTORS);
checkFileContains("styles/features/node-preview-cube-video.css", EXPECTED_NODE_PREVIEW_CUBE_VIDEO_SELECTORS);
checkFileContains("styles/features/node-preview-bottom-controls.css", EXPECTED_NODE_PREVIEW_BOTTOM_CONTROLS_SELECTORS);
checkFileContains("styles/features/node.css", EXPECTED_NODE_SELECTORS);
checkFileContains("styles/features/project-library.css", EXPECTED_PROJECT_LIBRARY_SELECTORS);
checkFileContains("styles/features/project-library-shell.css", EXPECTED_PROJECT_LIBRARY_SHELL_SELECTORS);
checkFileContains("styles/features/project-library-shell-layout.css", EXPECTED_PROJECT_LIBRARY_SHELL_LAYOUT_SELECTORS);
checkFileContains("styles/features/project-library-shell-header.css", EXPECTED_PROJECT_LIBRARY_SHELL_HEADER_SELECTORS);
checkFileContains("styles/features/project-library-shell-selection.css", EXPECTED_PROJECT_LIBRARY_SHELL_SELECTION_SELECTORS);
checkFileContains("styles/features/project-library-shell-empty.css", EXPECTED_PROJECT_LIBRARY_SHELL_EMPTY_SELECTORS);
checkFileContains("styles/features/project-library-cards.css", EXPECTED_PROJECT_LIBRARY_CARDS_SELECTORS);
checkFileContains("styles/features/project-library-cards-base.css", EXPECTED_PROJECT_LIBRARY_CARDS_BASE_SELECTORS);
checkFileContains("styles/features/project-library-cards-selection.css", EXPECTED_PROJECT_LIBRARY_CARDS_SELECTION_SELECTORS);
checkFileContains("styles/features/project-library-cards-content.css", EXPECTED_PROJECT_LIBRARY_CARDS_CONTENT_SELECTORS);
checkFileContains("styles/features/project-library-cards-responsive.css", EXPECTED_PROJECT_LIBRARY_CARDS_RESPONSIVE_SELECTORS);
checkFileContains("styles/features/project-library-page.css", EXPECTED_PROJECT_LIBRARY_PAGE_SELECTORS);
checkFileContains("styles/features/project-library-page-layout.css", EXPECTED_PROJECT_LIBRARY_PAGE_LAYOUT_SELECTORS);
checkFileContains("styles/features/project-library-page-cards.css", EXPECTED_PROJECT_LIBRARY_PAGE_CARDS_SELECTORS);
checkFileContains("styles/features/project-library-page-new-card.css", EXPECTED_PROJECT_LIBRARY_PAGE_NEW_CARD_SELECTORS);
checkFileContains("styles/features/project-library-page-card-content.css", EXPECTED_PROJECT_LIBRARY_PAGE_CARD_CONTENT_SELECTORS);
checkFileContains("styles/features/project-library-page-responsive.css", EXPECTED_PROJECT_LIBRARY_PAGE_RESPONSIVE_SELECTORS);
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
checkFileContains("styles/legacy-compact-tool-rail-shell.css", EXPECTED_LEGACY_COMPACT_TOOL_RAIL_SHELL_SELECTORS);
checkFileContains("styles/legacy-compact-tool-rail-items.css", EXPECTED_LEGACY_COMPACT_TOOL_RAIL_ITEMS_SELECTORS);
checkFileContains("styles/legacy-compact-tool-rail-light.css", EXPECTED_LEGACY_COMPACT_TOOL_RAIL_LIGHT_SELECTORS);

if (errors.length > 0) {
  console.error("Style entry check failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Style entry checks passed.");
