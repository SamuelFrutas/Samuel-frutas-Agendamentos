// =========================================================
// FIREBASE - SAMUEL FRUTAS
// =========================================================

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyBLU3UNXuPGUFrpmV6syI80ynUHppupeNA",
    authDomain: "samuel-frutas.firebaseapp.com",
    projectId: "samuel-frutas",
    storageBucket: "samuel-frutas.firebasestorage.app",
    messagingSenderId: "475005081261",
    appId: "1:475005081261:web:314ac91f8b0578b995824"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

function numeroValido(valor) {
    const n = parseInt(valor, 10);
    return Number.isInteger(n) && n > 0 ? n : 0;
}
function extrairQuantidadeLote(data) {
    const u = data?.unidadesMedida || {};
    const candidatos = [u.quantidadePorLote, data?.quantidadeLote, data?.loteQuantity, data?.lote_quantidade, data?.quantidadePorLote];
    for (const valor of candidatos) { const n = numeroValido(valor); if (n) return n; }
    return 0;
}
function adaptarDadosProduto(data) { return data; }

Object.defineProperty(window, "getDocs", { configurable: true, get() { return this.__samuelGetDocs; }, set(fn) { this.__samuelGetDocs = fn; } });

const estilo = document.createElement("style");
estilo.textContent = `
    .date-input.sunday-disabled,.date-input.invalid-date-disabled { border-color: var(--vermelho) !important; background: #fff5f5 !important; }
`;
document.head.appendChild(estilo);

function lerData(valor) { if (!valor) return null; const partes = String(valor).split("-").map(Number); if (partes.length !== 3 || partes.some(Number.isNaN)) return null; return new Date(partes[0], partes[1] - 1, partes[2]); }
function dataEhDomingo(valor) { const d = lerData(valor); return !!d && d.getDay() === 0; }
function dataEhHojeOuAnterior(valor) { const d = lerData(valor); if (!d) return false; const agora = new Date(); const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()); return d <= hoje; }
function instalarBloqueioDatas() { const procurar = () => document.querySelectorAll('input[type="date"],input[name*="date" i],input[id*="date" i],input[name*="data" i],input[id*="data" i],.date-input').forEach(input => { if (input.__samuelDataInstalled) return; input.__samuelDataInstalled = true; input.addEventListener("change", () => { if (dataEhDomingo(input.value) || dataEhHojeOuAnterior(input.value)) input.value = ""; }, true); }); new MutationObserver(procurar).observe(document.documentElement, { childList: true, subtree: true }); }
document.addEventListener("DOMContentLoaded", instalarBloqueioDatas); if (document.readyState !== "loading") instalarBloqueioDatas();

export { app, auth, db, storage };
