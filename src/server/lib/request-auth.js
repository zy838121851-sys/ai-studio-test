export function getRequestContext(req) {
  return {
    userId: req.auth.user.id
  };
}

export function setRequestAuth(req, auth = {}) {
  req.auth = auth;
}

export function hasRequestUser(req) {
  return Boolean(getOptionalRequestUser(req));
}

export function getOptionalRequestUser(req) {
  return req.auth?.user || null;
}

export function getRequestUserId(req) {
  return getRequestContext(req).userId;
}
