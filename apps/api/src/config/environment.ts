import "dotenv/config";

export const environment = {
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/knowledge-hub",
  port: Number(process.env.PORT || 4000),
};
