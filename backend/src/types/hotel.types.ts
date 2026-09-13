export interface Hotel {
  hotelId: string;
  name: string;
  price: number;
  supplier: "SupplierA" | "SupplierB";
}

export interface SearchRequest {
  city: string;
  checkIn: string;
  checkOut: string;
  scenario?: string;
}

export interface SupplierStatus {
  supplier: "SupplierA" | "SupplierB";

  status:
    | "SUCCESS"
    | "FAILED"
    | "TIMEOUT"
    | "EMPTY";

  hotels: Hotel[];

  error?: string;
}

export interface SearchResult {
  hotel: Hotel | null;

  message: string;

  search: SearchRequest;

  suppliers: SupplierStatus[];
}