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
    const candidatos = [
        u.quantidadePorLote,
        data?.quantidadeLote,
        data?.loteQuantity,
        data?.lote_quantidade,
        data?.quantidadePorLote
    ];

    for (const valor of candidatos) {
        const n = numeroValido(valor);
        if (n) return n;
    }

    const colecoes = [data?.formasVenda, data?.formasDeVenda];
    for (const formas of colecoes) {
        if (Array.isArray(formas)) {
            for (const forma of formas) {
                if (forma && typeof forma === "object") {
                    const tipo = String(forma.tipo || forma.rotulo || "").toLowerCase();
                    if (tipo.includes("lote")) {
                        const n = numeroValido(forma.quantidade);
                        if (n) return n;
                        const m = tipo.match(/c\s*\/\s*(\d+)/i);
                        if (m) return numeroValido(m[1]);
                    }
                } else {
                    const texto = String(forma || "");
                    if (/lote/i.test(texto)) {
                        const m = texto.match(/c\s*\/\s*(\d+)/i);
                        if (m) return numeroValido(m[1]);
                    }
                }
            }
        }
    }

    const listasAntigas = [data?.unidades, data?.units];
    for (const lista of listasAntigas) {
        if (Array.isArray(lista)) {
            for (const item of lista) {
                const texto = String(item || "");
                if (/lote/i.test(texto)) {
                    const m = texto.match(/c\s*\/\s*(\d+)/i);
                    if (m) return numeroValido(m[1]);
                }
            }
        }
    }

    return 0;
}

function adaptarDadosProduto(data) {
    const resultado = { ...data };
    const u = data?.unidadesMedida || {};
    const formas = data?.formasVenda || data?.formasDeVenda;
    const temForma = (nome, ...alternativas) => {
        if (u[nome] === true || formas?.[nome] === true) return true;
        if (Array.isArray(formas)) return formas.some(v => {
            const texto = String(v?.tipo || v?.rotulo || v || "").trim().toLowerCase();
            return alternativas.some(a => texto === a || texto.includes(a));
        });
        return false;
    };

    const unidades = [];
    if (u.unidade === true || data?.unidade === true || data?.un === true) unidades.push("UN");
    if (u.quilo === true || data?.quilo === true || data?.kg === true) unidades.push("KG");
    if (u.maco === true || data?.maco === true || data?.maço === true) unidades.push("MAÇO");
    if (u.duzia === true || data?.duzia === true || data?.dúzia === true) unidades.push("DÚZIA");

    const loteAtivo = u.lote === true || data?.lote === true || temForma("lote", "lote");
    const qtdLote = extrairQuantidadeLote(data);
    if (loteAtivo) {
        unidades.push(qtdLote > 0 ? `LOTE C/${qtdLote}` : "LOTE");
        if (qtdLote > 0) resultado.quantidadeLote = qtdLote;
    }

    if (temForma("bdj", "bdj", "bandeja")) unidades.push("BDJ");
    if (temForma("umQuarto", "1/4", "¼", "um quarto")) unidades.push("1/4");
    if (temForma("umOitavo", "1/8", "⅛", "um oitavo")) unidades.push("1/8");
    if (temForma("metade", "metade", "1/2", "½")) unidades.push("METADE");

    const listaAntiga = data?.unidades || data?.units;
    if (Array.isArray(listaAntiga)) listaAntiga.forEach(v => {
        const texto = String(v).trim().toUpperCase();
        if (texto.includes("LOTE")) {
            if (!loteAtivo) unidades.push(qtdLote > 0 ? `LOTE C/${qtdLote}` : "LOTE");
        } else if (texto.includes("BDJ") || texto.includes("BANDEJA")) unidades.push("BDJ");
        else if (texto.includes("1/4") || texto.includes("¼")) unidades.push("1/4");
        else if (texto.includes("1/8") || texto.includes("⅛")) unidades.push("1/8");
        else if (texto.includes("METADE") || texto.includes("1/2") || texto.includes("½")) unidades.push("METADE");
        else unidades.push(texto);
    });

    if (unidades.length) {
        resultado.unidades = [...new Set(unidades)];
        resultado.units = resultado.unidades;
        resultado.unidadesMedida = undefined;
    }
    return resultado;
}

