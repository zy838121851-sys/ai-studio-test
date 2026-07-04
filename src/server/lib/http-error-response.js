export function sendErrorResponse(res, status, message, extra = {}) {
  res.status(status).json({
    message,
    ...extra
  });
}

export function buildCaughtErrorResponse(error, {
  defaultStatus = 500,
  defaultMessage = "Request failed",
  useStatusMessageOnly = false
} = {}) {
  const status = error?.status || error?.statusCode || defaultStatus;
  const message = useStatusMessageOnly && (error?.status || error?.statusCode)
    ? error.message
    : (error?.message || defaultMessage);
  return { status, message };
}

export function sendCaughtErrorResponse(res, error, options = {}) {
  const { status, message } = buildCaughtErrorResponse(error, options);
  sendErrorResponse(res, status, message);
}
