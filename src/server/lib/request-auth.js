export function getRequestUserId(req) {
  return req.auth.user.id;
}
