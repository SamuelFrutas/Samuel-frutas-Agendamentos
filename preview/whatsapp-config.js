import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const DEFAULT_NUMBER='5521972837869';
const CONFIG_COLLECTION='produtos';
const CONFIG_ID='_config';

const style=document.createElement('style');
style.textContent='.whatsapp-config{margin:0 0 16px;padding:15px;border:1px solid rgba(56,193,114,.22);border-radius:18px;background:linear-gradient(180deg,#14241a,#0d1811);box-shadow:0 12px 30px rgba(0,0,0,.16)}.whatsapp-config h3{margin:0 0 4px;font-size:14px}.whatsapp-config p{margin:0 0 10px;color:#9eafa3;font-size:10px;line-height:1.45}.whatsapp-config-row{display:grid;grid-template-columns:minmax(240px,1fr) auto;gap:8px}.whatsapp-config input{width:100%;min-width:240px;height:46px;border:1px solid rgba(255,255,255,.09);background:#0c1710;color:#f5faf6;border-radius:11px;padding:0 12px;font-size:15px}.whatsapp-config button{height:46px;border:0;border-radius:11px;padding:0 16px;background:#38c172;color:#06200f;font-weight:900}.whatsapp-config-status{display:block;margin-top:7px;font-size:10px;color:#9eafa3}.whatsapp-config-status.ok{color:#38c172}.whatsapp-config-status.err{color:#ff6474}@media(max-width:600px){.whatsapp-config-row{grid-template-columns:1fr}.whatsapp-config input{min-width:0}.whatsapp-config button{width:100%}}';
document.head.appendChild(style);

function normalize(v){let n=String(v||'').replace(/\D/g,'');if(n.length===10||n.length===11)n='55'+n;return n}

async function init(){
  const main=document.querySelector('main');
  if(!main||document.getElementById('whatsapp-config'))return;
  const box=document.createElement('section');
  box.id='whatsapp-config';
  box.className='whatsapp-config';
  box.innerHTML='<h3>📱 WhatsApp da loja</h3><p>Este número fica salvo no Firestore e será usado pela loja para receber os pedidos. Pode trocar quando quiser.</p><div class="whatsapp-config-row"><input id="whatsapp-number" type="tel" inputmode="numeric" placeholder="Ex.: 21 97283-7869"><button id="save-whatsapp" type="button">Salvar número</button></div><span id="whatsapp-status" class="whatsapp-config-status">Carregando…</span>';
  main.prepend(box);

  const input=document.getElementById('whatsapp-number');
  const button=document.getElementById('save-whatsapp');
  const status=document.getElementById('whatsapp-status');

  try{
    const snap=await getDoc(doc(db,CONFIG_COLLECTION,CONFIG_ID));
    const configured=normalize(snap.data()?.responsibleNumber||'');
    input.value=configured||DEFAULT_NUMBER;
    status.textContent=configured?'Número carregado do Firestore.':'Nenhum número salvo ainda. O padrão será usado até salvar.';
    status.className='whatsapp-config-status ok';
  }catch(error){
    console.error('WhatsApp config read:',error);
    input.value=DEFAULT_NUMBER;
    status.textContent='Não foi possível ler o Firestore. Verifique as regras do Firebase.';
    status.className='whatsapp-config-status err';
  }

  button.onclick=async()=>{
    const n=normalize(input.value);
    if(n.length<12){status.textContent='Informe um número válido com DDD.';status.className='whatsapp-config-status err';return}
    button.disabled=true;
    status.textContent='Salvando no Firestore…';
    status.className='whatsapp-config-status';
    try{
      await setDoc(doc(db,CONFIG_COLLECTION,CONFIG_ID),{tipo:'configuracao',responsibleNumber:n,updatedAt:serverTimestamp()},{merge:true});
      input.value=n;
      status.textContent='Número salvo no Firestore com sucesso.';
      status.className='whatsapp-config-status ok';
    }catch(error){
      console.error('WhatsApp config write:',error);
      status.textContent='Não foi possível salvar no Firestore. O Firebase recusou a gravação.';
      status.className='whatsapp-config-status err';
    }finally{button.disabled=false}
  };
}

onAuthStateChanged(auth,user=>{if(user)init()});