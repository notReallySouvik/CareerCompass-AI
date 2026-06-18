import {
  NextRequest,
  NextResponse,
} from "next/server";

import { ai }
  from "@/lib/gemini";

function needsLiveSearch(
  question: string
) {
  const q =
    question.toLowerCase();

  return [
    "latest",
    "current",
    "today",
    "2026",
    "2027",
    "vacancy",
    "vacancies",
    "notification",
    "notifications",
    "opening",
    "openings",
    "deadline",
    "recruitment",
    "apply now",
    "new jobs",
    "job openings",
  ].some((word) =>
    q.includes(word)
  );
}

export async function POST(
  req: NextRequest
) {
  try {

    const body =
      await req.json();

    const country =
      body.country;

    const question =
      body.question;

    const messages =
      body.messages || [];

    const profile =
      body.profile || {};


const guardrailPrompt = `
You are a classifier.

Determine if the user's question is related to:

- careers
- jobs
- employment
- government jobs
- government exams
- recruitment
- salaries
- professional development
- education
- degrees
- certifications
- skills
- university admissions
- internships
- resume building
- career switching

Question:

${question}

Return ONLY:

YES

or

NO
`;

const guardrail =
  await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: guardrailPrompt,
  });

const guardrailResult =
  (
    guardrail.text || ""
  )
    .trim()
    .toUpperCase();

if (
  !guardrailResult.includes(
    "YES"
  )
) {
  return NextResponse.json({
    answer: `
I'm CareerCompass AI and can only assist with:

• Careers
• Government jobs
• Government exams
• Employment opportunities
• Education pathways
• Certifications
• Professional development

Please ask a career-related question.
`,
  });
}

const prompt = `
You are CareerCompass AI.

IMPORTANT:

You ONLY answer questions related to:

- careers
- jobs
- government jobs
- government exams
- employment
- salaries
- education
- certifications
- universities
- admissions
- professional skills
- career planning

If a user asks anything outside these topics,
politely refuse and redirect them back to career guidance.

Known User Profile:

${JSON.stringify(
  profile,
  null,
  2
)}

Selected Country:

${country}

Conversation History:

${JSON.stringify(
  messages,
  null,
  2
)}

Latest User Question:

${question}

Instructions:

1. Personalize using the user profile.
2. Use remembered information whenever possible.
3. Ask follow-up questions if important information is missing.
4. Give practical recommendations.
5. Mention competition levels when relevant.
6. If web search is available, use current information.
7. Never answer unrelated questions.
`;


    const useSearch =
  needsLiveSearch(question);

const result =
  await ai.models.generateContent({
    model:
      "gemini-2.5-flash",

    contents:
      prompt,

    config: useSearch
      ? {
          tools: [
            {
              googleSearch: {},
            },
          ],
        }
      : undefined,
  });

    return NextResponse.json({
      answer:
        result.text || "",
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        error:
          "Failed to generate response",
      },
      {
        status: 500,
      }
    );
  }
}