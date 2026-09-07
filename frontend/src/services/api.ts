import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:5000",
});

export interface Hotel {
  hotelId: string;
  name: string;
  price: number;
  supplier: string;
}

export interface SearchResponse {
  workflowId: string;

  hotel: Hotel | null;

  message: string;
}

export async function searchHotels(
  city: string,
  checkIn: string,
  checkOut: string
): Promise<SearchResponse> {
  const response =
    await api.post(
      "/api/search-hotels",
      {
        city,
        checkIn,
        checkOut,
      }
    );

  return response.data;
}