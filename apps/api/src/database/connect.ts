import mongoose from "mongoose";
import { environment } from "../config/environment.js";
import { backfillKnowledgeCaptains } from "./migrations/backfillKnowledgeCaptains.js";

export async function connectDatabase() {
  await mongoose.connect(environment.mongoUri);
  await backfillKnowledgeCaptains();
}
