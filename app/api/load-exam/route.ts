import { NextRequest, NextResponse } from "next/server";

import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import { researchExamDetails }
  from "@/lib/research-exam-details";

export async function POST(req: NextRequest) {
  try {
    const {
      country,
      examId,
    } = await req.json();

    const examRef = doc(
      db,
      "countries",
      country,
      "exams",
      examId
    );

    const snapshot = await getDoc(examRef);

    if (!snapshot.exists()) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    const exam = snapshot.data();

    if (exam.detailsLoaded) {
      return NextResponse.json(exam);
    }

    const details =
      await researchExamDetails(
        exam.name,
        country
      );

    await updateDoc(examRef, {
      ...details,

      detailsLoaded: true,

      lastUpdated:
        new Date().toISOString(),
    });

    return NextResponse.json({
      ...exam,
      ...details,
      detailsLoaded: true,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}