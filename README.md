# 🏨 Hotel Rate Comparator

A full-stack hotel search application built with **React, Node.js, TypeScript, PostgreSQL, and Temporal.io**.

The application searches for hotel rates from multiple suppliers simultaneously, handles supplier failures and retries using Temporal workflows, and returns the best available hotel rate.

---

## 🚀 Features

* 🔍 Search hotels by city and travel dates
* ⚡ Fetch hotel data from multiple suppliers in parallel
* 💰 Automatically select the cheapest hotel
* ⚖️ Deterministic selection when hotel prices are equal
* 🔄 Retry failed supplier requests using Temporal
* ❌ Handle supplier failures gracefully
* 📭 Handle empty supplier responses
* 🧪 Unit and Temporal workflow testing
* 🗄️ PostgreSQL integration
* 🎨 React frontend with TypeScript
* ⏳ Loading and error states

---

## 🛠️ Tech Stack

### Frontend

* React
* TypeScript
* Axios
* CSS

### Backend

* Node.js
* Express.js
* TypeScript

### Workflow Orchestration

* Temporal.io
* Temporal TypeScript SDK

### Database

* PostgreSQL

### Testing

* Jest
* Temporal Testing Environment

### Infrastructure

* Docker
* Docker Compose

---

# 🏗️ System Architecture

```text
                         ┌─────────────────────┐
                         │   React Frontend    │
                         │                     │
                         │  Hotel Search Form  │
                         └──────────┬──────────┘
                                    │
                                    │ HTTP Request
                                    ▼
                         ┌─────────────────────┐
                         │   Express Backend   │
                         │   Node.js + TS      │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Temporal Client   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │  Temporal Workflow  │
                         │                     │
                         │ Hotel Search Flow   │
                         └──────────┬──────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     │                             │
                     ▼                             ▼
            ┌────────────────┐            ┌────────────────┐
            │   Supplier A   │            │   Supplier B   │
            │   Activity     │            │   Activity     │
            └────────┬───────┘            └────────┬───────┘
                     │                             │
                     └──────────────┬──────────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ Compare Hotel Rates │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │  Cheapest Hotel     │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   React Frontend    │
                         └─────────────────────┘
```

---

# 📂 Project Structure

```text
HotelRateComparatorProject/
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
│   └── tsconfig.json
│
├── frontend/
│   │
│   ├── src/
│   │   ├── services/
│   │   │   └── api.ts
│   │   │
│   │   ├── App.tsx
│   │   ├── App.css
│   │   └── main.tsx
│   │
│   ├── package.json
│   └── vite.config.ts
│
├── docker-compose.yml
│
└── README.md
```

---

# 🔄 How It Works

The application follows the workflow below:

```text
User
 │
 │ Enter city and travel dates
 ▼
React Frontend
 │
 │ POST /api/search-hotels
 ▼
Express Backend
 │
 │ Start Workflow
 ▼
Temporal Workflow
 │
 ├───────────────┐
 │               │
 ▼               ▼
Supplier A     Supplier B
 │               │
 │ Parallel API Calls
 └───────┬───────┘
         │
         ▼
  Collect Results
         │
         ▼
 Compare Prices
         │
         ▼
 Select Cheapest
         │
         ▼
 Return API Response
         │
         ▼
 React UI
```

---

# ⚙️ Prerequisites

Make sure the following software is installed on your system:

* Node.js
* npm
* Docker Desktop
* PostgreSQL

Check your installation:

```bash
node --version
npm --version
docker --version
```

---

# 📥 Installation

## 1. Clone the Repository

```bash
git clone <your-repository-url>
```

Navigate into the project:

```bash
cd HotelRateComparatorProject
```

---

# 🐳 Start Temporal and PostgreSQL

From the project root directory:

```bash
docker-compose up -d
```

Check running containers:

```bash
docker ps
```

You should see the PostgreSQL and Temporal-related services configured in your Docker Compose setup.

---

# 🔧 Backend Setup

Navigate to the backend folder:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

---

## Environment Variables

Create a `.env` file inside the `backend` folder.

Example:

```env
PORT=5000

DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=hotel_db
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

TEMPORAL_ADDRESS=localhost:7233
```

> Update these values according to your local Docker and PostgreSQL configuration.

---

## Start the Backend Server

Run:

```bash
npm run dev
```

The backend should start on:

```text
http://localhost:5000
```

---

# ⚙️ Start the Temporal Worker

Open another terminal.

Navigate to the backend folder:

```bash
cd backend
```

Start the Temporal Worker:

```bash
npm run worker
```

The worker is responsible for executing:

* Temporal Workflows
* Temporal Activities
* Supplier requests
* Retry operations

---

# 💻 Frontend Setup

Open another terminal.

Navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the React application:

```bash
npm run dev
```

The frontend will typically be available at:

```text
http://localhost:5173
```

---

# 🔌 API Endpoints

## Search Hotels

### Endpoint

```http
POST /api/search-hotels
```

### Request Body

```json
{
  "city": "Mumbai",
  "checkIn": "2026-10-10",
  "checkOut": "2026-10-12"
}
```

### Successful Response

```json
{
  "workflowId": "hotel-search-example",
  "hotel": {
    "hotelId": "A1",
    "name": "Hotel Paradise",
    "price": 80,
    "supplier": "SupplierA"
  },
  "message": "Hotel found successfully"
}
```

---

# 🏨 Mock Supplier APIs

The application uses two mock hotel suppliers.

## Supplier A

```http
GET /supplierA/hotels
```

Example response:

```json
[
  {
    "hotelId": "A1",
    "name": "Hotel Paradise",
    "price": 80
  }
]
```

---

## Supplier B

```http
GET /supplierB/hotels
```

Example response:

