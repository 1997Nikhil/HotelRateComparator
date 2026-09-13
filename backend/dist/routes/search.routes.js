"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@temporalio/client");
const hotel_workflow_1 = require("../workflows/hotel.workflow");
const postgres_1 = require("../database/postgres");
const router = (0, express_1.Router)();
/*
 * --------------------------------------------------
 * Temporal Client
 * --------------------------------------------------
 */
async function getTemporalClient() {
    const connection = await client_1.Connection.connect({
        address: process.env.TEMPORAL_ADDRESS ||
            "localhost:7233",
    });
    return new client_1.Client({
        connection,
    });
}
/*
 * --------------------------------------------------
 * POST /api/search-hotels
 *
 * Start Temporal Workflow
 * --------------------------------------------------
 */
router.post("/search-hotels", async (req, res) => {
    try {
        const { city, checkIn, checkOut, scenario, } = req.body;
        /*
         * Validate request
         */
        if (!city || !checkIn || !checkOut) {
            return res.status(400).json({
                message: "city, checkIn and checkOut are required.",
            });
        }
        /*
         * Connect to Temporal
         */
        const client = await getTemporalClient();
        /*
         * Generate unique workflow ID
         */
        const workflowId = `hotel-search-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 8)}`;
        /*
         * Start Temporal Workflow
         */
        await client.workflow.start(hotel_workflow_1.hotelSearchWorkflow, {
            taskQueue: process.env.TEMPORAL_TASK_QUEUE ||
                "HOTEL_TASK_QUEUE",
            workflowId,
            args: [
                {
                    city,
                    checkIn,
                    checkOut,
                    scenario,
                },
            ],
        });
        return res.status(202).json({
            workflowId,
            status: "RUNNING",
            message: "Hotel search started.",
        });
    }
    catch (error) {
        console.error("Failed to start hotel workflow:", error);
        return res.status(500).json({
            message: "Failed to start hotel search.",
        });
    }
});
/*
 * --------------------------------------------------
 * GET /api/search-hotels/:workflowId
 *
 * Get current Temporal workflow state
 * --------------------------------------------------
 */
router.get("/search-hotels/:workflowId", async (req, res) => {
    const workflowId = req.params.workflowId;
    try {
        /*
         * Connect to Temporal
         */
        const client = await getTemporalClient();
        /*
         * Get workflow handle
         */
        const handle = client.workflow.getHandle(workflowId);
        /*
         * Get workflow execution status
         */
        const description = await handle.describe();
        const status = description.status.name;
        /*
         * --------------------------------------------
         * RUNNING
         *
         * Query the workflow for live workflow steps.
         * --------------------------------------------
         */
        if (status === "RUNNING") {
            const workflowSteps = await handle.query(hotel_workflow_1.workflowStatusQuery);
            return res.json({
                workflowId,
                status: "RUNNING",
                hotel: null,
                message: "Hotel search is still running.",
                suppliers: [],
                workflowSteps,
            });
        }
        /*
         * --------------------------------------------
         * COMPLETED
         * --------------------------------------------
         */
        if (status === "COMPLETED") {
            const result = await handle.result();
            /*
             * Save best hotel to PostgreSQL.
             *
             * ON CONFLICT prevents duplicate inserts
             * when the frontend polls multiple times.
             */
            if (result.hotel) {
                await postgres_1.pool.query(`
            INSERT INTO hotel_searches (
              workflow_id,
              city,
              check_in,
              check_out,
              hotel_id,
              hotel_name,
              price,
              supplier
            )
            VALUES (
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
            `, [
                    workflowId,
                    result.search.city,
                    result.search.checkIn,
                    result.search.checkOut,
                    result.hotel.hotelId,
                    result.hotel.name,
                    result.hotel.price,
                    result.hotel.supplier,
                ]);
            }
            /*
             * Return complete workflow result.
             *
             * This includes:
             * - best hotel
             * - both suppliers
             * - workflow steps
             * - search information
             */
            return res.json({
                workflowId,
                status: "COMPLETED",
                ...result,
            });
        }
        /*
         * --------------------------------------------
         * CANCELLED
         * --------------------------------------------
         */
        if (status === "CANCELLED") {
            return res.json({
                workflowId,
                status: "CANCELLED",
                hotel: null,
                suppliers: [],
                workflowSteps: [],
                message: "Hotel search was cancelled.",
            });
        }
        /*
         * --------------------------------------------
         * FAILED
         * --------------------------------------------
         */
        if (status === "FAILED") {
            return res.json({
                workflowId,
                status: "FAILED",
                hotel: null,
                suppliers: [],
                workflowSteps: [],
                message: "Hotel search workflow failed.",
            });
        }
        /*
         * --------------------------------------------
         * UNKNOWN STATUS
         * --------------------------------------------
         */
        return res.json({
            workflowId,
            status,
            hotel: null,
            suppliers: [],
            workflowSteps: [],
            message: `Workflow status: ${status}`,
        });
    }
    catch (error) {
        console.error("Failed to get workflow status:", error);
        return res.status(500).json({
            message: "Failed to get hotel search status.",
        });
    }
});
/*
 * --------------------------------------------------
 * POST /api/cancel-search/:workflowId
 *
 * Cancel running Temporal Workflow
 * --------------------------------------------------
 */
router.post("/cancel-search/:workflowId", async (req, res) => {
    const workflowId = req.params.workflowId;
    try {
        /*
         * Connect to Temporal
         */
        const client = await getTemporalClient();
        /*
         * Get workflow handle
         */
        const handle = client.workflow.getHandle(workflowId);
        /*
         * Request cancellation
         */
        await handle.cancel();
        return res.json({
            workflowId,
            status: "CANCELLED",
            message: "Hotel search cancellation requested.",
        });
    }
    catch (error) {
        console.error("Failed to cancel workflow:", error);
        return res.status(500).json({
            message: "Failed to cancel hotel search.",
        });
    }
});
exports.default = router;
