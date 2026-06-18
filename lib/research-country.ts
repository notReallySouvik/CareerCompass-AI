import { ai } from "./gemini";

function cleanJson(text: string) {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}

export async function researchCountry(country: string) {
  const prompt = `
Using Google Search, list government job examinations in ${country}.

Return ONLY JSON.

[
  {
    "name": "SSC CGL"
  }
]

Return as many exams as possible.
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return JSON.parse(
    cleanJson(response.text || "[]")
  );
}