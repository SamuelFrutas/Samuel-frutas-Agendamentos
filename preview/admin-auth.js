import { auth } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

let autenticado = false;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace('login.html');
    return;
  }
  autenticado = true;
  document.documentElement.classList.add('admin-auth-ok');

  const actions = document.querySelector('.actions-top');
  if (actions && !document.getElementById('btn-sair')) {
    const button = document.createElement('button');
    button.id = 'btn-sair';
    button.className = 'topbtn';
    button.type = 'button';
    button.textContent = 'Sair';
    button.addEventListener('click', async () => {
      await signOut(auth);
      window.location.replace('login.html');
    });
    actions.appendChild(button);
  }
});

// Evita que o painel fique disponível antes da confirmação da sessão.
document.documentElement.style.visibility = 'hidden';
onAuthStateChanged(auth, (user) => {
  document.documentElement.style.visibility = user ? 'visible' : 'hidden';
});
