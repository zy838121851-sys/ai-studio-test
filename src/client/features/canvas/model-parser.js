export const MAX_RENDER_FACES = 60000;
export const MAX_PARSE_FACES = 60000;
export const MAX_VERTEX_COUNT = 120000;
export const MAX_ASCII_MODEL_BYTES = 8 * 1024 * 1024;
export const MAX_PREVIEW_MODEL_BYTES = 100 * 1024 * 1024;

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
const COMPONENT_BYTE_SIZE = {
  5120: 1,
  5121: 1,
  5122: 2,
  5123: 2,
  5125: 4,
  5126: 4
};

export function createCubeGeometry() {
  return {
    vertices: [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
    ],
    faces: [[0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6], [0, 4, 5], [0, 5, 1], [3, 2, 6], [3, 6, 7], [1, 5, 6], [1, 6, 2], [0, 3, 7], [0, 7, 4]]
  };
}

export function createModelParseError(message, code = "MODEL_PARSE_FAILED", details = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, details);
  return error;
}

export function detectModelFormat(file, buffer) {
  const extension = getFileExtension(file);
  const result = {
    extension,
    format: "unknown",
    extensionMismatch: false,
    reason: ""
  };

  if (!buffer || buffer.byteLength < 4) {
    result.reason = "empty";
    return result;
  }

  const view = new DataView(buffer);
  if (buffer.byteLength >= 12 && view.getUint32(0, true) === GLB_MAGIC) {
    result.format = "glb";
    result.extensionMismatch = Boolean(extension && extension !== "glb");
    return result;
  }

  const prefix = decodeTextSlice(buffer, Math.min(buffer.byteLength, 4096));
  if (extension === "gltf" || looksLikeGltfJson(prefix)) {
    result.format = "gltf";
    result.extensionMismatch = Boolean(extension && extension !== "gltf");
    return result;
  }

  if (looksLikeObjText(prefix) || (extension === "obj" && looksLikeObjVertexText(prefix))) {
    result.format = "obj";
    result.extensionMismatch = Boolean(extension && extension !== "obj");
    return result;
  }

  if (looksLikeStl(buffer, prefix)) {
    result.format = "stl";
    result.extensionMismatch = Boolean(extension && extension !== "stl");
    return result;
  }

  result.reason = "unrecognized";
  return result;
}

export function normalizeModelGeometry(geometry) {
  const vertices = Array.isArray(geometry?.vertices) ? geometry.vertices : [];
  const faces = Array.isArray(geometry?.faces) ? geometry.faces : [];
  if (!vertices.length || !faces.length) {
    throw createModelParseError("模型解析失败：没有读取到有效顶点或面。", "MODEL_EMPTY_GEOMETRY");
  }

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  vertices.forEach((vertex) => {
    if (!isValidVertex(vertex)) return;
    for (let i = 0; i < 3; i += 1) {
      min[i] = Math.min(min[i], vertex[i]);
      max[i] = Math.max(max[i], vertex[i]);
    }
  });

  if (!min.every(Number.isFinite) || !max.every(Number.isFinite)) {
    throw createModelParseError("模型解析失败：顶点坐标无效。", "MODEL_INVALID_VERTICES");
  }

  const validFaces = faces.filter((face) => (
    Array.isArray(face)
    && face.length === 3
    && face.every((index) => Number.isInteger(index) && index >= 0 && index < vertices.length)
  ));
  if (!validFaces.length) {
    throw createModelParseError("模型解析失败：没有读取到有效三角面。", "MODEL_INVALID_FACES");
  }

  const center = min.map((value, index) => (value + max[index]) / 2);
  const span = Math.max(...max.map((value, index) => value - min[index]));
  if (!Number.isFinite(span) || span <= 0) {
    throw createModelParseError("模型解析失败：模型边界无效。", "MODEL_INVALID_BOUNDS");
  }

  return {
    vertices: vertices.map((vertex) => vertex.map((value, index) => (value - center[index]) / span * 2.8)),
    faces: sampleModelFaces(validFaces, MAX_RENDER_FACES),
    meta: {
      ...(geometry.meta || {}),
      vertexCount: vertices.length,
      faceCount: validFaces.length
    }
  };
}

export function sampleModelFaces(faces, limit) {
  if (faces.length <= limit) return faces;
  const step = faces.length / limit;
  const sampled = [];
  for (let i = 0; i < limit; i += 1) {
    sampled.push(faces[Math.floor(i * step)]);
  }
  return sampled;
}

