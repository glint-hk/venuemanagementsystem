import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";

import authRouter from "./routes/auth.js";
import apiRouter from "./routes/api.js";
import { publicAvailability } from "./controllers/venue.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "..", "public");
const basePath = process.env.BASE_PATH || "/";

function mountPath(...segments) {
  return `${basePath}/${segments.join("/")}`.replace(/\/+/g, "/");
}

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(compression());
app.use(express.json());

// Unauthenticated, outside /api — used by process managers / load balancers,
// not the application's own role-gated routes.
app.get(mountPath("healthz"), (req, res) => {
  res.status(200).json({ status: "ok" });
});

// TODO(Team 3): start the cron scheduler (server/src/lib/scheduler.js) here
// once it exists — auto-expiry, escalation, and outbox-send jobs.

const authPrefix = mountPath("auth");
const apiPrefix = mountPath("api");

app.use(authPrefix, authRouter);
app.use(apiPrefix, apiRouter);

// US-B5: Public availability board — NO authentication, NO session escalation.
// Mounted outside /api and /auth so it is accessible to anonymous users.
app.get(mountPath("public", "availability"), publicAvailability);

// Anything still under /auth or /api at this point matched no defined
// route. Return JSON 404 here -- never let it fall through to the SPA
// fallback below, which would silently serve index.html for a bad API call.
app.use([authPrefix, apiPrefix], (req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Serve the built SPA (see README.md "Single-origin SPA + API") with a
// client-side-routing fallback for unmatched non-API routes.
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
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: "Internal Server Error" });
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
