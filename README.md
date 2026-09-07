# 🏨 Hotel Rate Comparator

A production-style **Hotel Rate Comparator** built with **React, Node.js, TypeScript, PostgreSQL, and Temporal Workflows**.

The application searches multiple hotel suppliers **in parallel**, handles supplier failures and timeouts, compares available hotel rates, and returns the **cheapest available hotel**.

The project demonstrates real-world concepts such as:

* ⚡ Parallel supplier execution
* 🔄 Durable Temporal Workflows
* ⏱️ Supplier timeout handling
* 🔁 Activity retries
* ❌ Failure isolation
* 🛑 Workflow cancellation
* 🗄️ PostgreSQL persistence
* 🧪 Unit and workflow testing
* 🐳 Docker-based infrastructure
* 📡 Asynchronous API design
* ⚛️ React frontend integration

---

## 📌 Table of Contents

* [Overview](#-overview)
* [Key Features](#-key-features)
* [Architecture](#-architecture)
* [Technology Stack](#-technology-stack)
* [Project Structure](#-project-structure)
* [How the System Works](#-how-the-system-works)
* [Prerequisites](#-prerequisites)
* [Installation](#-installation)
* [Environment Variables](#-environment-variables)
* [Running the Project](#-running-the-project)
* [Docker Services](#-docker-services)
* [API Documentation](#-api-documentation)
* [Search Scenarios](#-search-scenarios)
* [Temporal Workflow](#-temporal-workflow)
* [Timeout and Retry Strategy](#-timeout-and-retry-strategy)
* [Cancellation](#-cancellation)
* [Database](#-database)
* [Testing](#-testing)
* [Frontend](#-frontend)
* [Troubleshooting](#-troubleshooting)
* [Future Improvements](#-future-improvements)
* [Learning Outcomes](#-learning-outcomes)
* [Author](#-author)

---

# 📖 Overview

The **Hotel Rate Comparator** simulates a hotel search platform that communicates with multiple external hotel suppliers.

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
             ┌───────────────┐
             │ Hotel Search  │
             └───────┬───────┘
                     │
              Temporal Workflow
                     │
          ┌──────────┴──────────┐
          ↓                     ↓
   ┌──────────────┐      ┌──────────────┐
   │ Supplier A   │      │ Supplier B   │
   │   Activity   │      │   Activity   │
   └──────┬───────┘      └──────┬───────┘
          │                     │
          └──────────┬──────────┘
                     ↓
             Compare Hotel Rates
                     ↓
              Cheapest Hotel
```

This approach improves response time and provides resilience when one supplier becomes slow or unavailable.

---

# ✨ Key Features

## 🔎 Multi-Supplier Hotel Search

The system queries:

* Supplier A
* Supplier B

in parallel.

Each supplier returns mock hotel data containing:

* Hotel ID
* Hotel name
* Price
* Supplier name

---

## ⚡ Parallel Execution

Temporal executes both supplier activities concurrently.

```text
                    Search Request
                         │
                         ▼
                 Temporal Workflow
                    /          \
                   /            \
                  ▼              ▼
          Supplier A        Supplier B
          Activity          Activity
              │                 │
              └───────┬─────────┘
                      ▼
                Compare Prices
                      │
                      ▼
                Cheapest Hotel
```

---

## 💰 Cheapest Hotel Selection

All supplier results are combined and sorted by price.

Example:

| Hotel             | Supplier   |   Price |
| ----------------- | ---------- | ------: |
| Grand Hotel       | Supplier A |    $120 |
| City Palace Hotel | Supplier A |    $100 |
| Grand Hotel       | Supplier B |    $110 |
| Royal Inn         | Supplier B | **$90** |

Result:

```text
Royal Inn
$90
Supplier B
```

---

# 🛡️ Fault Tolerance

The workflow does not immediately fail when one supplier fails.

For example:

```text
Supplier A → ERROR
Supplier B → SUCCESS
                    ↓
             Return Supplier B
```

If both suppliers fail:

```text
Supplier A → ERROR
Supplier B → ERROR
                    ↓
        Both suppliers failed
```

---

# ⏱️ Supplier Timeout

Each supplier has a business timeout of:

```text
5 seconds
```

If a supplier does not respond within 5 seconds, the workflow treats that supplier as failed.

Example:

```text
Supplier A
    │
    ├── 0s
    ├── 1s
    ├── 2s
    ├── 3s
    ├── 4s
    └── 5s → TIMEOUT
```

The other supplier can still provide results.

---

# 🔄 Retry Mechanism

Temporal Activity retries are configured for transient failures.

Example configuration:

```text
Maximum attempts: 3
Initial interval: 100 ms
Maximum interval: 500 ms
Backoff coefficient: 2
```

Conceptually:

```text
Attempt 1
   ↓
Failure
   ↓
100 ms
   ↓
Attempt 2
   ↓
Failure
   ↓
200 ms
   ↓
Attempt 3
```

Permanent errors can be configured as non-retryable.

---

# 🛑 Workflow Cancellation

A running hotel search can be cancelled.

```text
Frontend
   │
   │ POST /api/cancel-search/:workflowId
   ▼
Backend
   │
   ▼
Temporal
   │
   ▼
Cancel Workflow
```

This is useful for long-running searches or when the user no longer needs the result.

---

# 🏗️ Architecture

```text
┌─────────────────────────────────────────────────────┐
│                     React Frontend                  │
│                                                     │
│  Search Form → Search Status → Hotel Result         │
└───────────────────────┬─────────────────────────────┘
                        │ HTTP
                        ▼
┌─────────────────────────────────────────────────────┐
│                 Node.js / Express API               │
│                                                     │
│  POST /api/search-hotels                            │
│  GET  /api/search-hotels/:workflowId                │
│  POST /api/cancel-search/:workflowId                │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
              ┌────────────────────┐
              │ Temporal Server    │
              │                    │
              │ Workflow Engine    │
              └─────────┬──────────┘
                        │
                        ▼
              ┌────────────────────┐
              │ Temporal Worker    │
              └─────────┬──────────┘
                        │
                 ┌──────┴──────┐
                 ▼             ▼
          Supplier A       Supplier B
             API              API
                 │             │
                 └──────┬──────┘
                        ▼
                 Compare Results
                        │
                        ▼
                 Cheapest Hotel
                        │
                        ▼
                 PostgreSQL DB
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
│   │   │   └── postgres.ts
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

## Step 1 — User submits search

The React application sends:

```http
POST /api/search-hotels
```

with:

```json
{
  "city": "Mumbai",
  "checkIn": "2026-09-10",
  "checkOut": "2026-09-12"
}
```

---

## Step 2 — Backend starts Temporal Workflow

The Express API creates a Temporal workflow.

Instead of waiting for the complete search, the API immediately returns:

```json
{
  "workflowId": "hotel-search-123",
  "status": "RUNNING",
  "message": "Hotel search started"
}
```

This makes the API asynchronous.

---

## Step 3 — Temporal executes supplier activities

The workflow executes:

```text
fetchSupplierA()
fetchSupplierB()
```

in parallel.

---

## Step 4 — Supplier results are collected

Example:

```json
[
  {
    "hotelId": "A-101",
    "name": "Grand Hotel",
    "price": 120,
    "supplier": "SupplierA"
  }
]
```

---

## Step 5 — Results are compared

The comparison service combines the results:

```text
Supplier A Results
+
Supplier B Results
        ↓
Compare Prices
        ↓
Cheapest Hotel
```

---

## Step 6 — Frontend polls workflow status

The frontend calls:

```http
GET /api/search-hotels/:workflowId
```

until the workflow is complete.

---

## Step 7 — Final result

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
  "message": "Hotel found successfully"
}
```

---

# 💻 Prerequisites

Before running the project, install:

### Node.js

Recommended:

```text
Node.js 20+
```

Check:

```bash
node -v
```

and:

```bash
npm -v
```

---

### Docker Desktop

Install Docker Desktop and verify:

```bash
docker --version
```

and:

```bash
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

Navigate to backend:

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

Add:

```env
PORT=5000

TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=HOTEL_TASK_QUEUE

DATABASE_URL=postgresql://hotel_user:hotel_password@localhost:5432/hotel_db
```

---

# 🎨 Frontend Setup

Open another terminal.

Navigate to:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

---

# 🐳 Start Docker Services

From the project root:

```bash
docker compose up -d
```

Check running containers:

```bash
docker ps
```

You should see services similar to:

```text
hotel-postgres
hotel-temporal-postgres
hotel-temporal
hotel-temporal-ui
```

---

# 🗄️ PostgreSQL Setup

The application PostgreSQL database runs on:

```text
localhost:5432
```

Database:

```text
hotel_db
```

Username:

```text
hotel_user
```

Password:

```text
hotel_password
```

Create the hotel search table:

```sql
CREATE TABLE hotel_searches (
    id SERIAL PRIMARY KEY,
    city VARCHAR(100) NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    hotel_id VARCHAR(100),
    hotel_name VARCHAR(255),
    price DECIMAL(10, 2),
    supplier VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Add workflow ID:

```sql
ALTER TABLE hotel_searches
ADD COLUMN IF NOT EXISTS workflow_id VARCHAR(255);
```

Create a unique index:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS
idx_hotel_searches_workflow_id
ON hotel_searches(workflow_id);
```

---

# ▶️ Running the Project

You need **three terminals**.

---

## Terminal 1 — Backend API

```bash
cd backend
npm run dev
```

Expected:

```text
Server running on port 5000
PostgreSQL connected
```

Test:

```text
http://localhost:5000
```

You should receive:

```json
{
  "message": "Hotel Rate Comparator API is running"
}
```

Health check:

```text
http://localhost:5000/health
```

---

# Terminal 2 — Temporal Worker

Open another terminal:

```bash
cd backend
npm run worker
```

Expected:

```text
Temporal Worker started
```

Keep this terminal running.

The worker is responsible for executing Temporal workflows and activities.

---

# Terminal 3 — React Frontend

Open another terminal:

```bash
cd frontend
```

Run:

```bash
npm run dev
```

Vite should display something similar to:

```text
Local: http://localhost:5173/
```

Open:

```text
http://localhost:5173
```

---

# 🐳 Docker Services

The project uses Docker Compose for infrastructure.

| Service             | Port | Purpose              |
| ------------------- | ---: | -------------------- |
| PostgreSQL          | 5432 | Application database |
| Temporal PostgreSQL | 5433 | Temporal persistence |
| Temporal Server     | 7233 | Workflow engine      |
| Temporal UI         | 8080 | Workflow monitoring  |

---

# 🔍 Temporal UI

Open:

```text
http://localhost:8080
```

The Temporal UI allows you to monitor:

* Workflow executions
* Workflow status
* Workflow IDs
* Activity executions
* Retries
* Failures
* Execution history
* Cancellation

---

# 📡 API Documentation

## Start Hotel Search

### Endpoint

```http
POST /api/search-hotels
```

### Request

```json
{
  "city": "Mumbai",
  "checkIn": "2026-09-10",
  "checkOut": "2026-09-12"
}
```

### Response

```json
{
  "workflowId": "hotel-search-123",
  "status": "RUNNING",
  "message": "Hotel search started"
}
```

---

# 🔎 Get Search Status

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
  "message": "Hotel search is still running"
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
  "message": "Hotel found successfully"
}
```

---

# 🛑 Cancel Search

### Endpoint

```http
POST /api/cancel-search/:workflowId
```

Example:

```http
POST /api/cancel-search/hotel-search-123
```

This requests cancellation of the Temporal workflow.

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

Example response:

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

# 🧪 Search Scenarios

The mock supplier APIs support different scenarios for testing.

Pass the scenario in the search request:

```json
{
  "city": "Mumbai",
  "checkIn": "2026-09-10",
  "checkOut": "2026-09-12",
  "scenario": "supplierAError"
}
```

---

## Normal Search

```text
scenario:
```

Both suppliers return results.

Expected:

```text
Cheapest hotel = Royal Inn
Price = $90
```

---

## Supplier A Error

```json
{
  "scenario": "supplierAError"
}
```

Expected behavior:

```text
Supplier A → ERROR
Supplier B → SUCCESS
                   ↓
          Return Supplier B
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
Supplier B → ERROR
                   ↓
          Return Supplier A
```

---

## Supplier A Timeout

```json
{
  "scenario": "supplierATimeout"
}
```

Supplier A intentionally takes more than 5 seconds.

Expected:

```text
Supplier A → TIMEOUT
Supplier B → SUCCESS
                   ↓
          Return Supplier B
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
          Return Supplier A
```

---

## Both Suppliers Fail

Use:

```text
supplierAError
```

and configure the second supplier accordingly if testing a both-failure case.

Expected:

```text
Supplier A → ERROR
Supplier B → ERROR
                   ↓
        Both hotel suppliers failed
```

---

## Empty Supplier Response

Supplier A:

```json
{
  "scenario": "supplierAEmpty"
}
```

Supplier B:

```json
{
  "scenario": "supplierBEmpty"
}
```

Expected:

```text
No hotels found
```

---

# ⚙️ Temporal Workflow

The main workflow is:

```text
hotelSearchWorkflow
```

Location:

```text
backend/src/workflows/hotel.workflow.ts
```

The workflow is responsible for:

1. Receiving search criteria
2. Calling Supplier A
3. Calling Supplier B
4. Executing suppliers concurrently
5. Applying timeout logic
6. Handling failures
7. Collecting successful results
8. Comparing prices
9. Returning the cheapest hotel

---

# 🔁 Activity Retry Strategy

Temporal activities use retry configuration.

```text
Maximum attempts: 3
Initial interval: 100ms
Maximum interval: 500ms
Backoff coefficient: 2
```

The retry mechanism protects against temporary failures.

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
```

---

# ⏱️ Timeout Architecture

There are two different timeout concepts.

### Business Timeout

```text
5 seconds
```

This is the maximum time allowed for a supplier response.

### Activity Timeout

Configured at the Temporal activity level:

```text
10 seconds
```

The 5-second workflow timeout is intentionally shorter and represents the application's business requirement.

---

# 🧪 Testing

Backend tests are located at:

```text
backend/src/tests/
```

Run:

```bash
cd backend
npm test
```

The project uses:

* Jest
* ts-jest
* Temporal Testing Environment

---

# 🔬 Test Coverage

The test suite covers scenarios such as:

### 1. Supplier A is cheaper

```text
Supplier A = $80
Supplier B = $90

Expected → Supplier A
```

### 2. Supplier B is cheaper

```text
Supplier A = $100
Supplier B = $90

Expected → Supplier B
```

### 3. Equal prices

The comparison logic provides deterministic supplier selection when prices are equal.

### 4. Empty results

```text
Supplier A = []
Supplier B = []
```

Expected:

```text
No hotels found
```

### 5. Supplier A failure

Expected:

```text
Supplier B result is returned
```

### 6. Supplier B failure

Expected:

```text
Supplier A result is returned
```

### 7. Both suppliers fail

Expected:

```text
Both hotel suppliers failed
```

### 8. Supplier timeout

Expected:

```text
Timed-out supplier is treated as failed
```

### 9. Workflow cancellation

Expected:

```text
Workflow becomes canceled
```

---

# 🖥️ Frontend

The React frontend provides:

* City input
* Check-in date
* Check-out date
* Search button
* Workflow status
* Loading state
* Cheapest hotel result
* Supplier information
* Price display
* Cancel search functionality

The frontend communicates with the backend using Axios.

---

# 🔄 Frontend Search Flow

```text
User
 │
 │ Enter city/date
 ▼
React
 │
 │ POST /api/search-hotels
 ▼
Express
 │
 │ Start Workflow
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
     Save Result
         │
         ▼
React polls status
         │
         ▼
Display cheapest hotel
```

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

## Stop and remove volumes

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

## View PostgreSQL logs

```bash
docker logs hotel-postgres
```

## View Temporal PostgreSQL logs

```bash
docker logs hotel-temporal-postgres
```

---

# 🩺 Troubleshooting

## Backend cannot connect to PostgreSQL

Check:

```bash
docker ps
```

Make sure:

```text
hotel-postgres
```

is running.

Verify `.env`:

```env
DATABASE_URL=postgresql://hotel_user:hotel_password@localhost:5432/hotel_db
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

## Worker is not starting

Run:

```bash
cd backend
npm run worker
```

Expected:

```text
Temporal Worker started
```

Also verify that the Temporal server is running.

---

## Frontend cannot call backend

Verify the backend is running:

```text
http://localhost:5000/health
```

Expected:

```json
{
  "status": "OK"
}
```

Also verify the frontend API URL points to:

```text
http://localhost:5000
```

---

## Port 5432 already in use

Check which application is using port 5432.

Alternatively, change the Docker port mapping:

```yaml
ports:
  - "5434:5432"
```

Then update the database connection accordingly.

---

## Port 5000 already in use

Change:

```env
PORT=5000
```

to another port such as:

```env
PORT=5001
```

If you change the backend port, also update the frontend API URL.

---

## Temporal UI is unavailable

Check:

```bash
docker logs hotel-temporal-ui
```

The UI should be available at:

```text
http://localhost:8080
```

---

# 📊 Complete Request Lifecycle

```text
                    USER
                      │
                      ▼
              ┌───────────────┐
              │ React Frontend│
              └───────┬───────┘
                      │
                POST Search
                      │
                      ▼
              ┌───────────────┐
              │ Express API   │
              └───────┬───────┘
                      │
               Start Workflow
                      │
                      ▼
              ┌───────────────┐
              │    Temporal   │
              │    Workflow   │
              └───────┬───────┘
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
              React Gets Result
                      │
                      ▼
                 Display UI
```

---

# 🔐 Production Considerations

This project uses mock suppliers for demonstration.

For production, the following improvements would be recommended:

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

---

# 🚀 Future Improvements

Potential enhancements include:

### 🔹 More Suppliers

Add:

```text
Supplier C
Supplier D
Supplier E
```

and compare all results.

### 🔹 Redis Caching

Cache frequently requested searches.

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

### 🔹 Authentication

Add JWT authentication for users.

### 🔹 Search History

Allow users to view previous searches.

### 🔹 Advanced Filtering

Add:

* Maximum price
* Hotel rating
* Amenities
* Room type
* Cancellation policy

### 🔹 Real Supplier APIs

Replace mock APIs with real hotel supplier integrations.

### 🔹 Observability

Add:

* OpenTelemetry
* Prometheus
* Grafana
* Structured logs

---

# 🎯 Learning Outcomes

This project demonstrates practical understanding of:

### Backend Development

* REST APIs
* Express.js
* TypeScript
* Axios
* Error handling
* Async programming

### Distributed Systems

* Parallel execution
* Timeouts
* Retries
* Failure isolation
* Cancellation
* Workflow orchestration

### Temporal

* Workflows
* Activities
* Workers
* Task queues
* Workflow execution
* Activity retries
* Cancellation
* Testing

### Database

* PostgreSQL
* Connection pooling
* SQL tables
* Indexes
* Persistent search results

### Frontend

* React
* TypeScript
* Axios
* API polling
* Loading states
* Error handling

### DevOps

* Docker
* Docker Compose
* Service dependencies
* Health checks

### Testing

* Jest
* Unit testing
* Workflow testing
* Failure scenarios
* Timeout testing
* Cancellation testing

---

# 📌 Quick Start

For someone cloning the repository, the shortest setup is:

### 1. Clone

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd HotelRateComparatorProject
```

### 2. Start infrastructure

```bash
docker compose up -d
```

### 3. Install backend

```bash
cd backend
npm install
```

### 4. Configure `.env`

```env
PORT=5000
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=HOTEL_TASK_QUEUE
DATABASE_URL=postgresql://hotel_user:hotel_password@localhost:5432/hotel_db
```

### 5. Start backend

```bash
npm run dev
```

### 6. Start Temporal Worker

Open another terminal:

```bash
cd backend
npm run worker
```

### 7. Install frontend

Open another terminal:

```bash
cd frontend
npm install
```

### 8. Start frontend

```bash
npm run dev
```

### 9. Open application

```text
http://localhost:5173
```

### 10. Monitor Temporal

```text
http://localhost:8080
```

---

# 📝 Environment Variables

Backend `.env`:

```env
PORT=5000

TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=HOTEL_TASK_QUEUE

DATABASE_URL=postgresql://hotel_user:hotel_password@localhost:5432/hotel_db
```

> Never commit `.env` files containing production credentials to GitHub.

Add to `.gitignore`:

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

Full Stack Developer | React | Node.js | TypeScript | PostgreSQL | Temporal

---

## ⭐ If You Like This Project

If this project helped you understand **Temporal Workflows, distributed systems, asynchronous APIs, and fault-tolerant backend architecture**, consider giving the repository a ⭐ on GitHub.

---

## 💡 Project Highlights for Recruiters

> **Hotel Rate Comparator** is a full-stack distributed application that uses Temporal to orchestrate parallel hotel supplier searches. It demonstrates fault-tolerant workflow execution with supplier-level timeouts, retries, failure isolation, cancellation, PostgreSQL persistence, and a React-based asynchronous polling interface.

**Core engineering concepts demonstrated:**

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
Failure / Timeout / Retry Handling
  ↓
Rate Comparison
  ↓
PostgreSQL
  ↓
React Result
```
