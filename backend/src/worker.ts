import dotenv from "dotenv";

dotenv.config();

import {
  Worker,
  NativeConnection,
} from "@temporalio/worker";

import * as activities from "./activities/hotel.activities";


async function runWorker() {

  const connection =
    await NativeConnection.connect({
      address:
        process.env.TEMPORAL_ADDRESS ||
        "localhost:7233",
    });


  const worker =
    await Worker.create({

      connection,

      workflowsPath:
        require.resolve(
          "./workflows/hotel.workflow"
        ),

      activities,

      taskQueue:
        process.env.TEMPORAL_TASK_QUEUE ||
        "HOTEL_TASK_QUEUE",
    });


  console.log(
    "Temporal Worker started"
  );


  await worker.run();
}


runWorker().catch(
  (error) => {

    console.error(
      "Temporal Worker error:",
      error
    );

    process.exit(1);
  }
);