# Instructions to Create Seren SQL Editor Interface

**Context**: 
I am working in a fork of the SerenDB x402 MCP Server. My goal is to build a web-based SQL Editor interface that integrates with this server's logic to execute paid SQL queries via the SerenAI x402 Gateway.

**Goal**: 
Create a modular full-stack integration consisting of:
1. A **Shared Service** (`serenService.ts`) to handle x402 payments (refactored from existing code).
2. An **Express Backend** to serve the web API.
3. A **React Frontend** for the SQL Editor UI.
4. Updates to the existing **MCP Server** to use the new shared service (ensuring backward compatibility).



---

## Step 1: Extract Shared Service Logic
**Goal**: Decouple the payment logic from the MCP tool definitions so it can be reused by the Web API.

1.  **Analyze Dependencies**: Scan `src/index.ts` (or similar) to identify which library is used for signing (e.g., `ethers`, `viem`, or `web3.js`).
2.  **Create Directory**: `src/services/`
3.  **Create File**: `src/services/serenService.ts`
4.  **Implement Class `SerenService`**:
    * **Constructor**: Should accept `privateKey` and `gatewayUrl`.
    * **Method `executeQuery(params: { sql: string, providerId: string })`**:
        * **Try**: Make a standard POST request to the gateway.
        * **Catch 402**: If the response is `402 Payment Required`:
            1.  Extract the `WWW-Authenticate` or `X-402-Gateway` header.
            2.  **Sign**: Use the private key to sign the required payment challenge (reusing the logic found in the original source).
            3.  **Retry**: Resubmit the request with the `X-PAYMENT` or `Authorization` header.
    * **Return**: The JSON data from the successful response.

## Step 2: Refactor Existing MCP Server
**Goal**: Ensure the existing CLI tools use the new service to prevent code duplication.

1.  Open the main entry point (likely `src/index.ts`).
2.  Import `SerenService`.
3.  Initialize the service: `const serenService = new SerenService(process.env.WALLET_PRIVATE_KEY!, process.env.X402_GATEWAY_URL!);`
4.  Locate the `CallToolRequest` handler (specifically for the query tool).
5.  Replace the raw `axios`/signing block with a clean call:
    ```typescript
    const result = await serenService.executeQuery({ sql, providerId });
    ```
6.  Verify that `npm start` still launches the MCP server correctly.

## Step 3: Create the Backend API
**Goal**: Expose the logic to a web frontend.

1.  Install `express` and `cors` (and their types: `@types/express`, `@types/cors`).
2.  **Create File**: `src/server.ts`
3.  **Setup Express**:
    * Enable CORS.
    * Initialize `SerenService` using `process.env`.
4.  **Create Endpoint**: `POST /api/execute-sql`
    * **Body**: `{ sql: string, providerId: string }`
    * **Action**: `await serenService.executeQuery(req.body)`
    * **Response**: Return the JSON result or handle errors (especially forwarding 500s if the signing fails).

## Step 4: Create the Frontend Client
**Goal**: A clean UI for the user.

1.  Initialize a React project inside a `/client` folder (use Vite).
2.  Install `axios`, `lucide-react`, and `clsx`/`tailwind-merge` if styling is needed.
3.  **Create Component `SQLEditor.tsx`**:
    * **State**: `query` (string), `providerId` (string), `results` (array), `status` (enum: 'idle', 'signing', 'fetching', 'error').
    * **Defaults**:
        * Query: `SELECT * FROM vaults LIMIT 5`
        * Provider ID: `4cb187b9-b814-483c-a180-c24902ca2720` (Yearn Test ID).
    * **Layout**:
        * Top: Input fields for Query and Provider ID.
        * Middle: "Run Query" button (disabled while loading).
        * Bottom:
            * If `status === 'signing'`, show: "Payment Required. Signing transaction..."
            * If `results`, render a dynamic HTML `<table>` iterating over the keys/values.
4.  **Networking**:
    * The frontend should POST to `http://localhost:3000/api/execute-sql`.

## Step 5: Orchestration
**Goal**: Run everything with one command.

1.  Install `concurrently` in the root `package.json`.
2.  Add a script `dev:web`:
    ```json
    "dev:web": "concurrently \"npx tsx src/server.ts\" \"npm run dev --prefix client\""
    ```

**Final Instruction**: Implement these steps sequentially, verifying the service logic (Step 1) before moving to the frontend.