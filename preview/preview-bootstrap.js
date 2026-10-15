import "./central-whatsapp.js";

await new Promise(resolve => {
  if (window.samuelFrutasCentralWhatsappReady) return resolve();
  const timer = setInterval(() => {
    if (window.samuelFrutasCentralWhatsappReady) {
      clearInterval(timer);
      resolve();
    }
  }, 10);
});

const source = await fetch("./preview.js?v=40", { cache: "no-store" }).then(response => {
  if (!response.ok) throw new Error("Não foi possível carregar o sistema de agendamento.");
  return response.text();
});

const firebaseUrl = new URL("../firebase.js", import.meta.url).href;
const patched = source
  .replace(
    'import { db } from "../firebase.js";',
    `import { db } from "${firebaseUrl}";`
  )
  .replace(
    /let whatsappNumber = DEFAULT_WHATSAPP_NUMBER;\s*try \{[\s\S]*?\n  \} catch \(error\) \{[\s\S]*?\n  \}/,
    'let whatsappNumber = await window.getSamuelFrutasResponsibleNumber();'
  );

if (patched === source) {
  throw new Error("Não foi possível ligar o Agendamentos ao responsável central do bot.");
}

await import(URL.createObjectURL(new Blob([patched], { type: "text/javascript" })));
