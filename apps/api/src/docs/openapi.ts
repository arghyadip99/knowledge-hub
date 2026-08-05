export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Knowledge Hub API",
    version: "1.0.0",
    description:
      "Auth-free local API for curated podcast and knowledge imports.",
  },
  servers: [{ url: "http://localhost:4000", description: "Local Docker API" }],
  paths: {
    "/api/v1/imports/knowledge": {
      post: {
        tags: ["Manual imports"],
        summary: "Bulk-create curated knowledge sources",
        description:
          "Creates one or more sources, knowledge entries, lessons, quotes, and actions. Each import is independently rolled back on failure.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BulkKnowledgeImport" },
            },
          },
        },
        responses: {
          "201": {
            description: "Import batch completed or partially completed",
          },
          "400": { description: "Payload validation failed" },
        },
      },
    },
    "/api/v1/imports": {
      get: {
        tags: ["Manual imports"],
        summary: "List import batches",
        responses: { "200": { description: "Import history" } },
      },
    },
  },
  components: {
    schemas: {
      BulkKnowledgeImport: {
        type: "object",
        required: ["imports"],
        properties: {
          apiVersion: { type: "string", example: "v1" },
          continueOnError: { type: "boolean", example: true },
          imports: {
            type: "array",
            minItems: 1,
            items: { $ref: "#/components/schemas/KnowledgeImport" },
          },
        },
      },
      KnowledgeImport: {
        type: "object",
        required: ["source", "knowledge", "lessons"],
        properties: {
          source: {
            type: "object",
            required: ["type", "title", "creator"],
            properties: {
              type: { type: "string", example: "youtube" },
              title: { type: "string" },
              url: { type: "string", format: "uri" },
              creator: { type: "string" },
              durationSeconds: { type: "integer" },
              focusArea: {
                type: "string",
                description: "Free-form category label.",
                example: "Human Behaviour, Ambition and Wealth",
              },
            },
          },
          knowledge: {
            type: "object",
            required: ["centralThesis", "summary"],
            properties: {
              centralThesis: { type: "string" },
              summary: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
            },
          },
          lessons: {
            type: "array",
            items: {
              type: "object",
              required: ["title", "explanation"],
              properties: {
                title: { type: "string" },
                explanation: { type: "string" },
                type: { type: "string", example: "principle" },
                importance: { type: "integer", minimum: 1, maximum: 5 },
                timestamp: {
                  type: "object",
                  properties: { startSeconds: { type: "number" } },
                },
                practicalApplication: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
} as const;
