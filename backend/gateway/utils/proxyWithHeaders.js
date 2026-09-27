import proxy from "express-http-proxy";

export const proxyWithUser = (serviceUrl) => {
  return proxy(serviceUrl, {
    parseReqBody: true,
    timeout: 30000,
    proxyErrorHandler: (err, res, next) => {
      console.error(`Proxy error connecting to target service (${serviceUrl}):`, err?.message || err);
      res.status(503).json({
        message: "Service is starting up or temporarily unavailable. Please try again in a few seconds.",
        error: err?.message
      });
    },
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      if (srcReq.user) {
        proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
        proxyReqOpts.headers["x-user-email"] = srcReq.user.email;
        proxyReqOpts.headers["x-user-avatar"] = srcReq.user.avatar;
      }
      return proxyReqOpts;
    }
  });
};