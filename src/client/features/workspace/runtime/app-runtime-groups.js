import { buildRuntimeBootstrapStateBindings } from "./state/runtime-state-bootstrap.js";
import { buildAgentRuntimeBootstrapActionBindings } from "../../agent/runtime/action-runtime.js";
import { buildAICoreRuntimeBootstrapBindings } from "../../ai/runtime/ai-core-runtime.js";
import { buildChatRuntimeBootstrapBindings } from "../chat/runtime/chat-runtime.js";
import { buildHomeRuntimeBootstrapBindings } from "../home/runtime/home-runtime.js?v=20260627-library-bulk-select-1";
import { buildWorkspaceWorkflowRuntimeBootstrapBindings } from "../workflows/runtime/workflow-runtime.js";

function safeSetWithGuard(callback) {
  return (value) => {
    if (typeof callback === "function") {
      callback(value);
    }
  };
}

export function buildAppRuntimeBootstrapGroups(context = {}) {
  const {
    setChatImageFiles,
    setUploadDragDepth,
    setChatDragDepth,
    setPendingUploadPoint,
    setLibraryWheelLock,
    setLibraryViewModeInMemory,
    setAiCoreDragState,
    setAiCoreSuppressClick
  } = context;

  const normalizedBindingsContext = {
    ...context,
    setChatImageFiles: safeSetWithGuard(setChatImageFiles),
    setUploadDragDepth: safeSetWithGuard(setUploadDragDepth),
    setChatDragDepth: safeSetWithGuard(setChatDragDepth),
    setPendingUploadPoint: safeSetWithGuard(setPendingUploadPoint),
    setLibraryWheelLock: safeSetWithGuard(setLibraryWheelLock),
    setLibraryViewModeInMemory: safeSetWithGuard(setLibraryViewModeInMemory),
    setAiCoreDragState: safeSetWithGuard(setAiCoreDragState),
    setAiCoreSuppressClick: safeSetWithGuard(setAiCoreSuppressClick)
  };

  return buildAppRuntimeBootstrapBindings(normalizedBindingsContext);
}

export function buildAppRuntimeBootstrapBindings(context = {}) {
  const stateBindings = buildRuntimeBootstrapStateBindings(context);
  const actionBindings = buildAgentRuntimeBootstrapActionBindings(context);
  const homeBindings = buildHomeRuntimeBootstrapBindings(context);
  const workflowBindings = buildWorkspaceWorkflowRuntimeBootstrapBindings(context);
  const chatBindings = buildChatRuntimeBootstrapBindings(context);
  const aiCoreBindings = buildAICoreRuntimeBootstrapBindings({
    ...context,
    setUploadDragDepth: context.setUploadDragDepth
  });

  return {
    stateBindings,
    actionBindings,
    homeBindings,
    workflowBindings,
    chatBindings,
    aiCoreBindings
  };
}