Object.defineProperty(window, "getDocs", {
    configurable: true,
    get() { return this.__samuelGetDocs; },
    set(fn) {
        if (typeof fn !== "function") { this.__samuelGetDocs = fn; return; }
        this.__samuelGetDocs = async function(...args) {
            const snapshot = await fn(...args);
            if (!snapshot || typeof snapshot.forEach !== "function") return snapshot;
            return new Proxy(snapshot, {
                get(target, prop, receiver) {
                    if (prop !== "forEach") return Reflect.get(target, prop, receiver);
                    return callback => target.forEach(docSnap => {
                        const adaptedData = adaptarDadosProduto(docSnap.data());
                        const adaptedDoc = new Proxy(docSnap, {
                            get(docTarget, docProp, docReceiver) {
                                if (docProp === "data") return () => adaptedData;
                                return Reflect.get(docTarget, docProp, docReceiver);
                            }
                        });
                        callback(adaptedDoc);
                    });
                }
            });
        };
    }
});

const estilo = document.createElement("style");
estilo.textContent = `
    button.category-card[onclick="showView('aguaOvos')"] .category-icon {
        position: relative !important;
        overflow: hidden !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 0 !important;
    }
    button.category-card[onclick="showView('aguaOvos')"] .category-icon::before {
        content: "";
        display: block;
        width: 100%;
        height: 100%;
        background-image: url("./imagens/Gemini_Generated_Image_qc1508qc1508qc15.jpg");
        background-repeat: no-repeat;
        background-position: center;
        background-size: contain;
    }
    button.category-card[onclick="showView('aguaOvos')"] .category-icon > * { display: none !important; }
    .date-input.sunday-disabled,
    .date-input.invalid-date-disabled { border-color: var(--vermelho) !important; background: #fff5f5 !important; }
    #view-cart .back-button { background: #d32f2f !important; border-color: #d32f2f !important; color: #ffffff !important; }
    #view-cart .back-button:hover { background: #b71c1c !important; border-color: #b71c1c !important; color: #ffffff !important; }
`;
document.head.appendChild(estilo);

function lerData(valor) {
    if (!valor) return null;
    const partes = String(valor).split("-").map(Number);
    if (partes.length !== 3 || partes.some(Number.isNaN)) return null;
    return new Date(partes[0], partes[1] - 1, partes[2]);
}
function dataEhDomingo(valor) { const d = lerData(valor); return !!d && d.getDay() === 0; }
function dataEhHojeOuAnterior(valor) {
    const d = lerData(valor); if (!d) return false;
    const agora = new Date();
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    return d <= hoje;
}
function obterCampoDataAgendamento() {
    return [...document.querySelectorAll('input[type="date"], input[name*="date" i], input[id*="date" i], input[name*="data" i], input[id*="data" i], .date-input')].find(i => i.offsetParent !== null) || null;
}
function proximaEntregaEstaSelecionada() {
    return [...document.querySelectorAll('input[type="checkbox"],input[type="radio"]')].some(i => i.checked && /próxima entrega disponível|proxima entrega disponivel|próxima entrega|proxima entrega/i.test(i.closest('label,div,p,section')?.textContent || ''));
}
function rejeitarDataInvalida(input, mensagem) {
    if (!input) return false;
    alert(mensagem); input.value = ""; input.classList.add("invalid-date-disabled"); return false;
}
function validarDataNoEnvio(event) {
    const input = obterCampoDataAgendamento();
    if (!input) return true;
    if (dataEhDomingo(input.value)) { event.preventDefault(); event.stopImmediatePropagation(); return rejeitarDataInvalida(input, "Não é possível agendar para domingo. Domingo não temos atendimento."); }
    if (input.value && dataEhHojeOuAnterior(input.value)) { event.preventDefault(); event.stopImmediatePropagation(); return rejeitarDataInvalida(input, "Não é possível agendar para o dia atual ou para dias anteriores."); }
    if (!input.value && !proximaEntregaEstaSelecionada()) { event.preventDefault(); event.stopImmediatePropagation(); input.classList.add("invalid-date-disabled"); alert("Escolha uma data para o agendamento."); try { input.focus(); } catch (_) {} return false; }
    return true;
}
document.addEventListener("submit", validarDataNoEnvio, true);
document.addEventListener("click", event => {
    const b = event.target?.closest?.('button,input[type="submit"],[role="button"]'); if (!b) return;
    const t = String(b.textContent || b.value || "").trim().toLowerCase();
    if (t.includes("enviar") || t.includes("pedido") || t.includes("agendar")) validarDataNoEnvio(event);
}, true);
document.addEventListener("keydown", event => { if (event.key === "Enter") validarDataNoEnvio(event); }, true);

