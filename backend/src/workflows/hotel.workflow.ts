import { proxyActivities } from "@temporalio/workflow";

import type * as activities from "../activities/hotel.activities";

import {
  Hotel,
  SearchRequest,
  SearchResult,
} from "../types/hotel.types";

import {
  findCheapestHotel,
} from "../services/hotel-comparison";

const {
  fetchSupplierA,
  fetchSupplierB,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "5 seconds",

  retry: {
    maximumAttempts: 3,
    initialInterval: "1 second",
    maximumInterval: "2 seconds",
    backoffCoefficient: 2,

    nonRetryableErrorTypes: [
      "PermanentSupplierError",
    ],
  },
});

export async function hotelSearchWorkflow(
  search: SearchRequest
): Promise<SearchResult> {

  console.log(
    "Hotel workflow started"
  );

  const [
    supplierAResult,
    supplierBResult,
  ] = await Promise.allSettled([
    fetchSupplierA(search),
    fetchSupplierB(search),
  ]);

  let hotelsA: Hotel[] = [];

  let hotelsB: Hotel[] = [];

  let supplierAFailed = false;

  let supplierBFailed = false;

  if (
    supplierAResult.status ===
    "fulfilled"
  ) {
    hotelsA =
      supplierAResult.value;
  } else {
    supplierAFailed = true;

    console.log(
      "Supplier A failed"
    );
  }

  if (
    supplierBResult.status ===
    "fulfilled"
  ) {
    hotelsB =
      supplierBResult.value;
  } else {
    supplierBFailed = true;

    console.log(
      "Supplier B failed"
    );
  }

  const cheapestHotel =
    findCheapestHotel(
      hotelsA,
      hotelsB
    );

  // Both suppliers failed
  if (supplierAFailed && supplierBFailed) {
    return {
      hotel: null,
      message: "Both hotel suppliers failed",
    };
  }

  // Both suppliers responded but no hotels
  if (!cheapestHotel) {
    return {
      hotel: null,
      message: "No hotels found",
    };
  }

  return {
    hotel: cheapestHotel,
    message:
      "Hotel found successfully",
  };
}