const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('zadaca_token');
}
function setSesion(token, cliente) {
  localStorage.setItem('zadaca_token', token);
  localStorage.setItem('zadaca_cliente', JSON.stringify(cliente));
}
function getCliente() {
  try {
    return JSON.parse(localStorage.getItem('zadaca_cliente'));
  } catch {
    return null;
  }
}
function cerrarSesion() {
  localStorage.removeItem('zadaca_token');
  localStorage.removeItem('zadaca_cliente');
  window.location.href = 'index.html';
}
function estaLogueado() {
  return !!getToken();
}

async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  let data = null;
  try { data = await res.json(); } catch { /* sin cuerpo */ }

  if (!res.ok) {
    if (res.status === 401 && token) cerrarSesionSilenciosa();
    throw new Error((data && data.error) || 'Ocurrió un error inesperado');
  }
  return data;
}

function cerrarSesionSilenciosa() {
  localStorage.removeItem('zadaca_token');
  localStorage.removeItem('zadaca_cliente');
}

function formatoMoneda(valor) {
  const n = Number(valor);
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function mostrarToast(mensaje, tipo = 'ok') {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${tipo === 'error' ? 'error' : ''}`;
  toast.textContent = mensaje;
  stack.appendChild(toast);
  setTimeout(() => toast.remove(), 3800);
}

function irALoginConRetorno() {
  const destino = window.location.pathname.split('/').pop() + window.location.search;
  window.location.href = `cuenta.html?retorno=${encodeURIComponent(destino)}`;
}

function precioFinal(precioRegular, descuentoPorcentaje) {
  return Number(precioRegular) * (1 - Number(descuentoPorcentaje || 0) / 100);
}

function escapeHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}