```json
[
  {
    "hotelId": "B1",
    "name": "Royal Inn",
    "price": 90
  }
]
```

The mock supplier APIs can simulate different scenarios, including:

* Successful responses
* Empty responses
* Server errors
* Temporary failures
* Delayed responses

---

# 🧠 Temporal Workflow

The Temporal workflow calls both suppliers in parallel.

Conceptually:

```ts
const results = await Promise.allSettled([
  fetchSupplierA(search),
  fetchSupplierB(search),
]);
```

The workflow then:

1. Collects the supplier responses.
2. Handles failed suppliers.
3. Processes successful responses.
4. Compares hotel prices.
5. Selects the cheapest hotel.
6. Returns the result to the backend.

---

# 💰 Hotel Selection Rules

| Scenario                           | Expected Result          |
| ---------------------------------- | ------------------------ |
| Supplier A is cheaper              | Select Supplier A        |
| Supplier B is cheaper              | Select Supplier B        |
| Both suppliers have the same price | Select Supplier A        |
| Supplier A fails                   | Use Supplier B           |
| Supplier B fails                   | Use Supplier A           |
| Both suppliers fail                | Return failure message   |
| Supplier A returns empty data      | Use Supplier B           |
| Supplier B returns empty data      | Use Supplier A           |
| Both suppliers return empty data   | Return `No hotels found` |

---

# 🔄 Retry Mechanism

Temporal automatically retries temporary activity failures.

Example configuration:

```ts
retry: {
  maximumAttempts: 3,
  initialInterval: "1 second",
  maximumInterval: "2 seconds",
  backoffCoefficient: 2,
}
```

Retry flow:

```text
Supplier Request
       │
       ▼
   Attempt 1
       │
       ├── Success ──────────► Continue
       │
       └── Failure
              │
              ▼
           Retry
              │
              ▼
           Attempt 2
              │
              ▼
           Attempt 3
```

This allows temporary supplier failures to recover automatically.

---

# 🧪 Testing

The project includes both unit tests and Temporal workflow tests.

Navigate to the backend:

```bash
cd backend
```

Run the tests:

```bash
npm test
```

---

## Test Scenarios

### Basic Scenarios

* ✅ Supplier A is cheaper
* ✅ Supplier B is cheaper
* ✅ Same rate selects Supplier A
* ✅ Supplier A fails and Supplier B succeeds
* ✅ Both suppliers fail
* ✅ One supplier returns an empty response
* ✅ Both suppliers return empty responses

### Advanced Scenarios

* ✅ Supplier fails twice and succeeds on the third attempt
* 🔄 Supplier timeout handling can be extended
* 🔄 Workflow cancellation can be added as a future enhancement

---

# 🗄️ PostgreSQL Verification

To verify that PostgreSQL is running:

```bash
docker ps
```

If your PostgreSQL container is named `hotel-temporal-postgres`, you can access it using:

```bash
docker exec -it hotel-temporal-postgres psql -U postgres
```

Inside PostgreSQL, list databases:

```sql
\l
```

Connect to your database:

```sql
\c hotel_db
```

List tables:

```sql
\dt
```

You can then query your application's stored data.

For example:

```sql
SELECT * FROM hotel_searches;
```

> The table name may differ depending on your database implementation.

---

# ⏱️ Temporal Verification

When your Temporal services are running, you can inspect workflow executions using the Temporal UI.

A common local URL is:

```text
http://localhost:8233
```

From the Temporal UI, you can inspect:

* Workflow executions
* Workflow status
* Activity execution
* Workflow history
* Retries
* Errors

A typical workflow lifecycle looks like:

```text
Workflow Started
       │
       ▼
Fetch Supplier A ──────┐
                       │
                       ▼
                  Compare Results
                       ▲
                       │
Fetch Supplier B ──────┘
                       │
                       ▼
              Select Best Rate
                       │
                       ▼
            Workflow Completed
```

---

# 🐳 Useful Docker Commands

### Start Services

```bash
docker-compose up -d
```

### Stop Services

```bash
docker-compose down
```

### View Running Containers

```bash
docker ps
```

### View Container Logs

```bash
docker logs <container-name>
```

### Restart Services

```bash
docker-compose restart
```

---

# ⚠️ Known Limitations

This project is designed as a demonstration of a reliable hotel search workflow.

Current limitations include:

* Mock supplier APIs instead of real hotel providers
* Limited number of suppliers
* No user authentication
* No caching layer
* Basic frontend design
* No production monitoring configuration
* Workflow cancellation not yet implemented
* Advanced supplier timeout handling can be extended

---

# 🔮 Future Improvements

* [ ] Add additional hotel suppliers
* [ ] Implement Redis caching
* [ ] Add workflow cancellation
* [ ] Improve timeout handling
* [ ] Add JWT authentication
* [ ] Add user search history
* [ ] Add hotel filtering
* [ ] Add pagination
* [ ] Add rate limiting
* [ ] Add structured logging
* [ ] Add monitoring and observability
* [ ] Add CI/CD with GitHub Actions
* [ ] Deploy the application

---

# 📚 What This Project Demonstrates

This project demonstrates practical experience with:

* Full-stack application development
* React and TypeScript
* Node.js and Express.js
* REST API development
* PostgreSQL
* Docker
* Temporal Workflows
* Temporal Activities
* Workflow orchestration
* Parallel execution
* Retry policies
* Error handling
* Unit testing
* Workflow testing

---

# 👨‍💻 Author

**Nikhil Dadhich**

Full Stack Developer

**Technologies:** React · Node.js · TypeScript · Express.js · PostgreSQL · Temporal

---

# 📄 License

This project is created for educational and assessment purposes.

You are welcome to use and modify the project for learning purposes.

---

## ⭐ Support

If you found this project helpful, consider giving the repository a ⭐.
