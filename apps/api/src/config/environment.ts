import "dotenv/config";

export const environment = {
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/knowledge-hub",
  port: Number(process.env.PORT || 4000),
  ollamaModel: process.env.OLLAMA_MODEL || "qwen2.5:7b",
  ollamaBaseUrl:
    process.env.OLLAMA_BASE_URL || "http://host.docker.internal:11434",
};
