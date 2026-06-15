export function createPromptGenerationWorkflow({
  services = {}
} = {}) {
  const {
    addNode = () => null,
    addChat = () => null,
    buildPromptGenerationNodeConfig = () => ({}),
    detectGenerationKind = () => "",
    getNextGeneratedCount = () => 1
  } = services;

  function generateFromPrompt(prompt, point) {
    const count = getNextGeneratedCount();
    const nodeConfig = buildPromptGenerationNodeConfig({
      prompt,
      point,
      count,
      detectKind: detectGenerationKind
    });
    addNode(nodeConfig);
    addChat("assistant", `Generating using prompt for ${nodeConfig.label}`);
  }

  return {
    generateFromPrompt
  };
}
