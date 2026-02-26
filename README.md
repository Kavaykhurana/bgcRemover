# Production-Grade AI Background Remover

This is a production-ready, portfolio-defining background removal web application.
It uses a robust architecture to manage AI background removal, with a swappable interface supporting both a local ONNX Runtime inference engine using U²-Net AND a remote fallback to the `remove.bg` REST API.

Every decision has been made with scalability, security, clean UX, and strict code quality in mind. There are no frontend frameworks used (Vanilla JS) and the backend is built cleanly using Node.js and Express 5.

## Features

- **Local Inference:** Runs an ONNX Runtime node session using the U²-Net model. No external APIs needed.
- **Remote Integration:** Fallback to the `remove.bg` API wrapper via `axios` and `form-data`.
- **Zero Framework UI:** Entirely built with modern Vanilla JS and robust Design Tokens.
- **Advanced State Engine:** Micro-animations for uploads, before/after pure CSS comparison slider.
- **Enhanced Security & Logging:** Uses Pino for structured logging and strictly validates files using image magic bytes and Sharp decoding.

---

## Setup

### Prerequisites

- Node.js 20+
- Docker (optional but recommended)

### 1. Clone and install

```bash
git clone <repo>
cd <repo>
npm run install-all  # Installs backend dependencies
```

### 2. Download AI model

```bash
npm run build        # Downloads u2net.onnx (~170MB) to ./backend/models/
```

### 3. Configure environment

```bash
cd backend
cp .env.example .env
# Edit .env — add REMOVEBG_API_KEY if using remote provider, or use AI_PROVIDER=local
```

### 4. Run development

```bash
npm run dev          # Starts backend on :3000
# Open http://localhost:3000 in your browser
```

### 5. Run with Docker

```bash
docker-compose up --build
```

## Architecture Design Principles

1. **Provider Strategy Pattern for AI layer:** Background removal models are decoupled. We provide both U-Net (local) and Remove.bg (remote) under the `services/providers/` folder, easily allowing drop-in replacements.
2. **Strict File Validation:** Uploaded files bypass generic checks (Multer headers) by matching specific magic number bytes before executing logic via Sharp. Max file size is natively enforced in standard multipart data pipes.
3. **Optimized Streams:** The API response yields an ephemeral binary buffer returned straight from memory/temp storage securely, keeping runtime V8 heap footprint small.
