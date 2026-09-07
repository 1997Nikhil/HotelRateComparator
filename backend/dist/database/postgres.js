"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.testDatabaseConnection = testDatabaseConnection;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
console.log("DATABASE_URL:", process.env.DATABASE_URL);
exports.pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
async function testDatabaseConnection() {
    try {
        const result = await exports.pool.query("SELECT NOW()");
        console.log("PostgreSQL connected:", result.rows[0]);
    }
    catch (error) {
        console.error("PostgreSQL connection failed:", error);
    }
}
