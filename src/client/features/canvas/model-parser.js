export const MAX_RENDER_FACES = 60000;
export const MAX_PARSE_FACES = 60000;
export const MAX_VERTEX_COUNT = 120000;
export const MAX_ASCII_MODEL_BYTES = 8 * 1024 * 1024;
export const MAX_PREVIEW_MODEL_BYTES = 80 * 1024 * 1024;

export function createCubeGeometry() {
  return {
    vertices: [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
    ],
    faces: [[0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6], [0, 4, 5], [0, 5, 1], [3, 2, 6], [3, 6, 7], [1, 5, 6], [1, 6, 2], [0, 3, 7], [0, 7, 4]]
  };
}

export function normalizeModelGeometry(geometry) {
  if (!geometry.vertices.length || !geometry.faces.length) return createCubeGeometry();
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  geometry.vertices.forEach((vertex) => {
    for (let i = 0; i < 3; i += 1) {
      min[i] = Math.min(min[i], vertex[i]);
      max[i] = Math.max(max[i], vertex[i]);
    }
  });
  const center = min.map((value, index) => (value + max[index]) / 2);
  const span = Math.max(...max.map((value, index) => value - min[index])) || 1;
  return {
    vertices: geometry.vertices.map((vertex) => vertex.map((value, index) => (value - center[index]) / span * 2.8)),
    faces: sampleModelFaces(geometry.faces, MAX_RENDER_FACES)
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

export function parseObjGeometry(text) {
  const vertices = [];
  const faces = [];
  text.split(/\r?\n/).forEach((line) => {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === "v") {
      if (vertices.length >= MAX_VERTEX_COUNT) return;
      vertices.push(parts.slice(1, 4).map(Number));
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
  return normalizeModelGeometry({ vertices, faces });
}

export function parseStlGeometry(buffer) {
  const text = new TextDecoder().decode(buffer.slice(0, Math.min(buffer.byteLength, 600)));
  if (/solid[\s\S]*facet/i.test(text)) {
    if (buffer.byteLength > MAX_ASCII_MODEL_BYTES) return createCubeGeometry();
    const fullText = new TextDecoder().decode(buffer);
    const vertices = [];
    const faces = [];
    const matches = fullText.matchAll(/vertex\s+([-\d.e+]+)\s+([-\d.e+]+)\s+([-\d.e+]+)/gi);
    for (const match of matches) {
      if (vertices.length >= MAX_PARSE_FACES * 3) break;
      vertices.push([Number(match[1]), Number(match[2]), Number(match[3])]);
    }
    for (let i = 0; i + 2 < vertices.length; i += 3) faces.push([i, i + 1, i + 2]);
    return normalizeModelGeometry({ vertices, faces });
  }

  const view = new DataView(buffer);
  const triangleCount = view.getUint32(80, true);
  const vertices = [];
  const faces = [];
  const step = Math.max(1, Math.floor(triangleCount / MAX_PARSE_FACES));
  for (let tri = 0; tri < triangleCount && faces.length < MAX_PARSE_FACES; tri += step) {
    let offset = 84 + tri * 50;
    if (offset + 50 > buffer.byteLength) break;
    offset += 12;
    const face = [];
    for (let i = 0; i < 3; i += 1) {
      vertices.push([view.getFloat32(offset, true), view.getFloat32(offset + 4, true), view.getFloat32(offset + 8, true)]);
      face.push(vertices.length - 1);
      offset += 12;
    }
    faces.push(face);
  }
  return normalizeModelGeometry({ vertices, faces });
}

export function parseGlbGeometry(buffer) {
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x46546c67) return createCubeGeometry();
  let offset = 12;
  let json = null;
  let bin = null;
  while (offset + 8 <= buffer.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    offset += 8;
    const chunk = buffer.slice(offset, offset + length);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(chunk));
    if (type === 0x004e4942) bin = chunk;
    offset += length;
  }
  if (!json || !bin) return createCubeGeometry();
  const primitive = json.meshes?.[0]?.primitives?.[0];
  const positionAccessor = json.accessors?.[primitive?.attributes?.POSITION];
  const indexAccessor = json.accessors?.[primitive?.indices];
  const readAccessor = (accessor) => {
    const bufferView = json.bufferViews[accessor.bufferView];
    const start = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
    return { accessor, bufferView, start };
  };
  if (!positionAccessor || positionAccessor.componentType !== 5126) return createCubeGeometry();
  const position = readAccessor(positionAccessor);
  const vertices = [];
  const vertexCount = Math.min(positionAccessor.count, MAX_VERTEX_COUNT);
  const vertexStride = position.bufferView.byteStride || 12;
  const posView = new DataView(bin);
  for (let i = 0; i < vertexCount; i += 1) {
    const offset = position.start + i * vertexStride;
    if (offset + 12 > bin.byteLength) break;
    vertices.push([posView.getFloat32(offset, true), posView.getFloat32(offset + 4, true), posView.getFloat32(offset + 8, true)]);
  }
  const faces = [];
  if (indexAccessor) {
    const index = readAccessor(indexAccessor);
    const indexView = new DataView(bin, index.start);
    const size = indexAccessor.componentType === 5125 ? 4 : indexAccessor.componentType === 5123 ? 2 : 1;
    const readIndex = (i) => size === 4 ? indexView.getUint32(i * size, true) : size === 2 ? indexView.getUint16(i * size, true) : indexView.getUint8(i);
    const triangleCount = Math.floor(indexAccessor.count / 3);
    const step = Math.max(1, Math.floor(triangleCount / MAX_PARSE_FACES));
    for (let triangle = 0; triangle < triangleCount && faces.length < MAX_PARSE_FACES; triangle += step) {
      const i = triangle * 3;
      const face = [readIndex(i), readIndex(i + 1), readIndex(i + 2)];
      if (face.every((indexValue) => indexValue < vertices.length)) faces.push(face);
    }
  } else {
    for (let i = 0; i + 2 < vertices.length && faces.length < MAX_PARSE_FACES; i += 3) faces.push([i, i + 1, i + 2]);
  }
  return normalizeModelGeometry({ vertices, faces });
}

export function parseModelGeometryFile(file, buffer) {
  if (buffer.byteLength > MAX_PREVIEW_MODEL_BYTES) return createCubeGeometry();
  const name = String(file?.name || "").toLowerCase();
  if ((name.endsWith(".obj") || name.endsWith(".gltf")) && buffer.byteLength > MAX_ASCII_MODEL_BYTES) return createCubeGeometry();
  if (name.endsWith(".obj")) return parseObjGeometry(new TextDecoder().decode(buffer));
  if (name.endsWith(".stl")) return parseStlGeometry(buffer);
  if (name.endsWith(".glb")) return parseGlbGeometry(buffer);
  return createCubeGeometry();
}
