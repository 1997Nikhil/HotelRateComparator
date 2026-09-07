"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
router.get("/supplierA/hotels", async (req, res) => {
    const scenario = req.query.scenario;
    console.log("Supplier A called");
    try {
        if (scenario === "supplierAError") {
            return res.status(500).json({
                error: "Supplier A server error",
            });
        }
        if (scenario === "supplierATimeout") {
            await delay(7000);
        }
        else {
            await delay(Math.random() * 1000 + 500);
        }
        if (scenario === "supplierAEmpty") {
            return res.json([]);
        }
        return res.json([
            {
                hotelId: "A-101",
                name: "Grand Hotel",
                price: 120,
                supplier: "SupplierA",
            },
            {
                hotelId: "A-102",
                name: "City Palace Hotel",
                price: 100,
                supplier: "SupplierA",
            },
        ]);
    }
    catch (error) {
        return res.status(500).json({
            error: "Supplier A failed",
        });
    }
});
router.get("/supplierB/hotels", async (req, res) => {
    const scenario = req.query.scenario;
    console.log("Supplier B called");
    try {
        if (scenario === "supplierBError") {
            return res.status(500).json({
                error: "Supplier B server error",
            });
        }
        if (scenario === "supplierBTimeout") {
            await delay(7000);
        }
        else {
            await delay(Math.random() * 1000 + 500);
        }
        if (scenario === "supplierBEmpty") {
            return res.json([]);
        }
        return res.json([
            {
                hotelId: "B-201",
                name: "Grand Hotel",
                price: 110,
                supplier: "SupplierB",
            },
            {
                hotelId: "B-202",
                name: "Royal Inn",
                price: 90,
                supplier: "SupplierB",
            },
        ]);
    }
    catch (error) {
        return res.status(500).json({
            error: "Supplier B failed",
        });
    }
});
exports.default = router;
