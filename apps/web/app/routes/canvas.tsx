import { Link, useParams } from "react-router";

export default function CanvasRoute() {
  const { projectId } = useParams();

  return (
    <main className="rewrite-placeholder">
      <p className="rewrite-placeholder__eyebrow">项目 {projectId}</p>
      <h1>React 画布接收页</h1>
      <p>完整画布尚未切换，当前路由只用于纵向切片验证。</p>
      <Link to="/">返回首页</Link>
    </main>
  );
}
