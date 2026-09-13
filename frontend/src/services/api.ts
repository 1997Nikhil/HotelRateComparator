import axios from "axios";

const API_URL =
  "http://localhost:5000";

/**
 * ----------------------------------------------------
 * HOTEL
 * ----------------------------------------------------
 */
export interface Hotel {
  hotelId: string;
  name: string;
  price: number;
  supplier: string;
}

/**
 * ----------------------------------------------------
 * SEARCH REQUEST
 * ----------------------------------------------------
 */
export interface SearchRequest {
  city: string;
  checkIn: string;
  checkOut: string;
  scenario?: string;
}

/**
 * ----------------------------------------------------
 * SUPPLIER STATUS
 * ----------------------------------------------------
 */
export interface SupplierStatus {
  supplier:
    | "SupplierA"
    | "SupplierB";

  status:
    | "SUCCESS"
    | "FAILED"
    | "TIMEOUT"
    | "EMPTY";

  hotels: Hotel[];

  error?: string;
}

/**
 * ----------------------------------------------------
 * START SEARCH RESPONSE
 * ----------------------------------------------------
 */
export interface SearchStartResponse {
  workflowId: string;

  status: string;

  message: string;
}

/**
 * ----------------------------------------------------
 * SEARCH STATUS RESPONSE
 * ----------------------------------------------------
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
}

/**
 * ----------------------------------------------------
 * START SEARCH
 * ----------------------------------------------------
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

/**
 * ----------------------------------------------------
 * GET SEARCH STATUS
 * ----------------------------------------------------
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

/**
 * ----------------------------------------------------
 * CANCEL SEARCH
 * ----------------------------------------------------
 */
export async function cancelHotelSearch(
  workflowId: string
): Promise<void> {

  await axios.post(
    `${API_URL}/api/cancel-search/${workflowId}`
  );
}