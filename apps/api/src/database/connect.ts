import mongoose from "mongoose";
import { environment } from "../config/environment.js";
import { backfillKnowledgeCaptains } from "./migrations/backfillKnowledgeCaptains.js";
import { seedTopicShips } from "./migrations/seedTopicShips.js";
import { backfillNamedShipArt } from "./migrations/backfillNamedShipArt.js";

export async function connectDatabase() {
  await mongoose.connect(environment.mongoUri);
  await backfillKnowledgeCaptains();
  await seedTopicShips();
  await backfillNamedShipArt();
}
