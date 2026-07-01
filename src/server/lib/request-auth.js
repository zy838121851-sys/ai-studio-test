export function getRequestContext(req) {
  return {
    userId: req.auth.user.id
  };
}

export function getOptionalRequestUser(req) {
  return req.auth?.user || null;
}

export function getRequestUserId(req) {
  return getRequestContext(req).userId;
}
