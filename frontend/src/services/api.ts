import axios from "axios";


const API_URL =
  "http://localhost:5000";


export interface Hotel {
  hotelId: string;
  name: string;
  price: number;
  supplier: string;
}


export interface SearchRequest {
  city: string;
  checkIn: string;
  checkOut: string;
  scenario?: string;
}


export interface SearchStartResponse {
  workflowId: string;

  status: string;

  message: string;
}


export interface SearchStatusResponse {
  workflowId: string;

  status:
    | "RUNNING"
    | "COMPLETED"
    | "CANCELED"
    | "FAILED";

  hotel: Hotel | null;

  message: string;

  search?: SearchRequest;
}


/**
 * ==========================================
 * START SEARCH
 * ==========================================
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
 * ==========================================
 * GET SEARCH STATUS
 * ==========================================
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
 * ==========================================
 * CANCEL SEARCH
 * ==========================================
 */
export async function cancelHotelSearch(
  workflowId: string
): Promise<void> {

  await axios.post(
    `${API_URL}/api/cancel-search/${workflowId}`
  );
}