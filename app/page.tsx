"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

type UserProfile = {
  age?: number;
  nationality?: string;
  education?: string;
  interests?: string[];
  competitionTolerance?: string;
};

type Exam = {
  id: string;
  name: string;

  detailsLoaded?: boolean;

  description?: string;

  minAge?: number | null;
  maxAge?: number | null;

  education?: string;

  nationality?: string;

  experience?: string;

  physicalRequirements?: string;

  attemptsAllowed?: string;

  categoryRelaxation?: string;

  officialUrl?: string;
};


export default function Home() {

  const [country,setCountry] =
    useState("");

  const [countries,setCountries] =
    useState<string[]>([]);

  const [suggestions,setSuggestions] =
    useState<string[]>([]);

  const [exams,setExams] =
    useState<Exam[]>([]);


  const [selectedExam,setSelectedExam] =
    useState<Exam | null>(null);


  const [loading,setLoading] =
    useState(false);


  const [loadingMore,setLoadingMore] =
    useState(false);

  const [hasMore,setHasMore] =
    useState(true);

  const [question,setQuestion] =
  useState("");

  const [profile, setProfile] =
  useState<UserProfile>({});

  const [messages, setMessages] =
  useState<
    {
      role: "user" | "assistant";
      content: string;
    }[]
  >([]);
  
  const [chatLoading,setChatLoading] =
  useState(false);
  // load countries


  useEffect(() => {

  const savedProfile =
    localStorage.getItem(
      "careerProfile"
    );

  if (savedProfile) {
    setProfile(
      JSON.parse(savedProfile)
    );
  }

  const savedChat =
    localStorage.getItem(
      "careerChat"
    );

  if (savedChat) {
    setMessages(
      JSON.parse(savedChat)
    );
  }
}, []);

  function clearChat() {

  setMessages([]);

  localStorage.removeItem(
    "careerChat"
  );

}
function clearProfile() {

  setProfile({});

  localStorage.removeItem(
    "careerProfile"
  );

}

useEffect(() => {

  localStorage.setItem(
    "careerChat",
    JSON.stringify(messages)
  );

}, [messages]);

  useEffect(()=>{

    async function loadCountries(){

      const snapshot =
        await getDocs(
          collection(
            db,
            "countries"
          )
        );


      const list =
        snapshot.docs.map(
          doc =>
            doc.data().name
        );


      setCountries(list);
    }


    loadCountries();

  },[]);

useEffect(() => {

  localStorage.setItem(
    "careerProfile",
    JSON.stringify(profile)
  );

}, [profile]);

  function handleCountryChange(
    value:string
  ){

    setCountry(value);


    if(!value.trim()){
      setSuggestions([]);
      return;
    }


    const filtered =
      countries.filter(item =>
        item
        .toLowerCase()
        .startsWith(
          value.toLowerCase()
        )
      );


    setSuggestions(
      filtered.slice(0,8)
    );

  }




  async function selectCountry(
    selected:string
  ){

    setCountry(selected);
    setSuggestions([]);

    setSelectedExam(null);

    await loadExams(selected);

  }




  async function loadExams(
    selectedCountry:string
  ){

    setLoading(true);


    try {

      let response =
        await fetch(
          `/api/exams/${selectedCountry}`
        );


      let data =
        await response.json();


      let existing =
        data.exams || [];



      // no exams yet
      if(existing.length === 0){

        const sync =
          await fetch(
            "/api/sync-country",
            {
              method:"POST",
              headers:{
                "Content-Type":
                "application/json"
              },
              body:JSON.stringify({
                country:selectedCountry
              })
            }
          );


        await sync.json();


        response =
          await fetch(
            `/api/exams/${selectedCountry}`
          );


        data =
          await response.json();


        existing =
          data.exams || [];

      }



      setExams(existing);


    } catch(err){

      console.error(err);

    } finally {

      setLoading(false);

    }

  }



async function loadMore() {
  if (!country) return;

  setLoadingMore(true);

  try {

    const beforeNames =
      exams.map(e => e.name);


    // same search endpoint again
    await fetch(
      "/api/sync-country",
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          country
        })
      }
    );


    // reload from firestore
    const response =
      await fetch(
        `/api/exams/${encodeURIComponent(country)}`
      );


