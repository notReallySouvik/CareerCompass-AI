# CareerCompass AI 🧭

> An AI-powered career guidance platform that helps users discover competitive exams, understand eligibility requirements, explore career paths, and get personalized assistance.

---

## ✨ Features

- **Exam Discovery** — Browse and search competitive exams relevant to your profile and goals
- **Eligibility Checker** — Understand age limits, qualifications, and other criteria at a glance
- **AI-Powered Assistance** — Get personalized guidance powered by Google Gemini AI
- **Responsive UI** — Clean, modern interface built with Tailwind CSS and Lucide icons

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| AI | Google Gemini (`@google/genai`) |
| Database | Firebase 12 |

---

## 📁 Project Structure

```
CareerCompass-AI/
├── app/              # Next.js App Router pages and layouts
├── lib/              # Utility functions, Firebase config, AI clients
├── types/            # Shared TypeScript type definitions
├── next.config.ts    # Next.js configuration
├── tsconfig.json     # TypeScript configuration
└── package.json
```

---

## 🚀 Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/notReallySouvik/CareerCompass-AI.git
cd CareerCompass-AI

# Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Google Gemini AI
GOOGLE_GENAI_API_KEY=your_gemini_api_key_here

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

---

## 📜 Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build the app for production |
---

## 🤝 Contributing

Contributions are welcome! To get started:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature-name`)
3. Make your changes and commit (`git commit -m 'Add some feature'`)
4. Push to your branch (`git push origin feature/your-feature-name`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

---

## 👤 Collaborators

- **notReallySouvik** — [GitHub](https://github.com/notReallySouvik)
- **curiousdolphinn** — [GitHub](https://github.com/curiousdolphinn)
- **ByteNinjaX07** — [GitHub](https://github.com/ByteNinjaX07)
