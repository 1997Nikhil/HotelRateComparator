"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findCheapestHotel = findCheapestHotel;
function findCheapestHotel(hotelsA, hotelsB) {
    const allHotels = [
        ...hotelsA,
        ...hotelsB,
    ];
    if (allHotels.length === 0) {
        return null;
    }
    allHotels.sort((a, b) => {
        if (a.price === b.price) {
            if (a.supplier === "SupplierA") {
                return -1;
            }
            if (b.supplier === "SupplierA") {
                return 1;
            }
        }
        return a.price - b.price;
    });
    return allHotels[0];
}
