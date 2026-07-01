export function getRequestBody(req) {
  return req.body;
}

export function getRouteParam(req, name) {
  return req.params?.[name];
}
