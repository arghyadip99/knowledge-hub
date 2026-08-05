import { app } from "../apps/api/dist/app/createApp.js";
import { connectDatabase } from "../apps/api/dist/database/connect.js";

let databaseConnection;

async function ensureDatabaseConnection() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI must be configured for the Vercel deployment.");
  }

  if (!databaseConnection) {
    databaseConnection = connectDatabase().catch((error) => {
      databaseConnection = undefined;
      throw error;
    });
  }

  return databaseConnection;
}

export default async function handler(req, res) {
  try {
    await ensureDatabaseConnection();
    app(req, res);
  } catch (error) {
    console.error("Database connection failed", error);
    res.status(503).json({
      message: "The service database is temporarily unavailable.",
    });
  }
}
