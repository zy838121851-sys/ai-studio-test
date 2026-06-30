import {
  MAX_PREVIEW_MODEL_BYTES,
  detectModelFormat,
  parseModelGeometryFile
} from "./model-parser.js";

const CLEANUP_KEY = "__aiStudioModelViewerCleanup";
const BACKGROUND_COLOR = 0x101827;
let threeModulesPromise = null;

export function initModelViewerPreview(node, file, { hideAddNodeMenu, selectNode } = {}) {
  const canvas = node.querySelector("[data-model-viewer]");
  const loading = node.querySelector(".model-loading");
  if (!canvas || !file) return;

  cleanupExistingViewer(node);
  removeModeToggle(node);
  setLoading(loading, "Loading 3D model...");

  file.arrayBuffer()
    .then((buffer) => {
      const detected = detectModelFormat(file, buffer);
      if (detected.extensionMismatch) {
        setLoading(loading, `文件内容与扩展名不匹配，已按 ${detected.format.toUpperCase()} 解析`);
      }
      if (detected.format === "glb") {
        initThreeModelViewer(node, canvas, file, buffer, detected, {
          hideAddNodeMenu,
          selectNode,
          loading
        }).catch((error) => {
          console.warn("[model-viewer] Three.js GLB preview failed; trying lightweight fallback", error);
          cleanupExistingViewer(node);
          initLightweightModelViewerPreview(node, file, buffer, detected, {
            hideAddNodeMenu,
            selectNode,
            loading
          });
        });
        return;
      }
      initLightweightModelViewerPreview(node, file, buffer, detected, {
        hideAddNodeMenu,
        selectNode,
        loading
      });
    })
    .catch((error) => {
      console.warn("[model-viewer] failed to read model file", error);
      setLoading(loading, "模型解析失败：无法读取文件");
    });
}

async function initThreeModelViewer(node, canvas, file, buffer, detected, {
  hideAddNodeMenu = () => {},
  selectNode = () => {},
  loading = null
} = {}) {
  const { THREE, GLTFLoader, OrbitControls } = await loadThreeModules();
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: false,
    antialias: true,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true
  });
  renderer.setClearColor(BACKGROUND_COLOR, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7a8294, 2.2));

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
  keyLight.position.set(3, 5, 4);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xbfd7ff, 1.2);
  fillLight.position.set(-4, 2, -3);
  scene.add(fillLight);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.mouseButtons.LEFT = null;
  controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;

  const handlePointerDown = () => {
    hideAddNodeMenu?.();
    selectNode?.(node);
  };
  const handleDblClick = (event) => {
    event.preventDefault();
    resetCameraToModel(THREE, camera, controls, scene.userData.modelRoot);
  };
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("contextmenu", preventDefault);
  canvas.addEventListener("dblclick", handleDblClick);

  let animationFrame = 0;
  let disposed = false;
  const resizeObserver = typeof ResizeObserver === "undefined"
    ? null
    : new ResizeObserver(() => resizeThreeCanvas(renderer, camera, canvas));
  resizeObserver?.observe(canvas);

  const cleanup = () => {
    disposed = true;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    resizeObserver?.disconnect();
    removeModeToggle(node);
    canvas.removeEventListener("pointerdown", handlePointerDown);
    canvas.removeEventListener("contextmenu", preventDefault);
    canvas.removeEventListener("dblclick", handleDblClick);
    controls.dispose();
    disposeObject3D(scene);
    renderer.dispose();
  };
  node[CLEANUP_KEY] = cleanup;

  setLoading(loading, "Parsing 3D model...");
  const modelRoot = await loadGltfModel(buffer, THREE, GLTFLoader);
  if (disposed) {
    disposeObject3D(modelRoot);
    return;
  }
  if (!modelRoot) throw new Error("GLB did not contain a displayable scene");

  scene.userData.modelRoot = modelRoot;
  scene.add(modelRoot);
  applyModelMode(modelRoot, modelRoot.userData.defaultMode || "textured");
  frameModel(THREE, camera, controls, modelRoot);
  resizeThreeCanvas(renderer, camera, canvas);
  renderer.render(scene, camera);
  const visiblePixels = countVisiblePixels(renderer, BACKGROUND_COLOR);
  if (visiblePixels < 20) {
    console.warn("[model-viewer] GLB parsed but no visible pixels were rendered", {
      file: file?.name,
      detected,
      visiblePixels,
      diagnostics: modelRoot.userData?.diagnostics || {}
    });
    throw new Error("模型已解析但未能绘制，请查看控制台诊断");
  }

  setupModeToggle(node, modelRoot, (mode) => {
    applyModelMode(modelRoot, mode);
    renderer.render(scene, camera);
  });

  console.info("[model-viewer] model ready", {
    file: file?.name,
    format: detected?.format || "glb",
    path: "three-gltf-viewer",
    visiblePixels,
    diagnostics: modelRoot.userData?.diagnostics || {}
  });
  setLoading(loading, "Model ready");

  const render = () => {
    if (disposed) return;
    if (!node.isConnected) {
      cleanupExistingViewer(node);
      return;
    }
    resizeThreeCanvas(renderer, camera, canvas);
    controls.update();
    renderer.render(scene, camera);
    animationFrame = requestAnimationFrame(render);
  };
  render();
}

