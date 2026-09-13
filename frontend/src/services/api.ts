import axios from "axios";

const API_URL = "http://localhost:5000";

/*
 * --------------------------------------------------
 * Hotel
 * --------------------------------------------------
 */

export interface Hotel {
  hotelId: string;
  name: string;
  price: number;
  supplier: string;
}

/*
 * --------------------------------------------------
 * Search Request
 * --------------------------------------------------
 */

export interface SearchRequest {
  city: string;
  checkIn: string;
  checkOut: string;
  scenario?: string;
}

/*
 * --------------------------------------------------
 * Supplier Status
 * --------------------------------------------------
 */

export interface SupplierStatus {
  supplier: "SupplierA" | "SupplierB";

  status:
    | "SUCCESS"
    | "FAILED"
    | "TIMEOUT"
    | "EMPTY"
    | "RUNNING";

  hotels: Hotel[];

  error?: string;
}

/*
 * --------------------------------------------------
 * Temporal Workflow Step
 * --------------------------------------------------
 */

export interface WorkflowStep {
  id: string;

  name: string;

  description: string;

  status:
    | "PENDING"
    | "RUNNING"
    | "COMPLETED"
    | "FAILED"
    | "TIMEOUT";
}

/*
 * --------------------------------------------------
 * Start Search Response
 * --------------------------------------------------
 */

export interface SearchStartResponse {
  workflowId: string;

  status: string;

  message: string;
}

/*
 * --------------------------------------------------
 * Search Status Response
 * --------------------------------------------------
 */

export interface SearchStatusResponse {
  workflowId: string;

  status:
    | "RUNNING"
    | "COMPLETED"
    | "CANCELLED"
    | "FAILED";

  hotel: Hotel | null;

  message: string;

  search?: SearchRequest;

  suppliers?: SupplierStatus[];

  workflowSteps?: WorkflowStep[];
}

/*
 * --------------------------------------------------
 * Start Search
 * --------------------------------------------------
 */

export async function startHotelSearch(
  data: SearchRequest
): Promise<SearchStartResponse> {
  const response =
    await axios.post(
      `${API_URL}/api/search-hotels`,
      data
    );

  return response.data;
}

/*
 * --------------------------------------------------
 * Get Search Status
 * --------------------------------------------------
 */

export async function getHotelSearchStatus(
  workflowId: string
): Promise<SearchStatusResponse> {
  const response =
    await axios.get(
      `${API_URL}/api/search-hotels/${workflowId}`
    );

  return response.data;
}

/*
 * --------------------------------------------------
 * Cancel Search
 * --------------------------------------------------
 */

export async function cancelHotelSearch(
  workflowId: string
): Promise<void> {
  await axios.post(
    `${API_URL}/api/cancel-search/${workflowId}`
  );
}