import { NextRequest, NextResponse } from "next/server";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import { researchCountry } from "@/lib/research-country";

export async function POST(req: NextRequest) {
  try {
const body = await req.json();

const country =
  body.country?.trim();
    const examsRef = collection(
      db,
      "countries",
      country,
      "exams"
    );

    if (!country) {
  return NextResponse.json(
    {
      success: false,
      error: "Country required",
    },
    {
      status: 400,
    }
  );
}

    const existing = await getDocs(examsRef);

    if (!existing.empty) {
      return NextResponse.json({
        success: true,
        cached: true,
      });
    }

    const exams =
      await researchCountry(country);

    for (const exam of exams) {
await addDoc(examsRef, {
  name: exam.name,

  detailsLoaded: false,

  description: "",

  minAge: null,
  maxAge: null,

  education: "",

  nationality: "",

  experience: "",

  physicalRequirements: "",

  attemptsAllowed: "",

  categoryRelaxation: "",

  officialUrl: "",
});
    }

    // mark country initialized
await updateDoc(
  doc(db, "countries", country),
  {
    initialized: true,
  }
);

    return NextResponse.json({
      success: true,
      count: exams.length,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}