function loadThreeModules() {
  if (!threeModulesPromise) {
    threeModulesPromise = Promise.all([
      import("three"),
      import("three/examples/jsm/loaders/GLTFLoader.js"),
      import("three/examples/jsm/controls/OrbitControls.js")
    ]).catch(() => Promise.all([
      import(/* @vite-ignore */ "/vendor/three/build/three.module.js"),
      import(/* @vite-ignore */ "/vendor/three/examples/jsm/loaders/GLTFLoader.js"),
      import(/* @vite-ignore */ "/vendor/three/examples/jsm/controls/OrbitControls.js")
    ])).then(([THREE, { GLTFLoader }, { OrbitControls }]) => ({
      THREE,
      GLTFLoader,
      OrbitControls
    }));
  }
  return threeModulesPromise;
}

async function loadGltfModel(buffer, THREE, GLTFLoader) {
  const loader = new GLTFLoader();
  const gltf = await parseGltfBuffer(buffer, loader);
  const texturedRoot = gltf.scene || gltf.scenes?.[0] || null;
  if (!texturedRoot) return null;
  texturedRoot.updateMatrixWorld(true);
  normalizeMaterials(THREE, texturedRoot);

  const whiteRoot = createWhiteModelRoot(THREE, texturedRoot);
  const root = new THREE.Group();
  root.add(texturedRoot);
  root.add(whiteRoot);

  const diagnostics = {
    meshCount: whiteRoot.userData.meshCount || 0,
    vertexCount: whiteRoot.userData.vertexCount || 0,
    textureCount: countTexturedMaterials(texturedRoot),
    source: "GLTFLoader"
  };
  if (!diagnostics.meshCount) throw new Error("GLB contains no mesh");

  root.userData.texturedRoot = texturedRoot;
  root.userData.whiteRoot = whiteRoot;
  root.userData.defaultMode = diagnostics.textureCount > 0 ? "textured" : "white";
  root.userData.diagnostics = diagnostics;
  return root;
}

async function parseGltfBuffer(buffer, loader) {
  const canPatchImageBitmap = typeof window !== "undefined" && "createImageBitmap" in window;
  const originalCreateImageBitmap = canPatchImageBitmap ? window.createImageBitmap : undefined;
  if (canPatchImageBitmap) {
    try {
      window.createImageBitmap = undefined;
    } catch {
      // If the browser refuses reassignment, GLTFLoader will keep its default path.
    }
  }
  try {
    return await new Promise((resolve, reject) => {
      loader.parse(buffer, "", resolve, reject);
    });
  } finally {
    if (canPatchImageBitmap) {
      try {
        window.createImageBitmap = originalCreateImageBitmap;
      } catch {
        // Ignore restore failures; this is only a scoped compatibility shim.
      }
    }
  }
}

