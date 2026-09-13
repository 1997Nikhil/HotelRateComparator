import { Router } from "express";

import {
  Client,
  Connection,
} from "@temporalio/client";

import {
  hotelSearchWorkflow,
} from "../workflows/hotel.workflow";

import {
  pool,
} from "../database/postgres";


const router = Router();


let temporalClient:
  Client | null = null;


/**
 * Get / create Temporal client
 */
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


  temporalClient =
    new Client({
      connection,
    });


  return temporalClient;
}


/**
 * ==========================================
 * START HOTEL SEARCH
 * ==========================================
 *
 * Starts Temporal Workflow and immediately
 * returns workflowId.
 *
 * This is important because the frontend
 * needs workflowId to cancel the Workflow.
 */
router.post(
  "/api/search-hotels",
  async (req, res) => {

    try {

      const {
        city,
        checkIn,
        checkOut,
        scenario,
      } = req.body;


      /*
       * Validate request
       */
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


      /*
       * Generate unique Workflow ID
       */
      const workflowId =
        `hotel-search-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 8)}`;


      /*
       * Start Temporal Workflow
       */
      const handle =
        await client.workflow.start(
          hotelSearchWorkflow,
          {

            args: [
              {
                city,
                checkIn,
                checkOut,
                scenario,
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


      /*
       * IMPORTANT:
       *
       * Do NOT wait for handle.result().
       *
       * Return immediately so frontend
       * can poll and cancel.
       */
      return res.status(202).json({

        workflowId:
          handle.workflowId,

        status: "RUNNING",

        message:
          "Hotel search started",
      });

    } catch (error) {

      console.error(
        "Unable to start hotel search:",
        error
      );


      return res.status(500).json({

        message:
          "Unable to start hotel search",
      });
    }
  }
);


/**
 * ==========================================
 * GET SEARCH STATUS
 * ==========================================
 */
router.get(
  "/api/search-hotels/:workflowId",
  async (req, res) => {

    try {

      const client =
        await getTemporalClient();


      const handle =
        client.workflow.getHandle(
          req.params.workflowId
        );


      /*
       * Get current Workflow status
       */
      const description =
        await handle.describe();


      const status =
        description.status.name;


      /*
       * --------------------------------------
       * Workflow still running
       * --------------------------------------
       */
      if (status === "RUNNING") {

        return res.json({

          workflowId:
            req.params.workflowId,

          status: "RUNNING",

          hotel: null,

          message:
            "Hotel search is still running",

          suppliers: [],
        });
      }


      /*
       * --------------------------------------
       * Workflow completed
       * --------------------------------------
       */
      if (
        status === "COMPLETED"
      ) {

        const result =
          await handle.result();


        /*
         * Save successful search result.
         *
         * ON CONFLICT prevents duplicate
         * database records if frontend polls
         * the completed workflow more than once.
         */
        if (result.hotel) {

          await pool.query(
            `
            INSERT INTO hotel_searches
            (
              workflow_id,
              city,
              check_in,
              check_out,
              hotel_id,
              hotel_name,
              price,
              supplier
            )
            VALUES
            (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8
            )
            ON CONFLICT (workflow_id)
            DO NOTHING
            `,
            [

              req.params.workflowId,

              result.search.city,

              result.search.checkIn,

              result.search.checkOut,

              result.hotel.hotelId,

              result.hotel.name,

              result.hotel.price,

              result.hotel.supplier,

            ]
          );
        }


        return res.json({

          workflowId:
            req.params.workflowId,

          status: "COMPLETED",

          ...result,
        });
      }


      /*
       * --------------------------------------
       * Workflow cancelled
       * --------------------------------------
       */
      if (
        status === "CANCELLED"
      ) {

        return res.json({

          workflowId:
            req.params.workflowId,

          status: "CANCELLED",

          hotel: null,

          message:
            "Hotel search was cancelled",
        });
      }


      /*
       * --------------------------------------
       * Workflow failed
       * --------------------------------------
       */
      if (
        status === "FAILED"
      ) {

        return res.json({

          workflowId:
            req.params.workflowId,

          status: "FAILED",

          hotel: null,

          message:
            "Hotel search failed",
        });
      }


      /*
       * Other terminal state
       */
      return res.json({

        workflowId:
          req.params.workflowId,

        status,

        hotel: null,

        message:
          `Workflow finished with status: ${status}`,
      });

    } catch (error) {

      console.error(
        "Unable to get Workflow status:",
        error
      );


      return res.status(500).json({

        message:
          "Unable to get search status",
      });
    }
  }
);


/**
 * ==========================================
 * CANCEL SEARCH
 * ==========================================
 */
router.post(
  "/api/cancel-search/:workflowId",
  async (req, res) => {

    try {

      const client =
        await getTemporalClient();


      const handle =
        client.workflow.getHandle(
          req.params.workflowId
        );


      /*
       * Send cancellation request
       * to Temporal.
       */
      await handle.cancel();


      console.log(
        "Workflow cancellation requested:",
        req.params.workflowId
      );


      return res.json({

        workflowId:
          req.params.workflowId,

        status:
          "CANCEL_REQUESTED",

        message:
          "Search cancellation requested",
      });

    } catch (error) {

      console.error(
        "Unable to cancel Workflow:",
        error
      );


      return res.status(500).json({

        message:
          "Unable to cancel search",
      });
    }
  }
);


export default router;