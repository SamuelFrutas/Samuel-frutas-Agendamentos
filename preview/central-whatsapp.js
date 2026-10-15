import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Fonte central do número de atendimento: SamuelFrutasBot / config/bot.
const BOT_CONFIG = {
  apiKey: "AIzaSyB1E9oQsIwYO2-r4W5-uQK4ax92OmxISOI",
  authDomain: "samuelfrutasbot.firebaseapp.com",
  projectId: "samuelfrutasbot",
  storageBucket: "samuelfrutasbot.firebasestorage.app",
  messagingSenderId: "1052699327049",
  appId: "1:1052699327049:web:cf22d68c76d064d56b5d98"
};

const botApp = initializeApp(BOT_CONFIG, "samuel-frutas-bot-central");
const botDb = getFirestore(botApp);

window.getSamuelFrutasResponsibleNumber = async () => {
  const snap = await getDoc(doc(botDb, "config", "bot"));
  let number = String(snap.data()?.responsibleNumber || "").replace(/\D/g, "");
  if (number.length === 10 || number.length === 11) number = "55" + number;
  if (number.length < 12) {
    throw new Error("O número do responsável não está configurado no bot.");
  }
  return number;
};

window.samuelFrutasCentralWhatsappReady = true;