function createWhiteModelRoot(THREE, sourceRoot) {
  const whiteRoot = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0xcfd3d8,
    roughness: 0.74,
    metalness: 0.02,
    side: THREE.DoubleSide
  });
  let meshCount = 0;
  let vertexCount = 0;

  sourceRoot.traverse((object) => {
    if (!object.isMesh || !object.geometry?.attributes?.position) return;
    const geometry = object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    whiteRoot.add(mesh);
    meshCount += 1;
    vertexCount += geometry.attributes.position.count;
  });

  whiteRoot.userData.meshCount = meshCount;
  whiteRoot.userData.vertexCount = vertexCount;
  return whiteRoot;
}

function applyModelMode(root, mode) {
  const nextMode = mode === "white" ? "white" : "textured";
  if (root.userData.texturedRoot) root.userData.texturedRoot.visible = nextMode === "textured";
  if (root.userData.whiteRoot) root.userData.whiteRoot.visible = nextMode === "white";
  root.userData.mode = nextMode;
}

function setupModeToggle(node, modelRoot, onChange) {
  removeModeToggle(node);
  const viewer = node.querySelector(".model-viewer");
  if (!viewer) return;

  const toggle = document.createElement("div");
  toggle.className = "model-viewer-mode-toggle";
  toggle.setAttribute("role", "group");
  toggle.setAttribute("aria-label", "3D display mode");

  const modes = [
    ["textured", "贴图"],
    ["white", "白模"]
  ];
  modes.forEach(([mode, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.modelMode = mode;
    button.textContent = label;
    button.addEventListener("pointerdown", preventDefault);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onChange(mode);
      updateModeToggle(toggle, mode);
    });
    toggle.appendChild(button);
  });
  viewer.appendChild(toggle);
  updateModeToggle(toggle, modelRoot.userData.defaultMode || "textured");
}

function updateModeToggle(toggle, activeMode) {
  toggle.querySelectorAll("[data-model-mode]").forEach((button) => {
    const isActive = button.dataset.modelMode === activeMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function removeModeToggle(node) {
  node.querySelector?.(".model-viewer-mode-toggle")?.remove();
}

function frameModel(THREE, camera, controls, modelRoot) {
  const box = new THREE.Box3().setFromObject(modelRoot);
  if (box.isEmpty()) throw new Error("GLB mesh bounds are empty");

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  modelRoot.position.sub(center);

  const radius = Math.max(size.length() * 0.5, 0.5);
  const distance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov * 0.5));
  camera.near = Math.max(0.001, radius / 100);
  camera.far = Math.max(1000, radius * 100);
  camera.position.set(distance * 0.58, distance * 0.32, distance * 0.92);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();

  controls.target.set(0, 0, 0);
  controls.minDistance = Math.max(radius * 0.08, 0.01);
  controls.maxDistance = Math.max(radius * 8, 10);
  controls.update();
}

function resetCameraToModel(THREE, camera, controls, modelRoot) {
  if (!modelRoot) return;
  frameModel(THREE, camera, controls, modelRoot);
}

function resizeThreeCanvas(renderer, camera, canvas) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function countVisiblePixels(renderer, backgroundColor) {
  return countWebglVisiblePixels(renderer.getContext(), backgroundColor);
}

function countWebglVisiblePixels(gl, backgroundColor) {
  const width = gl.drawingBufferWidth;
  const height = gl.drawingBufferHeight;
  if (!width || !height) return 0;
  const pixels = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  const bg = {
    r: (backgroundColor >> 16) & 255,
    g: (backgroundColor >> 8) & 255,
    b: backgroundColor & 255
  };
  const stride = Math.max(1, Math.floor(Math.sqrt((width * height) / 8000)));
  let visible = 0;
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const offset = (y * width + x) * 4;
      const diff = Math.abs(pixels[offset] - bg.r)
        + Math.abs(pixels[offset + 1] - bg.g)
        + Math.abs(pixels[offset + 2] - bg.b);
      if (pixels[offset + 3] > 0 && diff > 28) visible += 1;
    }
  }
  return visible;
}