export function parseObjGeometry(text, meta = {}) {
  if (!looksLikeObjVertexText(text.slice(0, 4096))) {
    throw createModelParseError("OBJ 解析失败：未检测到有效顶点数据。", "OBJ_INVALID_CONTENT");
  }

  const vertices = [];
  const faces = [];
  text.split(/\r?\n/).forEach((line) => {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === "v") {
      if (vertices.length >= MAX_VERTEX_COUNT) return;
      const vertex = parts.slice(1, 4).map(Number);
      if (isValidVertex(vertex)) vertices.push(vertex);
    }
    if (parts[0] === "f") {
      if (faces.length >= MAX_PARSE_FACES) return;
      const indices = parts.slice(1).map((part) => {
        const raw = Number(part.split("/")[0]);
        return raw < 0 ? vertices.length + raw : raw - 1;
      }).filter((index) => index >= 0 && index < vertices.length);
      for (let i = 1; i < indices.length - 1; i += 1) {
        if (faces.length >= MAX_PARSE_FACES) break;
        faces.push([indices[0], indices[i], indices[i + 1]]);
      }
    }
  });
  return normalizeModelGeometry({ vertices, faces, meta: { ...meta, format: "obj" } });
}

export function parseStlGeometry(buffer, meta = {}) {
  const text = decodeTextSlice(buffer, Math.min(buffer.byteLength, 600));
  if (/^\s*solid\b[\s\S]*facet/i.test(text)) {
    if (buffer.byteLength > MAX_ASCII_MODEL_BYTES) {
      throw createModelParseError("ASCII STL 过大，无法在浏览器内预览。", "STL_ASCII_TOO_LARGE");
    }
    const fullText = new TextDecoder().decode(buffer);
    const vertices = [];
    const faces = [];
    const matches = fullText.matchAll(/vertex\s+([-\d.e+]+)\s+([-\d.e+]+)\s+([-\d.e+]+)/gi);
    for (const match of matches) {
      if (vertices.length >= MAX_PARSE_FACES * 3) break;
      const vertex = [Number(match[1]), Number(match[2]), Number(match[3])];
      if (isValidVertex(vertex)) vertices.push(vertex);
    }
    for (let i = 0; i + 2 < vertices.length; i += 3) faces.push([i, i + 1, i + 2]);
    return normalizeModelGeometry({ vertices, faces, meta: { ...meta, format: "stl" } });
  }

  if (buffer.byteLength < 84) {
    throw createModelParseError("STL 解析失败：文件太小。", "STL_INVALID_BINARY");
  }
  const view = new DataView(buffer);
  const triangleCount = view.getUint32(80, true);
  const expectedBytes = 84 + triangleCount * 50;
  if (triangleCount <= 0 || expectedBytes > buffer.byteLength) {
    throw createModelParseError("STL 解析失败：三角面数量无效。", "STL_INVALID_TRIANGLE_COUNT");
  }

  const vertices = [];
  const faces = [];
  const step = Math.max(1, Math.floor(triangleCount / MAX_PARSE_FACES));
  for (let tri = 0; tri < triangleCount && faces.length < MAX_PARSE_FACES; tri += step) {
    let offset = 84 + tri * 50;
    if (offset + 50 > buffer.byteLength) break;
    offset += 12;
    const face = [];
    for (let i = 0; i < 3; i += 1) {
      const vertex = [view.getFloat32(offset, true), view.getFloat32(offset + 4, true), view.getFloat32(offset + 8, true)];
      if (!isValidVertex(vertex)) break;
      vertices.push(vertex);
      face.push(vertices.length - 1);
      offset += 12;
    }
    if (face.length === 3) faces.push(face);
  }
  return normalizeModelGeometry({ vertices, faces, meta: { ...meta, format: "stl" } });
}

