import { db } from "../firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const WHATSAPP_NUMBER = "5521972837869";
const PRODUCTS_COLLECTION = "produtos";
const ADDRESS_STORAGE_KEY = "samuel_frutas_endereco_entrega";

let products = { frutas: [], legumes: [], verduras: [], aguaOvos: [] };
let cart = {};
let selectedUnits = {};
let currentCategory = "";
let orderType = "Entrega";
let editingKey = "";

const $ = id => document.getElementById(id);
const normalize = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const numberValue = value => Number(String(value ?? "").replace(",", ".")) || 0;
const formatQty = value => Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
const escapeHtml = value => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

const CATEGORY_META = {
  frutas: ["Frutas", "🍎"],
  legumes: ["Legumes", "🥕"],
  verduras: ["Verduras", "🥬"],
  aguaOvos: ["Água de coco e ovos", "🥥"]
};

function normalizarCategoria(categoria, nome = "") {
  const value = normalize(categoria);
  const name = normalize(nome);

  if (
    value.includes("agua de coco") ||
    value.includes("ovos") ||
    value.includes("ovo") ||
    name.includes("agua de coco") ||
    (name.includes("coco") && name.includes("agua")) ||
    name.includes("ovo")
  ) return "aguaOvos";

  if (value.includes("legume")) return "legumes";
  if (value.includes("verdura")) return "verduras";
  return "frutas";
}

function parseUnits(data) {
  const u = data?.unidadesMedida || {};
  const formas = data?.formasVenda || data?.formasDeVenda;
  const units = [];

  const hasForm = (name, ...alternatives) => {
    if (u[name] === true || formas?.[name] === true) return true;
    if (Array.isArray(formas)) {
      return formas.some(value => {
        const text = normalize(value);
        return alternatives.some(alt => text === normalize(alt) || text.includes(normalize(alt)));
      });
    }
    return false;
  };

  if (u.unidade === true || data?.unidade === true || data?.un === true) units.push("UN");
  if (u.quilo === true || data?.quilo === true || data?.kg === true) units.push("KG");
  if (u.maco === true || data?.maco === true || data?.maço === true) units.push("MAÇO");
  if (u.duzia === true || data?.duzia === true || data?.dúzia === true) units.push("DÚZIA");
  if (u.lote === true || data?.lote === true) {
    const quantity = parseInt(u.quantidadePorLote || data?.quantidadeLote || 3, 10);
    units.push(quantity > 0 ? "LOTE C/" + quantity : "LOTE");
  }
  if (hasForm("bdj", "bdj", "bandeja")) units.push("BDJ");
  if (hasForm("umQuarto", "1/4", "¼", "um quarto")) units.push("1/4");
  if (hasForm("umOitavo", "1/8", "⅛", "um oitavo")) units.push("1/8");
  if (hasForm("metade", "metade", "1/2", "½")) units.push("METADE");

  const oldUnits = data?.unidades || data?.units;
  if (Array.isArray(oldUnits)) {
    oldUnits.forEach(value => {
      const text = String(value).trim().toUpperCase();
      if (text.includes("BDJ") || text.includes("BANDEJA")) units.push("BDJ");
      else if (text.includes("1/4") || text.includes("¼")) units.push("1/4");
      else if (text.includes("1/8") || text.includes("⅛")) units.push("1/8");
      else if (text.includes("METADE") || text.includes("1/2") || text.includes("½")) units.push("METADE");
      else units.push(text);
    });
  }

  return [...new Set(units.length ? units : ["UN"])];
}

function getImage(data) {
  return data?.imagemUrl || data?.imagem || data?.imageUrl || data?.foto ||
    data?.image || data?.icon || data?.url || data?.img || "";
}

function productById(id) {
  return Object.values(products).flat().find(product => product.id === id);
}

function cartKey(id, unit) {
  return id + "::" + unit;
}

function stepFor(unit) {
  return normalize(unit) === "kg" ? 0.1 : 1;
}

function setStatus(message, kind = "") {
  const box = $("load-status");
  if (!box) return;
  box.textContent = message;
  box.className = "load-status " + kind;
}

