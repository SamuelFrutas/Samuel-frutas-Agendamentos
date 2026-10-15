import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const BOT_CONFIG={
  apiKey:'AIzaSyB1E9oQsIwYO2-r4W5-uQK4ax92OmxISOI',
  authDomain:'samuelfrutasbot.firebaseapp.com',
  projectId:'samuelfrutasbot',
  storageBucket:'samuelfrutasbot.firebasestorage.app',
  messagingSenderId:'1052699327049',
  appId:'1:1052699327049:web:cf22d68c76d064d56b5d98'
};
const botApp=initializeApp(BOT_CONFIG,'samuel-frutas-bot-admin-central');
const botDb=getFirestore(botApp);

const style=document.createElement('style');
style.textContent='.whatsapp-config{margin:0 0 16px;padding:15px;border:1px solid rgba(56,193,114,.22);border-radius:18px;background:linear-gradient(180deg,#14241a,#0d1811);box-shadow:0 12px 30px rgba(0,0,0,.16)}.whatsapp-config h3{margin:0 0 4px;font-size:14px}.whatsapp-config p{margin:0 0 10px;color:#9eafa3;font-size:10px;line-height:1.45}.whatsapp-config-number{height:44px;display:flex;align-items:center;padding:0 12px;border:1px solid rgba(255,255,255,.09);background:#0c1710;color:#f5faf6;border-radius:11px;font-size:14px;font-weight:800}.whatsapp-config-status{display:block;margin-top:7px;font-size:10px;color:#9eafa3}.whatsapp-config-status.ok{color:#38c172}.whatsapp-config-status.err{color:#ff6474}';
document.head.appendChild(style);

function normalize(v){let n=String(v||'').replace(/\D/g,'');if(n.length===10||n.length===11)n='55'+n;return n}
function displayNumber(n){if(n.length===13)return `(${n.slice(2,4)}) ${n.slice(4,9)}-${n.slice(9)}`;if(n.length===12)return `(${n.slice(2,4)}) ${n.slice(4,8)}-${n.slice(8)}`;return n}

async function init(){
  const main=document.querySelector('main');
  if(!main||document.getElementById('whatsapp-config'))return;
  const box=document.createElement('section');
  box.id='whatsapp-config';
  box.className='whatsapp-config';
  box.innerHTML='<h3>📱 WhatsApp do responsável</h3><p>Este painel apenas consulta o número central cadastrado em <b>SamuelFrutasBot → config/bot → responsável</b>. A alteração deve ser feita no Bot e será usada automaticamente pelo Agendamentos.</p><div id="whatsapp-central-number" class="whatsapp-config-number">Carregando…</div><span id="whatsapp-status" class="whatsapp-config-status">Consultando o número central…</span>';
  main.prepend(box);
  const numberBox=document.getElementById('whatsapp-central-number');
  const status=document.getElementById('whatsapp-status');
  try{
    const snap=await getDoc(doc(botDb,'config','bot'));
    const n=normalize(snap.data()?.responsibleNumber||'');
    if(n.length<12)throw new Error('Número não configurado');
    numberBox.textContent=displayNumber(n);
    status.textContent='Número central carregado do Bot. Não é necessário cadastrar aqui.';
    status.className='whatsapp-config-status ok';
  }catch(error){
    console.error('WhatsApp central read:',error);
    numberBox.textContent='Não configurado';
    status.textContent='Não foi possível consultar o responsável no Bot.';
    status.className='whatsapp-config-status err';
  }
}

init();
