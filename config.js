// ============================================================
// config.js — Configuración centralizada y helpers para Recicladora
// Reemplazar SUPABASE_URL y SUPABASE_KEY con los datos de tu proyecto
// ============================================================

const SUPABASE_URL = 'https://zsvemclzvtsoxqhrlxea.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzdmVtY2x6dnRzb3hxaHJseGVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MTIxNjQsImV4cCI6MjA5NTM4ODE2NH0.yrzuk6sd1gi8BQGL-nqrK9HFjrxhRNB_hOdbdAAL4sw';
const IVA_DEFAULT = 21;

// ===== FUNCIONES DE SESIÓN =====

function getSession() {
    const data = sessionStorage.getItem('sb_session');
    return data ? JSON.parse(data) : null;
}

function setSession(s) {
    sessionStorage.setItem('sb_session', JSON.stringify(s));
}

function clearSession() {
    sessionStorage.removeItem('sb_session');
}

function getAccessToken() {
    const s = getSession();
    return s ? s.access_token : null;
}

async function checkAuth(redirect = true) {
    const token = getAccessToken();
    if (!token) { if (redirect) window.location.href = 'login.html'; return false; }
    try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            const session = getSession();
            if (session && session.refresh_token) {
                const rf = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
                    method: 'POST',
                    headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: session.refresh_token })
                });
                if (rf.ok) { const ns = await rf.json(); setSession(ns); return true; }
            }
            clearSession();
            if (redirect) window.location.href = 'login.html';
            return false;
        }
        return true;
    } catch (e) { if (redirect) window.location.href = 'login.html'; return false; }
}

let _authChecked = false;
async function ensureAuth() {
    if (_authChecked) return true;
    _authChecked = await checkAuth(true);
    return _authChecked;
}

async function logout() {
    const token = getAccessToken();
    try {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` }
        });
    } catch (e) { /* ignorar error */ }
    clearSession();
    window.location.href = 'login.html';
}

// ===== FUNCIONES API (Fetch a Supabase PostgREST) =====

async function apiGet(table, queryStr = '') {
    const token = getAccessToken();
    let url = `${SUPABASE_URL}/rest/v1/${table}`;
    if (queryStr) url += `?${queryStr}`;
    const res = await fetch(url, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Error ${res.status}: ${txt}`);
    }
    return res.json();
}

async function apiGetSingle(table, queryStr = '') {
    const token = getAccessToken();
    let url = `${SUPABASE_URL}/rest/v1/${table}`;
    if (queryStr) url += `?${queryStr}`;
    url += (queryStr ? '&' : '?') + 'limit=1';
    const res = await fetch(url, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.pgrst.object+json'
        }
    });
    if (res.status === 406) {
        // No row found
        return null;
    }
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return res.json();
}

