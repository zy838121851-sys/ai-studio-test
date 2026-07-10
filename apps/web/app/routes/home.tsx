export function meta() {
  return [{ title: "AI Studio Rewrite" }];
}

export default function HomeRoute() {
  return (
    <main className="rewrite-placeholder">
      <p className="rewrite-placeholder__eyebrow">AI Studio</p>
      <h1>React 首页迁移工作区</h1>
      <p>该独立入口用于等价迁移，不会替换当前生产首页。</p>
    </main>
  );
}
