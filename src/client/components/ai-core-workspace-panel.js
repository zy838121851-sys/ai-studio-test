export function createAICoreWorkspaceElement() {
  const workspace = document.createElement("div");
  workspace.className = "ai-core-workspace";
  workspace.innerHTML = `
    <button class="ai-core-workspace-close" type="button" title="关闭">×</button>
    <section class="ai-suggestion-panel">
      <div class="ai-panel-head">
        <strong>✧ AI 智能建议</strong>
        <span>基于商品识别</span>
        <button type="button" class="ai-core-refresh" data-core-refresh title="换一组建议" aria-label="换一组建议">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></svg>
        </button>
      </div>
      <div class="ai-panel-actions">
        <button type="button" disabled>
          <span>AI 思考中</span>
          <small>正在理解图片类型，并推测最适合生成的素材。</small>
        </button>
      </div>
      <div class="ai-analysis-summary" data-core-analysis>
        <strong>AI 正在思考图片用途...</strong>
      </div>
    </section>
    <section class="ai-core-stage">
      <div class="ai-core-big">
        <img alt="当前素材" />
        <div class="ai-core-big-copy">
          <strong>AI Core</strong>
          <span>智能创作引擎已就绪</span>
        </div>
      </div>
      <div class="ai-core-status">
        <strong><span data-core-state-label>识别中</span>：<span data-core-product>产品</span></strong>
        <small data-core-status-copy>AI 正在分析图片内容...</small>
      </div>
    </section>
    <section class="ai-result-preview preview-scene">
      <strong>场景图 · 生成中</strong>
      <div></div>
    </section>
    <section class="ai-result-preview preview-poster">
      <strong>宣传海报</strong>
      <div></div>
    </section>
    <section class="ai-result-preview preview-detail">
      <strong>产品详情页</strong>
      <div></div>
    </section>
    <section class="ai-thinking-card">
      <strong>AI 思考中</strong>
      <span>● 识别商品属性</span>
      <span>● 分析风格与卖点</span>
      <span>● 生成素材方案</span>
      <span>○ 开始生成素材</span>
    </section>
    <section class="ai-decision-panel" hidden>
      <strong data-decision-title>先确认一下方向</strong>
      <p data-decision-question>你希望这次生成更偏向哪种感觉？</p>
      <div class="ai-decision-options">
        <button type="button" data-decision-style="高端极简、干净商业摄影、突出产品质感">高端极简</button>
        <button type="button" data-decision-style="电商转化导向、卖点清晰、画面更有冲击力">电商转化</button>
        <button type="button" data-decision-style="保留原产品结构与颜色，只优化场景和光影">尽量保真</button>
      </div>
      <button class="ai-generate-now" type="button">立即生成</button>
    </section>
  `;
  return workspace;
}
