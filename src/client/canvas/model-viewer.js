import {
  MAX_PREVIEW_MODEL_BYTES,
  createCubeGeometry,
  parseModelGeometryFile
} from "./model-parser.js";

export function initModelViewerPreview(node, file, { hideAddNodeMenu, selectNode } = {}) {
  const canvas = node.querySelector("[data-model-viewer]");
  const loading = node.querySelector(".model-loading");
  if (!canvas || !file) return;

  const gl = canvas.getContext("webgl", { alpha: true, antialias: true });
  if (!gl) {
    loading.textContent = "当前浏览器不支持 WebGL 预览";
    return;
  }

  const state = { geometry: createCubeGeometry(), rx: -0.45, ry: 0.75, zoom: 1, dragging: false, startX: 0, startY: 0 };
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
      vec3 clay = vec3(0.72, 0.72, 0.70) * shade;
      gl_FragColor = vec4(clay, 1.0);
    }
  `;

  const compileShader = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  const createProgram = () => {
    const program = gl.createProgram();
    gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexShaderSource));
    gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    return program;
  };

  let program;
  try {
    program = createProgram();
  } catch {
    loading.textContent = "WebGL 预览初始化失败";
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
      vertexNormals[index] = length > 0.0001 ? [normal[0] / length, normal[1] / length, normal[2] / length] : [0, 0, 1];
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
    const width = Math.max(1, Math.round(rect.width * devicePixelRatio));
    const height = Math.max(1, Math.round(rect.height * devicePixelRatio));
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
    gl.clearColor(0, 0, 0, 0);
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
    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
  };

  uploadGeometry();
  render();
  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 2) return;
    event.preventDefault();
    event.stopPropagation();
    hideAddNodeMenu?.();
    selectNode?.(node);
    state.dragging = true;
    state.startX = event.clientX;
    state.startY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!state.dragging) return;
    state.ry += (event.clientX - state.startX) * 0.012;
    state.rx += (event.clientY - state.startY) * 0.012;
    state.startX = event.clientX;
    state.startY = event.clientY;
    render();
  });
  canvas.addEventListener("pointerup", () => {
    state.dragging = false;
  });
  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    state.zoom = Math.min(5, Math.max(0.35, state.zoom * factor));
    render();
  }, { passive: false });
  canvas.addEventListener("dblclick", (event) => {
    event.preventDefault();
    event.stopPropagation();
    state.zoom = 1;
    render();
  });

  file.arrayBuffer()
    .then((buffer) => {
      loading.textContent = buffer.byteLength > MAX_PREVIEW_MODEL_BYTES ? "模型较大，显示轻量预览" : "正在生成轻量预览";
      setTimeout(() => {
        state.geometry = parseModelGeometryFile(file, buffer);
        uploadGeometry();
        loading.textContent = buffer.byteLength > MAX_PREVIEW_MODEL_BYTES
          ? "文件过大，显示轻量预览"
          : "左键拖动 · 右键旋转 · 滚轮缩放";
        render();
      }, 0);
    })
    .catch(() => {
      loading.textContent = "模型解析失败，显示占位预览";
      render();
    });
}
