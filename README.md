# Hodari — FIFA World Cup 2026 Tourist AI Agent

## Overview
Hodari is an AI-powered tourist guide built for FIFA World Cup 2026 visitors.
It combines conversational AI, real-time maps, voice interaction, and smart
itinerary planning into a single mobile-first web application.

## What Jocos12 Implemented

### 🗺️ Map (MapView.tsx — +908 lines)
- Interactive map panel with real-time place markers
- Route visualization between stops
- Place detail cards with photos and info
- Map control tools synced with agent responses
- Side panel for place exploration

### 💬 Chat Interface (ChatPanel.tsx — +682 lines)
- Streaming chat bubbles with typing indicators
- Collapsed reply component for long responses
- Message state machine (sending → streaming → done)
- Skeleton loading states

### 🎙️ Voice System (VoiceOrb, VoiceButton, useVoice — +400 lines)
- Voice orb with mic level animation
- Push-to-talk and toggle modes
- Vertex AI TTS integration (Gemini 2.5)
- Voice captions display
- ⚠️ TODO: Voice needs full review — latency, state management, UX

### 🏠 Landing Page (page.tsx)
- Full app shell with chat + map layout
- Session management and suggestion chips
- ⚠️ TODO: Landing page needs redesign — first impression weak

### 🔧 Libraries
- mapActions.ts — map tool handlers
- voice.ts — voice pipeline
- geo.ts — geolocation utilities
- stream.ts — SSE streaming
- text.ts — text formatting
- types.ts — shared TypeScript types

## Tech Stack
- Frontend: Next.js 15, TypeScript, Tailwind CSS
- Backend: Python, Google ADK, Gemini 2.5 Flash
- Maps: Google Maps API, Maps Grounding Lite
- Database: MongoDB Atlas (vector search)
- Voice: Vertex AI TTS/STT
- Deployment: Google Cloud Run

## Known Issues
- [ ] Landing page needs full redesign
- [ ] Voice: reduce latency, fix state transitions
- [ ] Activate Maps Grounding Lite API (403 error)
- [ ] Increase Next.js proxy timeout (502 on long requests)

## Local Development

### Backend
```bash
cd agents
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
adk api_server hodari
```

### Frontend
```bash
cd client
npm install
npm run dev
```

## Contributors
- Jocos12 — Project Lead, UI/Frontend
- ganji759 (Pacifique Kwaba Mugisho) — Backend, AI/ML Engineering