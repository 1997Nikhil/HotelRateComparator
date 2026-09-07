"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchSupplierA = fetchSupplierA;
exports.fetchSupplierB = fetchSupplierB;
const axios_1 = __importDefault(require("axios"));
const API_URL = "http://localhost:5000";
async function fetchSupplierA(search) {
    console.log("Fetching Supplier A");
    const response = await axios_1.default.get(`${API_URL}/supplierA/hotels`, {
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
    });
    return response.data;
}
async function fetchSupplierB(search) {
    console.log("Fetching Supplier B");
    const response = await axios_1.default.get(`${API_URL}/supplierB/hotels`, {
        params: {
            city: search.city,
            checkIn: search.checkIn,
            checkOut: search.checkOut,
            scenario: search.scenario,
        },
        timeout: 5000,
    });
    return response.data;
}
