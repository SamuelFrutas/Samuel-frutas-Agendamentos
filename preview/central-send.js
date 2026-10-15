const BOT_CONFIG_URL = "https://firestore.googleapis.com/v1/projects/samuelfrutasbot/databases/(default)/documents/config/bot";

async function getCentralResponsibleNumber() {
  const response = await fetch(BOT_CONFIG_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("Não foi possível consultar o número responsável no Bot.");

  const document = await response.json();
  let number = String(document?.fields?.responsibleNumber?.stringValue || "").replace(/\D/g, "");
  if (number.length === 10 || number.length === 11) number = "55" + number;
  if (number.length < 12) throw new Error("O número responsável não está configurado no Bot.");
  return number;
}

function toast(message) {
  const element = document.getElementById("toast");
  if (!element) return alert(message);
  element.textContent = message;
  element.classList.add("show");
  window.setTimeout(() => element.classList.remove("show"), 2200);
}

function formatQty(value) {
  const number = Number(String(value).replace(",", "."));
  return Number.isInteger(number) ? String(number) : String(number).replace(".", ",");
}

async function sendOrderThroughCentralWhatsApp() {
  const itemElements = [...document.querySelectorAll("#cartlist .item")];
  const date = document.getElementById("date")?.value || "";
  const delivery = document.getElementById("delivery")?.classList.contains("active");
  const building = document.getElementById("building")?.value.trim() || "";
  const block = document.getElementById("block")?.value.trim() || "";
  const apartment = document.getElementById("apartment")?.value.trim() || "";
  const general = document.getElementById("general")?.value.trim() || "";

  if (!itemElements.length) return toast("Sua sacola está vazia.");
  if (!date) return toast("Escolha a data.");
  if (delivery) {
    if (!building) return toast("Informe o número do prédio.");
    if (!apartment) return toast("Informe o número do apartamento.");
  }

  const items = itemElements.map(element => {
    const name = element.querySelector(".itemtitle b")?.textContent.trim() || "Produto";
    const quantityText = element.querySelector(".itemqty")?.textContent.trim() || "1 UN";
    const match = quantityText.match(/^(.*?)\s+(.+)$/);
    const quantity = match ? match[1] : quantityText;
    const unit = match ? match[2] : "UN";
    const obs = element.querySelector("textarea")?.value.trim() || "";
    return { name, quantity, unit, obs };
  });

  let message = "🛒 *NOVO PEDIDO - SAMUEL FRUTAS*\n-----------------------------------\n\n";
  items.forEach(item => {
    message += "• *" + item.name + "*: " + formatQty(item.quantity) + " " + item.unit + "\n";
    if (item.obs) message += "  _Obs: " + item.obs + "_\n";
  });

  message += "\n-----------------------------------\n";
  message += "📅 *Data:* " + date.split("-").reverse().join("/") + "\n";
  message += "🚚 *Tipo:* " + (delivery ? "Entrega" : "Retirada") + "\n";
  if (delivery) {
    const details = [];
    if (building) details.push("Prédio: " + building);
    if (block) details.push("Bloco: " + block);
    if (apartment) details.push("Apartamento: " + apartment);
    if (details.length) message += "🏢 " + details.join(" | ") + "\n";
  }
  if (general) message += "📝 *Observação geral:* " + general + "\n";

  try {
    const whatsappNumber = await getCentralResponsibleNumber();
    window.location.href = "https://wa.me/" + whatsappNumber + "?text=" + encodeURIComponent(message);
  } catch (error) {
    console.error("Samuel Frutas - WhatsApp central:", error);
    toast("Não foi possível obter o WhatsApp responsável no Bot. Tente novamente.");
  }
}

// Captura o clique antes do handler antigo do preview.js.
document.addEventListener("click", event => {
  const button = event.target?.closest?.("#send");
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  sendOrderThroughCentralWhatsApp();
}, true);
