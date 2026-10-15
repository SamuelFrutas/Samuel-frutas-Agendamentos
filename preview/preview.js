import { db } from "../firebase.js";
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const DEFAULT_WHATSAPP_NUMBER = "5521972837869";
const PRODUCTS_COLLECTION = "produtos";
const WHATSAPP_CONFIG_ID = "_config";
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
const escapeHtml = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

const CATEGORY_META = {frutas: ["Frutas", "🍎"],legumes: ["Legumes", "🥕"],verduras: ["Verduras", "🥬"],aguaOvos: ["Água de coco e ovos", "🥥"]};
function normalizarCategoria(categoria, nome = "") { const value=normalize(categoria),name=normalize(nome); if(value.includes("agua de coco")||value.includes("ovos")||value.includes("ovo")||name.includes("agua de coco")||(name.includes("coco")&&name.includes("agua"))||name.includes("ovo")) return "aguaOvos"; if(value.includes("legume")) return "legumes"; if(value.includes("verdura")) return "verduras"; return "frutas"; }
function parseUnits(data) { const u=data?.unidadesMedida||{},formas=data?.formasVenda||data?.formasDeVenda,units=[]; const hasForm=(name,...alternatives)=>{if(u[name]===true||formas?.[name]===true)return true;if(Array.isArray(formas))return formas.some(value=>alternatives.some(alt=>normalize(value)===normalize(alt)||normalize(value).includes(normalize(alt))));return false}; if(u.unidade===true||data?.unidade===true||data?.un===true)units.push("UN");if(u.quilo===true||data?.quilo===true||data?.kg===true)units.push("KG");if(u.maco===true||data?.maco===true||data?.maço===true)units.push("MAÇO");if(u.duzia===true||data?.duzia===true||data?.dúzia===true)units.push("DÚZIA");if(u.lote===true||data?.lote===true){const quantity=parseInt(u.quantidadePorLote||data?.quantidadeLote||3,10);units.push(quantity>0?"LOTE C/"+quantity:"LOTE")}if(hasForm("bdj","bdj","bandeja"))units.push("BDJ");if(hasForm("umQuarto","1/4","¼","um quarto"))units.push("1/4");if(hasForm("umOitavo","1/8","⅛","um oitavo"))units.push("1/8");if(hasForm("metade","metade","1/2","½"))units.push("METADE");const oldUnits=data?.unidades||data?.units;if(Array.isArray(oldUnits))oldUnits.forEach(value=>{const text=String(value).trim().toUpperCase();if(text.includes("BDJ")||text.includes("BANDEJA"))units.push("BDJ");else if(text.includes("1/4")||text.includes("¼"))units.push("1/4");else if(text.includes("1/8")||text.includes("⅛"))units.push("1/8");else if(text.includes("METADE")||text.includes("1/2")||text.includes("½"))units.push("METADE");else units.push(text)});return [...new Set(units.length?units:["UN"])] }
function getImage(data){return data?.imagemUrl||data?.imagem||data?.imageUrl||data?.foto||data?.image||data?.icon||data?.url||data?.img||""}
function productById(id){return Object.values(products).flat().find(product=>product.id===id)}
function cartKey(id,unit){return id+"::"+unit}
function stepFor(unit){return normalize(unit)==="kg"?0.1:1}
function setStatus(message,kind=""){const box=$("load-status");if(!box)return;box.textContent=message;box.className="load-status "+kind}
async function loadProducts(){setStatus("Carregando produtos…");try{const snapshot=await getDocs(collection(db,PRODUCTS_COLLECTION));products={frutas:[],legumes:[],verduras:[],aguaOvos:[]};snapshot.forEach(docSnap=>{if(docSnap.id===WHATSAPP_CONFIG_ID)return;const data=docSnap.data();const active=data.ativo!==undefined?data.ativo:(data.active!==undefined?data.active:true);if(!active)return;const name=data.nome||data.name||"Produto";const category=normalizarCategoria(data.categoria||data.category||"frutas",name);products[category].push({id:docSnap.id,name,image:getImage(data),units:parseUnits(data)})});Object.keys(products).forEach(key=>products[key].sort((a,b)=>a.name.localeCompare(b.name,"pt-BR")));renderCategories();renderProducts();setStatus(snapshot.size+" produtos carregados.","ok")}catch(error){console.error("Samuel Frutas preview - Firebase:",error);setStatus("Não foi possível carregar os produtos. Toque em Recarregar.","error");$("products").innerHTML='<div class="empty"><strong>Produtos não carregaram.</strong><br>Verifique a conexão e tente novamente.<br><button id="retry-load" class="retry" type="button">Recarregar</button></div>';$('retry-load').onclick=loadProducts}}
