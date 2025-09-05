// arquivo: admin-auth.js
function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}

const token = localStorage.getItem('token');
let isAdmin = false;

if (token) {
    const payload = parseJwt(token);
    if (payload && payload.role === 'admin') {
        isAdmin = true;
    }
}

if (!isAdmin) {
    alert('Acesso negado. Esta área é exclusiva para administradores.');
    window.location.href = 'index.html';
}