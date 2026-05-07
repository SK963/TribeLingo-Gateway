import { Router } from "express";
import swaggerUi from "swagger-ui-express";

import { buildOpenApiDocument } from "./openapi";

export const docsRouter = Router();

docsRouter.get("/openapi.json", (_req, res) => {
  return res.json(buildOpenApiDocument());
});

docsRouter.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    swaggerOptions: {
      url: "/api/openapi.json",
    },
  })
);

