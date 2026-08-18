export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

export function toast(message, type = 'info', timeout = 3200) {
  const root = $('#toastRoot');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => el.remove(), timeout);
}

export function modal({ title, subtitle = '', body = '', footer = '', size = '' }) {
  const root = $('#modalRoot');
  root.innerHTML = `
    <div class="modal-backdrop" data-modal-backdrop>
      <div class="modal ${size === 'lg' ? 'modal-lg' : ''}" role="dialog" aria-modal="true">
        <div class="modal-head"><div><h3>${escapeHtml(title)}</h3>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}</div><button class="icon-btn" data-close-modal type="button">×</button></div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
      </div>
    </div>`;
  $('[data-close-modal]', root)?.addEventListener('click', closeModal);
  $('[data-modal-backdrop]', root)?.addEventListener('click', e => { if (e.target.dataset.modalBackdrop !== undefined) closeModal(); });
}

export function closeModal() { $('#modalRoot').innerHTML = ''; }
export function formatDateTime(value) {
  if (!value) return '-';
  const d = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'short'}).format(d);
}
export function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID',{dateStyle:'long'}).format(d);
}
export function normalizeUsername(v='') { return v.trim().toLowerCase().replace(/\s+/g,''); }
export function usernameToEmail(value = '') {const username = normalizeUsername(value);if (username.includes('@')) {return username;}return `${username}@cbt.local`;}
export function randomId(len=8) { const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from({length:len},()=>chars[Math.floor(Math.random()*chars.length)]).join(''); }
export function downloadText(filename, text, type='text/plain;charset=utf-8') { const blob=new Blob([text],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url); }
export function csvEscape(v){ const s=String(v??''); return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; }
export function toLocalInputValue(iso){ if(!iso)return''; const d=new Date(iso); if(Number.isNaN(d.getTime()))return''; const pad=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }
export function localInputToIso(v){ return v ? new Date(v).toISOString() : ''; }
