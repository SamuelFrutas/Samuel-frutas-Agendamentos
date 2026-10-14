import { auth } from '../firebase.js';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

const form = document.getElementById('login-form');
const email = document.getElementById('email');
const password = document.getElementById('password');
const button = document.getElementById('login-button');
const error = document.getElementById('error-message');

onAuthStateChanged(auth, (user) => {
  if (user) window.location.href = 'admin.html';
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  error.style.display = 'none';
  error.textContent = '';
  button.disabled = true;
  button.textContent = 'Entrando...';

  try {
    await signInWithEmailAndPassword(auth, email.value.trim(), password.value);
    window.location.href = 'admin.html';
  } catch (err) {
    error.style.display = 'block';
    if (['auth/invalid-credential','auth/user-not-found','auth/wrong-password'].includes(err.code)) {
      error.textContent = 'E-mail ou senha incorretos.';
    } else if (err.code === 'auth/too-many-requests') {
      error.textContent = 'Muitas tentativas. Tente novamente mais tarde.';
    } else {
      error.textContent = 'Não foi possível realizar o login. Tente novamente.';
    }
  } finally {
    button.disabled = false;
    button.textContent = 'Entrar no painel';
  }
});
