import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import { ApplicationFailure } from "@temporalio/common";

import { hotelSearchWorkflow } from "../workflows/hotel.workflow";

jest.setTimeout(30000);

describe("Hotel Search Workflow", () => {
  let testEnv: TestWorkflowEnvironment;

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createTimeSkipping();
  });

  afterAll(async () => {
    await testEnv?.teardown();
  });

  // ----------------------------------------------------
  // TEST 1
  // Supplier A is cheaper
  // ----------------------------------------------------
  test("Supplier A cheaper", async () => {
    const worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue: "test-task-queue-1",

      workflowsPath: require.resolve(
        "../workflows/hotel.workflow"
      ),

      activities: {
        fetchSupplierA: async () => [
          {
            hotelId: "A1",
            name: "Hotel A",
            price: 80,
            supplier: "SupplierA",
          },
        ],

        fetchSupplierB: async () => [
          {
            hotelId: "B1",
            name: "Hotel B",
            price: 100,
            supplier: "SupplierB",
          },
        ],
      },
    });

    const result = await worker.runUntil(
      testEnv.client.workflow.execute(hotelSearchWorkflow, {
        taskQueue: "test-task-queue-1",
        workflowId: "test-supplier-a-cheaper",
        args: [
          {
            city: "Mumbai",
            checkIn: "2026-10-10",
            checkOut: "2026-10-12",
          },
        ],
      })
    );

    expect(result.hotel).not.toBeNull();
    expect(result.hotel?.supplier).toBe("SupplierA");
    expect(result.hotel?.price).toBe(80);
  });

  // ----------------------------------------------------
  // TEST 2
  // Supplier B is cheaper
  // ----------------------------------------------------
  test("Supplier B cheaper", async () => {
    const worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue: "test-task-queue-2",

      workflowsPath: require.resolve(
        "../workflows/hotel.workflow"
      ),

      activities: {
        fetchSupplierA: async () => [
          {
            hotelId: "A1",
            name: "Hotel A",
            price: 120,
            supplier: "SupplierA",
          },
        ],

        fetchSupplierB: async () => [
          {
            hotelId: "B1",
            name: "Hotel B",
            price: 90,
            supplier: "SupplierB",
          },
        ],
      },
    });

    const result = await worker.runUntil(
      testEnv.client.workflow.execute(hotelSearchWorkflow, {
        taskQueue: "test-task-queue-2",
        workflowId: "test-supplier-b-cheaper",
        args: [
          {
            city: "Delhi",
            checkIn: "2026-10-10",
            checkOut: "2026-10-12",
          },
        ],
      })
    );

    expect(result.hotel).not.toBeNull();
    expect(result.hotel?.supplier).toBe("SupplierB");
    expect(result.hotel?.price).toBe(90);
  });

  // ----------------------------------------------------
  // TEST 3
  // Same price → Supplier A should win
  // ----------------------------------------------------
  test("Same rate should deterministically select Supplier A", async () => {
    const worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue: "test-task-queue-3",

      workflowsPath: require.resolve(
        "../workflows/hotel.workflow"
      ),

      activities: {
        fetchSupplierA: async () => [
          {
            hotelId: "A1",
            name: "Hotel A",
            price: 100,
            supplier: "SupplierA",
          },
        ],

        fetchSupplierB: async () => [
          {
            hotelId: "B1",
            name: "Hotel B",
            price: 100,
            supplier: "SupplierB",
          },
        ],
      },
    });

    const result = await worker.runUntil(
      testEnv.client.workflow.execute(hotelSearchWorkflow, {
        taskQueue: "test-task-queue-3",
        workflowId: "test-same-rate",
        args: [
          {
            city: "Pune",
            checkIn: "2026-10-10",
            checkOut: "2026-10-12",
          },
        ],
      })
    );

    expect(result.hotel).not.toBeNull();
    expect(result.hotel?.price).toBe(100);
    expect(result.hotel?.supplier).toBe("SupplierA");
  });

  // ----------------------------------------------------
  // TEST 4
  // Supplier A fails, Supplier B succeeds
  // ----------------------------------------------------
  test("Supplier A fails but Supplier B succeeds", async () => {
    const worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue: "test-task-queue-4",

      workflowsPath: require.resolve(
        "../workflows/hotel.workflow"
      ),

      activities: {
        fetchSupplierA: async () => {
            throw ApplicationFailure.create({
                message: "Supplier A permanently failed",
                type: "PermanentSupplierError",
                nonRetryable: true,
            });
        },

        fetchSupplierB: async () => [
          {
            hotelId: "B1",
            name: "Hotel B",
            price: 95,
            supplier: "SupplierB",
          },
        ],
      },
    });

    const result = await worker.runUntil(
      testEnv.client.workflow.execute(hotelSearchWorkflow, {
        taskQueue: "test-task-queue-4",
        workflowId: "test-a-fails-b-succeeds",
        args: [
          {
            city: "Mumbai",
            checkIn: "2026-10-10",
            checkOut: "2026-10-12",
          },
        ],
      })
    );

    expect(result.hotel).not.toBeNull();
    expect(result.hotel?.supplier).toBe("SupplierB");
    expect(result.hotel?.price).toBe(95);
  });

  // ----------------------------------------------------
  // TEST 5
  // Both suppliers fail
  // ----------------------------------------------------
 test("Both suppliers fail", async () => {
  const worker = await Worker.create({
    connection: testEnv.nativeConnection,

    taskQueue: "test-task-queue-5",

    workflowsPath: require.resolve(
      "../workflows/hotel.workflow"
    ),

    activities: {
      fetchSupplierA: async () => {
        throw ApplicationFailure.create({
          message:
            "Supplier A permanently failed",

          type:
            "PermanentSupplierError",

          nonRetryable: true,
        });
      },

      fetchSupplierB: async () => {
        throw ApplicationFailure.create({
          message:
            "Supplier B permanently failed",

          type:
            "PermanentSupplierError",

          nonRetryable: true,
        });
      },
    },
  });

  const result = await worker.runUntil(
    testEnv.client.workflow.execute(
      hotelSearchWorkflow,
      {
        taskQueue: "test-task-queue-5",

        workflowId:
          "test-both-fail",

        args: [
          {
            city: "Delhi",
            checkIn: "2026-10-10",
            checkOut: "2026-10-12",
          },
        ],
      }
    )
  );

  expect(result.hotel).toBeNull();

  expect(result.message).toBe(
    "Both hotel suppliers failed"
  );
});

  // ----------------------------------------------------
  // TEST 6
  // Supplier A empty, Supplier B has hotels
  // ----------------------------------------------------
  test("Supplier A empty, Supplier B returns hotels", async () => {
    const worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue: "test-task-queue-6",

      workflowsPath: require.resolve(
        "../workflows/hotel.workflow"
      ),

      activities: {
        fetchSupplierA: async () => [],

        fetchSupplierB: async () => [
          {
            hotelId: "B1",
            name: "Royal Inn",
            price: 90,
            supplier: "SupplierB",
          },
        ],
      },
    });

    const result = await worker.runUntil(
      testEnv.client.workflow.execute(hotelSearchWorkflow, {
        taskQueue: "test-task-queue-6",
        workflowId: "test-a-empty-b-success",
        args: [
          {
            city: "Jaipur",
            checkIn: "2026-10-10",
            checkOut: "2026-10-12",
          },
        ],
      })
    );

    expect(result.hotel).not.toBeNull();
    expect(result.hotel?.name).toBe("Royal Inn");
    expect(result.hotel?.supplier).toBe("SupplierB");
  });

  // ----------------------------------------------------
  // TEST 7
  // Both suppliers empty
  // ----------------------------------------------------
  test("Both suppliers return empty results", async () => {
    const worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue: "test-task-queue-7",

      workflowsPath: require.resolve(
        "../workflows/hotel.workflow"
      ),

      activities: {
        fetchSupplierA: async () => [],

        fetchSupplierB: async () => [],
      },
    });

    const result = await worker.runUntil(
      testEnv.client.workflow.execute(hotelSearchWorkflow, {
        taskQueue: "test-task-queue-7",
        workflowId: "test-both-empty",
        args: [
          {
            city: "Goa",
            checkIn: "2026-10-10",
            checkOut: "2026-10-12",
          },
        ],
      })
    );

    expect(result.hotel).toBeNull();
    expect(result.message).toBe("No hotels found");
  });

  // ----------------------------------------------------
  // TEST 8
  // Supplier A fails twice, then succeeds
  // Tests Temporal retry
  // ----------------------------------------------------
  test("Supplier A fails twice and succeeds on third attempt", async () => {
    let attempts = 0;

    const worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue: "test-task-queue-8",

      workflowsPath: require.resolve(
        "../workflows/hotel.workflow"
      ),

      activities: {
        fetchSupplierA: async () => {
          attempts++;

          if (attempts < 3) {
            throw new Error(
              `Supplier A temporary failure - attempt ${attempts}`
            );
          }

          return [
            {
              hotelId: "A1",
              name: "Retry Hotel",
              price: 85,
              supplier: "SupplierA",
            },
          ];
        },

        fetchSupplierB: async () => [],
      },
    });

    const result = await worker.runUntil(
      testEnv.client.workflow.execute(hotelSearchWorkflow, {
        taskQueue: "test-task-queue-8",
        workflowId: "test-retry-success",
        args: [
          {
            city: "Mumbai",
            checkIn: "2026-10-10",
            checkOut: "2026-10-12",
          },
        ],
      })
    );

    expect(attempts).toBe(3);
    expect(result.hotel).not.toBeNull();
    expect(result.hotel?.name).toBe("Retry Hotel");
    expect(result.hotel?.price).toBe(85);
  });
});