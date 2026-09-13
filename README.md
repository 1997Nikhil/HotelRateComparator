# 🏨 Hotel Rate Comparator

A production-style **Hotel Rate Comparator** built with **React, Node.js, TypeScript, PostgreSQL, and Temporal Workflows**.

The application searches multiple hotel suppliers **in parallel**, handles supplier failures and timeouts, compares available hotel rates, and returns the **cheapest available hotel**.

<p align="center">
  <img src="./screenshots/hotel-rate-comparator.png" alt="Hotel Rate Comparator" width="900"/>
</p>

The project demonstrates real-world distributed-system concepts including:

* ⚡ Parallel supplier execution
* 🔄 Durable Temporal Workflows
* ⏱️ Supplier timeout handling
* 🔁 Temporal Activity retries
* ❌ Failure isolation
* 🛑 Workflow cancellation
* 🗄️ PostgreSQL persistence
* 🧪 Unit and workflow testing
* 🐳 Docker-based infrastructure
* 📡 Asynchronous API design
* ⚛️ React frontend integration
* 📊 Live workflow status visualization

---

# 📌 Table of Contents

* [Overview](#-overview)
* [Key Features](#-key-features)
* [Architecture](#-architecture)
* [Technology Stack](#-technology-stack)
* [Project Structure](#-project-structure)
* [How the System Works](#-how-the-system-works)
* [Prerequisites](#-prerequisites)
* [Installation](#-installation)
* [Environment Variables](#-environment-variables)
* [Docker Infrastructure](#-docker-infrastructure)
* [Database](#-database)
* [Running the Project](#-running-the-project)
* [API Documentation](#-api-documentation)
* [Supplier APIs](#-supplier-apis)
* [Search Scenarios](#-search-scenarios)
* [Temporal Workflow](#-temporal-workflow)
* [Timeout Strategy](#-timeout-strategy)
* [Retry Strategy](#-retry-strategy)
* [Workflow Cancellation](#-workflow-cancellation)
* [Frontend](#-frontend)
* [Testing](#-testing)
* [Troubleshooting](#-troubleshooting)
* [Production Considerations](#-production-considerations)
* [Future Improvements](#-future-improvements)
* [Learning Outcomes](#-learning-outcomes)
* [Quick Start](#-quick-start)
* [Author](#-author)

---

# 📖 Overview

The **Hotel Rate Comparator** simulates a hotel booking/search platform that communicates with multiple external hotel suppliers.

Instead of calling suppliers sequentially:

```text
Supplier A
    ↓
Supplier B
    ↓
Compare Results
```

the application executes supplier searches concurrently:

```text
                    ┌──────────────────┐
                    │  Search Request  │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Temporal Workflow│
                    └────────┬─────────┘
                             │
                  ┌──────────┴──────────┐
                  ▼                     ▼
          ┌──────────────┐      ┌──────────────┐
          │  Supplier A  │      │  Supplier B  │
          │   Activity   │      │   Activity   │
          └──────┬───────┘      └──────┬───────┘
                 │                     │
                 └──────────┬──────────┘
                            ▼
                    ┌───────────────┐
                    │ Compare Rates │
                    └───────┬───────┘
                            ▼
                    ┌───────────────┐
                    │ Cheapest Hotel│
                    └───────────────┘
```

Because suppliers are executed concurrently, a slow or failed supplier does not necessarily prevent another supplier from returning a valid result.

---

# ✨ Key Features

## 🔎 Multi-Supplier Hotel Search

The system currently integrates two mock suppliers:

* Supplier A
* Supplier B

Each supplier returns hotel information containing:

* Hotel ID
* Hotel name
* Price
* Supplier name

Example:

```json
[
  {
    "hotelId": "A-101",
    "name": "Grand Hotel",
    "price": 120,
    "supplier": "SupplierA"
  },
  {
    "hotelId": "A-102",
    "name": "City Palace Hotel",
    "price": 100,
    "supplier": "SupplierA"
  }
]
```

---

# ⚡ Parallel Supplier Execution

Both suppliers are executed concurrently inside the Temporal workflow.

```text
                         Search Request
                               │
                               ▼
                       Temporal Workflow
                               │
                     ┌─────────┴─────────┐
                     ▼                   ▼
              Supplier A           Supplier B
               Activity              Activity
                     │                   │
                     └─────────┬─────────┘
                               ▼
                         Compare Rates
                               │
                               ▼
                         Best Rate
```

This prevents the system from unnecessarily waiting for Supplier A to completely finish before starting Supplier B.

---

# 💰 Cheapest Hotel Selection

Results from successful suppliers are combined and compared by price.

Example:

| Hotel             | Supplier   | Price |
| ----------------- | ---------- | ----: |
| Grand Hotel       | Supplier A |  ₹120 |
| City Palace Hotel | Supplier A |  ₹100 |
| Grand Hotel       | Supplier B |  ₹110 |
| Royal Inn         | Supplier B |   ₹90 |

The result is:

```text
Royal Inn
₹90
Supplier B
```

If two hotels have the same price, the comparison logic uses a deterministic tie-breaker and prefers **Supplier A**.

---

# 🛡️ Failure Isolation

A supplier failure does not automatically fail the entire hotel search.

Example:

```text
Supplier A → FAILED
Supplier B → SUCCESS

             ↓

       Supplier B result
```

If Supplier A fails while Supplier B succeeds, the successful supplier's results are still considered.

---

# ⏱️ Supplier Timeout Handling

Each supplier has a business timeout of:

```text
5 seconds
```

If a supplier does not complete within five seconds, the workflow cancels that supplier execution and marks it as:

```text
TIMEOUT
```

Example:

```text
Supplier A
    │
    ├── 1s
    ├── 2s
    ├── 3s
    ├── 4s
    └── 5s → TIMEOUT

Supplier B
    │
    └── SUCCESS
```

The successful supplier can still provide the final result.

---

# 🔄 Activity Retry

Temporal Activity retries are configured to handle transient failures.

The workflow uses:

```text
Maximum Attempts: 3
```

Conceptually:

```text
Attempt #1
    │
    └── Failure
          │
          ▼
      Retry #2
          │
          └── Failure
                │
                ▼
            Retry #3
                │
                ├── Success
                │
                └── Final Failure
```

Permanent errors can be configured as non-retryable using Temporal's error types.

---

# 🛑 Workflow Cancellation

A running search can be cancelled through the backend API.

```text
React Frontend
      │
      │ POST /api/cancel-search/:workflowId
      ▼
Express API
      │
      ▼
Temporal Client
      │
      ▼
Temporal Workflow
      │
      ▼
Cancellation
```

Cancellation is particularly useful for long-running searches where the user no longer needs the result.

---

# 🏗️ Architecture

```text
┌──────────────────────────────────────────────────────┐
│                    React Frontend                    │
│                                                      │
│ Search Form → Workflow Status → Supplier Results     │
│                    ↓                                 │
│              Cheapest Hotel                          │
└────────────────────────┬─────────────────────────────┘
                         │ HTTP
                         ▼
┌──────────────────────────────────────────────────────┐
│                 Node.js / Express API                │
│                                                      │
│ POST /api/search-hotels                              │
│ GET  /api/search-hotels/:workflowId                  │
│ POST /api/cancel-search/:workflowId                 │
└────────────────────────┬─────────────────────────────┘
                         │
                         │ Temporal Client
                         ▼
                 ┌─────────────────┐
                 │ Temporal Server  │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ Temporal Worker │
                 └────────┬────────┘
                          │
                    ┌─────┴─────┐
                    ▼           ▼
               Supplier A   Supplier B
                  API           API
                    │           │
                    └─────┬─────┘
                          ▼
                   Compare Results
                          │
                          ▼
                    Best Hotel
                          │
                          ▼
                   PostgreSQL
```

---

# 🧰 Technology Stack

## Frontend

* React
* TypeScript
* Vite
* Axios
* CSS

## Backend

* Node.js
* Express.js
* TypeScript
* Axios
* CORS
* dotenv

## Workflow Engine

* Temporal
* Temporal TypeScript SDK

## Database

* PostgreSQL 16
* `pg` connection pool

## Infrastructure

* Docker
* Docker Compose

## Testing

* Jest
* ts-jest
* Temporal Testing Environment

---

# 📁 Project Structure

```text
HotelRateComparatorProject/
│
├── docker-compose.yml
│
├── backend/
│   │
│   ├── src/
│   │   │
│   │   ├── activities/
│   │   │   └── hotel.activities.ts
│   │   │
│   │   ├── database/
│   │   │   ├── postgres.ts
│   │   │   └── testConnection.ts
│   │   │
│   │   ├── routes/
│   │   │   ├── search.routes.ts
│   │   │   └── supplier.routes.ts
│   │   │
│   │   ├── services/
│   │   │   └── hotel-comparison.ts
│   │   │
│   │   ├── tests/
│   │   │   ├── hotel-comparison.test.ts
│   │   │   └── hotel.workflow.test.ts
│   │   │
│   │   ├── types/
│   │   │   └── hotel.types.ts
│   │   │
│   │   ├── workflows/
│   │   │   └── hotel.workflow.ts
│   │   │
│   │   ├── server.ts
│   │   └── worker.ts
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── frontend/
│   │
│   ├── src/
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── App.tsx
│   │   ├── App.css
│   │   └── main.tsx
│   │
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

---

# 🔄 How the System Works

## Step 1 — User submits a search

The React frontend sends:

```http
POST /api/search-hotels
```

Example request:

```json
{
  "city": "Mumbai",
  "checkIn": "2026-09-20",
  "checkOut": "2026-09-22"
}
```

An optional scenario can also be provided:

```json
{
  "city": "Mumbai",
  "checkIn": "2026-09-20",
  "checkOut": "2026-09-22",
  "scenario": "supplierATimeout"
}
```

---

## Step 2 — Backend starts Temporal Workflow

The Express API creates a unique workflow ID and starts the Temporal workflow.

The API does **not** wait for the entire hotel search to finish.

It immediately returns:

```json
{
  "workflowId": "hotel-search-172...",
  "status": "RUNNING",
  "message": "Hotel search started."
}
```

This makes the API asynchronous.

---

## Step 3 — Temporal executes supplier activities

The workflow executes Supplier A and Supplier B concurrently.

```text
                Temporal Workflow
                       │
               ┌───────┴───────┐
               ▼               ▼
         fetchSupplierA() fetchSupplierB()
               │               │
               └───────┬───────┘
                       ▼
                 Combine Results
```

---

## Step 4 — Timeout and failure handling

Each supplier execution is independently handled.

Possible supplier states include:

```text
SUCCESS
FAILED
TIMEOUT
EMPTY
RUNNING
```

Therefore, one supplier can fail while the other still succeeds.

---

## Step 5 — Compare Rates

Successful hotel results are passed to:

```text
findCheapestHotel()
```

The service combines the supplier results and selects the lowest price.

---

## Step 6 — Frontend polls workflow status

The frontend periodically calls:

```http
GET /api/search-hotels/:workflowId
```

While the workflow is running, the API returns the current workflow state and workflow visualization steps.

Example:

```json
{
  "workflowId": "hotel-search-123",
  "status": "RUNNING",
  "hotel": null,
  "message": "Hotel search is still running.",
  "suppliers": [],
  "workflowSteps": []
}
```

---

## Step 7 — Workflow completes

Once Temporal completes the workflow, the backend obtains the final result.

Example:

```json
{
  "workflowId": "hotel-search-123",
  "status": "COMPLETED",
  "hotel": {
    "hotelId": "B-202",
    "name": "Royal Inn",
    "price": 90,
    "supplier": "SupplierB"
  },
  "message": "Best rate found: Royal Inn at ₹90 from SupplierB."
}
```

---

# 💻 Prerequisites

Install the following:

## Node.js

Node.js 20+ is recommended.

Check:

```bash
node -v
npm -v
```

---

## Docker Desktop

Check:

```bash
docker --version
docker compose version
```

---

# 🚀 Installation

Clone the repository:

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
```

Navigate into the project:

```bash
cd HotelRateComparatorProject
```

---

# 📦 Backend Setup

Navigate to the backend:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create:

```text
backend/.env
```

Use:

```env
PORT=5000

DATABASE_URL=postgresql://hotel_user:hotel_password@localhost:5434/hotel_db

TEMPORAL_ADDRESS=localhost:7233

TEMPORAL_TASK_QUEUE=HOTEL_TASK_QUEUE
```

> The application PostgreSQL container is exposed on host port **5434**, not 5432.

---

# 🎨 Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

The Vite frontend currently runs on:

```text
http://localhost:5174
```

---

# 🐳 Docker Infrastructure

From the project root:

```bash
docker compose up -d
```

Check running containers:

```bash
docker ps
```

Expected containers:

```text
hotel-postgres
hotel-temporal-postgres
hotel-temporal
hotel-temporal-ui
```

---

# 🐳 Docker Services

| Service                | Host Port | Purpose                    |
| ---------------------- | --------: | -------------------------- |
| Application PostgreSQL |      5434 | Hotel application database |
| Temporal PostgreSQL    |      5433 | Temporal persistence       |
| Temporal Server        |      7233 | Workflow engine            |
| Temporal UI            |      8080 | Workflow monitoring        |

---

# 🗄️ Database

The application PostgreSQL database uses:

```text
Host: localhost
Port: 5434
Database: hotel_db
Username: hotel_user
Password: hotel_password
```

The Docker container itself still uses PostgreSQL's internal port:

```text
5432
```

The host mapping is:

```text
5434:5432
```

---

## Hotel Search Table

The application stores completed best-rate results in:

```sql
CREATE TABLE IF NOT EXISTS hotel_searches (
    id SERIAL PRIMARY KEY,
    workflow_id VARCHAR(255) UNIQUE NOT NULL,
    city VARCHAR(255) NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    hotel_id VARCHAR(255) NOT NULL,
    hotel_name VARCHAR(255) NOT NULL,
    price NUMERIC NOT NULL,
    supplier VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

The `workflow_id` is unique so that the same workflow result is not inserted multiple times.

The backend uses:

```sql
ON CONFLICT (workflow_id)
DO NOTHING
```

when persisting a completed workflow.

---

# ▶️ Running the Project

The project requires the following running components:

1. Docker infrastructure
2. Backend API
3. Temporal Worker
4. React frontend

---

## Step 1 — Start Docker

From:

```text
HotelRateComparatorProject/
```

run:

```bash
docker compose up -d
```

Verify:

```bash
docker ps
```

---

# Terminal 1 — Backend API

```bash
cd backend
npm run dev
```

Expected:

```text
Server running on port 5000
```

The backend API is available at:

```text
http://localhost:5000
```

Test:

```text
http://localhost:5000/
```

Expected:

```json
{
  "message": "Hotel Rate Comparator API is running"
}
```

Health check:

```text
http://localhost:5000/health
```

Expected:

```json
{
  "status": "OK",
  "timestamp": "..."
}
```

---

# Terminal 2 — Temporal Worker

Open another terminal:

```bash
cd backend
npm run worker
```

The worker connects to:

```text
localhost:7233
```

and listens on:

```text
HOTEL_TASK_QUEUE
```

Keep this terminal running.

The worker is responsible for executing:

* Temporal Workflows
* Temporal Activities

---

# Terminal 3 — React Frontend

Open another terminal:

```bash
cd frontend
npm run dev
```

The frontend currently runs at:

```text
http://localhost:5174
```

Open:

```text
http://localhost:5174
```

---

# 🔍 Temporal UI

Temporal UI is available at:

```text
http://localhost:8080
```

The UI can be used to monitor:

* Workflow executions
* Workflow IDs
* Workflow status
* Activity executions
* Activity retries
* Failures
* Execution history
* Cancellation
* Workflow timing

---

# 📡 API Documentation

## 1. Start Hotel Search

### Endpoint

```http
POST /api/search-hotels
```

### Request

```json
{
  "city": "Mumbai",
  "checkIn": "2026-09-20",
  "checkOut": "2026-09-22"
}
```

### Response

```json
{
  "workflowId": "hotel-search-123",
  "status": "RUNNING",
  "message": "Hotel search started."
}
```

The endpoint returns immediately after the workflow is started.

---

# 🔎 2. Get Search Status

### Endpoint

```http
GET /api/search-hotels/:workflowId
```

Example:

```http
GET /api/search-hotels/hotel-search-123
```

---

## Running Response

```json
{
  "workflowId": "hotel-search-123",
  "status": "RUNNING",
  "hotel": null,
  "message": "Hotel search is still running.",
  "suppliers": [],
  "workflowSteps": []
}
```

---

## Completed Response

```json
{
  "workflowId": "hotel-search-123",
  "status": "COMPLETED",
  "hotel": {
    "hotelId": "B-202",
    "name": "Royal Inn",
    "price": 90,
    "supplier": "SupplierB"
  },
  "message": "Best rate found: Royal Inn at ₹90 from SupplierB.",
  "search": {
    "city": "Mumbai",
    "checkIn": "2026-09-20",
    "checkOut": "2026-09-22"
  },
  "suppliers": [],
  "workflowSteps": []
}
```

---

# 🛑 3. Cancel Search

### Endpoint

```http
POST /api/cancel-search/:workflowId
```

Example:

```http
POST /api/cancel-search/hotel-search-123
```

Response:

```json
{
  "workflowId": "hotel-search-123",
  "status": "CANCELLED",
  "message": "Hotel search cancellation requested."
}
```

The cancellation request is sent to Temporal.

---

# 🏨 Mock Supplier APIs

The project includes two mock supplier APIs.

## Supplier A

```http
GET /supplierA/hotels
```

## Supplier B

```http
GET /supplierB/hotels
```

Both APIs accept search parameters:

```text
city
checkIn
checkOut
scenario
```

Example:

```text
/supplierA/hotels?city=Mumbai&checkIn=2026-09-20&checkOut=2026-09-22
```

---

## Supplier A Example

```json
[
  {
    "hotelId": "A-101",
    "name": "Grand Hotel",
    "price": 120,
    "supplier": "SupplierA"
  },
  {
    "hotelId": "A-102",
    "name": "City Palace Hotel",
    "price": 100,
    "supplier": "SupplierA"
  }
]
```

---

## Supplier B Example

```json
[
  {
    "hotelId": "B-101",
    "name": "Grand Hotel",
    "price": 110,
    "supplier": "SupplierB"
  },
  {
    "hotelId": "B-102",
    "name": "Royal Inn",
    "price": 90,
    "supplier": "SupplierB"
  }
]
```

---

# 🧪 Search Scenarios

The mock supplier system supports several scenarios.

Pass the scenario in the search request.

Example:

```json
{
  "city": "Mumbai",
  "checkIn": "2026-09-20",
  "checkOut": "2026-09-22",
  "scenario": "supplierATimeout"
}
```

---

## Normal Search

No scenario:

```json
{
  "city": "Mumbai",
  "checkIn": "2026-09-20",
  "checkOut": "2026-09-22"
}
```

Both suppliers return normally.

Expected:

```text
Supplier A → SUCCESS
Supplier B → SUCCESS

Cheapest → Royal Inn
Price → ₹90
```

---

## Supplier A Error

```json
{
  "scenario": "supplierAError"
}
```

Expected:

```text
Supplier A → FAILED
Supplier B → SUCCESS

        ↓

Supplier B result considered
```

---

## Supplier B Error

```json
{
  "scenario": "supplierBError"
}
```

Expected:

```text
Supplier A → SUCCESS
Supplier B → FAILED

        ↓

Supplier A result considered
```

---

## Supplier A Timeout

```json
{
  "scenario": "supplierATimeout"
}
```

Supplier A intentionally takes longer than the five-second business timeout.

Expected:

```text
Supplier A → TIMEOUT
Supplier B → SUCCESS

        ↓

Supplier B result considered
```

---

## Supplier B Timeout

```json
{
  "scenario": "supplierBTimeout"
}
```

Expected:

```text
Supplier A → SUCCESS
Supplier B → TIMEOUT

        ↓

Supplier A result considered
```

---

## Supplier A Empty

```json
{
  "scenario": "supplierAEmpty"
}
```

Expected:

```text
Supplier A → EMPTY
Supplier B → SUCCESS
```

Supplier B results are still considered.

---

## Supplier B Empty

```json
{
  "scenario": "supplierBEmpty"
}
```

Expected:

```text
Supplier A → SUCCESS
Supplier B → EMPTY
```

Supplier A results are still considered.

---

# ⚙️ Temporal Workflow

The main workflow is:

```text
hotelSearchWorkflow
```

Located at:

```text
backend/src/workflows/hotel.workflow.ts
```

The workflow is responsible for:

1. Receiving search criteria
2. Initializing workflow status
3. Calling Supplier A
4. Calling Supplier B
5. Running supplier activities concurrently
6. Applying five-second supplier timeouts
7. Handling supplier failures
8. Handling empty results
9. Collecting successful results
10. Comparing hotel prices
11. Selecting the cheapest hotel
12. Updating workflow visualization status
13. Returning the final search result

---

# 📊 Workflow Visualization

The workflow maintains steps that can be queried through Temporal.

The frontend can display states such as:

```text
PENDING
RUNNING
COMPLETED
FAILED
TIMEOUT
```

Conceptually:

```text
Search Request
      │
      ▼
Temporal Workflow
      │
 ┌────┴────┐
 ▼         ▼
Supplier A Supplier B
      │     │
      └──┬──┘
         ▼
   Compare Rates
         │
         ▼
     Best Rate
```

---

# 🔁 Retry Strategy

Supplier activities use Temporal Activity retry configuration.

The current workflow configures:

```text
Maximum Attempts: 3
```

The retry mechanism allows transient failures to be retried automatically.

Conceptually:

```text
Activity
   │
   ▼
Attempt #1
   │
   ├── Success → Continue
   │
   └── Failure
          │
          ▼
      Retry #2
          │
          ├── Success → Continue
          │
          └── Failure
                 │
                 ▼
             Retry #3
                 │
                 ├── Success
                 │
                 └── Final Failure
```

The workflow also supports marking permanent supplier errors as non-retryable through Temporal error types.

---

# ⏱️ Timeout Strategy

The application uses a **five-second business timeout** for each supplier.

```text
SUPPLIER_TIMEOUT_MS = 5000
```

The timeout is implemented inside the Temporal workflow using a cancellation scope.

Conceptually:

```text
Supplier Activity
       │
       ├───────────────┐
       │               │
       ▼               ▼
Activity Execution   5 sec Timer
       │               │
       │               ▼
       │            Timeout
       │               │
       │          Cancel Scope
       │               │
       └───────┬───────┘
               ▼
          Supplier Result
```

This allows Supplier A and Supplier B to have independent timeout handling.

---

# 🛑 Cancellation Architecture

The backend obtains a Temporal workflow handle using the workflow ID.

```text
POST /api/cancel-search/:workflowId
                │
                ▼
        Temporal Client
                │
                ▼
        Workflow Handle
                │
                ▼
          handle.cancel()
                │
                ▼
       Temporal Cancellation
```

The workflow's supplier activity execution is also cancellation-aware.

---

# 🖥️ Frontend

The React application provides:

* City input
* Check-in date
* Check-out date
* Search button
* Loading state
* Workflow status
* Supplier status
* Supplier hotel results
* Cheapest hotel
* Price display
* Error handling
* Workflow visualization
* Cancel search functionality

The frontend communicates with the backend using Axios.

---

# 🔄 Frontend Search Flow

```text
User
 │
 │ Enter city/date
 ▼
React Frontend
 │
 │ POST /api/search-hotels
 ▼
Express API
 │
 │ Start Temporal Workflow
 ▼
Temporal
 │
 ├───────────────┐
 ▼               ▼
Supplier A    Supplier B
 │               │
 └───────┬───────┘
         ▼
    Compare Rates
         │
         ▼
    Best Hotel
         │
         ▼
    PostgreSQL
         │
         ▼
React polls workflow
         │
         ▼
Display Result
```

---

# 🧪 Testing

The backend uses:

* Jest
* ts-jest
* Temporal Testing Environment

Run:

```bash
cd backend
npm test
```

The test suite covers both business logic and Temporal workflow behavior.

---

# 🔬 Test Coverage

The workflow tests cover:

### 1. Supplier A is cheaper

```text
Supplier A → lower price
Supplier B → higher price

Expected → Supplier A
```

### 2. Supplier B is cheaper

```text
Supplier A → higher price
Supplier B → lower price

Expected → Supplier B
```

### 3. Equal prices

The comparison logic provides deterministic supplier selection.

When prices are equal:

```text
Supplier A
```

is preferred.

### 4. One supplier fails

```text
Supplier A → FAILED
Supplier B → SUCCESS

Expected → Supplier B
```

### 5. Both suppliers fail

```text
Supplier A → FAILED
Supplier B → FAILED

Expected → No successful hotel
```

### 6. One supplier returns empty results

```text
Supplier A → EMPTY
Supplier B → SUCCESS

Expected → Supplier B
```

### 7. Both suppliers return empty results

```text
Supplier A → EMPTY
Supplier B → EMPTY

Expected → No hotels found
```

### 8. Supplier timeout

```text
Supplier A → TIMEOUT
Supplier B → SUCCESS

Expected → Supplier B
```

### 9. Activity retry

The workflow verifies that a transient supplier failure can succeed after retry attempts.

```text
Attempt 1 → Failure
Attempt 2 → Failure
Attempt 3 → Success
```

### 10. Workflow cancellation

The workflow can be cancelled while supplier activities are running.

---

# ✅ Current Test Status

The current backend test suite contains **14 tests**, covering comparison logic and Temporal workflow scenarios.

Current status:

```text
14 Tests
14 Passed
0 Failed
```

The timeout and cancellation behavior has been tested using Temporal's test workflow environment.

---

# 🛠️ Useful Commands

## Start Docker

```bash
docker compose up -d
```

## Stop Docker

```bash
docker compose down
```

## Stop Docker and remove volumes

⚠️ This deletes PostgreSQL data stored in Docker volumes.

```bash
docker compose down -v
```

## View containers

```bash
docker ps
```

## View Temporal logs

```bash
docker logs hotel-temporal
```

## View application PostgreSQL logs

```bash
docker logs hotel-postgres
```

## View Temporal PostgreSQL logs

```bash
docker logs hotel-temporal-postgres
```

## Backend development

```bash
cd backend
npm run dev
```

## Temporal Worker

```bash
cd backend
npm run worker
```

## Build backend

```bash
cd backend
npm run build
```

## Run tests

```bash
cd backend
npm test
```

---

# 🩺 Troubleshooting

## Backend returns 404 for `/api/search-hotels`

Make sure `server.ts` mounts the search routes using:

```typescript
app.use("/api", searchRoutes);
```

The route file contains:

```typescript
router.post("/search-hotels", ...)
```

Therefore the final endpoint becomes:

```text
POST /api/search-hotels
```

Do not mount the router without `/api`.

---

## Frontend cannot connect to backend

Verify:

```text
http://localhost:5000/health
```

Expected:

```json
{
  "status": "OK"
}
```

Also verify the frontend API URL:

```text
http://localhost:5000
```

The frontend currently runs on:

```text
http://localhost:5174
```

and the backend CORS configuration should allow:

```text
http://localhost:5173
http://localhost:5174
```

---

## PostgreSQL connection error

Check:

```bash
docker ps
```

Make sure:

```text
hotel-postgres
```

is running.

The correct application database connection is:

```env
DATABASE_URL=postgresql://hotel_user:hotel_password@localhost:5434/hotel_db
```

Remember:

```text
Host Port: 5434
Container Port: 5432
```

---

## Temporal connection error

Check:

```bash
docker ps
```

Make sure:

```text
hotel-temporal
```

is running.

Verify:

```env
TEMPORAL_ADDRESS=localhost:7233
```

---

## Worker is not processing workflows

Start the worker:

```bash
cd backend
npm run worker
```

Verify the task queue:

```env
TEMPORAL_TASK_QUEUE=HOTEL_TASK_QUEUE
```

The workflow and worker must use the same task queue.

---

## Temporal UI unavailable

Check:

```bash
docker logs hotel-temporal-ui
```

Open:

```text
http://localhost:8080
```

---

## Port 5434 already in use

Change the host port in:

```text
docker-compose.yml
```

For example:

```yaml
ports:
  - "5435:5432"
```

Then update:

```env
DATABASE_URL=postgresql://hotel_user:hotel_password@localhost:5435/hotel_db
```

---

## Port 5000 already in use

Change:

```env
PORT=5000
```

to:

```env
PORT=5001
```

Then update the frontend API URL accordingly.

---

# 📊 Complete Request Lifecycle

```text
                         USER
                           │
                           ▼
                 ┌──────────────────┐
                 │  React Frontend  │
                 └────────┬─────────┘
                          │
                    POST Search
                          │
                          ▼
                 ┌──────────────────┐
                 │   Express API    │
                 └────────┬─────────┘
                          │
                    Start Workflow
                          │
                          ▼
                 ┌──────────────────┐
                 │ Temporal Server  │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ Temporal Worker  │
                 └────────┬─────────┘
                          │
                   Parallel Activities
                     ┌────┴────┐
                     ▼         ▼
                 Supplier A Supplier B
                     │         │
                     └────┬────┘
                          │
                          ▼
                   Compare Results
                          │
                          ▼
                    Cheapest Hotel
                          │
                          ▼
                     PostgreSQL
                          │
                          ▼
                  Workflow Complete
                          │
                          ▼
                  React Polls Status
                          │
                          ▼
                    Display Result
```

---

# 🔐 Production Considerations

This project currently uses mock supplier APIs for demonstration.

A production implementation should additionally consider:

* Authentication and authorization
* HTTPS
* API rate limiting
* Redis caching
* Real supplier APIs
* Secret management
* Database connection pooling
* Structured logging
* Distributed tracing
* Monitoring and alerting
* Request correlation IDs
* Circuit breakers
* Supplier-specific retry policies
* Idempotency
* Production Temporal cluster
* Kubernetes deployment
* CI/CD pipeline
* Automated database migrations
* Centralized error handling

---

# 🚀 Future Improvements

## 🔹 More Suppliers

Add:

```text
Supplier C
Supplier D
Supplier E
```

The workflow could dynamically execute all supplier activities in parallel.

---

## 🔹 Redis Caching

Frequently requested searches could be cached:

```text
React
  ↓
API
  ↓
Redis
  ↓
Temporal
  ↓
Suppliers
```

---

## 🔹 Authentication

Add JWT-based authentication and user-specific search history.

---

## 🔹 Search History

Allow users to view:

```text
Previous Searches
       ↓
Search Details
       ↓
Best Hotel
       ↓
Price
       ↓
Supplier
```

---

## 🔹 Advanced Filtering

Potential filters:

* Maximum price
* Hotel rating
* Amenities
* Room type
* Cancellation policy
* Number of guests

---

## 🔹 Real Supplier APIs

Replace the mock supplier routes with real hotel supplier integrations.

---

## 🔹 Observability

Add:

* OpenTelemetry
* Prometheus
* Grafana
* Structured logging
* Distributed tracing

---

# 🎯 Learning Outcomes

This project demonstrates practical knowledge of several important engineering concepts.

## Backend Development

* REST APIs
* Express.js
* TypeScript
* Axios
* Async programming
* Error handling
* API polling
* CORS

## Distributed Systems

* Parallel execution
* Failure isolation
* Timeouts
* Retries
* Cancellation
* Workflow orchestration
* Asynchronous processing

## Temporal

* Workflows
* Activities
* Workers
* Task queues
* Workflow execution
* Activity retries
* Activity cancellation
* Workflow cancellation
* Workflow queries
* Temporal testing

## Database

* PostgreSQL
* Connection pooling
* SQL
* Unique constraints
* Indexes
* Persistent search results

## Frontend

* React
* TypeScript
* Axios
* API polling
* Loading states
* Error handling
* Workflow visualization

## DevOps

* Docker
* Docker Compose
* PostgreSQL containers
* Temporal infrastructure
* Service dependencies
* Health checks

## Testing

* Jest
* Unit testing
* Workflow testing
* Failure scenarios
* Timeout testing
* Retry testing
* Cancellation testing

---

# 📌 Quick Start

For someone cloning the repository:

## 1. Clone

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>

cd HotelRateComparatorProject
```

## 2. Start infrastructure

```bash
docker compose up -d
```

## 3. Install backend

```bash
cd backend
npm install
```

## 4. Configure `.env`

Create:

```text
backend/.env
```

Add:

```env
PORT=5000

DATABASE_URL=postgresql://hotel_user:hotel_password@localhost:5434/hotel_db

TEMPORAL_ADDRESS=localhost:7233

TEMPORAL_TASK_QUEUE=HOTEL_TASK_QUEUE
```

## 5. Start backend

```bash
npm run dev
```

## 6. Start Temporal Worker

Open another terminal:

```bash
cd backend
npm run worker
```

## 7. Install frontend

Open another terminal:

```bash
cd frontend
npm install
```

## 8. Start frontend

```bash
npm run dev
```

## 9. Open application

```text
http://localhost:5174
```

## 10. Monitor Temporal

```text
http://localhost:8080
```

---

# 📝 Environment Variables

The backend uses:

```env
PORT=5000

DATABASE_URL=postgresql://hotel_user:hotel_password@localhost:5434/hotel_db

TEMPORAL_ADDRESS=localhost:7233

TEMPORAL_TASK_QUEUE=HOTEL_TASK_QUEUE
```

Never commit production credentials to GitHub.

Recommended `.gitignore`:

```gitignore
.env
node_modules/
dist/
coverage/
```

---

# 📄 License

This project is intended for educational, portfolio, and demonstration purposes.

You may modify and extend the project for your own learning and development.

---

# 👨‍💻 Author

**Nikhil Dadhich**

Full Stack Developer
React | Node.js | TypeScript | PostgreSQL | Temporal

---

# ⭐ If You Like This Project

If this project helped you understand **Temporal Workflows, distributed systems, asynchronous APIs, fault-tolerant backend architecture, and workflow orchestration**, consider giving the repository a ⭐ on GitHub.

---

# 💡 Project Highlights for Recruiters

> **Hotel Rate Comparator** is a full-stack distributed application that uses Temporal to orchestrate parallel hotel supplier searches.

The project demonstrates:

* Parallel supplier execution
* Supplier-level timeout handling
* Activity retries
* Failure isolation
* Workflow cancellation
* PostgreSQL persistence
* Asynchronous API design
* React polling
* Live workflow status visualization
* Unit and workflow testing
* Docker-based infrastructure

### Core Architecture

```text
React
  ↓
Node.js / Express
  ↓
Temporal Workflow
  ↓
Parallel Activities
  ├── Supplier A
  └── Supplier B
  ↓
Timeout / Retry / Failure Handling
  ↓
Rate Comparison
  ↓
Best Hotel
  ↓
PostgreSQL
  ↓
React Result
```

### Key Engineering Idea

The important architectural decision is that the API does not synchronously wait for every supplier.

Instead:

```text
Client
  │
  │ Start Search
  ▼
Express API
  │
  │ Start Workflow
  ▼
Temporal
  │
  ├──────────────┐
  ▼              ▼
Supplier A    Supplier B
  │              │
  └──────┬───────┘
         ▼
    Compare Rates
         │
         ▼
     Best Hotel
         │
         ▼
    Persist Result
         │
         ▼
    Client Polls
```

This architecture makes the application more resilient to slow, failed, or temporarily unavailable suppliers.
