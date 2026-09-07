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

export interface SearchResult {
  hotel: Hotel | null;
  message: string;

  /**
   * Optional because the original workflow
   * result only contains hotel + message.
   *
   * Keeping this optional prevents the
   * existing 12 tests from breaking.
   */
  search?: SearchRequest;
}