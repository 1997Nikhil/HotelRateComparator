import axios from "axios";
import { Hotel, SearchRequest } from "../types/hotel.types";

const API_URL = "http://localhost:5000";

export async function fetchSupplierA(
  search: SearchRequest
): Promise<Hotel[]> {
  console.log("Fetching Supplier A");

  const response = await axios.get(
    `${API_URL}/supplierA/hotels`,
    {
      params: {
        city: search.city,
        checkIn: search.checkIn,
        checkOut: search.checkOut,
        scenario: search.scenario,
      },

      /*
       * HTTP request timeout.
       *
       * The Workflow also has its own 5-second
       * CancellationScope timeout.
       */
      timeout: 5000,
    }
  );

  return response.data;
}

export async function fetchSupplierB(
  search: SearchRequest
): Promise<Hotel[]> {
  console.log("Fetching Supplier B");

  const response = await axios.get(
    `${API_URL}/supplierB/hotels`,
    {
      params: {
        city: search.city,
        checkIn: search.checkIn,
        checkOut: search.checkOut,
        scenario: search.scenario,
      },

      timeout: 5000,
    }
  );

  return response.data;
}