"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const supplier_routes_1 = __importDefault(require("./routes/supplier.routes"));
const search_routes_1 = __importDefault(require("./routes/search.routes"));
const postgres_1 = require("./database/postgres");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)({
    origin: "http://localhost:5173",
}));
app.use(express_1.default.json());
app.get("/", (req, res) => {
    res.json({
        message: "Hotel Rate Comparator API is running",
    });
});
app.get("/health", async (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date(),
    });
});
app.use(supplier_routes_1.default);
app.use(search_routes_1.default);
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await (0, postgres_1.testDatabaseConnection)();
});
