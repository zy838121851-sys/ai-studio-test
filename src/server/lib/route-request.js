export function getRequestBody(req) {
  return req.body;
}

export function getRequestQuery(req) {
  return req.query;
}

export function getRouteParam(req, name) {
  return req.params?.[name];
}
