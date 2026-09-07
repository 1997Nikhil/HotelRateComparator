"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hotel_comparison_1 = require("../services/hotel-comparison");
describe("Hotel Comparison", () => {
    test("Supplier A cheaper", () => {
        const result = (0, hotel_comparison_1.findCheapestHotel)([
            {
                hotelId: "A1",
                name: "Hotel A",
                price: 80,
                supplier: "SupplierA",
            },
        ], [
            {
                hotelId: "B1",
                name: "Hotel B",
                price: 100,
                supplier: "SupplierB",
            },
        ]);
        expect(result?.supplier).toBe("SupplierA");
    });
    test("Supplier B cheaper", () => {
        const result = (0, hotel_comparison_1.findCheapestHotel)([
            {
                hotelId: "A1",
                name: "Hotel A",
                price: 120,
                supplier: "SupplierA",
            },
        ], [
            {
                hotelId: "B1",
                name: "Hotel B",
                price: 90,
                supplier: "SupplierB",
            },
        ]);
        expect(result?.supplier).toBe("SupplierB");
    });
    test("Same price picks Supplier A", () => {
        const result = (0, hotel_comparison_1.findCheapestHotel)([
            {
                hotelId: "A1",
                name: "Hotel A",
                price: 100,
                supplier: "SupplierA",
            },
        ], [
            {
                hotelId: "B1",
                name: "Hotel B",
                price: 100,
                supplier: "SupplierB",
            },
        ]);
        expect(result?.supplier).toBe("SupplierA");
    });
    test("Both empty returns null", () => {
        const result = (0, hotel_comparison_1.findCheapestHotel)([], []);
        expect(result).toBeNull();
    });
});
