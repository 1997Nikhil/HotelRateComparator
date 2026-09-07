import { Hotel } from "../types/hotel.types";

export function findCheapestHotel(
  hotelsA: Hotel[],
  hotelsB: Hotel[]
): Hotel | null {
  const allHotels = [
    ...hotelsA,
    ...hotelsB,
  ];

  if (allHotels.length === 0) {
    return null;
  }

  allHotels.sort((a, b) => {
    if (a.price === b.price) {
      if (
        a.supplier === "SupplierA"
      ) {
        return -1;
      }

      if (
        b.supplier === "SupplierA"
      ) {
        return 1;
      }
    }

    return a.price - b.price;
  });

  return allHotels[0];
}