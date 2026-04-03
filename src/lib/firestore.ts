import { enableMultiTabIndexedDbPersistence, getFirestore } from "firebase/firestore";

import { auth } from "@/lib/firebase";

const db = getFirestore(auth.app);

if (typeof window !== "undefined") {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    console.error("Failed to enable offline persistence:", err);
  });
}

export { db };
