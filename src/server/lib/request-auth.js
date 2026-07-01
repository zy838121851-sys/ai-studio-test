export function getRequestContext(req) {
  return {
    userId: req.auth.user.id
  };
}

export function getRequestUserId(req) {
  return getRequestContext(req).userId;
}