export function parseGlbGeometry(buffer, meta = {}) {
  const { json, bin } = readGlbChunks(buffer);
  const vertices = [];
  const faces = [];
  const vertexMap = new Map();

  const appendVertex = (primitive, sourceIndex) => {
    const key = `${primitive.positionAccessorIndex}:${sourceIndex}`;
    if (vertexMap.has(key)) return vertexMap.get(key);
    const vertex = readPositionVertex(json, bin, primitive.positionAccessor, sourceIndex);
    const nextIndex = vertices.length;
    vertices.push(vertex);
    vertexMap.set(key, nextIndex);
    return nextIndex;
  };

  const primitives = collectTrianglePrimitives(json);
  primitives.forEach((primitive) => {
    if (faces.length >= MAX_PARSE_FACES) return;
    const remaining = MAX_PARSE_FACES - faces.length;
    const triangleCount = primitive.indexAccessor
      ? Math.floor(primitive.indexAccessor.count / 3)
      : Math.floor(primitive.positionAccessor.count / 3);
    const step = Math.max(1, Math.floor(triangleCount / remaining));

    for (let triangle = 0; triangle < triangleCount && faces.length < MAX_PARSE_FACES; triangle += step) {
      const sourceIndices = primitive.indexAccessor
        ? [
            readIndexValue(json, bin, primitive.indexAccessor, triangle * 3),
            readIndexValue(json, bin, primitive.indexAccessor, triangle * 3 + 1),
            readIndexValue(json, bin, primitive.indexAccessor, triangle * 3 + 2)
          ]
        : [triangle * 3, triangle * 3 + 1, triangle * 3 + 2];

      if (sourceIndices.some((index) => index < 0 || index >= primitive.positionAccessor.count)) continue;
      const face = sourceIndices.map((sourceIndex) => appendVertex(primitive, sourceIndex));
      if (face.length === 3) faces.push(face);
    }
  });

  return normalizeModelGeometry({
    vertices,
    faces,
    meta: {
      ...meta,
      format: "glb",
      meshCount: json.meshes?.length || 0,
      sourceVertexCount: primitives.reduce((total, primitive) => total + primitive.positionAccessor.count, 0)
    }
  });
}

export function parseModelGeometryFile(file, buffer) {
  if (buffer.byteLength > MAX_PREVIEW_MODEL_BYTES) {
    throw createModelParseError(
      `模型文件超过当前预览上限：${formatBytes(buffer.byteLength)} / ${formatBytes(MAX_PREVIEW_MODEL_BYTES)}。`,
      "MODEL_PREVIEW_TOO_LARGE",
      {
      byteLength: buffer.byteLength,
      maxBytes: MAX_PREVIEW_MODEL_BYTES
      }
    );
  }

  const detected = detectModelFormat(file, buffer);
  const meta = {
    extension: detected.extension,
    extensionMismatch: detected.extensionMismatch
  };

  if (detected.format === "glb") return parseGlbGeometry(buffer, meta);
  if (detected.format === "obj") {
    if (buffer.byteLength > MAX_ASCII_MODEL_BYTES) {
      throw createModelParseError("OBJ 文件过大，无法在浏览器内预览。", "OBJ_TOO_LARGE");
    }
    return parseObjGeometry(new TextDecoder().decode(buffer), meta);
  }
  if (detected.format === "stl") return parseStlGeometry(buffer, meta);
  if (detected.format === "gltf") {
    throw createModelParseError("暂不支持带外部资源的 .gltf 预览，请上传 .glb。", "GLTF_EXTERNAL_UNSUPPORTED");
  }

  throw createModelParseError("模型解析失败：无法识别文件内容。", "MODEL_UNKNOWN_FORMAT", {
    reason: detected.reason,
    extension: detected.extension
  });
}

function readGlbChunks(buffer) {
  if (buffer.byteLength < 20) {
    throw createModelParseError("GLB 解析失败：文件太小。", "GLB_TOO_SMALL");
  }
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== GLB_MAGIC) {
    throw createModelParseError("GLB 解析失败：文件头不是 glTF。", "GLB_INVALID_MAGIC");
  }
  const version = view.getUint32(4, true);
  if (version !== 2) {
    throw createModelParseError(`GLB 解析失败：不支持 glTF ${version}。`, "GLB_UNSUPPORTED_VERSION");
  }

  let offset = 12;
  let json = null;
  let bin = null;
  while (offset + 8 <= buffer.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    offset += 8;
    if (offset + length > buffer.byteLength) {
      throw createModelParseError("GLB 解析失败：chunk 长度无效。", "GLB_INVALID_CHUNK");
    }
    const chunk = buffer.slice(offset, offset + length);
    if (type === JSON_CHUNK) json = JSON.parse(new TextDecoder().decode(chunk));
    if (type === BIN_CHUNK) bin = chunk;
    offset += length;
  }

  if (!json || !bin) {
    throw createModelParseError("GLB 解析失败：缺少 JSON 或 BIN chunk。", "GLB_MISSING_CHUNKS");
  }
  return { json, bin };
}