async function loadProducts() {
  setStatus("Carregando produtos…");
  try {
    const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));

    products = { frutas: [], legumes: [], verduras: [], aguaOvos: [] };

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const active = data.ativo !== undefined ? data.ativo :
        (data.active !== undefined ? data.active : true);

      if (!active) return;

      const name = data.nome || data.name || "Produto";
      const category = normalizarCategoria(data.categoria || data.category || "frutas", name);

      products[category].push({
        id: docSnap.id,
        name,
        image: getImage(data),
        units: parseUnits(data)
      });
    });

    Object.keys(products).forEach(key => {
      products[key].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    });

    renderCategories();
    renderProducts();
    setStatus(snapshot.size + " produtos carregados.", "ok");
  } catch (error) {
    console.error("Samuel Frutas preview - Firebase:", error);
    setStatus("Não foi possível carregar os produtos. Toque em Recarregar.", "error");
    $("products").innerHTML =
      '<div class="empty"><strong>Produtos não carregaram.</strong><br>Verifique a conexão e tente novamente.<br><button id="retry-load" class="retry" type="button">Recarregar</button></div>';
    $("retry-load").onclick = loadProducts;
  }
}

function renderCategories() {
  const categoryMarkup = Object.keys(products).map(key => {
    const meta = CATEGORY_META[key];
    return '<button class="category-option ' + (currentCategory === key ? "active" : "") + '" data-panel-category="' + key + '" type="button">' +
      '<div><b>' + meta[0] + '</b></div></button>';
  }).join("");

  $("category-panel-list").innerHTML = categoryMarkup;

  $("cats").innerHTML = Object.keys(products).map(key => {
    const meta = CATEGORY_META[key];
    return '<button class="cat ' + (currentCategory === key ? "active" : "") + '" data-category="' + key + '" type="button">' +
      '<span>' + meta[1] + '</span><b>' + meta[0] + '</b><small>' + products[key].length + " item(ns)</small></button>";
  }).join("");

  document.querySelectorAll(".category-option").forEach(button => {
    button.onclick = () => {
      currentCategory = button.dataset.panelCategory;
      closeCategorySheet();
      openCatalog();
      renderCategories();
      renderProducts();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
  });

  document.querySelectorAll(".cat").forEach(button => {
    button.onclick = () => {
      currentCategory = button.dataset.category;
      renderCategories();
      renderProducts();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
  });
}

function renderProduct(product) {
  const hasMultipleUnits = product.units.length > 1;
  const unit = hasMultipleUnits ? (selectedUnits[product.id] || "") : (product.units[0] || "UN");
  const key = unit ? cartKey(product.id, unit) : "";
  const quantity = unit ? (cart[key]?.quantity || 0) : 0;
  const image = product.image
    ? '<img src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.name) + '" loading="lazy">'
    : '<span class="fallback-fruit">🍏</span>';

  return '<article class="product">' +
    '<div class="photo">' + image + '<button class="heart" type="button" aria-label="Favorito">♡</button></div>' +
    '<h3>' + escapeHtml(product.name) + '</h3>' +
    '<p>Fresquinho e selecionado</p>' +
    (hasMultipleUnits && !unit ? '<p class="unit-hint">⚠️ SELECIONE A UNIDADE DE MEDIDA</p>' : '') +
    '<div class="units">' +
      product.units.map(option =>
        '<button class="unit ' + (option === unit ? "active" : "") + '" data-id="' + escapeHtml(product.id) + '" data-unit="' + escapeHtml(option) + '" type="button">' +
          escapeHtml(option) + '</button>'
      ).join("") +
    '</div>' +
    '<div class="quantity-control">' +
      '<button class="quantity-btn quantity-minus" data-id="' + escapeHtml(product.id) + '" data-unit="' + escapeHtml(unit) + '" type="button" aria-label="Diminuir quantidade"' + (!unit ? ' disabled' : '') + '>−</button>' +
      '<input class="quantity-input' + (!unit ? ' quantity-locked' : '') + '" data-id="' + escapeHtml(product.id) + '" data-unit="' + escapeHtml(unit) + '" type="number" min="0" step="' + (unit ? stepFor(unit) : 1) + '" value="' + quantity + '" inputmode="decimal" aria-label="Quantidade"' + (!unit ? ' disabled placeholder="Escolha a unidade"' : '') + '>' +
      '<button class="quantity-btn quantity-plus" data-id="' + escapeHtml(product.id) + '" data-unit="' + escapeHtml(unit) + '" type="button" aria-label="Aumentar quantidade"' + (!unit ? ' disabled' : '') + '>+</button>' +
    '</div>' +
  '</article>';
}

function renderProducts() {
  const search = normalize($("search")?.value);
  let groups = Object.entries(products);

  if (currentCategory) groups = groups.filter(([key]) => key === currentCategory);

  if (search) {
    groups = groups.map(([key, list]) => [key, list.filter(product => normalize(product.name).includes(search))])
      .filter(([, list]) => list.length);
  }

  if (!groups.length) {
    $("products").innerHTML = '<div class="empty">Nenhum produto encontrado.</div>';
    return;
  }

  $("products").innerHTML = groups.map(([key, list]) => {
    const meta = CATEGORY_META[key];
    return '<section class="block"><div class="blockhead"><h2>' + meta[1] + " " + meta[0] +
      '</h2><button class="see-all" data-see="' + key + '" type="button">Ver todos ›</button></div>' +
      '<div class="grid">' + list.map(renderProduct).join("") + '</div></section>';
  }).join("");

  bindProductControls();
}

function bindProductControls() {
  document.querySelectorAll(".unit").forEach(button => {
    button.onclick = () => {
      selectedUnits[button.dataset.id] = button.dataset.unit;
      renderProducts();
    };
  });

  document.querySelectorAll(".quantity-plus").forEach(button => {
    button.onclick = event => {
      event.preventDefault();
      const unit = button.dataset.unit;
      if (!unit) return;
      const current = cart[cartKey(button.dataset.id, unit)]?.quantity || 0;
      setQuantity(button.dataset.id, unit, current + stepFor(unit));
    };
  });

  document.querySelectorAll(".quantity-minus").forEach(button => {
    button.onclick = event => {
      event.preventDefault();
      const unit = button.dataset.unit;
      if (!unit) return;
      const current = cart[cartKey(button.dataset.id, unit)]?.quantity || 0;
      setQuantity(button.dataset.id, unit, current - stepFor(unit));
    };
  });

  document.querySelectorAll(".quantity-input").forEach(input => {
    input.onchange = () => {
      if (!input.dataset.unit) {
        input.value = 0;
        return;
      }
      setQuantity(input.dataset.id, input.dataset.unit, input.value);
    };
    input.onkeydown = event => {
      if (event.key === "Enter") input.blur();
    };
  });

  document.querySelectorAll("[data-see]").forEach(button => {
    button.onclick = () => {
      currentCategory = button.dataset.see;
      renderCategories();
      renderProducts();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
  });
}

function setQuantity(id, unit, value) {
  const product = productById(id);
  if (!product) return;

  let quantity = numberValue(value);
  quantity = normalize(unit) === "kg" ? Math.round(quantity * 10) / 10 : Math.round(quantity);

  const key = cartKey(id, unit);
  if (quantity <= 0) {
    delete cart[key];
  } else {
    cart[key] = {
      id,
      name: product.name,
      unit,
      quantity,
      obs: cart[key]?.obs || ""
    };
  }

  selectedUnits[id] = unit;
  updateCart();
}

function updateCart() {
  const count = Object.keys(cart).length;
  $("count").textContent = count;
  $("navcount").textContent = count;
  $("floatcount").textContent = count;
  updateFloatingButtons();
  renderCart();
  renderProducts();
}

function renderCart() {
  const items = Object.entries(cart);

  if (!items.length) {
    $("cartlist").innerHTML = '<div class="empty">Sua sacola está vazia.</div>';
    return;
  }

  $("cartlist").innerHTML = items.map(([key, item]) =>
    '<article class="item">' +
      '<div class="itemrow"><div class="iteminfo">' +
        '<div class="itemtitle"><b>' + escapeHtml(item.name) + '</b><span class="itemqty" data-edit="' + escapeHtml(key) + '">' +
          formatQty(item.quantity) + " " + escapeHtml(item.unit) + '</span></div>' +
        '<div class="sub edit-hint">👆 TOQUE NA QUANTIDADE PARA ALTERAR</div>' +
        '<button class="obsbtn" data-obs="' + escapeHtml(key) + '" type="button">' +
          (item.obs ? "✎ Editar observação" : "＋ Adicionar observação deste item") + '</button>' +
        '<div class="obs" id="obs-' + escapeHtml(key) + '">' +
          '<textarea id="oin-' + escapeHtml(key) + '" placeholder="Ex.: bem madura, por favor">' + escapeHtml(item.obs) + '</textarea>' +
          '<button class="saveobs" data-save="' + escapeHtml(key) + '" type="button">Salvar observação</button>' +
        '</div>' +
      '</div><button class="remove" data-remove="' + escapeHtml(key) + '" type="button" aria-label="Remover">×</button></div>' +
    '</article>'
  ).join("");

  document.querySelectorAll("[data-remove]").forEach(button => {
    button.onclick = () => {
      delete cart[button.dataset.remove];
      updateCart();
    };
  });

  document.querySelectorAll("[data-obs]").forEach(button => {
    button.onclick = () => $("obs-" + button.dataset.obs).classList.toggle("show");
  });

  document.querySelectorAll("[data-save]").forEach(button => {
    button.onclick = () => {
      const item = cart[button.dataset.save];
      if (!item) return;
      item.obs = $("oin-" + button.dataset.save).value.trim();
      renderCart();
      toast("Observação salva");
    };
  });

  document.querySelectorAll("[data-edit]").forEach(button => {
    button.onclick = () => openEdit(button.dataset.edit);
  });
}

function openEdit(key) {
  const item = cart[key];
  const product = productById(item?.id);
  if (!item) return;

  editingKey = key;
  $("mname").textContent = item.name;
  $("munit").innerHTML = (product?.units || [item.unit]).map(unit =>
    '<option value="' + escapeHtml(unit) + '">' + escapeHtml(unit) + "</option>"
  ).join("");
  $("munit").value = item.unit;
  $("mqty").value = item.quantity;
  $("modal").classList.add("show");
}

function closeEdit() {
  $("modal").classList.remove("show");
  editingKey = "";
}

function saveEdit() {
  if (!editingKey || !cart[editingKey]) return;

  const old = cart[editingKey];
  const unit = $("munit").value;
  let quantity = numberValue($("mqty").value);
  quantity = normalize(unit) === "kg" ? Math.round(quantity * 10) / 10 : Math.round(quantity);

  delete cart[editingKey];

  if (quantity > 0) {
    cart[cartKey(old.id, unit)] = {
      id: old.id,
      name: old.name,
      unit,
      quantity,
      obs: old.obs || ""
    };
  }

  selectedUnits[old.id] = unit;
  closeEdit();
  updateCart();
}

function setOrderType(type) {
  orderType = type;
  $("delivery").classList.toggle("active", type === "Entrega");
  $("pickup").classList.toggle("active", type === "Retirada");
  $("addressbox").hidden = type !== "Entrega";
}

function updateFloatingButtons() {
  const inCart = $("cart").classList.contains("on");
  $("floating-checkout").style.display = inCart ? "none" : (Object.keys(cart).length ? "flex" : "none");
  $("floating-search").style.display = inCart ? "none" : "block";
}

function openCart() {
  $("catalog").classList.remove("on");
  $("cart").classList.add("on");
  updateFloatingButtons();
  window.scrollTo(0, 0);
  renderCart();
}

function openCategorySheet() {
  renderCategories();
  $("category-sheet").classList.add("show");
  $("category-sheet").setAttribute("aria-hidden", "false");
}

function closeCategorySheet() {
  $("category-sheet").classList.remove("show");
  $("category-sheet").setAttribute("aria-hidden", "true");
}

function openCatalog() {
  $("cart").classList.remove("on");
  $("catalog").classList.add("on");
  updateFloatingButtons();
  window.scrollTo(0, 0);
}

function toast(message) {
  const element = $("toast");
  element.textContent = message;
  element.classList.add("show");
  window.setTimeout(() => element.classList.remove("show"), 1800);
}

function saveAddressData() {
  const data = {
    building: $("building").value.trim(),
    block: $("block").value.trim(),
    apartment: $("apartment").value.trim()
  };
  localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(data));
}

function loadAddressData() {
  try {
    const data = JSON.parse(localStorage.getItem(ADDRESS_STORAGE_KEY) || "null");
    if (!data) return;
    $("building").value = data.building || "";
    $("block").value = data.block || "";
    $("apartment").value = data.apartment || "";
  } catch (error) {
    console.warn("Endereço salvo inválido:", error);
  }
}

function onlyNumbersInput(input) {
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "");
  });
}

