export function getRequestBody(req) {
  return req.body;
}

export function getRequestQuery(req) {
  return req.query;
}

export function getRequestHeader(req, name) {
  return req.headers?.[String(name || "").toLowerCase()];
}

export function getRequestClientAddress(req) {
  return req.ip || req.socket?.remoteAddress || "unknown";
}

export function getRequestMethod(req) {
  return req.method;
}

export function getRequestPath(req) {
  return req.path;
}

export function getRouteParam(req, name) {
  return req.params?.[name];
}