function normalizeMaterials(THREE, root) {
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.frustumCulled = false;
    const materials = Array.isArray(object.material) ? object.material : [object.material].filter(Boolean);
    materials.forEach((material) => {
      if (!material) return;
      [
        "map",
        "emissiveMap",
        "normalMap",
        "roughnessMap",
        "metalnessMap",
        "aoMap",
        "alphaMap"
      ].forEach((key) => {
        if (material[key]) material[key].colorSpace = key === "map" || key === "emissiveMap"
          ? THREE.SRGBColorSpace
          : material[key].colorSpace;
      });
      if (material.transparent && Number(material.opacity) < 0.08) {
        material.transparent = false;
        material.opacity = 1;
      }
      material.side = THREE.DoubleSide;
      material.needsUpdate = true;
    });
  });
}

function countTexturedMaterials(root) {
  let count = 0;
  root.traverse((object) => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material].filter(Boolean);
    materials.forEach((material) => {
      if (material?.map || material?.normalMap || material?.roughnessMap || material?.metalnessMap) count += 1;
    });
  });
  return count;
}

function disposeObject3D(object) {
  object.traverse?.((child) => {
    if (child.geometry) child.geometry.dispose();
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material].filter(Boolean);
    materials.forEach(disposeMaterial);
  });
}

function disposeMaterial(material) {
  if (!material) return;
  [
    "map",
    "normalMap",
    "roughnessMap",
    "metalnessMap",
    "aoMap",
    "emissiveMap",
    "alphaMap",
    "bumpMap",
    "displacementMap"
  ].forEach((key) => {
    if (material[key]) material[key].dispose?.();
  });
  material.dispose?.();
}

function cleanupExistingViewer(node) {
  if (typeof node?.[CLEANUP_KEY] === "function") {
    node[CLEANUP_KEY]();
    node[CLEANUP_KEY] = null;
  }
}

function setLoading(loading, text) {
  if (loading) loading.textContent = text;
}

function preventDefault(event) {
  event.preventDefault();
  event.stopPropagation();
}

