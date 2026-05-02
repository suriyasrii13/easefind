# Technical Architecture Report: EaseFind.AI
**Project Title**: Smart AI-Powered Lost & Found System
**System Version**: V1.3 - AI Reborn

---

## 1. Core Artificial Intelligence (AI) Implementation
The project leverages state-of-the-art Generative AI to automate the traditionally manual process of reporting and matching items.

### A. Large Language Models (LLM)
*   **Model**: Google Gemini 3.1 Flash-TTS-Preview.
*   **Technique**: Zero-shot Entity Extraction.
*   **Implementation**: Used to parse unstructured voice transcripts or manual text into structured JSON data (Item Name, Category, Date, Location, Item Type).
*   **Algorithm**: Prompt Engineering with strict schema enforcement to ensure 100% form accuracy.

### B. AI Matching Algorithm
*   **Logic**: Multi-modal Scoring System.
*   **Textual Similarity**: Analyzes item descriptions using semantic understanding rather than simple keyword matching.
*   **Visual Analysis**: Uses Computer Vision (Gemini Vision) to compare uploaded images of lost and found items.
*   **Confidence Score**: A weighted average algorithm that provides a "Match Probability" (e.g., 90% Match) to the user.

---

## 2. Natural Language Processing (NLP) Techniques
*   **Speech-to-Text (STT)**: Integration with the Web Speech API for real-time voice capturing.
*   **Entity Extraction**: Automatic identification of temporal data (e.g., "today" → "2026-05-02") and categorical data (e.g., "iPhone" → "Electronics").
*   **Constraint Matching**: Fuzzy matching algorithms ensure that AI-generated categories match the pre-defined system categories (Electronics, Personal Items, etc.).

---

## 3. Backend Architecture (Java Spring Boot)
*   **Framework**: Spring Boot 4.0.2 (Java 21).
*   **Real-time Communication**: STOMP over WebSockets for instant user notifications when a match is found.
*   **Asynchronous Processing**: Background tasks for handling email notifications and AI parsing to ensure a responsive UI.
*   **Database Management**: Relational Mapping (JPA/Hibernate) with MySQL for secure, structured data persistence.

---

## 4. Frontend & User Experience (React + Vite)
*   **Design Paradigm**: Glassmorphism & High-Tech Dark Blue Aesthetics.
*   **State Management**: React Context API for global authentication and user session tracking.
*   **Component Architecture**: Modular UI components using Shadcn/UI and Tailwind CSS for a premium, responsive experience.
*   **GIS Integration**: Reverse Geocoding via ArcGIS/Leaflet for auto-detecting "Found Locations" using GPS coordinates.

---

## 5. Security & DevSecOps
*   **Authentication**: JSON Web Tokens (JWT) for secure, stateless user sessions.
*   **Data Masking**: Implementation of environment variable injection (`${GEMINI_API_KEY}`) to prevent sensitive credentials from being exposed in source control.
*   **Secure API Design**: CORS (Cross-Origin Resource Sharing) policies and CSRF protection for backend safety.

---

## 6. Technical Stack Summary
*   **Frontend**: React, Vite, Tailwind CSS, Lucide Icons.
*   **Backend**: Java 21, Spring Boot, Maven.
*   **Database**: MySQL.
*   **AI Engine**: Google Gemini API.
*   **Deployment**: Railway (Backend), Vercel (Frontend).
