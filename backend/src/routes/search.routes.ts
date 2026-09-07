import { Router, Request, Response } from "express";

import {
  Client,
  Connection,
} from "@temporalio/client";

import {
  hotelSearchWorkflow,
} from "../workflows/hotel.workflow";

import { pool } from "../database/postgres";

const router = Router();

let temporalClient: Client | null = null;

async function getTemporalClient() {
  if (temporalClient) {
    return temporalClient;
  }

  const connection =
    await Connection.connect({
      address:
        process.env.TEMPORAL_ADDRESS ||
        "localhost:7233",
  });

  temporalClient = new Client({
    connection,
  });

  return temporalClient;
}

router.post(
  "/api/search-hotels",
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const {
        city,
        checkIn,
        checkOut,
      } = req.body;

      if (
        !city ||
        !checkIn ||
        !checkOut
      ) {
        return res.status(400).json({
          message:
            "City, check-in and check-out dates are required",
        });
      }

      const client =
        await getTemporalClient();

      const workflowId =
        `hotel-search-${Date.now()}`;

      const handle =
        await client.workflow.start(
          hotelSearchWorkflow,
          {
            args: [
              {
                city,
                checkIn,
                checkOut,
              },
            ],

            taskQueue:
              process.env.TEMPORAL_TASK_QUEUE ||
              "HOTEL_TASK_QUEUE",

            workflowId,
          }
        );

      console.log(
        "Workflow started:",
        handle.workflowId
      );

      const result =
        await handle.result();

      if (result.hotel) {
        await pool.query(
          `
          INSERT INTO hotel_searches
          (
            city,
            check_in,
            check_out,
            hotel_id,
            hotel_name,
            price,
            supplier
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
          [
            city,
            checkIn,
            checkOut,
            result.hotel.hotelId,
            result.hotel.name,
            result.hotel.price,
            result.hotel.supplier,
          ]
        );
      }

      return res.json({
        workflowId:
          handle.workflowId,

        ...result,
      });
    } catch (error) {
      console.error(
        "Search error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to search hotels",
      });
    }
  }
);

router.post(
  "/api/cancel-search/:workflowId",
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const client =
        await getTemporalClient();

      const workflowId = req.params.workflowId;

      if (typeof workflowId !== "string") {
        return res.status(400).json({
          error: "Invalid workflowId",
        });
      }

      const handle = client.workflow.getHandle(workflowId);

      await handle.cancel();

      return res.json({
        message:
          "Search cancelled successfully",
      });
    } catch (error) {
      return res.status(500).json({
        message:
          "Unable to cancel search",
      });
    }
  }
);

export default router;