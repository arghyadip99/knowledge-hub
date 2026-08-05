import { app } from "./app/createApp.js";
import { environment } from "./config/environment.js";
import { connectDatabase } from "./database/connect.js";

connectDatabase()
  .then(() => {
    app.listen(environment.port, () =>
      console.log(`Knowledge Hub API on :${environment.port}`),
    );
  })
  .catch(console.error);
