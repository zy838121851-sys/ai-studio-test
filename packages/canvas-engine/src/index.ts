export type CanvasNode = CanvasImageNode | CanvasPendingImageNode;

export interface CanvasNodeBase {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasImageNode extends CanvasNodeBase {
  kind: "image";
  sourceUrl: string;
  alt: string;
}

export interface CanvasPendingImageNode extends CanvasNodeBase {
  kind: "pending-image";
  jobId: string;
}

export interface CanvasDocument {
  schemaVersion: 1;
  projectId: string;
  nodes: CanvasNode[];
}

export function createCanvasDocument(projectId: string): CanvasDocument {
  return {
    schemaVersion: 1,
    projectId,
    nodes: []
  };
}

export function upsertCanvasNode(document: CanvasDocument, node: CanvasNode): CanvasDocument {
  const existingIndex = document.nodes.findIndex((candidate) => candidate.id === node.id);
  const nodes = [...document.nodes];

  if (existingIndex === -1) {
    nodes.push(node);
  } else {
    nodes[existingIndex] = node;
  }

  return { ...document, nodes };
}

export function replacePendingImage(
  document: CanvasDocument,
  jobId: string,
  image: Omit<CanvasImageNode, "id" | "x" | "y" | "width" | "height">
): CanvasDocument {
  return {
    ...document,
    nodes: document.nodes.map((node) => {
      if (node.kind !== "pending-image" || node.jobId !== jobId) {
        return node;
      }

      return {
        id: node.id,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        ...image
      };
    })
  };
}
