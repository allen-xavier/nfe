import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import empresaRoutes from "./routes/empresaRoutes";
import nfeRoutes from "./routes/nfeRoutes";
import pool from "./db";

dotenv.config();

const app = express();
const port = process.env.PORT ?? 3000;

app.use(cors());
app.use(bodyParser.json({ limit: "2mb" }));

app.use("/api/empresa", empresaRoutes);
app.use("/api/nfe", nfeRoutes);

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno" });
});

const server = app.listen(port, () => {
  console.log(`API rodando na porta ${port}`);
});

process.on("SIGINT", async () => {
  console.log("Fechando conexões...");
  await pool.end();
  server.close(() => process.exit(0));
});
