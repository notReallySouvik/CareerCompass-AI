import {
  NextRequest,
  NextResponse,
} from "next/server";

import { ai }
  from "@/lib/gemini";

export async function POST(
  req: NextRequest
) {
  try {
    const {
      profile,
      message,
    } = await req.json();

    const prompt = `
Current Profile:
${JSON.stringify(profile)}

User Message:
${message}

Extract profile information.

Return ONLY valid JSON.

Schema:
{
  "age": number | null,
  "nationality": string | null,
  "education": string | null,
  "interests": string[],
  "competitionTolerance": string | null
}
`;

    const result =
      await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

    const text =
      (result.text || "")
        .replace(
          /```json|```/g,
          ""
        )
        .trim();

    try {
      return NextResponse.json(
        JSON.parse(text)
      );
    } catch {
      console.log(
        "Bad JSON:",
        text
      );

      return NextResponse.json({});
    }
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {},
      { status: 500 }
    );
  }
}