import { buildRuntimeDependencies } from "./context/dependencies.js?v=20260628-boot-inline-1";
import { buildRuntimeContext } from "./context/context-builder.js?v=20260628-boot-inline-1";
import { buildRuntimeContextSections } from "./context/sections.js?v=20260628-boot-inline-1";
import { bindCanvasToolControls } from "../../canvas/tool-bindings.js";
import { bindCanvasInfrastructureFromRuntime } from "../../canvas/runtime/canvas-runtime-bindings.js";
import { bindCanvasMenuRuntime } from "../../canvas/runtime/canvas-menu-runtime.js";
import { ensureWorkspaceShowView } from "../routing/view-runtime.js";
import { bindPromptRuntime } from "../chat/runtime/prompt-runtime.js";
import { bindHomeLibraryRuntime } from "../home/runtime/home-library-runtime.js?v=20260628-boot-inline-1";
import { bindFooterRuntime } from "../interactions/footer-runtime.js";
import { bindTaskBarRuntime } from "../taskbar/task-bar-runtime.js";
import { bindCompatibilityBridge } from "./compatibility-bridge.js?v=20260628-boot-inline-1";
import { buildAppRuntimeInputs } from "./app-runtime-inputs.js";
import { initializeWorkspaceRuntimeView } from "./workspace-startup.js";
import { bootstrapWorkspaceVisualState } from "./workspace-visual-state.js";

export function initializeAppRuntime(runtime) {
  bootstrapWorkspaceVisualState(runtime);
  bindTaskBarRuntime(runtime);

  runtime.homeWorkflow?.bindHomeControls?.();
  bindHomeLibraryRuntime(runtime);
  bindCanvasMenuRuntime(runtime);
  bindCanvasToolControls({
    root: runtime.documentRoot,
    elements: {
      textFontFamily: runtime.textFontFamily,
      textFontWeight: runtime.textFontWeight,
      textFontSize: runtime.textFontSize,
      textColorInput: runtime.textColorInput,
      textFormatToolbar: runtime.textFormatToolbar,
      toolRail: runtime.toolRail,
      toggleToolRail: runtime.toggleToolRail
    },
    actions: {
      setActiveRailPanelButton: runtime.setActiveRailPanelButton,
      runCanvasTool: runtime.runCanvasTool,
      setShapeTool: runtime.setShapeTool,
      applyTextStyle: runtime.applyTextStyle,
      toggleToolRailCollapsed: runtime.toggleToolRailCollapsed
    }
  });

  bindFooterRuntime(runtime);

  bindCanvasInfrastructureFromRuntime(runtime);
  bindPromptRuntime(runtime);

  initializeWorkspaceRuntimeView(runtime);

  bindCompatibilityBridge(runtime);
}

export function bootstrapAppRuntime(deps) {
  const runtimeContextSections = buildRuntimeContextSections(deps);
  const appRuntimeContext = buildRuntimeContext({
    defaultPan: deps.defaultPan,
    ...runtimeContextSections
  });
  ensureWorkspaceShowView(appRuntimeContext);
  initializeAppRuntime(appRuntimeContext);
  return appRuntimeContext;
}

export function bootstrapAppRuntimeFromInputs(inputs) {
  const runtimeDependencies = buildRuntimeDependencies(buildAppRuntimeInputs(inputs));
  return bootstrapAppRuntime(runtimeDependencies);
}
