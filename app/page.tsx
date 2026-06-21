"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

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

function getAssistantCountry(country: string, profile: UserProfile, message: string) {
  return profile.nationality ?? "";
}

export default function Home() {
  const [country, setCountry] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [question, setQuestion] = useState("");
  const [profile, setProfile] = useState<UserProfile>({});
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedProfile = localStorage.getItem("careerProfile");

    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile));
      } catch {
        localStorage.removeItem("careerProfile");
      }
    }

    const savedChat = localStorage.getItem("careerChat");

    if (savedChat) {
      try {
        setMessages(JSON.parse(savedChat));
      } catch {
        localStorage.removeItem("careerChat");
      }
    }
  }, []);

  useEffect(() => {
    async function loadCountries() {
      try {
        let snapshot = await getDocs(collection(db, "countries"));

        if (snapshot.empty) {
          await fetch("/api/init-db", {
            method: "POST",
          });

          snapshot = await getDocs(collection(db, "countries"));
        }

        const list = snapshot.docs
          .map(doc => doc.data().name)
          .filter((name): name is string => typeof name === "string");

        setCountries(list);
      } catch (err) {
        console.error(err);
        setNotice("Countries could not be loaded. Check Firebase configuration.");
      }
    }

    loadCountries();
  }, []);

  useEffect(() => {
    localStorage.setItem("careerChat", JSON.stringify(messages));
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("careerProfile", JSON.stringify(profile));
  }, [profile]);

  function clearChat() {
    setMessages([]);
    localStorage.removeItem("careerChat");
  }

  function clearProfile() {
    setProfile({});
    localStorage.removeItem("careerProfile");
  }

  function handleCountryChange(value: string) {
    setCountry(value);

    if (!value.trim()) {
      setSuggestions([]);
      return;
    }

    const filtered = countries.filter(item =>
      item.toLowerCase().startsWith(value.toLowerCase()),
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

  async function searchCountry(event: FormEvent) {
    event.preventDefault();

    if (!country.trim()) {
      return;
    }

    setSuggestions([]);
    setSelectedExam(null);
    setHasMore(true);
    await loadExams(country.trim());
  }

  async function loadExams(selectedCountry: string) {
    setLoading(true);
    setNotice("");

    try {
      let response = await fetch(`/api/exams/${selectedCountry}`);
      let data = await response.json();
      let existing = data.exams || [];

      if (existing.length === 0) {
        const sync = await fetch("/api/sync-country", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            country: selectedCountry,
          }),
        });

        await sync.json();

        response = await fetch(`/api/exams/${selectedCountry}`);
        data = await response.json();
        existing = data.exams || [];
      }

      setExams(existing);
    } catch (err) {
      console.error(err);
      setNotice("Exams could not be loaded. Check your backend and API key setup.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!country) return;

    setLoadingMore(true);
    setNotice("");

    try {
      const beforeNames = exams.map(e => e.name);

      await fetch("/api/sync-country", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          country,
        }),
      });

      const response = await fetch(`/api/exams/${encodeURIComponent(country)}`);

      if (!response.ok) {
        throw new Error("Failed loading details");
      }

      const data = await response.json();
      const after = data.exams || [];
      const newExams = after.filter((exam: Exam) => !beforeNames.includes(exam.name));

      if (newExams.length === 0) {
        setHasMore(false);
        return;
      }

      setExams(after);
    } catch (err) {
      console.error(err);
      setNotice("No more exams could be loaded right now.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function openExam(exam: Exam) {
    setSelectedExam(exam);

    if (exam.detailsLoaded) {
      return;
    }

    setDetailsLoading(true);
    setNotice("");

    try {
      const response = await fetch("/api/exam-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          country,
          exam,
        }),
      });

      const details = await response.json();

      setSelectedExam({
        ...exam,
        ...details,
      });
    } catch (err) {
      console.error(err);
      setNotice("Exam details could not be loaded.");
    } finally {
      setDetailsLoading(false);
    }
  }

  async function askAI() {
    if (!question.trim()) {
      return;
    }

    const userMessage = {
      role: "user" as const,
      content: question,
    };

    const nextMessages = [...messages, userMessage];
    const currentQuestion = question;
    let mergedProfile = profile;

    setMessages(nextMessages);

    try {
      const extract = await fetch("/api/extract-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile,
          message: currentQuestion,
        }),
      });

      const updates = await extract.json();

      mergedProfile = {
        ...profile,
        ...updates,
      };

      setProfile(mergedProfile);
    } catch (err) {
      console.error(err);
    }

    setQuestion("");

    try {
      setChatLoading(true);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          country: getAssistantCountry(country, mergedProfile, currentQuestion),
          question: currentQuestion,
          messages: nextMessages,
          profile: mergedProfile,
        }),
      });

      const data = await response.json();

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
        },
      ]);
    } catch (error) {
      console.error(error);
      setNotice("AI assistant could not answer right now.");
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#06080d] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(26,93,255,0.26),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(212,175,55,0.16),transparent_28%)]" />
      <div className="pointer-events-none fixed inset-0 shadow-[inset_0_0_55px_rgba(44,136,255,0.45)]" />

      <header className="relative z-10 flex h-[76px] items-center justify-between border-b border-amber-400/15 bg-[#090d18]/90 px-5 shadow-[0_0_34px_rgba(26,93,255,0.18)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-300/30 bg-gradient-to-br from-amber-300 to-yellow-600 text-xl font-black text-black shadow-[0_0_22px_rgba(212,175,55,0.35)]">
            C
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-amber-300">CareerCompass</h1>
              <span className="rounded-md bg-amber-300 px-2 py-0.5 text-xs font-black text-black">
                AI
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400">
              Smart Government Exam Intelligence
            </p>
          </div>
        </div>

        <div className="hidden text-xs italic text-slate-500 sm:block">
          {profile.age || profile.education || profile.nationality
            ? "Profile context active"
            : "No Profile Extracted Yet"}
        </div>
      </header>

      <div className="relative z-10 grid gap-5 p-5 lg:grid-cols-[380px_1fr]">
        <aside className="space-y-5">
          <section className="relative z-40 rounded-2xl border border-white/5 bg-[#0c101b]/78 p-4 shadow-[0_12px_34px_rgba(0,0,0,0.32)] backdrop-blur-xl">
            <form onSubmit={searchCountry} className="relative">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
                Country
              </label>
              <div className="flex gap-2">
                <input
                  value={country}
                  onChange={event => handleCountryChange(event.target.value)}
                  placeholder="Type or select a country"
                  className="h-11 min-w-0 flex-1 rounded-xl border border-white/5 bg-black/35 px-3 text-sm font-semibold text-slate-100 outline-none transition focus:border-amber-300/60"
                />
                <button
                  disabled={loading}
                  className="h-11 rounded-xl bg-amber-300 px-4 text-sm font-black text-black transition hover:bg-amber-200 disabled:opacity-50"
                >
                  {loading ? "..." : "Search"}
                </button>
              </div>

              {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-[72px] z-50 overflow-hidden rounded-xl border border-amber-300/20 bg-[#080b12] shadow-2xl">
                  {suggestions.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => selectCountry(item)}
                      className="block w-full px-4 py-3 text-left text-sm font-semibold text-slate-300 transition hover:bg-amber-300/10 hover:text-amber-200"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </form>
          </section>

          <section className="min-h-[210px] rounded-2xl border border-white/5 bg-[#0c101b]/78 p-4 shadow-[0_12px_34px_rgba(0,0,0,0.32)] backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-white">Examinations</h2>
              {exams.length > 0 && (
                <span className="rounded-full border border-amber-300/15 px-2 py-1 text-[11px] text-amber-200">
                  {exams.length}
                </span>
              )}
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(item => (
                  <div key={item} className="h-12 animate-pulse rounded-xl bg-black/30" />
                ))}
              </div>
            ) : exams.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-white/5 bg-black/15 px-8 text-center text-xs leading-relaxed text-slate-500">
                Please select or type a country above to view examinations.
              </div>
            ) : (
              <div className="max-h-[310px] space-y-2 overflow-y-auto pr-1">
                {exams.map(exam => (
                  <button
                    key={exam.id}
                    onClick={() => openExam(exam)}
                    className={`block w-full rounded-xl border px-3 py-3 text-left text-sm font-bold transition ${
                      selectedExam?.id === exam.id
                        ? "border-amber-300/55 bg-amber-300/10 text-amber-100"
                        : "border-white/5 bg-black/22 text-slate-300 hover:border-amber-300/25 hover:bg-amber-300/5"
                    }`}
                  >
                    {exam.name}
                  </button>
                ))}
              </div>
            )}

            {exams.length > 0 && hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="mt-3 h-10 w-full rounded-xl border border-amber-300/15 bg-black/20 text-xs font-extrabold text-amber-200 transition hover:bg-amber-300/10 disabled:opacity-50"
              >
                {loadingMore ? "Searching..." : "Load More Exams"}
              </button>
            )}
          </section>

          <section className="rounded-2xl border border-white/5 bg-[#0c101b]/78 p-4 shadow-[0_12px_34px_rgba(0,0,0,0.32)] backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-white">Profile Context (Auto-Extracted)</h2>
              <button onClick={clearProfile} className="text-[11px] text-slate-500 hover:text-amber-200">
                Clear
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-white/5 bg-black/35">
              <ProfileLine label="Age" value={profile.age} />
              <ProfileLine label="Nationality" value={profile.nationality} />
              <ProfileLine label="Education Level" value={profile.education} wide />
              <ProfileLine label="Interests" value={profile.interests?.join(", ")} wide />
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
              Profile bits are automatically updated in real-time as you chat with the AI assistant.
            </p>
          </section>
        </aside>

        <section className="grid gap-5 xl:grid-rows-[1fr_550px]">
          <section className="min-h-[430px] rounded-2xl border border-white/5 bg-[#0b0f1a] p-6 shadow-[0_16px_45px_rgba(0,0,0,0.38)] backdrop-blur-xl">
            {detailsLoading ? (
              <div className="flex h-full min-h-[360px] items-center justify-center">
                <div className="text-sm font-bold text-amber-200">Loading eligibility details...</div>
              </div>
            ) : selectedExam ? (
              <div className="mx-auto max-w-5xl">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-white/5 pb-5">
                  <div>
                    <div className="mb-3 inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-amber-200">
                      Government Exam
                    </div>
                    <h2 className="text-3xl font-black text-white">{selectedExam.name}</h2>
                  </div>

                  {selectedExam.officialUrl && (
                    <a
                      href={selectedExam.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl bg-amber-300 px-4 py-3 text-sm font-black text-black transition hover:bg-amber-200"
                    >
                      Official Website
                    </a>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <InfoTile label="Age Limit" value={formatAge(selectedExam)} />
                  <InfoTile label="Education" value={selectedExam.education} />
                  <InfoTile label="Nationality" value={selectedExam.nationality} />
                  <InfoTile label="Experience" value={selectedExam.experience} />
                  <InfoTile label="Physical Standards" value={selectedExam.physicalRequirements} />
                  <InfoTile label="Attempts Allowed" value={selectedExam.attemptsAllowed} />
                  <InfoTile label="Category Relaxation" value={selectedExam.categoryRelaxation} wide />
                </div>

                <div className="mt-5 rounded-2xl border border-white/5 bg-black/25 p-5">
                  <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-amber-200">
                    Description
                  </h3>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                    {selectedExam.description || "No description returned yet."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center">
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-300/20 bg-black/25 text-4xl font-black text-amber-300 shadow-[0_0_28px_rgba(212,175,55,0.18)]">
                  C
                </div>
                <h2 className="mb-3 text-xl font-black text-white">Eligibility Dashboard</h2>
                <p className="max-w-md text-sm leading-7 text-slate-400">
                  Select an exam card from the list on the left to see complete age ranges,
                  educational prerequisites, attempt allowances, and official web links.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/5 bg-[#0b0f1a] shadow-[0_16px_45px_rgba(0,0,0,0.38)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <h2 className="text-sm font-black text-white">AI Career Assistant</h2>
              {messages.length > 0 && (
                <button onClick={clearChat} className="text-xs text-slate-500 hover:text-amber-200">
                  Clear Chat
                </button>
              )}
            </div>

            <div className="grid h-[500px] gap-0 md:grid-cols-[1fr_360px]">
              <div className="space-y-3 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">
                    Ask questions about eligibility, salary, competition, preparation strategy, or
                    career paths.
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`rounded-xl border p-3 ${
                        message.role === "user"
                          ? "ml-auto max-w-[86%] border-amber-300/15 bg-amber-300/10"
                          : "mr-auto max-w-[86%] border-white/5 bg-black/25"
                      }`}
                    >
                      <div className="mb-1 text-[11px] font-black uppercase tracking-wide text-amber-200">
                        {message.role === "user" ? "You" : "CareerCompass AI"}
                      </div>
                      {message.role === "user" ? (
                        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                          {message.content}
                        </p>
                      ) : (
                        <div className="text-sm">
                          <ReactMarkdown
                            components={{
                              h1: ({ children }) => (
                                <h1 className="mb-2 mt-5 text-xl font-black text-amber-200">
                                  {children}
                                </h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className="mb-2 mt-5 text-lg font-black text-amber-200">
                                  {children}
                                </h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className="mb-2 mt-4 text-base font-black text-amber-200">
                                  {children}
                                </h3>
                              ),
                              p: ({ children }) => (
                                <p className="my-2 leading-6 text-slate-300">{children}</p>
                              ),
                              ul: ({ children }) => (
                                <ul className="my-3 list-disc space-y-2 pl-5 text-slate-300">
                                  {children}
                                </ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="my-3 list-decimal space-y-2 pl-5 text-slate-300">
                                  {children}
                                </ol>
                              ),
                              li: ({ children }) => (
                                <li className="leading-6 text-slate-300">{children}</li>
                              ),
                              strong: ({ children }) => (
                                <strong className="font-extrabold text-amber-100">
                                  {children}
                                </strong>
                              ),
                              a: ({ children, href }) => (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-bold text-amber-200 underline underline-offset-2"
                                >
                                  {children}
                                </a>
                              ),
                              code: ({ children }) => (
                                <code className="rounded border border-white/10 bg-black/35 px-1.5 py-0.5 text-xs text-amber-100">
                                  {children}
                                </code>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  ))
                )}

                {chatLoading && (
                  <div className="text-sm font-bold text-amber-200">Thinking...</div>
                )}

                <div ref={chatEndRef} />
              </div>

<div className="flex h-full flex-col border-t border-white/5 p-4 md:border-l md:border-t-0">
<textarea
  value={question}
  onChange={event => setQuestion(event.target.value)}
  placeholder="Ask about government exams..."
  className="flex-1 w-full resize-none rounded-xl border border-white/5 bg-black/35 p-3 text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-amber-300/50"
/>
                <button
                  onClick={askAI}
                  disabled={chatLoading || !question.trim()}
                  className="mt-3 h-11 w-full rounded-xl bg-amber-300 text-sm font-black text-black transition hover:bg-amber-200 disabled:opacity-50"
                >
                  {chatLoading ? "Thinking..." : "Ask AI"}
                </button>
              </div>
            </div>
          </section>
        </section>
      </div>

      {notice && (
        <div className="fixed bottom-12 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-amber-300/20 bg-[#090d18] px-4 py-3 text-sm font-bold text-amber-100 shadow-2xl">
          {notice}
        </div>
      )}

      {showDisclaimer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/72 p-5 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-amber-300/20 bg-[#0b0f1a] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
            <div className="mb-4 inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-amber-200">
              Important Disclaimer
            </div>

            <h2 className="text-2xl font-black text-white">Verify Before You Act</h2>

            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              <p>
                CareerCompass AI provides educational guidance about careers, government jobs,
                exams, eligibility, and preparation paths. It does not make final eligibility,
                hiring, legal, financial, or admission decisions.
              </p>

              <p>
                AI responses and cached exam information may be incomplete, outdated, or
                incorrect. Always verify dates, eligibility rules, application requirements, and
                official notices on the relevant government or exam authority website.
              </p>

              <p>
                Any profile details you provide are used only to personalize guidance in this app.
                Do not enter sensitive personal information unless you are comfortable sharing it.
              </p>
            </div>

            <button
              onClick={() => setShowDisclaimer(false)}
              className="mt-6 h-11 w-full rounded-xl bg-amber-300 text-sm font-black text-black transition hover:bg-amber-200"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      <footer className="relative z-10 border-t border-white/5 py-3 text-center text-[11px] text-slate-600">
        CareerCompass-AI - Powered by Gemini 2.5 Flash with Google Search Tool integration.
        Cached locally on Google Firestore.
      </footer>
    </main>
  );
}

function ProfileLine({
  label,
  value,
  wide,
}: {
  label: string;
  value?: string | number;
  wide?: boolean;
}) {
  return (
    <div className={`border-b border-white/5 p-3 last:border-b-0 ${wide ? "" : "inline-block w-1/2"}`}>
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-600">{label}</div>
      <div className="mt-1 truncate text-xs font-semibold text-slate-300">
        {value || "Unknown"}
      </div>
    </div>
  );
}

function InfoTile({
  label,
  value,
  wide,
}: {
  label: string;
  value?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/5 bg-black/25 p-4 ${
        wide ? "md:col-span-2 xl:col-span-3" : ""
      }`}
    >
      <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold leading-6 text-slate-200">
        {value || <span className="italic text-slate-600">Not specified</span>}
      </div>
    </div>
  );
}

function formatAge(exam: Exam) {
  if (exam.minAge === null && exam.maxAge === null) {
    return "";
  }

  if (exam.minAge === undefined && exam.maxAge === undefined) {
    return "";
  }

  return `${exam.minAge ?? "N/A"} - ${exam.maxAge ?? "N/A"} years`;
}
