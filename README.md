# Halupedia (Local Version)

Halupedia is an AI-powered encyclopedia where every article is generated on-demand by Large Language Models (LLMs). This project was originally designed for Cloudflare Workers (using KV, D1, and R2), but has been fully ported to run **locally** using Node.js, Express, and SQLite.

You can run Halupedia entirely on your own hardware using an OpenAI-compatible local AI server like [llama.cpp](https://github.com/ggerganov/llama.cpp) or vLLM, or you can connect it to OpenRouter / OpenAI.

## Features

- **Fully AI-Generated:** Articles, summaries, and related topics are dynamically created by LLMs based on search queries and URL slugs.
- **Local First:** 
  - **D1 Shim:** Uses `better-sqlite3` to simulate Cloudflare D1.
  - **KV Shim:** Stores key-value data in local SQLite for caching and fast lookups.
  - **R2 Shim:** Simulates object storage using the local file system for generated images.
- **Full-Stack:** Client is a React Single Page App (SPA) built with Vite, backend is Express wrapping a Hono API.
- **Moderation & Rate Limiting:** Built-in tools for limiting generation spam, auto-moderating bad words, and managing user comments.

---

## Prerequisites

- **Node.js** (v18 or higher recommended)
- **NPM** (comes with Node.js)
- *(Optional but recommended)* A local LLM server (like `llama.cpp` or `Ollama` exposing an OpenAI-compatible `/v1/chat/completions` endpoint) OR an API key for OpenRouter/OpenAI.

## Installation

**If you downloaded the ZIP file:**
1. Extract the `.zip` archive.
2. Open your terminal and navigate **inside** the extracted folder (where the `package.json` file is located):
   ```bash
   cd path/to/extracted/folder
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

**If you are using Git:**
1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/halupedia-local.git
   cd halupedia-local
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

## Configuration

Halupedia requires some environment variables to connect to your preferred LLM. 

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your settings:

   **For Local LLMs (e.g., llama.cpp):**
   ```env
   OPENAI_BASE_URL="http://127.0.0.1:8080/v1"
   OPENAI_API_KEY="sk-fake-key"
   LLM_MODEL="local-model"
   APP_URL="http://localhost:3000"
   ```

   **For OpenRouter:**
   ```env
   OPENAI_BASE_URL="https://openrouter.ai/api/v1"
   OPENAI_API_KEY="sk-or-v1-..."
   LLM_MODEL="google/gemini-2.5-flash-lite" # Or another supported model
   APP_URL="http://localhost:3000"
   ```

## Running the Development Server

Start the application in development mode with hot-reloading (for the backend via `tsx` and the frontend via Vite middleware):

```bash
npm run dev
```

The application will be accessible at [http://localhost:3000](http://localhost:3000). 
When you start the server, a `.data/` directory will be created automatically in your project root containing SQLite databases representing your KV data (`kv.sqlite`), D1 schema (`d1.sqlite`), and R2 generated images (`r2/`).

## Building for Production

To create an optimized production build:

```bash
npm run build
```

This will:
1. Compile the React client into the `dist/` folder.
2. Bundle the backend server script into `dist/server.cjs`.

To run the production build:
```bash
npm run start
```

## Admin Access

Halupedia includes a built-in admin panel at `/admin`. To log in, you will need to add a user to the `admins` table in the local D1 database (`.data/d1.sqlite`). Passwords are hashed using SHA-512.

## Project Structure

- `/src` - The React Vite client (SPA that drives the Wiki interface).
- `/server` - The Hono backend containing all API endpoints (`index.ts`, `llm.ts`, `moderation.ts`, etc.).
- `/cf-shims.ts` - Custom local emulators for Cloudflare's D1, KV, and R2 APIs.
- `/server.ts` - The main Express entry point that hosts the Hono API and serves the Vite client.