if(!response.ok){
  throw new Error(
    "Failed loading details"
  );
}


const data =
 await response.json();


    const after =
      data.exams || [];



    const newExams =
      after.filter(
        (exam:Exam) =>
          !beforeNames.includes(
            exam.name
          )
      );



    if(newExams.length === 0){

      setHasMore(false);

      return;
    }



    setExams(after);


  } catch(err){

    console.error(err);

  } finally {

    setLoadingMore(false);

  }
}




  async function openExam(
    exam:Exam
  ){

    setSelectedExam(exam);


    if(
      exam.detailsLoaded
    ){
      return;
    }



    const response =
      await fetch(
        "/api/exam-details",
        {
          method:"POST",

          headers:{
            "Content-Type":
            "application/json"
          },

          body:JSON.stringify({
            country,
            exam
          })
        }
      );


    const details =
      await response.json();



    setSelectedExam({
      ...exam,
      ...details
    });

  }

async function askAI() {

  if (!question.trim()) {
    return;
  }

  const userMessage = {
    role: "user" as const,
    content: question
  };
 
  setMessages(prev => [
    ...prev,
    userMessage
  ]);

  const currentQuestion =
    question;

let mergedProfile = profile;

try {

  const extract =
    await fetch(
      "/api/extract-profile",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          profile,
          message:
            currentQuestion
        })
      }
    );

  const updates =
    await extract.json();

  mergedProfile = {
    ...profile,
    ...updates
  };

  setProfile(
    mergedProfile
  );

} catch (err) {

  console.error(err);

}
  setQuestion("");

  try {

    setChatLoading(true);

    const response =
      await fetch(
        "/api/chat",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

body: JSON.stringify({
  country,
  question: currentQuestion,
  messages,
  profile: mergedProfile
})
        }
      );

    const data =
      await response.json();

    setMessages(prev => [
      ...prev,
      {
        role:
          "assistant",
        content:
          data.answer
      }
    ]);

  } catch (error) {

    console.error(error);

  } finally {

    setChatLoading(false);

  }

}



  return (

    <main className="p-10">


      <h1 className="
        text-4xl
        font-bold
        mb-6
      ">
        CareerCompass
      </h1>




      <div className="
        relative
        w-80
      ">


        <input

          value={country}

          onChange={
            e =>
            handleCountryChange(
              e.target.value
            )
          }

          placeholder="Enter country"

          className="
            border
            p-2
            w-full
          "

        />



        {
          suggestions.length > 0 &&

          <div className="
            absolute
            bg-white
            border
            w-full
            z-10
          ">


            {
              suggestions.map(
                item=>(

                <div

                  key={item}

                  onClick={() =>
                    selectCountry(item)
                  }

                  className="
                    p-2
                    cursor-pointer
                    hover:bg-gray-100
                  "

                >

                  {item}

                </div>

              ))
            }


          </div>
        }


      </div>





      {
        loading &&

        <p className="mt-4">
          Loading exams...
        </p>
      }





      {
        exams.length > 0 &&

        <section className="mt-8">


          <h2 className="
            text-2xl
            font-bold
          ">
            Government Exams
          </h2>



          <div className="mt-4">

            {
              exams.map(
                exam=>(

                <button

                  key={exam.id}

                  onClick={() =>
                    openExam(exam)
                  }

                  className="
                    block
                    border
                    p-3
                    mt-2
                    w-96
                    text-left
                  "

                >

                  {exam.name}

                </button>

              ))
            }


          </div>



          {
            hasMore &&

            <button

              onClick={loadMore}

              disabled={loadingMore}

              className="
                border
                px-4
                py-2
                mt-5
              "

            >

              {
                loadingMore
                ?
                "Searching..."
                :
                "Load More Exams"
              }

            </button>
          }


        </section>

      }


{
        selectedExam &&

        <section className="
          mt-10
          border
          p-5
          w-96
        ">
          <h2 className="text-2xl font-bold">
  {selectedExam.name}
</h2>


<div className="mt-6">

  <h3 className="font-bold text-lg mb-3">
    Eligibility Criteria
  </h3>


  {(selectedExam.minAge !== null ||
    selectedExam.maxAge !== null) && (
    <p>
      <strong>Age Limit:</strong>{" "}
      {selectedExam.minAge ?? "N/A"}
      {" - "}
      {selectedExam.maxAge ?? "N/A"}
      years
    </p>
  )}


  {selectedExam.education && (
    <p className="mt-2">
      <strong>Education:</strong>{" "}
      {selectedExam.education}
    </p>
  )}


  {selectedExam.nationality && (
    <p className="mt-2">
      <strong>Nationality:</strong>{" "}
      {selectedExam.nationality}
    </p>
  )}


  {selectedExam.experience && (
    <p className="mt-2">
      <strong>Experience:</strong>{" "}
      {selectedExam.experience}
    </p>
  )}


  {selectedExam.physicalRequirements && (
    <p className="mt-2">
      <strong>Physical Standards:</strong>{" "}
      {selectedExam.physicalRequirements}
    </p>
  )}


  {selectedExam.attemptsAllowed && (
    <p className="mt-2">
      <strong>Attempts Allowed:</strong>{" "}
      {selectedExam.attemptsAllowed}
    </p>
  )}


  {selectedExam.categoryRelaxation && (
    <p className="mt-2">
      <strong>Category Relaxation:</strong>{" "}
      {selectedExam.categoryRelaxation}
    </p>
  )}

</div>



<div className="mt-6">

  <h3 className="font-bold text-lg mb-3">
    Description
  </h3>

  <p>
    {selectedExam.description}
  </p>

</div>


{selectedExam.officialUrl && (
  <div className="mt-6">
    <a
      href={selectedExam.officialUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline"
    >
      Official Website
    </a>
  </div>
)}
        </section>

      }

<section className="
  border
  p-4
  mt-8
">

  <h2 className="
    text-xl
    font-bold
  ">
    Known About You
  </h2>

  {profile.age && (
    <p>
      Age:
      {" "}
      {profile.age}
    </p>
  )}

  {profile.education && (
    <p>
      Education:
      {" "}
      {profile.education}
    </p>
  )}

  {profile.nationality && (
    <p>
      Nationality:
      {" "}
      {profile.nationality}
    </p>
  )}

  {profile.interests?.length ? (
    <p>
      Interests:
      {" "}
      {
        profile.interests.join(
          ", "
        )
      }
    </p>
  ) : null}

<div className="mt-4 flex gap-2">

  <button
    onClick={clearProfile}
    className="
      border
      px-3
      py-2
    "
  >
    Clear Profile
  </button>

  <button
    onClick={clearChat}
    className="
      border
      px-3
      py-2
    "
  >
    Clear Chat
  </button>


</div>

</section>
    <section className="
      mt-10
      border
      p-5
      max-w-3xl
    ">

      <h2 className="
        text-2xl
        font-bold
      ">
        AI Career Assistant
      </h2>

      <p className="
        mt-2
        text-sm
        text-gray-600
      ">
        Ask questions about government exams,
        eligibility, salary, competition,
        preparation strategy, or career paths.
      </p>

      <textarea

        value={question}

        onChange={(e) =>
          setQuestion(
            e.target.value
          )
        }

        placeholder="
Examples:

• Which exams should a 21 year old graduate focus on?

• Which exams have the highest salary?

• Compare UPSC and SSC CGL.

• Which exams are easiest for beginners?
"

        className="
          border
          p-3
          w-full
          mt-4
          h-40
        "

      />

      <button

        onClick={askAI}

        disabled={chatLoading}

        className="
          border
          px-4
          py-2
          mt-3
        "

      >

        {
          chatLoading
            ? "Thinking..."
            : "Ask AI"
        }

      </button>
<div className="mt-5">

  {messages.map(
    (message, index) => (

      <div
        key={index}
        className="
          border
          p-3
          mb-3
        "
      >

        <strong>

          {
            message.role ===
            "user"
              ? "You"
              : "CareerCompass AI"
          }

          :

        </strong>

        <p className="mt-2 whitespace-pre-wrap">

          {message.content}

        </p>

      </div>

    )
  )}

</div>

    </section>

    </main>

  );

}

