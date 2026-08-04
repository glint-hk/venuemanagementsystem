import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

import authRouter from "./routes/auth.js";
import apiRouter from "./routes/api.js";

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

const swaggerDocument = YAML.load(
  path.resolve(__dirname, "../openapi.yml")
);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get(mountPath("healthz"), (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// TODO(Team 3): start cron scheduler (server/src/lib/scheduler.js) here.

const authPrefix = mountPath("auth");
const apiPrefix = mountPath("api");

app.use(authPrefix, authRouter);
app.use(apiPrefix, apiRouter);

app.use([authPrefix, apiPrefix], (_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

app.use(basePath, express.static(clientDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
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
