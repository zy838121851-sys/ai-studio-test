export function sendErrorResponse(res, status, message, extra = {}) {
  res.status(status).json({
    message,
    ...extra
  });
}

export function sendCaughtErrorResponse(res, error, {
  defaultStatus = 500,
  defaultMessage = "Request failed",
  useStatusMessageOnly = false
} = {}) {
  const status = error?.status || error?.statusCode || defaultStatus;
  const message = useStatusMessageOnly && (error?.status || error?.statusCode)
    ? error.message
    : (error?.message || defaultMessage);
  sendErrorResponse(res, status, message);
}
