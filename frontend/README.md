# Nirnay AI Frontend (Hackathon MVP)

Simple, reliable React UI for demoing the Nirnay AI flow in under 2 minutes.

## Tech stack

- React + Vite
- Tailwind CSS (v4 via Vite plugin)
- Local component state (no Redux)

## Core demo flow

1. Upload Screen
	 - Upload PDF
	 - Show selected filename

2. Extraction + Verification Screen (2-column)
	 - Left: extracted action items with confidence badges
	 - Right: PDF preview + simulated highlight overlay
	 - Approve/Edit per action with instant status updates

3. Dashboard Screen
	 - Final verified actions table (action, deadline, status)

## Component structure

```text
src/
	api/
		client.js
	components/
		ActionItemCard.jsx
		ConfidenceBadge.jsx
		DashboardTable.jsx
		PdfViewerSim.jsx
		StatusPill.jsx
		StepProgress.jsx
	mock/
		mockData.js
	pages/
		DashboardScreen.jsx
		ExtractionScreen.jsx
		UploadScreen.jsx
	App.jsx
	index.css
	main.jsx
```

## Run locally

1. Install dependencies:

```bash
npm install
```

2. (Optional) Set backend URL:

```bash
cp .env.example .env
```

`.env`:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```

3. Start dev server:

```bash
npm run dev
```

## Connect to backend APIs

API calls are in `src/api/client.js` and map to backend routes:

- `uploadPdf(file)` -> `POST /api/upload`
- `extractByDocument(documentId)` -> `POST /api/extract/{document_id}`
- `verifyItem(itemId, payload)` -> `PUT /api/verify/{item_id}`
- `getActions(documentId)` -> `GET /api/actions/{document_id}`

## Demo reliability mode

- The Upload screen includes a `Demo safety mode` toggle.
- ON: uses stable mock extraction data (no backend dependency).
- OFF: calls backend APIs; if backend fails, UI auto-falls back to mock data.

This ensures your demo remains smooth even under network/backend issues.
