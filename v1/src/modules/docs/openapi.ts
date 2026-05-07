import { env } from "../../config/env";

export type OpenApiDocument = Record<string, unknown>;

/**
 * OpenAPI `servers.url` + `paths` are joined by Swagger UI using URL resolution.
 * If server is `http://host:port/api` and a path is `/auth/signup`, browsers resolve
 * that to `http://host:port/auth/signup` (leading `/` on the path replaces the whole
 * pathname), so Try-it-out hits the wrong route. Use origin-only server + `/api/...` paths.
 */
export function buildOpenApiDocument(): OpenApiDocument {
  const baseUrl = `http://localhost:${env.PORT}`;

  return {
    openapi: "3.0.3",
    info: {
      title: "Gateway API",
      version: "1.0.0",
    },
    servers: [{ url: baseUrl }],
    tags: [
      { name: "Health" },
      { name: "Docs" },
      { name: "Auth" },
      { name: "Users" },
      { name: "Translation" },
      { name: "POS" },
      { name: "Chatbot" },
    ],
    paths: {
      "/healthz": {
        get: {
          tags: ["Health"],
          summary: "Gateway health check",
          responses: {
            "200": { description: "Healthy (DB reachable and Prisma schema applied)" },
            "503": { description: "Unhealthy (DB down or migrations not applied)" },
          },
        },
      },
      "/api/auth/signup": {
        post: {
          tags: ["Auth"],
          summary: "Signup with email/password",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["fullName", "email", "password"],
                  properties: {
                    fullName: { type: "string" },
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 8 },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Created — returns JWT and sets auth cookie" },
            "400": { description: "Invalid payload" },
            "409": { description: "Email in use" },
            "500": { description: "Server error (e.g. DB not migrated)" },
          },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login with email/password",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 8 },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "OK" },
            "400": { description: "Invalid payload" },
            "401": { description: "Invalid credentials" },
            "500": { description: "Server error" },
          },
        },
      },
      "/api/auth/google": {
        post: {
          tags: ["Auth"],
          summary: "Login with Google ID token",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["idToken"],
                  properties: { idToken: { type: "string" } },
                },
              },
            },
          },
          responses: {
            "200": { description: "OK" },
            "400": { description: "Invalid payload" },
            "401": { description: "Invalid token" },
            "403": { description: "Email not verified" },
            "501": { description: "Google not configured" },
            "500": { description: "Server error" },
          },
        },
      },
      "/api/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Logout (clears auth cookie)",
          responses: { "204": { description: "No Content" } },
        },
      },
      "/api/users/me": {
        get: {
          tags: ["Users"],
          summary: "Get current user",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "OK" }, "401": { description: "Unauthorized" }, "404": { description: "Not found" } },
        },
        patch: {
          tags: ["Users"],
          summary: "Update current user",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    fullName: { type: "string" },
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 8 },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "OK" },
            "400": { description: "Invalid payload" },
            "401": { description: "Unauthorized" },
            "409": { description: "Email in use" },
            "500": { description: "Server error" },
          },
        },
        delete: {
          tags: ["Users"],
          summary: "Delete current user",
          security: [{ bearerAuth: [] }],
          responses: { "204": { description: "No Content" }, "401": { description: "Unauthorized" } },
        },
      },
      "/api/translation/direct": {
        post: {
          tags: ["Translation"],
          summary: "Translate + POS (no persistence)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["text", "targetLang"],
                  properties: {
                    text: { type: "string" },
                    sourceLang: { type: "string", description: "Optional; forwarded as `source` to translation service" },
                    targetLang: { type: "string", description: "Required; forwarded as `target` (e.g. en, trp, or eng_Latn → en)" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "OK" }, "400": { description: "Invalid payload" }, "502": { description: "Downstream error" } },
        },
      },
      "/api/translation": {
        post: {
          tags: ["Translation"],
          summary: "Translate + POS (persists translation for logged-in user)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["text", "targetLang"],
                  properties: {
                    text: { type: "string" },
                    sourceLang: { type: "string" },
                    targetLang: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Created" },
            "400": { description: "Invalid payload" },
            "401": { description: "Unauthorized" },
            "502": { description: "Downstream error" },
          },
        },
      },
      "/api/translation/history": {
        get: {
          tags: ["Translation"],
          summary: "Get translation history (Redis cached, max 100)",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "OK" }, "401": { description: "Unauthorized" } },
        },
      },
      "/api/pos": {
        post: {
          tags: ["POS"],
          summary: "Standalone POS tagging (Kokborok morphological analysis)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["text"],
                  properties: {
                    text: { type: "string", description: "Text to analyze" },
                    lang: { type: "string", description: "Optional language hint" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "OK" }, "400": { description: "Invalid payload" }, "502": { description: "POS service error" } },
        },
      },
      "/api/chat": {
        post: {
          tags: ["Chatbot"],
          summary: "Chat with Kokborok AI (bilingual narrative generation)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["user_query"],
                  properties: {
                    user_query: { type: "string", description: "User message (English, Bengali, or Kokborok)" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "OK" }, "400": { description: "Invalid payload" }, "502": { description: "Chatbot service error" } },
        },
      },
      "/api/chat/health": {
        get: {
          tags: ["Chatbot"],
          summary: "Chatbot service health check",
          responses: { "200": { description: "OK" }, "502": { description: "Chatbot unreachable" } },
        },
      },
      "/api/openapi.json": {
        get: {
          tags: ["Docs"],
          summary: "OpenAPI JSON document",
          responses: { "200": { description: "OK" } },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  };
}