async function apiPost(table, data) {
    const token = getAccessToken();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Error ${res.status}: ${txt}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

async function apiPatch(table, id, data) {
    const token = getAccessToken();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

async function apiDelete(table, id) {
    const token = getAccessToken();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
}

async function apiRpc(fnName, body = {}) {
    const token = getAccessToken();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

// ===== HELPERS DE STOCK =====

async function updateStock(tipoChatarraId, delta) {
    const stockRes = await apiGet('stock', `tipo_chatarra_id=eq.${tipoChatarraId}`);
    if (stockRes.length > 0) {
        const s = stockRes[0];
        const nueva = parseFloat(s.cantidad) + delta;
        if (nueva < 0) throw new Error('Stock insuficiente');
        return apiPatch('stock', s.id, { cantidad: nueva });
    } else {
        if (delta < 0) throw new Error('Stock insuficiente');
        return apiPost('stock', { tipo_chatarra_id: tipoChatarraId, cantidad: delta });
    }
}

// ===== COSTO PROMEDIO QUINCENAL =====

async function getCostoPromedioQuincenal(tipoChatarraId) {
    try {
        const hoy = new Date();
        const año = hoy.getFullYear();
        const mes = hoy.getMonth();
        const dia = hoy.getDate();

        let desdeDate, hastaDate;
        if (dia <= 15) {
            desdeDate = new Date(año, mes, 1);
            hastaDate = new Date(año, mes, 16);
        } else {
            desdeDate = new Date(año, mes, 16);
            hastaDate = new Date(año, mes + 1, 1);
        }
        const desde = desdeDate.toISOString().split('T')[0];
        const hasta = hastaDate.toISOString().split('T')[0];

        let totalCantidad = 0;
        let totalCosto = 0;

        // Compras en la quincena
        const compras = await apiGet('compras',
            `fecha=gte.${desde}&fecha=lt.${hasta}&select=id`);

        if (compras.length > 0) {
            const ids = compras.map(c => c.id);
            const detalles = await apiGet('detalle_compras',
                `tipo_chatarra_id=eq.${tipoChatarraId}&compra_id=in.(${ids.join(',')})&select=cantidad,precio_unitario`);
            detalles.forEach(d => {
                const cant = parseFloat(d.cantidad) || 0;
                const precio = parseFloat(d.precio_unitario) || 0;
                totalCantidad += cant;
                totalCosto += cant * precio;
            });
        }

        // Transformaciones (salidas) en la quincena
        const transfs = await apiGet('transformaciones',
            `fecha=gte.${desde}&fecha=lt.${hasta}&select=id`);

        if (transfs.length > 0) {
            const tIds = transfs.map(t => t.id);
            const salidas = await apiGet('detalle_transformacion_salida',
                `tipo_chatarra_id=eq.${tipoChatarraId}&transformacion_id=in.(${tIds.join(',')})&select=cantidad,costo_unitario`);
            salidas.forEach(d => {
                const cant = parseFloat(d.cantidad) || 0;
                const precio = parseFloat(d.costo_unitario) || 0;
                totalCantidad += cant;
                totalCosto += cant * precio;
            });
        }

        if (totalCantidad === 0) return null;
        return parseFloat((totalCosto / totalCantidad).toFixed(2));
    } catch (e) {
        console.error('Error calculando costo promedio quincenal:', e);
        return null;
    }
}

// ===== COSTO PROMEDIO TOTAL (histórico, para transformaciones) =====

async function getCostoPromedioTotal(tipoChatarraId) {
    try {
        let totalCantidad = 0;
        let totalCosto = 0;

        const detallesC = await apiGet('detalle_compras',
            `tipo_chatarra_id=eq.${tipoChatarraId}&select=cantidad,precio_unitario`);
        detallesC.forEach(d => {
            const cant = parseFloat(d.cantidad) || 0;
            const precio = parseFloat(d.precio_unitario) || 0;
            totalCantidad += cant;
            totalCosto += cant * precio;
        });

        const detallesT = await apiGet('detalle_transformacion_salida',
            `tipo_chatarra_id=eq.${tipoChatarraId}&select=cantidad,costo_unitario`);
        detallesT.forEach(d => {
            const cant = parseFloat(d.cantidad) || 0;
            const precio = parseFloat(d.costo_unitario) || 0;
            totalCantidad += cant;
            totalCosto += cant * precio;
        });

        if (totalCantidad === 0) return null;
        return parseFloat((totalCosto / totalCantidad).toFixed(2));
    } catch (e) {
        console.error('Error calculando costo promedio total:', e);
        return null;
    }
}

// ===== HELPERS DE FORMATO =====

function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}

function formatNum(n, decimals = 2) {
    return parseFloat(n || 0).toFixed(decimals);
}

function formatMoney(n) {
    return '$ ' + parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

// ===== TOAST / NOTIFICACIÓN =====

function showToast(msg, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// ===== NAVBAR DINÁMICO =====

let _navCreated = false;
let _navCurrent = null;

function createNavbar(currentPage) {
    if (_navCreated) {
        if (_navCurrent === currentPage) return;
        const prev = document.querySelector(`.nav-menu li a[data-page="${_navCurrent}"]`);
        const next = document.querySelector(`.nav-menu li a[data-page="${currentPage}"]`);
        if (prev) prev.classList.remove('active');
        if (next) next.classList.add('active');
        _navCurrent = currentPage;
        return;
    }
    _navCreated = true;
    _navCurrent = currentPage;

    const navHTML = `
    <nav class="navbar" id="navbar">
      <div class="nav-brand">
        <img src="img/logo.jpeg" alt="Khloe Global" style="width:36px;height:36px;border-radius:8px;object-fit:cover;">
        <span>Khloe Global</span>
      </div>
      <button class="nav-toggle" id="navToggle" aria-label="Menú">
        <span></span><span></span><span></span>
      </button>
      <ul class="nav-menu" id="navMenu">
        <li><a href="dashboard.html" data-page="dashboard" ${currentPage==='dashboard'?'class="active"':''}><i class="fas fa-chart-pie"></i> Dashboard</a></li>
        <li><a href="maestros.html" data-page="maestros" ${currentPage==='maestros'?'class="active"':''}><i class="fas fa-database"></i> Maestros</a></li>
        <li><a href="compras.html" data-page="compras" ${currentPage==='compras'?'class="active"':''}><i class="fas fa-cart-plus"></i> Compras</a></li>
        <li><a href="ventas.html" data-page="ventas" ${currentPage==='ventas'?'class="active"':''}><i class="fas fa-store"></i> Ventas</a></li>
        <li><a href="reportes.html" data-page="reportes" ${currentPage==='reportes'?'class="active"':''}><i class="fas fa-file-invoice"></i> Reportes</a></li>
        <li><a href="gastos.html" data-page="gastos" ${currentPage==='gastos'?'class="active"':''}><i class="fas fa-wallet"></i> Gastos</a></li>
        <li><a href="transformaciones.html" data-page="transformaciones" ${currentPage==='transformaciones'?'class="active"':''}><i class="fas fa-sync-alt"></i> Transformaciones</a></li>
        <li><a href="caja.html" data-page="caja" ${currentPage==='caja'?'class="active"':''}><i class="fas fa-cash-register"></i> Caja</a></li>
        <li><a href="configuracion.html" data-page="configuracion" ${currentPage==='configuracion'?'class="active"':''}><i class="fas fa-cog"></i> Config</a></li>
        <li><a href="#" onclick="logout();return false;" style="color:#fecaca;"><i class="fas fa-sign-out-alt"></i> Salir</a></li>
      </ul>
    </nav>
    `;
    document.body.insertAdjacentHTML('afterbegin', navHTML);

    document.getElementById('navToggle').addEventListener('click', () => {
        document.getElementById('navMenu').classList.toggle('open');
        document.getElementById('navToggle').classList.toggle('open');
    });

    if (document.getElementById('app-view')) {
        document.querySelectorAll('.nav-menu li a[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                if (typeof navigateTo === 'function') navigateTo(page);
            });
        });
    }
}

// ===== SPA ROUTER =====

function extractScripts(html) {
    const scripts = [];
    const regex = /<script\b(?![^>]*\bsrc\b[^>]*>)[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
        const code = match[1].trim();
        if (code && !code.includes('config.js')) scripts.push(code);
    }
    return scripts;
}

function extractMainContent(html) {
    const mainMatch = html.match(/<main\b[^>]*class="[^"]*main[^"]*"[^>]*>([\s\S]*?)<\/main>/i);
    if (!mainMatch) return null;
    return mainMatch[0].replace(/<main\b[^>]*>/i, '').replace(/<\/main>/i, '').trim();
}

function extractStyles(html) {
    const styles = [];
    const regex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
        styles.push(match[1].trim());
    }
    return styles;
}

