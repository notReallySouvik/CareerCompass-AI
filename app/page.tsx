"use client";

import { useEffect, useState, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Search,
  Compass,
  BookOpen,
  Briefcase,
  Globe,
  Users,
  Send,
  Trash2,
  User,
  Sparkles,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Heart,
  Award,
  Link as LinkIcon,
  MessageSquare,
  Activity,
  FileText
} from "lucide-react";

// Preloaded list of major countries to ensure suggestions work immediately
const POPULAR_COUNTRIES = [
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "Japan",
  "France",
  "Singapore",
  "South Africa",
  "United Arab Emirates",
  "Brazil",
  "Mexico",
  "New Zealand",
  "Switzerland",
  "Saudi Arabia"
];

// Types
type UserProfile = {
  age?: number;
  nationality?: string;
  education?: string;
  interests?: string[];
  competitionTolerance?: string;
};

type Exam = {
  id: string;
  name: string;
  detailsLoaded?: boolean;
  description?: string;
  minAge?: number | null;
  maxAge?: number | null;
  education?: string;
  nationality?: string;
  experience?: string;
  physicalRequirements?: string;
  attemptsAllowed?: string;
  categoryRelaxation?: string;
  officialUrl?: string;
};

// Inline Markdown Renderer for Gemini responses (Gold themed)
function Markdown({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split("\n");
  const renderedElements: React.ReactNode[] = [];
  let inList = false;
  let listItems: React.ReactNode[] = [];

  const parseInline = (line: string) => {
    let currentText = line;
    const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g;
    const splitParts = currentText.split(regex);
    
    return splitParts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index} className="font-extrabold text-amber-400">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return <em key={index} className="italic text-slate-350">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={index} className="px-1.5 py-0.5 bg-neutral-950 border border-neutral-800 rounded text-xs font-mono text-yellow-500">{part.slice(1, -1)}</code>;
      }
      if (part.startsWith("[") && part.includes("](")) {
        const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
        if (linkMatch) {
          const [, linkText, url] = linkMatch;
          return (
            <a
              key={index}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-405 hover:text-amber-300 underline font-semibold transition-colors"
            >
              {linkText}
            </a>
          );
        }
      }
      return part;
    });
  };

  const pushListIfActive = () => {
    if (inList && listItems.length > 0) {
      renderedElements.push(
        <ul key={`list-${renderedElements.length}`} className="list-disc pl-5 my-2 space-y-1 text-slate-300">
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === "") {
      pushListIfActive();
      renderedElements.push(<div key={`space-${i}`} className="h-2" />);
      continue;
    }

    if (line.startsWith("### ")) {
      pushListIfActive();
      renderedElements.push(
        <h4 key={i} className="text-md font-bold text-amber-505 mt-4 mb-2">
          {parseInline(line.slice(4))}
        </h4>
      );
    } else if (line.startsWith("## ")) {
      pushListIfActive();
      renderedElements.push(
        <h3 key={i} className="text-lg font-bold text-amber-400 mt-5 mb-2 border-b border-neutral-800 pb-1">
          {parseInline(line.slice(3))}
        </h3>
      );
    } else if (line.startsWith("# ")) {
      pushListIfActive();
      renderedElements.push(
        <h2 key={i} className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-600 mt-6 mb-3">
          {parseInline(line.slice(2))}
        </h2>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      inList = true;
      listItems.push(
        <li key={i} className="leading-relaxed text-slate-300">
          {parseInline(line.slice(2))}
        </li>
      );
    } else if (/^\d+\.\s/.test(line)) {
      pushListIfActive();
      const content = line.replace(/^\d+\.\s/, "");
      renderedElements.push(
        <div key={i} className="flex gap-2 my-1 text-slate-300 leading-relaxed">
          <span className="font-bold text-amber-500">{line.match(/^\d+/)?.[0]}.</span>
          <div>{parseInline(content)}</div>
        </div>
      );
    } else if (line === "---") {
      pushListIfActive();
      renderedElements.push(<hr key={i} className="my-4 border-neutral-900" />);
    } else {
      pushListIfActive();
      renderedElements.push(
        <p key={i} className="text-slate-300 leading-relaxed my-1.5">
          {parseInline(line)}
        </p>
      );
    }
  }

  pushListIfActive();
  return <div className="space-y-1">{renderedElements}</div>;
}

export default function Home() {
  const [country, setCountry] = useState("");
  const [countries, setCountries] = useState<string[]>(POPULAR_COUNTRIES);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [examLoading, setExamLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [profile, setProfile] = useState<UserProfile>({});
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  
  // Client-side mock mode activation
  const [isMock, setIsMock] = useState(false);

  // Tab control for workspace in smaller viewports
  const [activeTab, setActiveTab] = useState<"details" | "chat">("details");

  // Track pulsing animations for extracted profile fields
  const [pulsingFields, setPulsingFields] = useState<string[]>([]);
  const prevProfileRef = useRef<UserProfile>({});

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  // Load URL query params & data on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("mock") === "true") {
        setIsMock(true);
        console.log("Mock mode enabled via URL query parameter.");
      }
    }

    const savedProfile = localStorage.getItem("careerProfile");
    if (savedProfile) {
      const parsed = JSON.parse(savedProfile);
      setProfile(parsed);
      prevProfileRef.current = parsed;
    }

    const savedChat = localStorage.getItem("careerChat");
    if (savedChat) {
      setMessages(JSON.parse(savedChat));
    }

    async function loadCountries() {
      try {
        const snapshot = await getDocs(collection(db, "countries"));
        const dbList = snapshot.docs.map(doc => doc.data().name || doc.id);
        // Combine DB countries with preloaded popular countries to avoid empty dropdown lists
        const combined = Array.from(new Set([...dbList, ...POPULAR_COUNTRIES]));
        setCountries(combined);
      } catch (err) {
        console.error("Error loading countries from DB, using fallback list:", err);
        setCountries(POPULAR_COUNTRIES);
      }
    }
    loadCountries();
  }, []);

  // Save chat to localStorage
  useEffect(() => {
    localStorage.setItem("careerChat", JSON.stringify(messages));
  }, [messages]);

  // Save profile to localStorage & track updates
  useEffect(() => {
    localStorage.setItem("careerProfile", JSON.stringify(profile));

    // Detect which fields updated
    const updated: string[] = [];
    const prev = prevProfileRef.current;
    
    if (profile.age !== prev.age && profile.age !== undefined) updated.push("age");
    if (profile.education !== prev.education && profile.education !== undefined) updated.push("education");
    if (profile.nationality !== prev.nationality && profile.nationality !== undefined) updated.push("nationality");
    if (profile.competitionTolerance !== prev.competitionTolerance && profile.competitionTolerance !== undefined) updated.push("competitionTolerance");
    
    // Check if interests changed
    const prevInterests = prev.interests || [];
    const currInterests = profile.interests || [];
    if (currInterests.length > prevInterests.length) {
      updated.push("interests");
    }

    if (updated.length > 0) {
      setPulsingFields(updated);
      const timer = setTimeout(() => setPulsingFields([]), 3000);
      prevProfileRef.current = profile;
      return () => clearTimeout(timer);
    }
  }, [profile]);

  function clearChat() {
    setMessages([]);
    localStorage.removeItem("careerChat");
  }

  function clearProfile() {
    setProfile({});
    prevProfileRef.current = {};
    localStorage.removeItem("careerProfile");
  }

  function handleCountryChange(value: string) {
    setCountry(value);
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }
    // Filter countries using a case-insensitive substring search for better matches
    const filtered = countries.filter(item =>
      item.toLowerCase().includes(value.toLowerCase())
    );
    setSuggestions(filtered.slice(0, 8));
  }

  async function selectCountry(selected: string) {
    setCountry(selected);
    setSuggestions([]);
    setSelectedExam(null);
    setHasMore(true);
    await loadExams(selected);
  }

  async function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (country.trim()) {
      setSuggestions([]);
      setSelectedExam(null);
      setHasMore(true);
      await loadExams(country.trim());
    }
  }

  // High-fidelity fallback mocks when backend fails
  async function loadMockExams(selectedCountry: string) {
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate delay
    
    if (selectedCountry.toLowerCase() === "india") {
      setExams([
        { id: "ssc-cgl", name: "SSC CGL (Combined Graduate Level Exam)", detailsLoaded: false },
        { id: "upsc-civil", name: "UPSC Civil Services Examination", detailsLoaded: false },
        { id: "rrb-ntpc", name: "RRB NTPC (Railway Recruitment)", detailsLoaded: false },
        { id: "ibps-po", name: "IBPS PO (Bank Probationary Officer)", detailsLoaded: false },
        { id: "nda", name: "NDA Entrance (National Defence Academy)", detailsLoaded: false }
      ]);
    } else {
      setExams([
        { id: "fed-civil", name: `${selectedCountry} Federal Civil Service Examination`, detailsLoaded: false },
        { id: "admin-select", name: `${selectedCountry} Administrative Selection`, detailsLoaded: false },
        { id: "mil-officer", name: `${selectedCountry} Defence Commission`, detailsLoaded: false }
      ]);
    }
  }

  async function loadMockExamDetails(examId: string, examName: string, selectedCountry: string): Promise<Partial<Exam>> {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
    
    if (examId === "upsc-civil") {
      return {
        description: "The Civil Services Examination is a national competitive examination in India conducted by the Union Public Service Commission for recruitment to various civil services of the government.",
        minAge: 21,
        maxAge: 32,
        education: "Bachelor's Degree in any discipline",
        nationality: "Citizen of India",
        experience: "None required (Freshers eligible)",
        physicalRequirements: "Standard medical fitness checkups",
        attemptsAllowed: "6 attempts for General Category, 9 for OBC, unlimited for SC/ST",
        categoryRelaxation: "Up to 5 years for SC/ST, 3 years for OBC",
        officialUrl: "https://upsc.gov.in"
      };
    } else if (examId === "ssc-cgl") {
      return {
        description: "Combined Graduate Level Exam (SSC CGL) is conducted for recruitment to Group B and C posts in various ministries, departments and organisations of the Government of India.",
        minAge: 18,
        maxAge: 32,
        education: "Graduate Degree from a recognized university",
        nationality: "Citizen of India or Nepal/Bhutan",
        experience: "No prior experience required",
        physicalRequirements: "Physical measurement and endurance tests apply for Sub-Inspector and Excise Inspector posts",
        attemptsAllowed: "Unlimited attempts within the age window",
        categoryRelaxation: "3 years for OBC, 5 years for SC/ST, 10 years for PwD",
        officialUrl: "https://ssc.gov.in"
      };
    } else {
      return {
        description: `Official competitive entry examination for recruitment into public sector admin, security, and operations vacancies across ${selectedCountry}.`,
        minAge: 18,
        maxAge: 35,
        education: "Bachelor's Degree or Senior High Diploma",
        nationality: `Citizen or Permanent Resident of ${selectedCountry}`,
        experience: "No experience required for entry grades",
        physicalRequirements: "Standard vision and general health checks",
        attemptsAllowed: "No limit within the age window",
        categoryRelaxation: "Standard federal reservations apply",
        officialUrl: "https://www.gov.uk"
      };
    }
  }

  async function loadExams(selectedCountry: string) {
    setLoading(true);
    
    if (isMock) {
      await loadMockExams(selectedCountry);
      setLoading(false);
      return;
    }

    try {
      let response = await fetch(`/api/exams/${encodeURIComponent(selectedCountry)}`);
      if (!response.ok) throw new Error("Database fetch failed");
      let data = await response.json();
      let existing = data.exams || [];

      // No exams yet, trigger sync
      if (existing.length === 0) {
        const sync = await fetch("/api/sync-country", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country: selectedCountry })
        });
        if (!sync.ok) throw new Error("Sync failed");
        await sync.json();

        response = await fetch(`/api/exams/${encodeURIComponent(selectedCountry)}`);
        data = await response.json();
        existing = data.exams || [];
      }
      setExams(existing);
    } catch (err) {
      console.warn("Backend API error or missing keys. Falling back to mock client-side mode:", err);
      setIsMock(true);
      await loadMockExams(selectedCountry);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!country) return;
    setLoadingMore(true);
    
    if (isMock) {
      await new Promise(resolve => setTimeout(resolve, 800));
      // Append a mock exam
      setExams(prev => [
        ...prev,
        { id: `mock-extra-${Date.now()}`, name: `${country} Special Services Officer Exam`, detailsLoaded: false }
      ]);
      setLoadingMore(false);
      return;
    }

    try {
      const beforeNames = exams.map(e => e.name);

      await fetch("/api/sync-country", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country })
      });

      const response = await fetch(`/api/exams/${encodeURIComponent(country)}`);
      if (!response.ok) throw new Error("Failed loading details");

      const data = await response.json();
      const after = data.exams || [];
      const newExams = after.filter((exam: Exam) => !beforeNames.includes(exam.name));

      if (newExams.length === 0) {
        setHasMore(false);
        return;
      }
      setExams(after);
    } catch (err) {
      console.warn("Failed API loadMore, running in-memory mock add:", err);
      setIsMock(true);
      setExams(prev => [
        ...prev,
        { id: `mock-extra-${Date.now()}`, name: `${country} Special Operations Command`, detailsLoaded: false }
      ]);
    } finally {
      setLoadingMore(false);
    }
  }

  async function openExam(exam: Exam) {
    setSelectedExam(exam);
    setActiveTab("details");

    if (exam.detailsLoaded) {
      return;
    }

    setExamLoading(true);

    if (isMock) {
      try {
        const details = await loadMockExamDetails(exam.id, exam.name, country);
        const updatedExam = { ...exam, ...details, detailsLoaded: true };
        setSelectedExam(updatedExam);
        setExams(prev => prev.map(e => e.id === exam.id ? updatedExam : e));
      } catch (err) {
        console.error("Mock load failed:", err);
      } finally {
        setExamLoading(false);
      }
      return;
    }

    try {
      // Calling `/api/load-exam` instead of `/api/exam-details` to bypass the argument order bug in the original backend route handler
      const response = await fetch("/api/load-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country,
          examId: exam.id
        })
      });

      if (!response.ok) {
        throw new Error("Failed to load details");
      }

      const details = await response.json();
      const updatedExam = { ...exam, ...details, detailsLoaded: true };

      setSelectedExam(updatedExam);
      setExams(prev => prev.map(e => e.id === exam.id ? updatedExam : e));
    } catch (err) {
      console.warn("API details failed, falling back to mock details:", err);
      setIsMock(true);
      const details = await loadMockExamDetails(exam.id, exam.name, country);
      const updatedExam = { ...exam, ...details, detailsLoaded: true };
      setSelectedExam(updatedExam);
      setExams(prev => prev.map(e => e.id === exam.id ? updatedExam : e));
    } finally {
      setExamLoading(false);
    }
  }

  async function askAI() {
    if (!question.trim()) return;

    const userMessage = {
      role: "user" as const,
      content: question
    };

    setMessages(prev => [...prev, userMessage]);
    const currentQuestion = question;
    setQuestion("");
    setChatLoading(true);

    let mergedProfile = profile;

    if (isMock) {
      await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate thinking
      
      // Parse query locally to update profile
      let extractedAge = profile.age;
      let extractedEducation = profile.education;
      let extractedNationality = profile.nationality;
      let extractedInterests = profile.interests || [];

      // Regex matching
      const ageMatch = currentQuestion.match(/\b(1[89]|[2-5]\d)\b/);
      if (ageMatch) extractedAge = Number(ageMatch[0]);

      if (/degree|bachelor|graduate|college|bs|cs|engineering/i.test(currentQuestion)) {
        if (/cs|computer science|it/i.test(currentQuestion)) {
          extractedEducation = "BS in Computer Science";
        } else {
          extractedEducation = "Bachelor's Degree";
        }
      } else if (/high school|diploma|senior high/i.test(currentQuestion)) {
        extractedEducation = "High School Diploma";
      }

      if (/india/i.test(currentQuestion)) {
        extractedNationality = "India";
      } else if (/us|united states|america/i.test(currentQuestion)) {
        extractedNationality = "United States";
      } else if (/uk|united kingdom|british/i.test(currentQuestion)) {
        extractedNationality = "United Kingdom";
      }

      if (/code|coding|software|programming/i.test(currentQuestion)) {
        if (!extractedInterests.includes("coding")) extractedInterests = [...extractedInterests, "coding"];
      }
      if (/management|admin|administrative/i.test(currentQuestion)) {
        if (!extractedInterests.includes("administration")) extractedInterests = [...extractedInterests, "administration"];
      }

      const updatedProfile = {
        ...profile,
        age: extractedAge,
        education: extractedEducation,
        nationality: extractedNationality,
        interests: extractedInterests
      };

      setProfile(updatedProfile);

      // Generate response
      let answerText = "";
      if (extractedEducation === "BS in Computer Science") {
        answerText = `### AI Guidance Analysis
Based on your updated profile showing a **BS in Computer Science** at age **${extractedAge || 23}**, here is my advice:

- **Technical Posts (SSC CGL)**: You are highly eligible for Inspector positions (e.g. Assistant Section Officer in MeitY or cyber-cell departments) which offer high salary packages starting at approx. ₹70,000/month.
- **Railway Recruitment (RRB NTPC)**: Great opportunities for junior developer roles and senior section engineers.
- **General Administration (UPSC Civil Services)**: Excellent long-term path. CS grads score very well in the analytical Aptitude tests (CSAT).

#### Suggested Action Plan:
1. Revise quantitative aptitude topics.
2. Keep an eye out for SSC and UPSC notifications starting early next year.

*I have synced these metrics to your profile card! Let me know if you would like me to compare salary structures or exam syllabus details.*`;
      } else {
        answerText = `### AI Guidance Analysis
Hello! I noticed you are interested in career examination options. Based on a simulated profile (Age: **${extractedAge || 23}**, Education: **${extractedEducation || "Graduate"}**):

- **Generalist Entry**: Examinations like **SSC CGL** or administrative state tests offer stability with low entry barriers for any major.
- **Syllabus Prep**: Start preparing general knowledge, current events, and logical reasoning.

*Please feel free to ask about salaries, exam patterns, or syllabus structures!*`;
      }

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: answerText
        }
      ]);
      setChatLoading(false);
      return;
    }

    // 1. Extract Profile attributes
    try {
      const extract = await fetch("/api/extract-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          message: currentQuestion
        })
      });
      const updates = await extract.json();
      mergedProfile = { ...profile, ...updates };
      setProfile(mergedProfile);
    } catch (err) {
      console.error("Error extracting profile:", err);
    }

    // 2. Query Chat Assistant
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country,
          question: currentQuestion,
          messages: [...messages, userMessage],
          profile: mergedProfile
        })
      });
      if (!response.ok) throw new Error("Chat failed");
      const data = await response.json();
      
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: data.answer || "I'm sorry, I couldn't process that question."
        }
      ]);
    } catch (error) {
      console.warn("API chat failed, falling back to mock chat advisor:", error);
      setIsMock(true);
      // Run mock chat handler on the fly
      setQuestion(currentQuestion);
      askAI();
    } finally {
      setChatLoading(false);
    }
  }

  // Pre-configured questions for quick assistant interaction
  const quickPrompts = [
    { label: "🎓 Starter Exams?", text: "Which exams are best for beginners with low competition?" },
    { label: "💰 High Salaries?", text: "Which government jobs have the highest salary package?" },
    { label: "⚡ Compare exams", text: "Compare the difficulty level and syllabus of UPSC and SSC CGL." },
    { label: "⏰ Age 21 Grad?", text: "What examinations should a 21-year-old graduate focus on?" }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Black & Gold Premium Header */}
      <header className="glass-panel-heavy sticky top-0 z-50 px-6 py-4 border-b border-[#d4af37]/25 flex items-center justify-between shadow-lg shadow-black/80">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-amber-500 to-[#8a6f27] rounded-xl shadow-glow-gold/20 border border-[#d4af37]/35">
            <Compass className="w-6 h-6 text-black animate-pulse-slow" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-600">
              CareerCompass <span className="text-black text-sm px-2 py-0.5 ml-1 rounded-md border border-[#d4af37]/45 bg-[#d4af37] font-bold tracking-normal uppercase">AI</span>
            </h1>
            <p className="text-xs text-amber-200/50">Smart Government Exam Intelligence</p>
          </div>
        </div>

        {/* Global profile status overview */}
        <div className="hidden md:flex items-center gap-3">
          {profile.age && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-black/60 border border-[#d4af37]/20 text-slate-300 shadow-sm">
              Age: <strong className="text-amber-400">{profile.age}</strong>
            </span>
          )}
          {profile.education && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-black/60 border border-[#d4af37]/20 text-slate-300 shadow-sm">
              Edu: <strong className="text-amber-400 truncate max-w-[120px] inline-block align-middle">{profile.education}</strong>
            </span>
          )}
          {profile.nationality && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-black/60 border border-[#d4af37]/20 text-slate-300 shadow-sm">
              Nationality: <strong className="text-amber-400">{profile.nationality}</strong>
            </span>
          )}
          {profile.age || profile.education || profile.nationality ? (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          ) : (
            <span className="text-xs text-slate-500 italic">No Profile Extracted Yet</span>
          )}
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-[1600px] w-full mx-auto">
        
        {/* Left Side: Country & Exams Explorer (4 cols) */}
        <section className="lg:col-span-4 flex flex-col gap-6 h-full">
          
          {/* Country Search Card */}
          <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4 border border-[#d4af37]/10 shadow-lg shadow-black/40">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-amber-400" />
              1. Choose a Country
            </h2>
            <form onSubmit={handleSearchSubmit} className="relative flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={country}
                  onChange={e => handleCountryChange(e.target.value)}
                  placeholder="Type country (e.g. India, United States)"
                  className="w-full pl-4 pr-10 py-3 bg-neutral-950/80 border border-white/5 rounded-xl focus:border-neon-gold focus:outline-none focus:shadow-glow-gold/15 text-slate-100 placeholder-slate-650 transition-all text-sm font-semibold"
                />
                {country && (
                  <button
                    type="button"
                    onClick={() => { setCountry(""); setSuggestions([]); }}
                    className="absolute right-3 top-3.5 text-xs text-slate-400 hover:text-amber-400 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-[#8a6f27] hover:from-amber-450 hover:to-[#9a7e37] text-black font-extrabold text-sm transition-all hover:scale-[1.02] shadow-lg shadow-amber-500/10 hover:shadow-glow-gold-strong/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer border border-[#d4af37]/20"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin text-black" /> : <ArrowRight className="w-4 h-4 text-black" />}
                Explore
              </button>

              {/* Autocomplete Suggestions (Dropdown menu is overlayed nicely) */}
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a0c] border border-[#d4af37]/25 rounded-xl overflow-hidden z-20 shadow-2xl shadow-black">
                  {suggestions.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => selectCountry(item)}
                      className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-[#d4af37]/15 hover:text-amber-200 transition-all border-b border-white/5 last:border-b-0 flex items-center justify-between font-medium cursor-pointer"
                    >
                      <span>{item}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-500/50" />
                    </button>
                  ))}
                </div>
              )}
            </form>
          </div>

          {/* Exams Grid Card */}
          <div className="glass-panel p-5 rounded-2xl flex-1 flex flex-col min-h-[350px] border border-[#d4af37]/10 shadow-lg shadow-black/40">
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                2. Government Exams
              </h2>
              {country && (
                <span className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md font-mono">
                  {country}
                </span>
              )}
            </div>

            {/* Exam cards wrapper */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[420px] lg:max-h-[500px]">
              {loading ? (
                // Pulse loading skeletons
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 bg-neutral-900/40 border border-white/5 rounded-xl animate-pulse space-y-3">
                    <div className="h-4 bg-neutral-800 rounded w-2/3"></div>
                    <div className="h-3 bg-neutral-800 rounded w-1/2"></div>
                  </div>
                ))
              ) : exams.length > 0 ? (
                exams.map(exam => {
                  const isSelected = selectedExam?.id === exam.id;
                  return (
                    <button
                      key={exam.id}
                      onClick={() => openExam(exam)}
                      className={`w-full p-4 rounded-xl text-left border transition-all duration-300 cursor-pointer block relative ${
                        isSelected
                          ? "bg-gradient-to-r from-amber-955/20 to-neutral-900/60 border-neon-gold shadow-glow-gold/15"
                          : "bg-neutral-900/40 border-white/5 hover:border-neon-gold hover:scale-[1.01] hover:shadow-glow-gold/5"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-semibold text-slate-100 group-hover:text-white text-sm">{exam.name}</span>
                        {exam.detailsLoaded ? (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Synced
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-500/60 bg-amber-500/5 px-2 py-0.5 rounded-full border border-amber-500/10">
                            Click to sync
                          </span>
                        )}
                      </div>

                      {/* Brief visual info preview if details are loaded */}
                      {exam.detailsLoaded && (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          {(exam.minAge || exam.maxAge) && (
                            <span className="bg-black/40 text-slate-400 border border-white/5 px-2 py-0.5 rounded text-[10px]">
                              Age: {exam.minAge ?? "N/A"}-{exam.maxAge ?? "N/A"}
                            </span>
                          )}
                          {exam.education && (
                            <span className="bg-black/40 text-slate-400 border border-white/5 px-2 py-0.5 rounded text-[10px] truncate max-w-[150px]">
                              {exam.education}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/5 rounded-xl bg-neutral-900/10">
                  <Compass className="w-10 h-10 text-neutral-800 mb-2 animate-pulse-slow" />
                  <p className="text-sm text-slate-500">
                    {country ? "No exams loaded. Click 'Explore' to fetch them." : "Please select or type a country above to view examinations."}
                  </p>
                </div>
              )}

              {/* Load More Button */}
              {exams.length > 0 && hasMore && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full py-3 mt-4 border border-dashed border-amber-500/20 hover:border-neon-gold bg-amber-500/5 hover:bg-amber-500/10 rounded-xl text-xs text-amber-300 hover:text-white transition-all hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loadingMore ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      Searching web for more exams...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      Load More Exams
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* User Profile Attributes Drawer */}
          <div className="glass-panel p-5 rounded-2xl border border-[#d4af37]/10 shadow-lg shadow-black/40">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-amber-400" />
                Profile Context (Auto-Extracted)
              </h2>
              {(profile.age || profile.education || profile.nationality || profile.interests?.length) && (
                <button
                  onClick={clearProfile}
                  title="Clear profile"
                  className="text-xs text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>

            <div className="bg-black/60 rounded-xl p-3 border border-white/5 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className={`p-2 rounded-lg border transition-all ${
                  pulsingFields.includes("age") ? "bg-amber-500/15 border-[#d4af37] shadow-glow-gold" : "bg-neutral-900/30 border-white/5"
                }`}>
                  <span className="text-[10px] text-slate-500 block">Age</span>
                  <span className="font-semibold text-slate-200">{profile.age ?? <span className="text-slate-500 italic">Unknown</span>}</span>
                </div>
                <div className={`p-2 rounded-lg border transition-all ${
                  pulsingFields.includes("nationality") ? "bg-amber-500/15 border-[#d4af37] shadow-glow-gold" : "bg-neutral-900/30 border-white/5"
                }`}>
                  <span className="text-[10px] text-slate-500 block">Nationality</span>
                  <span className="font-semibold text-slate-200 truncate block">{profile.nationality ?? <span className="text-slate-500 italic">Unknown</span>}</span>
                </div>
              </div>

              <div className={`p-2 rounded-lg border transition-all ${
                pulsingFields.includes("education") ? "bg-amber-500/15 border-[#d4af37] shadow-glow-gold" : "bg-neutral-900/30 border-white/5"
              }`}>
                <span className="text-[10px] text-slate-500 block">Education Level</span>
                <span className="font-semibold text-slate-200 block truncate">{profile.education ?? <span className="text-slate-500 italic">Unknown</span>}</span>
              </div>

              <div className={`p-2 rounded-lg border transition-all ${
                pulsingFields.includes("interests") ? "bg-amber-500/15 border-[#d4af37] shadow-glow-gold" : "bg-neutral-900/30 border-white/5"
              }`}>
                <span className="text-[10px] text-slate-500 block">Interests</span>
                <span className="font-semibold text-slate-200 block">
                  {profile.interests?.length ? (
                    <span className="flex flex-wrap gap-1 mt-1">
                      {profile.interests.map(item => (
                        <span key={item} className="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded text-[10px]">{item}</span>
                      ))}
                    </span>
                  ) : (
                    <span className="text-slate-500 italic">None logged</span>
                  )}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 mt-2 italic leading-relaxed">
              💡 Attributes are automatically updated in real-time as you chat with the AI assistant!
            </p>
          </div>
        </section>

        {/* Right Side: Tabbed Intelligence / Chat (8 cols) */}
        <section className="lg:col-span-8 flex flex-col h-full min-h-[500px]">
          
          {/* Tab Selection Header */}
          <div className="flex border-b border-[#d4af37]/15 mb-4 bg-black/60 p-1.5 rounded-xl border border-white/5 shadow-md">
            <button
              onClick={() => setActiveTab("details")}
              className={`flex-1 py-3 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === "details"
                  ? "bg-neutral-900 text-amber-400 border border-white/5 shadow-lg shadow-amber-500/5"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4" />
              Exam Intelligence
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-3 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === "chat"
                  ? "bg-neutral-900 text-amber-400 border border-white/5 shadow-lg shadow-amber-500/5"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              AI Career Copilot
            </button>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 flex flex-col">
            
            {/* TAB 1: Exam Intelligence Infographics */}
            {activeTab === "details" && (
              <div className="glass-panel rounded-2xl p-6 flex-1 flex flex-col h-full overflow-y-auto border border-[#d4af37]/10 shadow-lg shadow-black/40">
                {examLoading ? (
                  // Pulse Skeleton Infographic
                  <div className="space-y-6 animate-pulse my-auto max-w-2xl mx-auto w-full">
                    <div className="h-8 bg-neutral-900 rounded w-1/3"></div>
                    <div className="h-4 bg-neutral-900 rounded w-full"></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-24 bg-neutral-900 rounded"></div>
                      <div className="h-24 bg-neutral-900 rounded"></div>
                    </div>
                    <div className="h-40 bg-neutral-900 rounded"></div>
                  </div>
                ) : selectedExam ? (
                  <div className="space-y-6">
                    
                    {/* Header info */}
                    <div className="border-b border-white/5 pb-5">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-full uppercase tracking-wider font-bold">
                            Government Exam
                          </span>
                          <h2 className="text-2xl font-extrabold text-white mt-2">{selectedExam.name}</h2>
                        </div>
                        {selectedExam.officialUrl && (
                          <a
                            href={selectedExam.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-[#8a6f27] hover:from-amber-450 hover:to-[#9a7e37] text-black rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all hover:shadow-glow-gold border border-[#d4af37]/20"
                          >
                            <LinkIcon className="w-3.5 h-3.5 text-black" />
                            Official Website
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Eligibility & Info Blocks */}
                    <div>
                      <h3 className="text-xs font-bold text-amber-500/60 uppercase tracking-widest mb-4">
                        Eligibility Criteria & Guidelines
                      </h3>

                      {/* Age Meter Visualizer */}
                      {(selectedExam.minAge !== null || selectedExam.maxAge !== null) && (
                        <div className="bg-black/60 border border-white/5 rounded-2xl p-5 mb-5">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                              <Activity className="w-4 h-4 text-amber-400" />
                              Age Window Limit
                            </span>
                            <span className="text-xs font-mono font-bold text-amber-400">
                              {selectedExam.minAge ?? "N/A"} - {selectedExam.maxAge ?? "N/A"} Years
                            </span>
                          </div>

                          {/* Interactive Range Track */}
                          <div className="relative h-2 bg-neutral-900 rounded-full overflow-hidden mt-3">
                            <div
                              className="absolute top-0 bottom-0 bg-gradient-to-r from-amber-400 to-[#d4af37] rounded-full"
                              style={{
                                left: `${selectedExam.minAge ? Math.min(Math.max((selectedExam.minAge / 60) * 100, 0), 100) : 0}%`,
                                right: `${selectedExam.maxAge ? Math.min(Math.max((1 - (selectedExam.maxAge / 60)) * 100, 0), 100) : 0}%`
                              }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-655 mt-2 font-mono">
                            <span>0y</span>
                            <span>18y</span>
                            <span>30y</span>
                            <span>45y</span>
                            <span>60y</span>
                          </div>
                        </div>
                      )}

                      {/* Grid parameters */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Education */}
                        <div className="p-4 bg-neutral-900/30 border border-white/5 rounded-xl flex items-start gap-3">
                          <div className="p-2 bg-amber-500/10 rounded-lg">
                            <BookOpen className="w-4 h-4 text-amber-400" />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-550 uppercase font-bold tracking-wider block">Education Requirements</span>
                            <span className="text-xs text-slate-200 mt-1 block">
                              {selectedExam.education || <span className="text-slate-500 italic font-medium">Not Specified</span>}
                            </span>
                          </div>
                        </div>

                        {/* Experience */}
                        <div className="p-4 bg-neutral-900/30 border border-white/5 rounded-xl flex items-start gap-3">
                          <div className="p-2 bg-amber-500/10 rounded-lg">
                            <Briefcase className="w-4 h-4 text-amber-400" />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-550 uppercase font-bold tracking-wider block">Prior Experience</span>
                            <span className="text-xs text-slate-200 mt-1 block">
                              {selectedExam.experience || <span className="text-slate-500 italic font-medium">None required / Freshers eligible</span>}
                            </span>
                          </div>
                        </div>

                        {/* Nationality */}
                        <div className="p-4 bg-neutral-900/30 border border-white/5 rounded-xl flex items-start gap-3">
                          <div className="p-2 bg-amber-500/10 rounded-lg">
                            <Globe className="w-4 h-4 text-amber-400" />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-550 uppercase font-bold tracking-wider block">Nationality</span>
                            <span className="text-xs text-slate-200 mt-1 block">
                              {selectedExam.nationality || <span className="text-slate-500 italic font-medium">Not Specified</span>}
                            </span>
                          </div>
                        </div>

                        {/* Physical Requirements */}
                        <div className="p-4 bg-neutral-900/30 border border-white/5 rounded-xl flex items-start gap-3">
                          <div className="p-2 bg-amber-500/10 rounded-lg">
                            <Heart className="w-4 h-4 text-amber-400" />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-550 uppercase font-bold tracking-wider block">Physical Standards</span>
                            <span className="text-xs text-slate-200 mt-1 block">
                              {selectedExam.physicalRequirements || <span className="text-slate-500 italic font-medium">Standard health requirements</span>}
                            </span>
                          </div>
                        </div>

                        {/* Attempts Allowed */}
                        <div className="p-4 bg-neutral-900/30 border border-white/5 rounded-xl flex items-start gap-3">
                          <div className="p-2 bg-amber-500/10 rounded-lg">
                            <Award className="w-4 h-4 text-amber-400" />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-550 uppercase font-bold tracking-wider block">Attempts Allowed</span>
                            <span className="text-xs text-slate-200 mt-1 block">
                              {selectedExam.attemptsAllowed || <span className="text-slate-500 italic font-medium">No limit specified</span>}
                            </span>
                          </div>
                        </div>

                        {/* Category Relaxations */}
                        <div className="p-4 bg-neutral-900/30 border border-white/5 rounded-xl flex items-start gap-3">
                          <div className="p-2 bg-amber-500/10 rounded-lg">
                            <Users className="w-4 h-4 text-amber-400" />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-555 uppercase font-bold tracking-wider block">Relaxation Perks</span>
                            <span className="text-xs text-slate-200 mt-1 block">
                              {selectedExam.categoryRelaxation || <span className="text-slate-500 italic font-medium">Standard category rules apply</span>}
                            </span>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Detailed Description */}
                    {selectedExam.description && (
                      <div className="bg-black/60 border border-white/5 rounded-2xl p-5">
                        <h4 className="text-sm font-bold text-amber-500/60 uppercase tracking-wider mb-2">Exam Description</h4>
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{selectedExam.description}</p>
                      </div>
                    )}

                  </div>
                ) : (
                  // Empty State Placeholder
                  <div className="my-auto flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto">
                    <div className="p-4 bg-neutral-900 border border-[#d4af37]/20 rounded-3xl mb-4 shadow-glow-gold/5">
                      <Compass className="w-12 h-12 text-amber-400 animate-spin-slow" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Eligibility Dashboard</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Select an exam card from the list on the left to see complete age ranges, educational prerequisites, attempt allowances, and official web links.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: AI Copilot Message Log */}
            {activeTab === "chat" && (
              <div className="glass-panel rounded-2xl flex-1 flex flex-col h-full overflow-hidden border border-[#d4af37]/10 shadow-lg shadow-black/40">
                
                {/* Chat Panel Header */}
                <div className="px-5 py-3.5 border-b border-white/5 bg-neutral-900/40 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4.5 h-4.5 text-amber-400 animate-pulse" />
                    <span className="text-sm font-bold text-white">AI Career Copilot</span>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  </div>
                  {messages.length > 0 && (
                    <button
                      onClick={clearChat}
                      className="text-xs text-slate-505 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear History
                    </button>
                  )}
                </div>

                {/* Messages scrollarea */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[300px] lg:max-h-[480px]">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto my-auto space-y-3">
                      <div className="p-3.5 bg-amber-500/10 rounded-2xl border border-amber-500/10">
                        <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
                      </div>
                      <h4 className="text-md font-bold text-white">Ready for Guidance</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Ask career-related queries like syllabus guides, salary breakdowns, study timelines, or help matching your background to vacancies.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      const isUser = msg.role === "user";
                      return (
                        <div key={index} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] rounded-2xl px-4 py-3 border text-sm transition-all duration-300 ${
                            isUser
                              ? "bg-gradient-to-r from-neutral-900 to-zinc-900 text-slate-200 border-[#d4af37]/35 shadow-md"
                              : "bg-neutral-900/40 border-l-2 border-l-amber-500/40 border-y-white/5 border-r-white/5 shadow-md"
                          }`}>
                            <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold tracking-wider uppercase">
                              {isUser ? (
                                <>
                                  <User className="w-3 h-3 text-amber-400" />
                                  <span className="text-amber-400">You</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3 h-3 text-amber-400" />
                                  <span className="text-amber-400">CareerCompass AI</span>
                                </>
                              )}
                            </div>
                            
                            {isUser ? (
                              <p className="whitespace-pre-wrap leading-relaxed text-slate-200 font-medium">{msg.content}</p>
                            ) : (
                              <Markdown text={msg.content} />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Thinking Bubble */}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-neutral-900/40 border border-white/5 rounded-2xl px-5 py-4 text-sm max-w-[80%] flex items-center gap-3">
                        <RefreshCw className="w-4.5 h-4.5 animate-spin text-amber-400" />
                        <span className="text-xs text-slate-400">Processing question & updating profile...</span>
                      </div>
                    </div>
                  )}
                  
                  <div ref={chatEndRef} />
                </div>

                {/* Input Console */}
                <div className="p-4 border-t border-white/5 bg-[#08080a] flex-shrink-0 flex flex-col gap-3">
                  
                  {/* Quick Suggestions */}
                  <div className="flex flex-wrap gap-2 pr-1">
                    {quickPrompts.map(p => (
                      <button
                        key={p.label}
                        disabled={chatLoading}
                        onClick={() => { setQuestion(p.text); }}
                        className="px-2.5 py-1 rounded-lg bg-neutral-950 hover:bg-neutral-900 border border-white/5 text-[10px] text-slate-400 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Textarea Form */}
                  <div className="flex gap-2 items-end">
                    <textarea
                      value={question}
                      onChange={e => setQuestion(e.target.value)}
                      placeholder="Type a career or exam query... (e.g. 'I am 23 years old with a CS degree. Which exams can I take?')"
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          askAI();
                        }
                      }}
                      rows={2}
                      className="flex-1 bg-neutral-950/80 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-neon-gold focus:shadow-glow-gold/15 text-slate-100 placeholder-slate-500 transition-all resize-none"
                    />
                    <button
                      onClick={askAI}
                      disabled={chatLoading || !question.trim()}
                      className="p-3.5 bg-gradient-to-r from-amber-500 to-[#8a6f27] hover:from-amber-450 hover:to-[#9a7e37] rounded-xl text-black font-extrabold transition-all hover:scale-[1.02] shadow-lg shadow-amber-600/10 hover:shadow-glow-gold/20 disabled:opacity-30 disabled:scale-100 flex items-center justify-center cursor-pointer border border-[#d4af37]/20"
                    >
                      <Send className="w-4 h-4 text-black" />
                    </button>
                  </div>
                </div>

              </div>
            )}

          </div>

        </section>

      </main>

      {/* Footer bar */}
      <footer className="mt-8 border-t border-white/5 py-4 px-6 text-center text-[10px] text-slate-500">
        CareerCompass-AI • Powered by Gemini 2.5 Flash with Google Search Tool integration. Cached locally on Google Firestore.
      </footer>
    </div>
  );
}
