import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

import {
  NextRequest,
  NextResponse
} from "next/server";

import { db } from "@/lib/firebase";

import {
  researchExamDetails as researchExam
} from "@/lib/research-exam-details";


export async function POST(
req:NextRequest
){

try {


const {
  country,
  exam
} = await req.json();



const ref =
doc(
 db,
 "countries",
 country,
 "exams",
 exam.id
);



const existing =
await getDoc(ref);



const data =
existing.data();



if(
 data?.detailsLoaded
){

return NextResponse.json(
 data
);

}



const details =
await researchExam(
 country,
 exam.name
);



await updateDoc(
 ref,
 {
  ...details,
  detailsLoaded:true
 }
);



return NextResponse.json(
 {
  ...exam,
  ...details,
  detailsLoaded:true
 }
);



}catch (error: any) {

  console.error(error);

  const message =
    error?.message || "";

  if (
    message.includes("503") ||
    message.includes("UNAVAILABLE")
  ) {

    return NextResponse.json(
      {
        error:
          "AI servers are busy right now. Please try again in a few moments."
      },
      {
        status: 503
      }
    );

  }

  return NextResponse.json(
    {
      error:
        "Failed to load exam details."
    },
    {
      status: 500
    }
  );

}

}