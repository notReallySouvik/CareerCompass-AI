import {
  getDocs,
  collection,
} from "firebase/firestore";

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";


export async function GET(
  req: Request,
  {
    params,
  }: {
params: Promise<{
  country:string
}>
  }
) {

   const { country } = await params;

  const snapshot =
    await getDocs(
      collection(
        db,
        "countries",
        country,
        "exams"
      )
    );


  const exams =
    snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));


  return NextResponse.json({
    exams
  });
}