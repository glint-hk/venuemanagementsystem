import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";

import authRouter from "./routes/auth.js";
import apiRouter from "./routes/api.js";
import * as publicController from "./controllers/publicController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const clientDist = path.join(__dirname, "..", "public");
const basePath = process.env.BASE_PATH || "/";

function mountPath(...segments) {
  return `${basePath}/${segments.join("/")}`.replace(/\/+/g, "/");
}

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(compression());
app.use(express.json());

// TODO(Team 3): start cron scheduler (server/src/lib/scheduler.js) here.

const authPrefix = mountPath("auth");
const apiPrefix = mountPath("api");

app.use(authPrefix, authRouter);
app.use(apiPrefix, apiRouter);

// ==========================================
// PUBLIC (no auth — US-B5)
// ==========================================
apiRouter.get("/public/availability", publicController.getPublicAvailability);

// Anything still under /auth or /api at this point matched no defined
// route. Return JSON 404 here -- never let it fall through to the SPA
// fallback below, which would silently serve index.html for a bad API call.
app.use([authPrefix, apiPrefix], (req, res) => {
  res.status(404).json({ error: "Not Found" });
});

app.use(basePath, express.static(clientDist));
app.get("*", (req, res, next) => {
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) {
      if (err.code === "ENOENT") {
        return res.status(404).type("text/plain").send(
          "Client build not found in server/public. In development, use Vite dev server at http://localhost:5173 or run 'npm run build'."
        );
      }
      next(err);
    }
  });
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);

  if (err.code === "P2002") {
    return res.status(409).json({
      error: "A record with this unique value already exists.",
    });
  }

  if (err.code === "P2010" || err.message?.includes("exclusion constraint")) {
    return res.status(409).json({
      error: "Venue is already booked for the requested timeslot.",
    });
  }

  return res
    .status(err.status || 500)
    .json({ error: err.message || "Internal Server Error" });
});

const port = process.env.PORT || 4000;
const server = app.listen(port, () => {
  console.log(`server listening on :${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export default app;
