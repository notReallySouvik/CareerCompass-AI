import { ai } from "./gemini";

function cleanJson(text: string) {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}

export async function researchExamDetails(
  examName: string,
  country: string
) {
  const prompt = `
Using web search.

Find details about:

${examName}
Country: ${country}

Return ONLY JSON.

{
  description: string,

  minAge: number | null,
  maxAge: number | null,

  education: string,

  nationality: string,

  experience: string,

  physicalRequirements: string,

  attemptsAllowed: string,

  categoryRelaxation: string,

  officialUrl: string
}
`;
let response;

  try {

    response =
      await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

  } catch (error: any) {

    if (
      error?.message?.includes("503") ||
      error?.message?.includes("UNAVAILABLE")
    ) {

      await new Promise(
        resolve =>
          setTimeout(resolve, 2000)
      );

response =
  await ai.models.generateContent({
    model: "gemini-2.5-flash",

    contents: prompt,

    config: {
      tools: [
        {
          googleSearch: {},
        },
      ],
    },
  });

    } else {

      throw error;

    }
  }

  return JSON.parse(
    cleanJson(
      response.text || "{}"
    )
  );
}