function extractTitle(html) {
    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : '';
}

const ROUTE_CACHE = {};

async function navigateTo(page, pushState = true) {
    const view = document.getElementById('app-view');
    if (!view) return;

    try {
        let html;
        if (ROUTE_CACHE[page]) {
            html = ROUTE_CACHE[page];
        } else {
            const res = await fetch(page + '.html');
            html = await res.text();
            ROUTE_CACHE[page] = html;
        }

        const content = extractMainContent(html);
        const title = extractTitle(html);

        const existingStyle = document.getElementById('page-dynamic-styles');
        if (existingStyle) existingStyle.remove();
        const styles = extractStyles(html);
        if (styles.length > 0) {
            const styleEl = document.createElement('style');
            styleEl.id = 'page-dynamic-styles';
            styleEl.textContent = styles.join('\n');
            document.head.appendChild(styleEl);
        }

        if (content) {
            view.innerHTML = content;
        }

        if (title) document.title = title;

        createNavbar(page);

        const scripts = extractScripts(html);
        for (const code of scripts) {
            try {
                new Function('"use strict";' + code)();
            } catch (e) {
                console.error('Script error (' + page + '):', e);
            }
        }

        if (pushState) {
            history.pushState({ page }, '', page + '.html');
        }

        document.getElementById('navMenu')?.classList.remove('open');
        document.getElementById('navToggle')?.classList.remove('open');
    } catch (e) {
        console.error('Navigation error:', e);
    }
}

window.addEventListener('popstate', (e) => {
    if (e.state && e.state.page) {
        navigateTo(e.state.page, false);
    }
});
