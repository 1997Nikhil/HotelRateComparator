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
}

export interface SearchResult {
  hotel: Hotel | null;
  message: string;
}