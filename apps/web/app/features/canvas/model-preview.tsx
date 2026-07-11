import { useEffect, useRef } from "react";

export function ModelPreview({ sourceUrl, title }: { sourceUrl: string; title: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let frame = 0;
    let dispose = () => {};

    void import("three").then(async (THREE) => {
      if (disposed) return;
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        38,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        100
      );
      camera.position.set(0, 0.7, 3.2);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x667085, 2.4));
      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(3, 4, 5);
      scene.add(key);

      let object: InstanceType<typeof THREE.Object3D> = new THREE.Mesh(
        new THREE.BoxGeometry(1.35, 1.35, 1.35),
        new THREE.MeshStandardMaterial({ color: 0x6c8ed9, roughness: 0.42, metalness: 0.08 })
      );
      scene.add(object);

      if (/\.(?:glb|gltf)(?:\?|$)/i.test(sourceUrl)) {
        try {
          const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
          const loaded = await new GLTFLoader().loadAsync(sourceUrl);
          if (!disposed) {
            scene.remove(object);
            object = loaded.scene;
            scene.add(object);
          }
        } catch {
          // The visible geometry remains as a deterministic unavailable-model fallback.
        }
      }

      const render = () => {
        object.rotation.y += 0.006;
        renderer.render(scene, camera);
        frame = window.requestAnimationFrame(render);
      };
      render();
      dispose = () => {
        window.cancelAnimationFrame(frame);
        scene.traverse((entry) => {
          if (entry instanceof THREE.Mesh) {
            entry.geometry.dispose();
            const materials = Array.isArray(entry.material) ? entry.material : [entry.material];
            materials.forEach((material) => material.dispose());
          }
        });
        renderer.dispose();
      };
    });

    return () => {
      disposed = true;
      dispose();
    };
  }, [sourceUrl]);

  return (
    <div className="canvas-model-preview" aria-label={`${title} 3D preview`}>
      <canvas ref={canvasRef} aria-hidden="true" />
      <strong>{title}</strong>
    </div>
  );
}