function initLightweightModelViewerPreview(node, file, buffer, detected, {
  hideAddNodeMenu = () => {},
  selectNode = () => {},
  loading = null
} = {}) {
  removeModeToggle(node);
  const canvas = node.querySelector("[data-model-viewer]");
  if (!canvas || !file) return;

  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: true,
    preserveDrawingBuffer: true
  });
  if (!gl) {
    setLoading(loading, "WebGL preview is unavailable");
    return;
  }

  const state = {
    geometry: null,
    rx: -0.45,
    ry: 0.75,
    zoom: 1,
    dragging: false,
    startX: 0,
    startY: 0
  };

  const vertexShaderSource = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    uniform float uRx;
    uniform float uRy;
    uniform float uZoom;
    uniform float uAspect;
    varying vec3 vNormal;
    varying float vDepth;
    vec3 rotatePoint(vec3 p) {
      float cx = cos(uRx);
      float sx = sin(uRx);
      float cy = cos(uRy);
      float sy = sin(uRy);
      vec3 yRot = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
      return vec3(yRot.x, yRot.y * cx - yRot.z * sx, yRot.y * sx + yRot.z * cx);
    }
    void main() {
      vec3 rotated = rotatePoint(aPosition);
      vec3 normal = normalize(rotatePoint(aNormal));
      float z = rotated.z + 5.0;
      vec2 projected = rotated.xy * 0.82 * uZoom / z;
      gl_Position = vec4(projected.x / uAspect, projected.y, (z - 1.0) / 8.0, 1.0);
      vNormal = normal;
      vDepth = z;
    }
  `;

  const fragmentShaderSource = `
    precision mediump float;
    varying vec3 vNormal;
    varying float vDepth;
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 keyLight = normalize(vec3(-0.35, 0.62, 0.72));
      vec3 fillLight = normalize(vec3(0.55, -0.25, 0.35));
      float key = abs(dot(normal, keyLight));
      float fill = abs(dot(normal, fillLight)) * 0.18;
      float rim = pow(1.0 - abs(normal.z), 2.0) * 0.12;
      float shade = 0.62 + key * 0.34 + fill + rim;
      shade *= mix(0.82, 1.04, smoothstep(8.4, 2.1, vDepth));
      vec3 clay = vec3(0.78, 0.79, 0.78) * shade;
      gl_FragColor = vec4(clay, 1.0);
    }
  `;

  const compileShader = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
  };

  const createProgram = () => {
    const program = gl.createProgram();
    gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexShaderSource));
    gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program));
    }
    return program;
  };

  let program;
  try {
    program = createProgram();
  } catch {
    setLoading(loading, "WebGL preview failed");
    return;
  }

  const positionBuffer = gl.createBuffer();
  const normalBuffer = gl.createBuffer();
  const locations = {
    position: gl.getAttribLocation(program, "aPosition"),
    normal: gl.getAttribLocation(program, "aNormal"),
    rx: gl.getUniformLocation(program, "uRx"),
    ry: gl.getUniformLocation(program, "uRy"),
    zoom: gl.getUniformLocation(program, "uZoom"),
    aspect: gl.getUniformLocation(program, "uAspect")
  };

  let vertexCount = 0;
  const getNormal = (a, b, c) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz) || 1;
    return [nx / length, ny / length, nz / length];
  };

  const uploadGeometry = () => {
    if (!state.geometry?.vertices?.length || !state.geometry?.faces?.length) {
      vertexCount = 0;
      return;
    }
    const positions = [];
    const normals = [];
    const vertexNormals = state.geometry.vertices.map(() => [0, 0, 0]);

    state.geometry.faces.forEach((face) => {
      const a = state.geometry.vertices[face[0]];
      const b = state.geometry.vertices[face[1]];
      const c = state.geometry.vertices[face[2]];
      if (!a || !b || !c) return;
      const normal = getNormal(a, b, c);
      face.forEach((vertexIndex) => {
        const target = vertexNormals[vertexIndex];
        if (!target) return;
        target[0] += normal[0];
        target[1] += normal[1];
        target[2] += normal[2];
      });
    });

    vertexNormals.forEach((normal, index) => {
      const length = Math.hypot(normal[0], normal[1], normal[2]);
      vertexNormals[index] = length > 0.0001
        ? [normal[0] / length, normal[1] / length, normal[2] / length]
        : [0, 0, 1];
    });

    state.geometry.faces.forEach((face) => {
      const vertices = face.map((vertexIndex) => state.geometry.vertices[vertexIndex]);
      if (vertices.some((vertex) => !vertex)) return;
      vertices.forEach((vertex) => positions.push(vertex[0], vertex[1], vertex[2]));
      face.forEach((vertexIndex) => {
        const vertex = state.geometry.vertices[vertexIndex] || [0, 0, 1];
        const radialLength = Math.hypot(vertex[0], vertex[1], vertex[2]) || 1;
        const radial = [vertex[0] / radialLength, vertex[1] / radialLength, vertex[2] / radialLength];
        const normal = vertexNormals[vertexIndex] || radial;
        const aligned = normal[0] * radial[0] + normal[1] * radial[1] + normal[2] * radial[2] < 0
          ? [-normal[0], -normal[1], -normal[2]]
          : normal;
        normals.push(aligned[0], aligned[1], aligned[2]);
      });
    });

    vertexCount = positions.length / 3;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  };

  const resizeCanvas = () => {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width * window.devicePixelRatio));
    const height = Math.max(1, Math.round(rect.height * window.devicePixelRatio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  const render = () => {
    resizeCanvas();
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.clearColor(0.0627, 0.0941, 0.1529, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(locations.position);
    gl.vertexAttribPointer(locations.position, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.enableVertexAttribArray(locations.normal);
    gl.vertexAttribPointer(locations.normal, 3, gl.FLOAT, false, 0, 0);
    gl.uniform1f(locations.rx, state.rx);
    gl.uniform1f(locations.ry, state.ry);
    gl.uniform1f(locations.zoom, state.zoom);
    gl.uniform1f(locations.aspect, canvas.width / canvas.height);
    if (vertexCount > 0) gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
  };

  const handlePointerDown = (event) => {
    if (event.button !== 2) return;
    event.preventDefault();
    event.stopPropagation();
    hideAddNodeMenu?.();
    selectNode?.(node);
    state.dragging = true;
    state.startX = event.clientX;
    state.startY = event.clientY;
    canvas.setPointerCapture?.(event.pointerId);
  };
  const handlePointerMove = (event) => {
    if (!state.dragging) return;
    state.ry += (event.clientX - state.startX) * 0.012;
    state.rx += (event.clientY - state.startY) * 0.012;
    state.startX = event.clientX;
    state.startY = event.clientY;
    render();
  };
  const handlePointerUp = () => {
    state.dragging = false;
  };
  const handleWheel = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    state.zoom = Math.min(5, Math.max(0.35, state.zoom * factor));
    render();
  };
  const handleDblClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    state.zoom = 1;
    render();
  };

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("contextmenu", preventDefault);
  canvas.addEventListener("wheel", handleWheel, { passive: false });
  canvas.addEventListener("dblclick", handleDblClick);

  node[CLEANUP_KEY] = () => {
    removeModeToggle(node);
    canvas.removeEventListener("pointerdown", handlePointerDown);
    canvas.removeEventListener("pointermove", handlePointerMove);
    canvas.removeEventListener("pointerup", handlePointerUp);
    canvas.removeEventListener("contextmenu", preventDefault);
    canvas.removeEventListener("wheel", handleWheel);
    canvas.removeEventListener("dblclick", handleDblClick);
    gl.deleteBuffer(positionBuffer);
    gl.deleteBuffer(normalBuffer);
    gl.deleteProgram(program);
  };

  setLoading(loading, buffer.byteLength > MAX_PREVIEW_MODEL_BYTES
    ? "模型文件超过当前预览上限"
    : "Building fallback preview...");
  setTimeout(() => {
    try {
      state.geometry = parseModelGeometryFile(file, buffer);
      uploadGeometry();
      render();
      if (vertexCount <= 0) throw new Error("模型解析失败：没有可绘制的几何。");
      const visiblePixels = countWebglVisiblePixels(gl, BACKGROUND_COLOR);
      if (visiblePixels < 20) throw new Error("模型已解析但未能绘制，请查看控制台诊断");
      console.info("[model-viewer] model ready", {
        file: file?.name,
        format: state.geometry.meta?.format || detected?.format || "unknown",
        path: "lightweight-parser",
        vertexCount: state.geometry.meta?.vertexCount || state.geometry.vertices.length,
        faceCount: state.geometry.meta?.faceCount || state.geometry.faces.length,
        visiblePixels,
        extensionMismatch: Boolean(state.geometry.meta?.extensionMismatch || detected?.extensionMismatch)
      });
      setLoading(loading, "Model ready");
    } catch (error) {
      console.warn("[model-viewer] lightweight preview failed", { file: file?.name, detected, error });
      state.geometry = null;
      vertexCount = 0;
      render();
      setLoading(loading, error?.message || "模型解析失败");
    }
  }, 0);
}
