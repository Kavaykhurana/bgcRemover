# BGC Remover

BGC Remover is a web app for removing image backgrounds and downloading the result as a PNG.
The backend can run a local ONNX segmentation model and can also call the `remove.bg` API when a remote provider is configured.

The frontend is written with HTML, CSS, and vanilla JavaScript. The backend uses Node.js, Express, Sharp, and ONNX Runtime.

## Features

- Local background removal with an ONNX model.
- Optional remote processing through remove.bg.
- Drag-and-drop, paste, and file-picker upload support.
- Before/after comparison slider.
- Output background preview controls and PNG download.
- File validation with size limits, magic-byte checks, and Sharp decoding.
- Structured server logging and rate limiting.

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

### 2. Download the model

```bash
npm run build        # Downloads u2net.onnx (~170MB) to ./backend/models/
```

### 3. Configure environment

```bash
cd backend
cp .env.example .env
# Edit .env if you want to change the provider or add a remove.bg key
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

## Architecture

The application keeps the UI, upload handling, image processing, and provider logic separated:

- `backend/public/` contains the static frontend.
- `backend/routes/` contains the HTTP routes.
- `backend/middleware/` contains upload validation, rate limiting, and error handling.
- `backend/services/providers/` contains the local and remote background-removal providers.
- `backend/services/imageProcessor.js` handles image preprocessing and output formatting.
