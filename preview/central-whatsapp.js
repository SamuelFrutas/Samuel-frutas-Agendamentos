const BOT_CONFIG_URL = "https://firestore.googleapis.com/v1/projects/samuelfrutasbot/databases/(default)/documents/config/bot";

export async function getCentralResponsibleNumber() {
  const response = await fetch(BOT_CONFIG_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("Não foi possível consultar o número responsável no Bot.");

  const document = await response.json();
  let number = String(document?.fields?.responsibleNumber?.stringValue || "").replace(/\D/g, "");

  if (number.length === 10 || number.length === 11) number = "55" + number;
  if (number.length < 12) {
    throw new Error("O número responsável pelo recebimento dos pedidos não está configurado no bot.");
  }

  return number;
}
