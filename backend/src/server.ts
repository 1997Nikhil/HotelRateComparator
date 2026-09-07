import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import supplierRoutes from "./routes/supplier.routes";
import searchRoutes from "./routes/search.routes";

import {
  testDatabaseConnection,
} from "./database/postgres";

dotenv.config();

const app = express();

const PORT =
  process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message:
      "Hotel Rate Comparator API is running",
  });
});

app.get(
  "/health",
  async (req, res) => {
    res.json({
      status: "OK",
      timestamp: new Date(),
    });
  }
);

app.use(supplierRoutes);

app.use(searchRoutes);

app.listen(PORT, async () => {
  console.log(
    `Server running on port ${PORT}`
  );

  await testDatabaseConnection();
});