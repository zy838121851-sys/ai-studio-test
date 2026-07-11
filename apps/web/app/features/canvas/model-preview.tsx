import { useEffect, useRef, useState } from "react";
import type * as ThreeModule from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";

type PreviewStatus = "loading" | "ready" | "fallback" | "failed";

export function ModelPreview({ sourceUrl, title }: { sourceUrl: string; title: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<PreviewStatus>("loading");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let cleanup = () => {};
    setStatus("loading");

    void initializePreview(canvas, sourceUrl, (next) => !disposed && setStatus(next)).then((next) => {
      cleanup = next;
    }).catch(() => !disposed && setStatus("failed"));

    return () => {
      disposed = true;
      cleanup();
    };
  }, [sourceUrl]);

  return (
    <div className="canvas-model-preview" aria-label={`${title} 3D preview`}>
      <canvas ref={canvasRef} aria-label={`${title} 3D model`} />
      <strong>{title}</strong>
      {status !== "ready" ? <span role={status === "failed" ? "alert" : undefined}>{statusLabel(status)}</span> : null}
    </div>
  );
}

async function initializePreview(
  canvas: HTMLCanvasElement,
  sourceUrl: string,
  setStatus: (status: PreviewStatus) => void
): Promise<() => void> {
  const [THREE, { GLTFLoader }, { OrbitControls }] = await Promise.all([
    import("three"),
    import("three/addons/loaders/GLTFLoader.js"),
    import("three/addons/controls/OrbitControls.js")
  ]);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x101827, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x667085, 2.2));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
  keyLight.position.set(3, 5, 4);
  scene.add(keyLight);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.mouseButtons.LEFT = null;
  controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
  canvas.addEventListener("contextmenu", preventDefault);

  let object: InstanceType<typeof THREE.Object3D> = fallbackMesh(THREE);
  scene.add(object);
  let fallback = true;
  if (/\.(?:glb|gltf)(?:\?|$)/i.test(sourceUrl)) {
    try {
      const loaded = await new GLTFLoader().loadAsync(sourceUrl);
      const model = loaded.scene ?? loaded.scenes[0];
      if (!model) throw new Error("Model scene is empty");
      scene.remove(object);
      disposeObject(THREE, object);
      object = model;
      scene.add(object);
      fallback = false;
    } catch {
      // The local fallback remains visible while the original model failure is made explicit.
    }
  }
  frameModel(THREE, camera, controls, object);
  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  const reset = () => frameModel(THREE, camera, controls, object);
  canvas.addEventListener("dblclick", reset);
  let animationFrame = 0;
  const render = () => {
    controls.update();
    renderer.render(scene, camera);
    animationFrame = window.requestAnimationFrame(render);
  };
  render();
  setStatus(fallback ? "fallback" : "ready");
  return () => {
    window.cancelAnimationFrame(animationFrame);
    observer.disconnect();
    canvas.removeEventListener("contextmenu", preventDefault);
    canvas.removeEventListener("dblclick", reset);
    controls.dispose();
    disposeObject(THREE, scene);
    renderer.dispose();
  };
}

function fallbackMesh(three: typeof ThreeModule) {
  return new three.Mesh(new three.BoxGeometry(1.35, 1.35, 1.35), new three.MeshStandardMaterial({ color: 0x6c8ed9, roughness: 0.42, metalness: 0.08 }));
}
function frameModel(three: typeof ThreeModule, camera: ThreeModule.PerspectiveCamera, controls: OrbitControls, object: ThreeModule.Object3D) {
  const box = new three.Box3().setFromObject(object);
  if (box.isEmpty()) return;
  const center = box.getCenter(new three.Vector3());
  const radius = Math.max(box.getSize(new three.Vector3()).length() * 0.5, 0.5);
  object.position.sub(center);
  const distance = radius / Math.sin(three.MathUtils.degToRad(camera.fov * 0.5));
  camera.near = Math.max(0.001, radius / 100);
  camera.far = Math.max(1000, radius * 100);
  camera.position.set(distance * 0.58, distance * 0.32, distance * 0.92);
  controls.target.set(0, 0, 0);
  controls.minDistance = Math.max(radius * 0.08, 0.01);
  controls.maxDistance = Math.max(radius * 8, 10);
  camera.updateProjectionMatrix();
  controls.update();
}
function disposeObject(three: typeof ThreeModule, object: ThreeModule.Object3D) {
  object.traverse((entry) => {
    if (!(entry instanceof three.Mesh)) return;
    entry.geometry.dispose();
    (Array.isArray(entry.material) ? entry.material : [entry.material]).forEach((material) => material.dispose());
  });
}
function preventDefault(event: Event) { event.preventDefault(); }
function statusLabel(status: PreviewStatus): string {
  if (status === "loading") return "Loading 3D model";
  if (status === "fallback") return "Model unavailable";
  return "3D preview failed";
}
