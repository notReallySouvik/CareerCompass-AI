import {
  collection,
  getDocs,
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
){

  try {


    const {
      country
    } = await params;


    const decodedCountry =
      decodeURIComponent(country);



    const snapshot =
      await getDocs(
        collection(
          db,
          "countries",
          decodedCountry,
          "exams"
        )
      );



    const exams =
      snapshot.docs.map(
        doc => ({
          id: doc.id,
          ...doc.data()
        })
      );



    return NextResponse.json({
      exams
    });



  } catch(error){

    console.error(error);


    return NextResponse.json(
      {
        error:"Failed loading exams"
      },
      {
        status:500
      }
    );

  }

}