"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowStatusQuery = void 0;
exports.hotelSearchWorkflow = hotelSearchWorkflow;
const workflow_1 = require("@temporalio/workflow");
/*
 * --------------------------------------------------
 * Configuration
 * --------------------------------------------------
 */
const SUPPLIER_TIMEOUT_MS = 5000;
/*
 * --------------------------------------------------
 * Temporal Activities
 *
 * IMPORTANT:
 * Activities must be called through proxyActivities()
 * from inside a Temporal Workflow.
 *
 * Retry:
 * - Maximum 3 attempts
 * - PermanentSupplierError is NOT retried
 * --------------------------------------------------
 */
const { fetchSupplierA, fetchSupplierB, } = (0, workflow_1.proxyActivities)({
    startToCloseTimeout: "5 seconds",
    retry: {
        maximumAttempts: 3,
        nonRetryableErrorTypes: [
            "PermanentSupplierError",
        ],
    },
});
/*
 * --------------------------------------------------
 * Temporal Query
 *
 * Express can query a running workflow and retrieve
 * the current visualization state.
 * --------------------------------------------------
 */
exports.workflowStatusQuery = (0, workflow_1.defineQuery)("workflowStatus");
/*
 * --------------------------------------------------
 * Run Supplier With Timeout
 * --------------------------------------------------
 *
 * IMPORTANT:
 * The activity call itself is inside the
 * CancellationScope.
 *
 * This allows the 5-second timeout to cancel
 * the running activity correctly.
 * --------------------------------------------------
 */
async function runSupplierWithTimeout(supplier, search) {
    try {
        return await workflow_1.CancellationScope.withTimeout(SUPPLIER_TIMEOUT_MS, async () => {
            try {
                const hotels = supplier === "SupplierA"
                    ? await fetchSupplierA(search)
                    : await fetchSupplierB(search);
                return {
                    kind: "success",
                    hotels,
                };
            }
            catch (error) {
                /*
                 * User cancellation must propagate out of
                 * the workflow rather than being treated as
                 * a supplier failure.
                 */
                if ((0, workflow_1.isCancellation)(error)) {
                    throw error;
                }
                return {
                    kind: "failed",
                    error,
                };
            }
        });
    }
    catch (error) {
        /*
         * A Temporal timeout is represented as an
         * ApplicationFailure with TimeoutError.
         */
        if (error instanceof workflow_1.ApplicationFailure &&
            error.type === "TimeoutError") {
            return {
                kind: "timeout",
            };
        }
        /*
         * Preserve user cancellation.
         */
        if ((0, workflow_1.isCancellation)(error)) {
            throw error;
        }
        throw error;
    }
}
/*
 * --------------------------------------------------
 * Initial Workflow Visualization State
 * --------------------------------------------------
 */
function createInitialWorkflowSteps() {
    return [
        {
            id: "search-request",
            name: "Search Request",
            description: "Hotel search request received",
            status: "COMPLETED",
        },
        {
            id: "temporal-workflow",
            name: "Temporal Workflow",
            description: "Temporal workflow started",
            status: "RUNNING",
        },
        {
            id: "supplier-a",
            name: "Supplier A",
            description: "Fetching hotel rates from Supplier A",
            status: "PENDING",
        },
        {
            id: "supplier-b",
            name: "Supplier B",
            description: "Fetching hotel rates from Supplier B",
            status: "PENDING",
        },
        {
            id: "compare-rates",
            name: "Compare Rates",
            description: "Comparing hotel prices",
            status: "PENDING",
        },
        {
            id: "best-rate",
            name: "Best Rate",
            description: "Selecting cheapest available hotel",
            status: "PENDING",
        },
    ];
}
/*
 * --------------------------------------------------
 * Convert Supplier Execution -> SupplierStatus
 * --------------------------------------------------
 */
function createSupplierStatus(supplier, result) {
    if (result.kind === "timeout") {
        return {
            supplier,
            status: "TIMEOUT",
            hotels: [],
            error: supplier === "SupplierA"
                ? "Supplier A timed out after 5 seconds"
                : "Supplier B timed out after 5 seconds",
        };
    }
    if (result.kind === "failed") {
        return {
            supplier,
            status: "FAILED",
            hotels: [],
            error: result.error instanceof Error
                ? result.error.message
                : supplier === "SupplierA"
                    ? "Supplier A failed"
                    : "Supplier B failed",
        };
    }
    if (result.hotels.length === 0) {
        return {
            supplier,
            status: "EMPTY",
            hotels: [],
        };
    }
    return {
        supplier,
        status: "SUCCESS",
        hotels: result.hotels,
    };
}
/*
 * --------------------------------------------------
 * Hotel Search Workflow
 * --------------------------------------------------
 */
