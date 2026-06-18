import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export async function getExams() {
  console.log("Fetching exams...");

  const ref = collection(db, "exams");

  console.log("Collection ref:", ref.path);

  const snapshot = await getDocs(ref);

  console.log("Snapshot size:", snapshot.size);

  snapshot.forEach((doc) => {
    console.log("DOC:", doc.id, doc.data());
  });

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}