function collectTrianglePrimitives(json) {
  const primitives = [];
  (json.meshes || []).forEach((mesh) => {
    (mesh.primitives || []).forEach((primitive) => {
      if (primitive.mode !== undefined && primitive.mode !== 4) return;
      const positionAccessorIndex = primitive.attributes?.POSITION;
      const positionAccessor = json.accessors?.[positionAccessorIndex];
      if (!positionAccessor) return;
      if (positionAccessor.componentType !== 5126 || positionAccessor.type !== "VEC3" || positionAccessor.sparse) return;
      const indexAccessor = primitive.indices !== undefined ? json.accessors?.[primitive.indices] : null;
      if (indexAccessor && ![5121, 5123, 5125].includes(indexAccessor.componentType)) return;
      primitives.push({
        positionAccessorIndex,
        positionAccessor,
        indexAccessor: indexAccessor || null
      });
    });
  });
  if (!primitives.length) {
    throw createModelParseError("GLB 解析失败：没有可预览的三角网格。", "GLB_NO_TRIANGLE_MESH");
  }
  return primitives;
}

function readPositionVertex(json, bin, accessor, index) {
  const bufferView = json.bufferViews?.[accessor.bufferView];
  if (!bufferView) throw createModelParseError("GLB 解析失败：POSITION bufferView 缺失。", "GLB_MISSING_POSITION_BUFFER");
  const stride = bufferView.byteStride || 12;
  const start = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0) + index * stride;
  if (start + 12 > bin.byteLength) {
    throw createModelParseError("GLB 解析失败：POSITION 数据越界。", "GLB_POSITION_OUT_OF_RANGE");
  }
  const view = new DataView(bin);
  const vertex = [
    view.getFloat32(start, true),
    view.getFloat32(start + 4, true),
    view.getFloat32(start + 8, true)
  ];
  if (!isValidVertex(vertex)) {
    throw createModelParseError("GLB 解析失败：POSITION 顶点无效。", "GLB_INVALID_POSITION");
  }
  return vertex;
}

function readIndexValue(json, bin, accessor, index) {
  const bufferView = json.bufferViews?.[accessor.bufferView];
  if (!bufferView) throw createModelParseError("GLB 解析失败：index bufferView 缺失。", "GLB_MISSING_INDEX_BUFFER");
  const componentSize = COMPONENT_BYTE_SIZE[accessor.componentType];
  const stride = bufferView.byteStride || componentSize;
  const start = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0) + index * stride;
  if (start + componentSize > bin.byteLength) {
    throw createModelParseError("GLB 解析失败：index 数据越界。", "GLB_INDEX_OUT_OF_RANGE");
  }
  const view = new DataView(bin);
  if (accessor.componentType === 5125) return view.getUint32(start, true);
  if (accessor.componentType === 5123) return view.getUint16(start, true);
  return view.getUint8(start);
}

function getFileExtension(file) {
  const match = String(file?.name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

function decodeTextSlice(buffer, length) {
  return new TextDecoder("utf-8", { fatal: false }).decode(buffer.slice(0, length));
}

function looksLikeGltfJson(text) {
  return /^\s*\{/.test(text) && /"asset"\s*:/.test(text) && /"version"\s*:/.test(text);
}

function looksLikeObjText(text) {
  return looksLikeObjVertexText(text)
    && /(?:^|\n)\s*f\s+\S+\s+\S+\s+\S+/.test(text);
}

function looksLikeObjVertexText(text) {
  return /(?:^|\n)\s*v\s+[-+0-9.eE]+\s+[-+0-9.eE]+\s+[-+0-9.eE]+/.test(text);
}

function looksLikeStl(buffer, prefix) {
  if (/^\s*solid\b[\s\S]*facet/i.test(prefix)) return true;
  if (buffer.byteLength < 84) return false;
  const view = new DataView(buffer);
  const triangleCount = view.getUint32(80, true);
  return triangleCount > 0 && 84 + triangleCount * 50 <= buffer.byteLength;
}

function isValidVertex(vertex) {
  return Array.isArray(vertex) && vertex.length === 3 && vertex.every(Number.isFinite);
}

function formatBytes(bytes) {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(mb >= 10 ? 1 : 2)}MB`;
}
