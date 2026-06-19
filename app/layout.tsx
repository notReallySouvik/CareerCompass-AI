import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareerCompass AI - Government Exam Explorer & Career Assistant",
  description: "Explore government examinations, check eligibility criteria, and chat with our intelligent career assistant.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gradient-to-br from-neutral-950 via-zinc-900 to-neutral-950 min-h-screen text-slate-100 antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}