function sendOrder() {
  const items = Object.values(cart);
  const date = $("date").value;
  const building = $("building").value.trim();
  const block = $("block").value.trim();
  const apartment = $("apartment").value.trim();

  if (!items.length) return toast("Sua sacola está vazia.");
  if (!date) return toast("Escolha a data.");
  if (orderType === "Entrega") {
    if (!building) return toast("Informe o número do prédio.");
    if (!apartment) return toast("Informe o número do apartamento.");
    saveAddressData();
  }

  const details = [];
  if (building) details.push("Prédio: " + building);
  if (block) details.push("Bloco: " + block);
  if (apartment) details.push("Apartamento: " + apartment);

  let message = "🛒 *NOVO PEDIDO - SAMUEL FRUTAS*\n-----------------------------------\n\n";
  items.forEach(item => {
    message += "• *" + item.name + "*: " + formatQty(item.quantity) + " " + item.unit + "\n";
    if (item.obs) message += "  _Obs: " + item.obs + "_\n";
  });

  message += "\n-----------------------------------\n";
  message += "📅 *Data:* " + date.split("-").reverse().join("/") + "\n";
  message += "🚚 *Tipo:* " + orderType + "\n";

  if (orderType === "Entrega") {
    message += "📍 *Endereço:* " + address + "\n";
    if (details.length) message += "🏢 " + details.join(" | ") + "\n";
  }

  const general = $("general").value.trim();
  if (general) message += "📝 *Observação geral:* " + general + "\n";

  window.open("https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message), "_blank");
}

function openFloatingSearch() {
  currentCategory = "";
  renderCategories();
  renderProducts();
  const search = $("search");
  if (!search) return;
  search.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => {
    search.focus();
    try { search.select(); } catch (error) {}
  }, 450);
}

