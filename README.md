# Redis Messaging Queue

A lightweight, asynchronous job processing and request-response system built with **Node.js**, **TypeScript**, **Express**, and **Redis**.

This project demonstrates a producer-consumer messaging queue pattern using Redis lists (`LPUSH`, `RPUSH`, and blocking `BRPOP` operations) to decouple an HTTP API server (**Backend**) from a background worker service (**Engine**).

---

## Architecture & Message Flow

```text
+--------+       POST /job        +---------+      LPUSH "job"       +-------+
|        | ---------------------> |         | ---------------------> |       |
| Client |                        | Backend |                        | Redis |
|        | <--------------------- | (:3000) | <--------------------- |(:6379)|
+--------+   200 OK / 504 Timeout +---------+     BRPOP "return"     +-------+
                                                                      |     ^
                                                         BRPOP "job"  |     |  RPUSH "return"
                                                                      v     |
                                                                    +---------+
                                                                    | Engine  |
                                                                    | (:3001) |
                                                                    +---------+
```

1. **Job Submission (`Backend`)**: A client sends a `POST /job` request with a JSON payload to the Backend API server (`port 3000`).
2. **Enqueue Job (`LPUSH`)**: The Backend serializes the request body and pushes it onto the Redis `"job"` list using `LPUSH`.
3. **Wait for Result (`BRPOP`)**: The Backend blocks on the Redis `"return"` list using `BRPOP` with a **5-second timeout** waiting for the processed result.
4. **Dequeue & Process (`Engine`)**: The Engine worker (`port 3001`) continuously polls the `"job"` list using `BRPOP` (3-second polling interval), parses the job payload, and executes `processJob()`.
5. **Return Result (`RPUSH`)**: Once processed, the Engine pushes the result (`{ success: true, payload }`) to the `"return"` list using `RPUSH`.
6. **HTTP Response**:
   - If the Engine responds within 5 seconds, the Backend returns the processed result to the client (`200 OK`).
   - If no response is received within 5 seconds, the Backend returns `{ "message": "worker response timeout" }` (`504 Gateway Timeout`).

---

## Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/) (ES Modules)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Web Framework**: [Express 5](https://expressjs.com/)
- **Message Broker**: [Redis](https://redis.io/) (`redis` Node.js client v6)

---

## Project Structure

```text
Redis_MessagingQueue/
├── backend/                # HTTP API Server (Producer)
│   ├── src/
│   │   └── index.ts        # Express server, POST /job endpoint, Redis client
│   ├── package.json
│   └── tsconfig.json
├── engine/                 # Background Worker Service (Consumer)
│   ├── src/
│   │   └── index.ts        # Continuous BRPOP worker loop & job processor
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

---

## Prerequisites

- **Node.js** (v18+ recommended; v22.6+ supports running `.ts` files directly)
- **npm**
- **Redis Server** running locally on `redis://localhost:6379` (or via Docker)

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/sohail4291/Redis_MessagingQueue.git
cd Redis_MessagingQueue
```

### 2. Start Redis

If you have Docker installed, you can spin up a local Redis instance on port `6379`:

```bash
docker run -d --name redis-queue -p 6379:6379 redis:latest
```

*(Alternatively, start your locally installed `redis-server`.)*

### 3. Install Dependencies

Install packages for both `backend` and `engine`:

```bash
# Install Backend dependencies
cd backend
npm install

# Install Engine dependencies
cd ../engine
npm install
```

### 4. Run the Services

Open two separate terminals to run the **Engine** worker and the **Backend** API server.

#### Terminal 1 — Start the Engine (Worker)

```bash
cd engine
npx tsc
node src/index.js
```

> Or with Node.js v22.6+ / `tsx`:
> ```bash
> node src/index.ts
> ```

#### Terminal 2 — Start the Backend (API Server)

```bash
cd backend
npx tsc
node src/index.js
```

> Or with Node.js v22.6+ / `tsx`:
> ```bash
> node src/index.ts
> ```

---

## API Usage

### Submit a Job

- **Endpoint**: `POST http://localhost:3000/job`
- **Content-Type**: `application/json`

#### Example Request

```bash
curl -X POST http://localhost:3000/job \
  -H "Content-Type: application/json" \
  -d '{"task": "send_email", "userId": 42}'
```

#### Success Response (`200 OK`)

When the Engine worker is running and processes the job within 5 seconds:

```json
{
  "response ": {
    "success": true,
    "payload": {
      "task": "send_email",
      "userId": 42
    }
  }
}
```

#### Timeout Response (`504 Gateway Timeout`)

When the Engine worker is stopped or takes longer than 5 seconds to respond:

```json
{
  "message": "worker response timeout"
}
```

---

## License

This project is licensed under the **ISC License**.
