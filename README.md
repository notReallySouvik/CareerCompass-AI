# CareerCompass AI

CareerCompass AI is a government exam explorer and career guidance assistant. It helps users discover government examinations by country, inspect eligibility criteria, and ask career-focused questions about government jobs, education pathways, certifications, preparation strategy, and employment opportunities.

The app is designed for students and early-career professionals who need a clearer path from their background and interests to relevant public-sector opportunities.

## Hackathon Submission Information

**Project name:** CareerCompass AI  
**Build phase:** Phase 2 Hackathon Build, June 14-21, 2026  
**Submission deadline:** June 21, 2026, 11:59 PM ET  
**Qualifier code:** CO26-29049714  
**Track:** Undergraduate Track 
**Challenge:** Public Services: Fix Systems People Depend On

## Problem

Government job and exam information is often scattered across many portals, notifications, PDFs, and official websites. Candidates may not know which exams match their age, education, nationality, interests, or career goals.

CareerCompass AI reduces this discovery gap by combining exam exploration with a conversational assistant that can personalize guidance based on user-provided context.

## Solution

CareerCompass AI provides:

- Country-based government exam discovery.
- Exam eligibility details such as age limits, education, nationality, experience, physical requirements, attempts allowed, category relaxations, descriptions, and official links when available.
- A career assistant for government jobs, exam strategy, education pathways, certifications, and professional development.
- Auto-extracted user profile context from chat, such as age, nationality, education, and interests.
- A disclaimer and responsible-use warning on every page load.
- Local/cached storage of previously fetched exam data through Firebase/Firestore.

## Key Features

- **Government Exam Explorer:** Users select a country and load relevant government examinations.
- **Eligibility Dashboard:** Users can inspect exam-specific details and official links.
- **AI Career Assistant:** Users can ask career questions and receive tailored guidance.
- **Profile Context Extraction:** The assistant extracts non-sensitive user context from chat to improve recommendations.
- **Human-in-the-Loop Verification:** Users are repeatedly directed to verify final eligibility, deadlines, and rules using official sources.
- **Responsible AI Disclaimer:** The app displays a disclaimer on launch/page refresh explaining limitations and privacy considerations.

## AI Architecture

CareerCompass AI uses a frontend/backend architecture:

1. **Frontend:** A Next.js app provides the dashboard, country search, exam list, eligibility view, profile context panel, chat interface, and disclaimer modal.
2. **Database/cache:** Firebase Firestore stores country and exam data so repeated queries can be served efficiently.
3. **Exam loading routes:** Backend API routes retrieve or generate exam information for a selected country and cache it.
4. **Profile extraction route:** A backend route extracts lightweight profile context from user messages, such as age, nationality, education, and interests.
5. **Chat route:** A backend route sends the user question, conversation history, profile context, and selected/derived country context to the AI assistant.
6. **AI model:** The app uses Gemini-powered responses for exam discovery, profile extraction, and career guidance.

## Human-in-the-Loop Design

CareerCompass AI is not intended to make final decisions for users. The user remains responsible for checking and acting on information.

Human-in-the-loop safeguards include:

- Users choose the country and exam they want to inspect.
- Users ask follow-up questions and refine their goals.
- Official website links are shown when available.
- The app warns users to verify eligibility, application deadlines, and official notifications.
- AI recommendations are treated as guidance, not final authority.
- Users can clear saved chat and profile context.

## Responsible AI Guardrails

CareerCompass AI includes the following guardrails:

- Displays a disclaimer every time the page launches or refreshes.
- States that AI responses may be incomplete, outdated, or incorrect.
- States that users must verify information on official government or exam authority websites.
- Does not make final eligibility, hiring, legal, financial, or admission decisions.
- Restricts the assistant to career, government job, government exam, education, certification, and professional development topics.
- Avoids requiring sensitive personal information.
- Allows users to clear chat history and profile context.

## Data and Privacy

CareerCompass AI uses:

- Publicly available exam and career information.
- Public APIs and AI-generated summaries.
- Firebase/Firestore for cached country and exam data.
- User-provided chat context for personalization.

The app does not require users to submit sensitive personal data. Users should avoid entering private or sensitive information. Profile context is used to personalize guidance and can be cleared from the interface.

## Data Sources and Disclosure

Data sources used or supported by the project:

- Public government exam information.
- Official government or exam authority websites when available.
- Gemini-generated summaries and guidance.
- Google Search/tool-assisted retrieval enabled in the backend.
- Firebase/Firestore cached data created by the app.

All final eligibility rules, application dates, and official notices should be verified through the relevant official website.

## Tools, Libraries, and Frameworks

This project uses:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Firebase
- Firestore
- React Markdown
- Gemini API / Google Generative AI tooling
- AI coding assistance from Codex/ChatGPT

Open-source libraries and frameworks are used according to their respective licenses.

## AI Assistance Disclosure

AI coding assistance was used during development. Codex/ChatGPT helped with code implementation, README drafting, debugging guidance, and responsible AI wording. The final project decisions, integration, testing, and submission are owned by the team.

The application itself also uses AI to generate career guidance, summarize exam information, and extract lightweight profile context from user messages.

## Originality Statement

CareerCompass AI was built as original work by the team during the hackathon build period. Open-source libraries and frameworks were used as permitted by the rules and are disclosed above. The submitted application is not a pre-built solution.

## Setup

Install dependencies:

```bash
npm install
```

Create a `.env.local` file in the root directory:

```bash
GEMINI_API_KEY=your_key_here
NEXT_PUBLIC_FIREBASE_API_KEY=your_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_value_here
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_value_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_value_here
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_value_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_value_here
```

Run the development server:

```bash
npm run dev
```

Open the app in a browser:

```bash
http://localhost:3000
```

## Known Limitations

- AI-generated guidance can be incomplete or outdated.
- Some exam details depend on availability and quality of public information.
- Official links may not be available for every exam.
- Users must verify all eligibility rules, deadlines, and official notices before applying.

## License and Attribution

This project uses open-source frameworks and libraries including Next.js, React, Tailwind CSS, Firebase, and React Markdown. AI assistance and Gemini-powered features are disclosed above.

Add any additional dataset, API, image, icon, font, or asset attribution here before submission.