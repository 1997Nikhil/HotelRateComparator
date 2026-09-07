import axios from "axios";

import {
  Hotel,
  SearchRequest,
} from "../types/hotel.types";

const API_URL =
  "http://localhost:5000";

export async function fetchSupplierA(
  search: SearchRequest
): Promise<Hotel[]> {
  const response =
    await axios.get(
      `${API_URL}/supplierA/hotels`,
      {
        params: {
          ...search,
        },

        timeout: 5000,
      }
    );

  return response.data;
}

export async function fetchSupplierB(
  search: SearchRequest
): Promise<Hotel[]> {
  const response =
    await axios.get(
      `${API_URL}/supplierB/hotels`,
      {
        params: {
          ...search,
        },

        timeout: 5000,
      }
    );

  return response.data;
}