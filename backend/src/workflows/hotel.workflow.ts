import {
  CancellationScope,
  isCancellation,
  proxyActivities,
  sleep,
} from "@temporalio/workflow";

import type * as activities from "../activities/hotel.activities";

import type {
  Hotel,
  SearchRequest,
  SearchResult,
} from "../types/hotel.types";

import { findCheapestHotel } from "../services/hotel-comparison";

/**
 * ----------------------------------------------------
 * Temporal Activity Configuration
 * ----------------------------------------------------
 */
const {
  fetchSupplierA,
  fetchSupplierB,
} = proxyActivities<typeof activities>({
  /**
   * Maximum time allowed for an Activity execution.
   *
   * Our business timeout below is 5 seconds,
   * while Temporal itself allows 10 seconds.
   */
  startToCloseTimeout: "10 seconds",

  /**
   * Retry configuration.
   */
  retry: {
    maximumAttempts: 3,
    initialInterval: "100 milliseconds",
    maximumInterval: "500 milliseconds",
    backoffCoefficient: 2,
    nonRetryableErrorTypes: [
      "PermanentSupplierError",
    ],
  },
});

/**
 * ----------------------------------------------------
 * Supplier Timeout Error
 * ----------------------------------------------------
 *
 * This is different from Temporal's
 * CancelledFailure.
 *
 * Supplier timeout:
 *     Only that supplier fails.
 *
 * User cancellation:
 *     Entire workflow is cancelled.
 */
class SupplierTimeoutError extends Error {
  constructor(supplierName: string) {
    super(
      `${supplierName} timed out after 5 seconds`
    );

    this.name = "SupplierTimeoutError";
  }
}

/**
 * ----------------------------------------------------
 * Run Supplier With 5 Second Timeout
 * ----------------------------------------------------
 *
 * Supplier A and Supplier B each receive their
 * own independent 5-second timeout.
 *
 * If Supplier A times out:
 *
 *      Supplier A ❌
 *      Supplier B ✅
 *
 * The workflow continues.
 *
 * If the USER cancels the workflow:
 *
 *      Entire workflow ❌
 */
async function runSupplierWithTimeout(
  supplierName: string,
  supplier: () => Promise<Hotel[]>
): Promise<Hotel[]> {
  /**
   * Scope responsible for the supplier Activity.
   */
  const activityScope =
    new CancellationScope();

  /**
   * Separate scope responsible for the
   * 5-second timer.
   */
  const timeoutScope =
    new CancellationScope();

  /**
   * Start supplier Activity.
   */
  const activityPromise =
    activityScope.run(supplier);

  /**
   * Start 5-second timeout.
   */
  const timeoutPromise =
    timeoutScope.run(async () => {
      /**
       * Wait 5 seconds using Temporal's
       * deterministic timer.
       */
      await sleep("5 seconds");

      /**
       * Supplier has exceeded the
       * business timeout.
       *
       * Cancel only this supplier.
       */
      activityScope.cancel();

      /**
       * Convert the timeout into a
       * normal application error.
       */
      throw new SupplierTimeoutError(
        supplierName
      );
    });

  try {
    /**
     * Whichever happens first wins:
     *
     * 1. Supplier returns
     * 2. Supplier fails
     * 3. 5-second timeout occurs
     * 4. User cancels workflow
     */
    return await Promise.race([
      activityPromise,
      timeoutPromise,
    ]);
  } finally {
    /**
     * If supplier finishes before 5 seconds,
     * stop the timeout timer.
     */
    timeoutScope.cancel();
  }
}

/**
 * ----------------------------------------------------
 * HOTEL SEARCH WORKFLOW
 * ----------------------------------------------------
 *
 * IMPORTANT:
 * This must remain a named export because:
 *
 * - Tests import it
 * - Search API imports it
 * - Temporal Client uses it
 */
export async function hotelSearchWorkflow(
  search: SearchRequest
): Promise<SearchResult> {
  console.log("Hotel workflow started");

  /**
   * --------------------------------------------------
   * Call Supplier A and Supplier B in parallel
   * --------------------------------------------------
   */
  const [
    supplierAResult,
    supplierBResult,
  ] = await Promise.allSettled([
    runSupplierWithTimeout(
      "Supplier A",
      () => fetchSupplierA(search)
    ),

    runSupplierWithTimeout(
      "Supplier B",
      () => fetchSupplierB(search)
    ),
  ]);

  /**
   * --------------------------------------------------
   * Store successful supplier results
   * --------------------------------------------------
   */
  let hotelsA: Hotel[] = [];
  let hotelsB: Hotel[] = [];

  let supplierAFailed = false;
  let supplierBFailed = false;

  /**
   * --------------------------------------------------
   * Supplier A Result
   * --------------------------------------------------
   */
  if (
    supplierAResult.status === "fulfilled"
  ) {
    hotelsA = supplierAResult.value;
  } else {
    /**
     * IMPORTANT:
     *
     * A real user/workflow cancellation must
     * propagate and cancel the entire workflow.
     */
    if (
      isCancellation(
        supplierAResult.reason
      )
    ) {
      throw supplierAResult.reason;
    }

    /**
     * Otherwise this is:
     *
     * - Supplier A server error
     * - Supplier A timeout
     * - Supplier A temporary failure after retries
     */
    supplierAFailed = true;

    console.log(
      "Supplier A failed or timed out:",
      supplierAResult.reason
    );
  }

  /**
   * --------------------------------------------------
   * Supplier B Result
   * --------------------------------------------------
   */
  if (
    supplierBResult.status === "fulfilled"
  ) {
    hotelsB = supplierBResult.value;
  } else {
    /**
     * Real workflow cancellation.
     */
    if (
      isCancellation(
        supplierBResult.reason
      )
    ) {
      throw supplierBResult.reason;
    }

    /**
     * Supplier B failure or timeout.
     */
    supplierBFailed = true;

    console.log(
      "Supplier B failed or timed out:",
      supplierBResult.reason
    );
  }

  /**
   * --------------------------------------------------
   * BOTH SUPPLIERS FAILED
   * --------------------------------------------------
   */
  if (
    supplierAFailed &&
    supplierBFailed
  ) {
    return {
      hotel: null,
      message: "Both hotel suppliers failed",
    };
  }

  /**
   * --------------------------------------------------
   * FIND CHEAPEST HOTEL
   * --------------------------------------------------
   *
   * This works even if only one supplier
   * successfully returned hotels.
   */
  const cheapestHotel =
    findCheapestHotel(
      hotelsA,
      hotelsB
    );

  /**
   * --------------------------------------------------
   * BOTH SUPPLIERS RETURNED EMPTY
   * --------------------------------------------------
   */
  if (!cheapestHotel) {
    return {
      hotel: null,
      message: "No hotels found",
    };
  }

  /**
   * --------------------------------------------------
   * SUCCESS
   * --------------------------------------------------
   */
  return {
    hotel: cheapestHotel,
    message: "Hotel found successfully",
  };
}