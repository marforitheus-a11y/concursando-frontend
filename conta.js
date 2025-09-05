// arquivo: conta.js
const token = localStorage.getItem('token');
const API_URL = 'https://quiz-api-z4ri.onrender.com'; // ⚠️ Sua URL

document.addEventListener('DOMContentLoaded', () => {
    loadAccount();
    const addBtn = document.getElementById('add-tag-btn');
    const newTagInput = document.getElementById('new-tag-input');
    if (addBtn) addBtn.addEventListener('click', () => {
        const v = newTagInput.value && newTagInput.value.trim();
        if (!v) return;
        addTagForCurrentUser(v);
        newTagInput.value = '';
    });
    if (newTagInput) newTagInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') addBtn.click(); });
    // safe logout binding if present
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = 'index.html'; });
});

function getCurrentUserKey() {
    // try to identify user by stored user object or token
    const userRaw = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userRaw) {
        try { const u = JSON.parse(userRaw); if (u && u.username) return `user_tags_${u.username}`; } catch(e){}
    }
    // fallback to token-based key
    const t = localStorage.getItem('token') || '';
    return `user_tags_${t.slice(0,10)}`;
}

async function loadAccount() {
    const usernameEl = document.getElementById('account-username');
    const createdEl = document.getElementById('account-created');
    const subscriptionEl = document.getElementById('account-subscription');

    // default placeholders
    usernameEl.textContent = '—'; createdEl.textContent = '—'; subscriptionEl.textContent = '—';

    // Try backend route first
    try {
        const resp = await fetch(`${API_URL}/account/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (resp.ok) {
            const data = await resp.json();
            usernameEl.textContent = data.username || data.name || '—';
            createdEl.textContent = data.created_at ? new Date(data.created_at).toLocaleDateString('pt-BR') : '—';
            subscriptionEl.textContent = data.subscription_expires_at ? new Date(data.subscription_expires_at).toLocaleDateString('pt-BR') : 'Nenhuma';
            // load tags from backend if possible
            try {
                const t = await fetch(`${API_URL}/account/tags`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (t.ok) {
                    const tags = await t.json();
                    renderTags(tags);
                    return;
                }
            } catch (e) { /* fallback */ }
            renderTags(loadTagsFromStorage());
            return;
        }
    } catch (err) { /* ignore and use fallback */ }

    // fallback: read from localStorage 'user'
    const userRaw = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userRaw) {
        try {
            const u = JSON.parse(userRaw);
            usernameEl.textContent = u.username || '—';
            createdEl.textContent = 'Local';
            subscriptionEl.textContent = 'Local';
        } catch (e) { /* ignore */ }
    }
    renderTags(loadTagsFromStorage());
}

function loadTagsFromStorage() {
    // try backend first when logged in
    // fallback to localStorage
    const key = getCurrentUserKey();
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
}

function renderTags(tags) {
    const container = document.getElementById('tags-container');
    container.innerHTML = '';
    if (!tags || tags.length === 0) {
        container.innerHTML = '<div class="text-gray-500">Nenhuma tag adicionada.</div>';
        return;
    }
    tags.forEach(t => {
        const pill = document.createElement('div');
        pill.className = 'tag-pill';
        pill.textContent = t;
        const remove = document.createElement('button');
        remove.className = 'btn-small';
        remove.style.marginLeft = '8px';
        remove.textContent = 'x';
        remove.addEventListener('click', () => { removeTagForCurrentUser(t); });
        const wrapper = document.createElement('div');
        wrapper.style.display = 'inline-flex';
        wrapper.style.alignItems = 'center';
        wrapper.appendChild(pill);
        wrapper.appendChild(remove);
        container.appendChild(wrapper);
    });
}

function addTagForCurrentUser(tag) {
    // attempt to persist to backend
    (async () => {
        try {
            // fetch existing, then PUT
            const existing = await fetch(`${API_URL}/account/tags`, { headers: { 'Authorization': `Bearer ${token}` } });
            let tags = [];
            if (existing.ok) tags = await existing.json();
            if (!tags.includes(tag)) tags.push(tag);
            const put = await fetch(`${API_URL}/account/tags`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ tags }) });
            if (put.ok) { renderTags(tags); return; }
        } catch (e) { /* fallback to localStorage */ }
        // fallback
        const key = getCurrentUserKey();
        const tags = loadTagsFromStorage();
        if (tags.includes(tag)) return;
        tags.push(tag);
        localStorage.setItem(key, JSON.stringify(tags));
        renderTags(tags);
    })();
}

function removeTagForCurrentUser(tag) {
    (async () => {
        try {
            const existing = await fetch(`${API_URL}/account/tags`, { headers: { 'Authorization': `Bearer ${token}` } });
            let tags = [];
            if (existing.ok) tags = await existing.json();
            tags = tags.filter(t => t !== tag);
            const put = await fetch(`${API_URL}/account/tags`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ tags }) });
            if (put.ok) { renderTags(tags); return; }
        } catch (e) { /* fallback */ }
        const key = getCurrentUserKey();
        let tags = loadTagsFromStorage();
        tags = tags.filter(t => t !== tag);
        localStorage.setItem(key, JSON.stringify(tags));
        renderTags(tags);
    })();
}