async function hotelSearchWorkflow(search) {
    /*
     * Workflow visualization state.
     *
     * Temporal Query reads this variable.
     */
    let workflowSteps = createInitialWorkflowSteps();
    /*
     * Register query handler.
     */
    (0, workflow_1.setHandler)(exports.workflowStatusQuery, () => workflowSteps);
    /*
     * --------------------------------------------------
     * Supplier A + Supplier B
     * --------------------------------------------------
     *
     * Both suppliers run in parallel.
     */
    workflowSteps = workflowSteps.map((step) => {
        if (step.id === "supplier-a" ||
            step.id === "supplier-b") {
            return {
                ...step,
                status: "RUNNING",
            };
        }
        return step;
    });
    let supplierAResult;
    let supplierBResult;
    try {
        [
            supplierAResult,
            supplierBResult,
        ] = await Promise.all([
            runSupplierWithTimeout("SupplierA", search),
            runSupplierWithTimeout("SupplierB", search),
        ]);
    }
    catch (error) {
        /*
         * User cancellation must cancel the workflow.
         */
        if ((0, workflow_1.isCancellation)(error)) {
            throw error;
        }
        throw error;
    }
    /*
     * --------------------------------------------------
     * Convert results into SupplierStatus
     * --------------------------------------------------
     */
    const supplierAStatus = createSupplierStatus("SupplierA", supplierAResult);
    const supplierBStatus = createSupplierStatus("SupplierB", supplierBResult);
    /*
     * --------------------------------------------------
     * Update Supplier A/B workflow nodes
     * --------------------------------------------------
     */
    workflowSteps = workflowSteps.map((step) => {
        if (step.id === "supplier-a") {
            return {
                ...step,
                status: supplierAStatus.status ===
                    "TIMEOUT"
                    ? "TIMEOUT"
                    : supplierAStatus.status ===
                        "FAILED"
                        ? "FAILED"
                        : "COMPLETED",
            };
        }
        if (step.id === "supplier-b") {
            return {
                ...step,
                status: supplierBStatus.status ===
                    "TIMEOUT"
                    ? "TIMEOUT"
                    : supplierBStatus.status ===
                        "FAILED"
                        ? "FAILED"
                        : "COMPLETED",
            };
        }
        if (step.id === "temporal-workflow") {
            return {
                ...step,
                status: "COMPLETED",
            };
        }
        return step;
    });
    /*
     * --------------------------------------------------
     * Collect available hotels
     * --------------------------------------------------
     */
    const hotelsA = supplierAResult.kind === "success"
        ? supplierAResult.hotels
        : [];
    const hotelsB = supplierBResult.kind === "success"
        ? supplierBResult.hotels
        : [];
    const allHotels = [
        ...hotelsA,
        ...hotelsB,
    ];
    /*
     * --------------------------------------------------
     * Compare Rates
     * --------------------------------------------------
     */
    workflowSteps = workflowSteps.map((step) => {
        if (step.id === "compare-rates") {
            return {
                ...step,
                status: "RUNNING",
            };
        }
        return step;
    });
    /*
     * Small delay so the frontend can visibly
     * display Compare Rates -> RUNNING.
     */
    await (0, workflow_1.sleep)(300);
    /*
     * --------------------------------------------------
     * Find Cheapest Hotel
     * --------------------------------------------------
     *
     * Lower price wins.
     *
     * If prices are equal:
     * Supplier A wins.
     * --------------------------------------------------
     */
    const cheapestHotel = allHotels.length > 0
        ? [...allHotels].sort((a, b) => {
            /*
             * Different prices
             */
            if (a.price !== b.price) {
                return a.price - b.price;
            }
            /*
             * Same price:
             * Supplier A gets priority.
             */
            if (a.supplier === "SupplierA" &&
                b.supplier === "SupplierB") {
                return -1;
            }
            if (a.supplier === "SupplierB" &&
                b.supplier === "SupplierA") {
                return 1;
            }
            return 0;
        })[0]
        : null;
    /*
     * --------------------------------------------------
     * Comparison completed
     * --------------------------------------------------
     */
    workflowSteps = workflowSteps.map((step) => {
        if (step.id === "compare-rates") {
            return {
                ...step,
                status: "COMPLETED",
            };
        }
        if (step.id === "best-rate") {
            return {
                ...step,
                status: "RUNNING",
            };
        }
        return step;
    });
    /*
     * Small delay for frontend visualization.
     */
    await (0, workflow_1.sleep)(300);
    /*
     * --------------------------------------------------
     * Best Rate selected
     * --------------------------------------------------
     */
    workflowSteps = workflowSteps.map((step) => {
        if (step.id === "best-rate") {
            return {
                ...step,
                status: "COMPLETED",
            };
        }
        return step;
    });
    /*
     * --------------------------------------------------
     * Determine final message
     * --------------------------------------------------
     */
    let message;
    if (cheapestHotel) {
        message =
            `Best rate found: ${cheapestHotel.name} ` +
                `at ₹${cheapestHotel.price} ` +
                `from ${cheapestHotel.supplier}.`;
    }
    else {
        const supplierAFailed = supplierAStatus.status === "FAILED" ||
            supplierAStatus.status === "TIMEOUT";
        const supplierBFailed = supplierBStatus.status === "FAILED" ||
            supplierBStatus.status === "TIMEOUT";
        /*
         * Both suppliers failed/timed out.
         */
        if (supplierAFailed &&
            supplierBFailed) {
            message =
                "Both hotel suppliers failed";
        }
        else {
            /*
             * Suppliers responded successfully but
             * returned no hotels.
             */
            message = "No hotels found";
        }
    }
    /*
     * --------------------------------------------------
     * Final Result
     * --------------------------------------------------
     */
    return {
        hotel: cheapestHotel,
        message,
        search,
        suppliers: [
            supplierAStatus,
            supplierBStatus,
        ],
        workflowSteps,
    };
}