function setup() {
  $("home").onclick = openCatalog;
  $("bag").onclick = openCart;
  $("back").onclick = openCatalog;
  $("nav-home").onclick = openCatalog;
  $("nav-cats").onclick = openCategorySheet;
  $("close-categories").onclick = closeCategorySheet;
  $("category-sheet").querySelector(".category-shade").onclick = closeCategorySheet;
  $("floating-checkout").onclick = openCart;
  $("floating-search").onclick = openFloatingSearch;
  $("nav-bag").onclick = openCart;
  $("nav-more").onclick = () => toast("Em breve");

  $("search").oninput = () => {
    currentCategory = "";
    renderCategories();
    renderProducts();
  };

  $("delivery").onclick = () => setOrderType("Entrega");
  $("pickup").onclick = () => setOrderType("Retirada");
  $("send").onclick = sendOrder;

  $("close").onclick = closeEdit;
  $("modal").querySelector(".shade").onclick = closeEdit;
  $("msave").onclick = saveEdit;

  $("mminus").onclick = () => {
    const unit = $("munit").value;
    $("mqty").value = Math.max(0, numberValue($("mqty").value) - stepFor(unit));
  };

  $("mplus").onclick = () => {
    const unit = $("munit").value;
    $("mqty").value = numberValue($("mqty").value) + stepFor(unit);
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  $("date").value = tomorrow.getFullYear() + "-" +
    String(tomorrow.getMonth() + 1).padStart(2, "0") + "-" +
    String(tomorrow.getDate()).padStart(2, "0");

  ["building", "block", "apartment"].forEach(id => onlyNumbersInput($(id)));
  ["building", "block", "apartment"].forEach(id => {
    $(id).addEventListener("change", saveAddressData);
  });
  loadAddressData();
  setOrderType("Entrega");
  updateCart();
  updateFloatingButtons();
  loadProducts();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setup);
} else {
  setup();
}
