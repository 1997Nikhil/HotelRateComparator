import {
  findCheapestHotel,
} from "../services/hotel-comparison";

describe(
  "Hotel Comparison",
  () => {
    test(
      "Supplier A cheaper",
      () => {
        const result =
          findCheapestHotel(
            [
              {
                hotelId: "A1",
                name: "Hotel A",
                price: 80,
                supplier: "SupplierA",
              },
            ],

            [
              {
                hotelId: "B1",
                name: "Hotel B",
                price: 100,
                supplier: "SupplierB",
              },
            ]
          );

        expect(
          result?.supplier
        ).toBe("SupplierA");
      }
    );

    test(
      "Supplier B cheaper",
      () => {
        const result =
          findCheapestHotel(
            [
              {
                hotelId: "A1",
                name: "Hotel A",
                price: 120,
                supplier: "SupplierA",
              },
            ],

            [
              {
                hotelId: "B1",
                name: "Hotel B",
                price: 90,
                supplier: "SupplierB",
              },
            ]
          );

        expect(
          result?.supplier
        ).toBe("SupplierB");
      }
    );

    test(
      "Same price picks Supplier A",
      () => {
        const result =
          findCheapestHotel(
            [
              {
                hotelId: "A1",
                name: "Hotel A",
                price: 100,
                supplier: "SupplierA",
              },
            ],

            [
              {
                hotelId: "B1",
                name: "Hotel B",
                price: 100,
                supplier: "SupplierB",
              },
            ]
          );

        expect(
          result?.supplier
        ).toBe("SupplierA");
      }
    );

    test(
      "Both empty returns null",
      () => {
        const result =
          findCheapestHotel(
            [],
            []
          );

        expect(result).toBeNull();
      }
    );
  }
);