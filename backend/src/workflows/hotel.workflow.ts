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
  SupplierStatus,
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
  startToCloseTimeout: "10 seconds",

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
 * Run Supplier With Timeout
 * ----------------------------------------------------
 */
async function runSupplierWithTimeout(
  supplierName: string,
  supplier: () => Promise<Hotel[]>
): Promise<Hotel[]> {

  const activityScope =
    new CancellationScope();

  const timeoutScope =
    new CancellationScope();

  const activityPromise =
    activityScope.run(supplier);

  const timeoutPromise =
    timeoutScope.run(async () => {

      await sleep("5 seconds");

      activityScope.cancel();

      throw new SupplierTimeoutError(
        supplierName
      );
    });

  try {

    return await Promise.race([
      activityPromise,
      timeoutPromise,
    ]);

  } finally {

    timeoutScope.cancel();

  }
}

/**
 * ----------------------------------------------------
 * HOTEL SEARCH WORKFLOW
 * ----------------------------------------------------
 */
export async function hotelSearchWorkflow(
  search: SearchRequest
): Promise<SearchResult> {

  console.log(
    "Hotel workflow started"
  );

  /**
   * --------------------------------------------------
   * Call both suppliers in parallel
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
   * Store successful hotel results
   * --------------------------------------------------
   */
  let hotelsA: Hotel[] = [];

  let hotelsB: Hotel[] = [];

  /**
   * --------------------------------------------------
   * Store supplier status for frontend
   * --------------------------------------------------
   */
  const suppliers: SupplierStatus[] = [];

  /**
   * --------------------------------------------------
   * Supplier A
   * --------------------------------------------------
   */
  if (
    supplierAResult.status ===
    "fulfilled"
  ) {

    hotelsA =
      supplierAResult.value;

    if (hotelsA.length === 0) {

      suppliers.push({
        supplier: "SupplierA",
        status: "EMPTY",
        hotels: [],
      });

    } else {

      suppliers.push({
        supplier: "SupplierA",
        status: "SUCCESS",
        hotels: hotelsA,
      });

    }

  } else {

    /**
     * User cancellation should cancel
     * the complete workflow.
     */
    if (
      isCancellation(
        supplierAResult.reason
      )
    ) {

      throw supplierAResult.reason;

    }

    /**
     * Supplier A failed.
     */
    const error =
      supplierAResult.reason;

    const isTimeout =
      error instanceof SupplierTimeoutError;

    suppliers.push({

      supplier: "SupplierA",

      status:
        isTimeout
          ? "TIMEOUT"
          : "FAILED",

      hotels: [],

      error:
        error instanceof Error
          ? error.message
          : String(error),

    });

  }

  /**
   * --------------------------------------------------
   * Supplier B
   * --------------------------------------------------
   */
  if (
    supplierBResult.status ===
    "fulfilled"
  ) {

    hotelsB =
      supplierBResult.value;

    if (hotelsB.length === 0) {

      suppliers.push({
        supplier: "SupplierB",
        status: "EMPTY",
        hotels: [],
      });

    } else {

      suppliers.push({
        supplier: "SupplierB",
        status: "SUCCESS",
        hotels: hotelsB,
      });

    }

  } else {

    /**
     * User cancellation.
     */
    if (
      isCancellation(
        supplierBResult.reason
      )
    ) {

      throw supplierBResult.reason;

    }

    /**
     * Supplier B failed.
     */
    const error =
      supplierBResult.reason;

    const isTimeout =
      error instanceof SupplierTimeoutError;

    suppliers.push({

      supplier: "SupplierB",

      status:
        isTimeout
          ? "TIMEOUT"
          : "FAILED",

      hotels: [],

      error:
        error instanceof Error
          ? error.message
          : String(error),

    });

  }

  /**
   * --------------------------------------------------
   * Find cheapest hotel
   * --------------------------------------------------
   */
  const cheapestHotel =
    findCheapestHotel(
      hotelsA,
      hotelsB
    );

  /**
   * --------------------------------------------------
   * No hotel available
   * --------------------------------------------------
   */
  if (!cheapestHotel) {

    return {

      hotel: null,

      message:
        "No hotels found",

      search,

      suppliers,

    };

  }

  /**
   * --------------------------------------------------
   * SUCCESS
   * --------------------------------------------------
   */
  return {

    hotel: cheapestHotel,

    message:
      "Hotel found successfully",

    search,

    suppliers,

  };
}