function normalizarData(valor) {
    const t = String(valor || "").trim();
    let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`;
    m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (m) return `${m[3]}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
    return "";
}
function campoPareceData(el) {
    if (!el) return false;
    const texto = `${el.id || ""} ${el.name || ""} ${el.className || ""} ${el.getAttribute?.("aria-label") || ""}`.toLowerCase();
    return el.matches?.('input[type="date"]') || /data|date|entrega|agend/.test(texto);
}
function validarDataImediatamente(event) {
    const input = event.target?.closest?.('input,select,textarea');
    if (!campoPareceData(input)) return;
    const valor = normalizarData(input.value);
    if (!valor) return;
    if (dataEhDomingo(valor)) { event.preventDefault(); event.stopImmediatePropagation(); rejeitarDataInvalida(input, "Não é possível agendar para domingo. Domingo não temos atendimento."); return; }
    if (dataEhHojeOuAnterior(valor)) { event.preventDefault(); event.stopImmediatePropagation(); rejeitarDataInvalida(input, "Não é possível agendar para o dia atual ou para dias anteriores."); }
}
document.addEventListener("change", validarDataImediatamente, true);
document.addEventListener("input", validarDataImediatamente, true);

function instalarBloqueioDatas() {
    const procurar = () => document.querySelectorAll('input[type="date"],input[name*="date" i],input[id*="date" i],input[name*="data" i],input[id*="data" i],.date-input').forEach(input => {
        if (input.__samuelDataInstalled) return;
        input.__samuelDataInstalled = true;
        const validar = () => {
            if (dataEhDomingo(input.value)) rejeitarDataInvalida(input, "Não é possível agendar para domingo. Domingo não temos atendimento.");
            else if (dataEhHojeOuAnterior(input.value)) rejeitarDataInvalida(input, "Não é possível agendar para o dia atual ou para dias anteriores.");
            else input.classList.remove("sunday-disabled", "invalid-date-disabled");
        };
        input.addEventListener("change", validar, true);
        input.addEventListener("input", validar, true);
    });
    new MutationObserver(procurar).observe(document.documentElement, { childList: true, subtree: true });
}
document.addEventListener("DOMContentLoaded", instalarBloqueioDatas);
if (document.readyState !== "loading") instalarBloqueioDatas();

function sincronizarSacolaFlutuante() {
    const cartView = document.getElementById("view-cart");
    const floatingCart = document.getElementById("floating-cart");
    if (!cartView || !floatingCart) return;
    const dentroDaSacola = cartView.classList.contains("active");
    floatingCart.style.visibility = dentroDaSacola ? "hidden" : "visible";
    floatingCart.style.pointerEvents = dentroDaSacola ? "none" : "auto";
}
function instalarControleSacolaFlutuante() {
    sincronizarSacolaFlutuante();
    const observer = new MutationObserver(() => sincronizarSacolaFlutuante());
    document.querySelectorAll(".view").forEach(view => observer.observe(view, { attributes: true, attributeFilter: ["class"] }));
    const bodyObserver = new MutationObserver(() => sincronizarSacolaFlutuante());
    bodyObserver.observe(document.body, { childList: true, subtree: true });
}
document.addEventListener("DOMContentLoaded", instalarControleSacolaFlutuante);
if (document.readyState !== "loading") instalarControleSacolaFlutuante();

export { app, auth, db, storage };
