"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const activity_1 = require("@temporalio/activity");
const testing_1 = require("@temporalio/testing");
const worker_1 = require("@temporalio/worker");
const hotel_workflow_1 = require("../workflows/hotel.workflow");
jest.setTimeout(30000);
let testEnv;
const baseSearch = {
    city: "Delhi",
    checkIn: "2026-09-10",
    checkOut: "2026-09-12",
};
function hotel(hotelId, name, price, supplier) {
    return {
        hotelId,
        name,
        price,
        supplier,
    };
}
function waitForCancellation() {
    return new Promise((_, reject) => {
        const signal = activity_1.Context.current().cancellationSignal;
        if (signal.aborted) {
            reject(signal.reason);
            return;
        }
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
}
async function runWorkflow(taskQueue, workflowId, activities) {
    const worker = await worker_1.Worker.create({
        connection: testEnv.nativeConnection,
        workflowsPath: require.resolve("../workflows/hotel.workflow"),
        taskQueue,
        activities,
    });
    const workerRun = worker.run();
    try {
        const result = await testEnv.client.workflow.execute(hotel_workflow_1.hotelSearchWorkflow, {
            taskQueue,
            workflowId,
            args: [baseSearch],
        });
        return result;
    }
    finally {
        await worker.shutdown();
        await workerRun;
    }
}
beforeAll(async () => {
    testEnv =
        await testing_1.TestWorkflowEnvironment.createTimeSkipping();
});
afterAll(async () => {
    await testEnv.teardown();
});
describe("Hotel Search Workflow", () => {
    test("1. Supplier A is cheaper", async () => {
        const result = await runWorkflow("QUEUE_TEST_1", "workflow-test-1", {
            fetchSupplierA: async () => [
                hotel("A-101", "Grand Hotel", 100, "SupplierA"),
            ],
            fetchSupplierB: async () => [
                hotel("B-201", "Royal Inn", 150, "SupplierB"),
            ],
        });
        expect(result.hotel?.supplier).toBe("SupplierA");
        expect(result.hotel?.price).toBe(100);
    });
    test("2. Supplier B is cheaper", async () => {
        const result = await runWorkflow("QUEUE_TEST_2", "workflow-test-2", {
            fetchSupplierA: async () => [
                hotel("A-101", "Grand Hotel", 150, "SupplierA"),
            ],
            fetchSupplierB: async () => [
                hotel("B-201", "Royal Inn", 90, "SupplierB"),
            ],
        });
        expect(result.hotel?.supplier).toBe("SupplierB");
        expect(result.hotel?.price).toBe(90);
    });
    test("3. Same rate returns Supplier A", async () => {
        const result = await runWorkflow("QUEUE_TEST_3", "workflow-test-3", {
            fetchSupplierA: async () => [
                hotel("A-101", "Grand Hotel", 100, "SupplierA"),
            ],
            fetchSupplierB: async () => [
                hotel("B-201", "Royal Inn", 100, "SupplierB"),
            ],
        });
        expect(result.hotel?.supplier).toBe("SupplierA");
        expect(result.hotel?.price).toBe(100);
    });
    test("4. Supplier A fails, Supplier B succeeds", async () => {
        const result = await runWorkflow("QUEUE_TEST_4", "workflow-test-4", {
            fetchSupplierA: async () => {
                const error = new Error("Supplier A failed");
                error.name = "PermanentSupplierError";
                throw error;
            },
            fetchSupplierB: async () => [
                hotel("B-201", "Royal Inn", 90, "SupplierB"),
            ],
        });
        expect(result.hotel).not.toBeNull();
        expect(result.hotel?.supplier).toBe("SupplierB");
        expect(result.hotel?.price).toBe(90);
    });
    test("5. Both suppliers fail", async () => {
        const result = await runWorkflow("QUEUE_TEST_5", "workflow-test-5", {
            fetchSupplierA: async () => {
                const error = new Error("Supplier A failed");
                error.name = "PermanentSupplierError";
                throw error;
            },
            fetchSupplierB: async () => {
                const error = new Error("Supplier B failed");
                error.name = "PermanentSupplierError";
                throw error;
            },
        });
        expect(result.hotel).toBeNull();
        expect(result.message).toBe("Both hotel suppliers failed");
    });
    test("6. One supplier returns empty", async () => {
        const result = await runWorkflow("QUEUE_TEST_6", "workflow-test-6", {
            fetchSupplierA: async () => [],
            fetchSupplierB: async () => [
                hotel("B-201", "Royal Inn", 90, "SupplierB"),
            ],
        });
        expect(result.hotel).not.toBeNull();
        expect(result.hotel?.supplier).toBe("SupplierB");
        expect(result.hotel?.price).toBe(90);
    });
    test("7. Both suppliers return empty", async () => {
        const result = await runWorkflow("QUEUE_TEST_7", "workflow-test-7", {
            fetchSupplierA: async () => [],
            fetchSupplierB: async () => [],
        });
        expect(result.hotel).toBeNull();
        expect(result.message).toBe("No hotels found");
    });
    test("8. One supplier times out, other supplier succeeds", async () => {
        const taskQueue = "QUEUE_TEST_8";
        const worker = await worker_1.Worker.create({
            connection: testEnv.nativeConnection,
            workflowsPath: require.resolve("../workflows/hotel.workflow"),
            taskQueue,
            activities: {
                fetchSupplierA: async () => {
                    await waitForCancellation();
                    return [];
                },
                fetchSupplierB: async () => [
                    hotel("B-201", "Royal Inn", 90, "SupplierB"),
                ],
            },
        });
        const workerRun = worker.run();
        try {
            const result = await testEnv.client.workflow.execute(hotel_workflow_1.hotelSearchWorkflow, {
                taskQueue,
                workflowId: "workflow-test-8",
                args: [baseSearch],
            });
            expect(result.hotel).not.toBeNull();
            expect(result.hotel?.supplier).toBe("SupplierB");
            expect(result.hotel?.price).toBe(90);
        }
        finally {
            await worker.shutdown();
            await workerRun;
        }
    }, 15000);
    test("9. Supplier A fails twice and succeeds on third attempt", async () => {
        let attempts = 0;
        const taskQueue = "QUEUE_TEST_9";
        const worker = await worker_1.Worker.create({
            connection: testEnv.nativeConnection,
            workflowsPath: require.resolve("../workflows/hotel.workflow"),
            taskQueue,
            activities: {
                fetchSupplierA: async () => {
                    attempts++;
                    console.log(`Supplier A attempt ${attempts}`);
                    if (attempts < 3) {
                        throw new Error("Temporary Supplier A failure");
                    }
                    return [
                        hotel("A-101", "Grand Hotel", 80, "SupplierA"),
                    ];
                },
                fetchSupplierB: async () => [
                    hotel("B-201", "Royal Inn", 150, "SupplierB"),
                ],
            },
        });
        const workerRun = worker.run();
        try {
            const result = await testEnv.client.workflow.execute(hotel_workflow_1.hotelSearchWorkflow, {
                taskQueue,
                workflowId: "workflow-test-9",
                args: [baseSearch],
            });
            expect(attempts).toBe(3);
            expect(result.hotel).not.toBeNull();
            expect(result.hotel?.supplier).toBe("SupplierA");
            expect(result.hotel?.price).toBe(80);
        }
        finally {
            await worker.shutdown();
            await workerRun;
        }
    }, 15000);
    test("10. User cancels workflow while suppliers are running", async () => {
        const taskQueue = "QUEUE_TEST_10";
        const worker = await worker_1.Worker.create({
            connection: testEnv.nativeConnection,
            workflowsPath: require.resolve("../workflows/hotel.workflow"),
            taskQueue,
            activities: {
                fetchSupplierA: async () => {
                    await waitForCancellation();
                    return [];
                },
                fetchSupplierB: async () => {
                    await waitForCancellation();
                    return [];
                },
            },
        });
        const workerRun = worker.run();
        try {
            const handle = await testEnv.client.workflow.start(hotel_workflow_1.hotelSearchWorkflow, {
                taskQueue,
                workflowId: "workflow-test-10",
                args: [baseSearch],
            });
            await new Promise((resolve) => setTimeout(resolve, 500));
            await handle.cancel();
            await expect(handle.result()).rejects.toThrow();
        }
        finally {
            await worker.shutdown();
            await workerRun;
        }
    }, 15000);
});
