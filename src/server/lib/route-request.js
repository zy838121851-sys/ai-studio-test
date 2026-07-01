export function getRequestBody(req) {
  return req.body;
}

export function getRequestQuery(req) {
  return req.query;
}

export function getRequestHeader(req, name) {
  return req.headers?.[String(name || "").toLowerCase()];
}

export function getRouteParam(req, name) {
  return req.params?.[name];
}
