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

/*
 * --------------------------------------------------
 * CORS
 * --------------------------------------------------
 */

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin)
      ) {
        callback(null, true);
      } else {
        callback(
          new Error("Not allowed by CORS")
        );
      }
    },

    credentials: true,
  })
);

/*
 * --------------------------------------------------
 * Middleware
 * --------------------------------------------------
 */

app.use(express.json());

/*
 * --------------------------------------------------
 * Basic Routes
 * --------------------------------------------------
 */

app.get("/", (req, res) => {
  res.json({
    message:
      "Hotel Rate Comparator API is running",
  });
});

app.get("/health", async (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date(),
  });
});

/*
 * --------------------------------------------------
 * Supplier Routes
 * --------------------------------------------------
 */

app.use(supplierRoutes);

/*
 * --------------------------------------------------
 * Search Routes
 *
 * All search APIs will start with /api
 * --------------------------------------------------
 */

app.use("/api", searchRoutes);

/*
 * --------------------------------------------------
 * Start Server
 * --------------------------------------------------
 */

app.listen(PORT, async () => {
  console.log(
    `Server running on port ${PORT}`
  );

  await testDatabaseConnection();
});