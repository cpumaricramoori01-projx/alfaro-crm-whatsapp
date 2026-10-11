import { initialState, validState, stages, addContact, addMessage, updateContact, searchContacts } from './model.js';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const key = 'alfaro-crm-demo-v1';
let state = initialState(), selected = state.contacts[0].id, filter = 'Todos', query = '', catalog = [], storageProblem = false;
try { const data = JSON.parse(localStorage.getItem(key) || 'null'); if (validState(data)) { state = data; selected = state.contacts[0]?.id; } else if (data) storageProblem = true; } catch { storageProblem = true; }
let toastTimer;
function toast(message, error = false) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.remove('hidden'); $('#toast').classList.toggle('error', error); toastTimer = setTimeout(() => $('#toast').classList.add('hidden'), 5000); }
function save() { try { localStorage.setItem(key, JSON.stringify(state)); return true; } catch { toast('No se pudo guardar en este navegador. Exporta los datos antes de cerrar.', true); return false; } }
const initials = name => name.split(/\s+/).slice(0,2).map(s => s[0]).join('').toUpperCase();
const time = at => at ? new Date(at).toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' }) : 'Nuevo';
const chosen = () => state.contacts.find(c => c.id === selected);
function metrics() {
  const values = [['Contactos de prueba',state.contacts.length,'♧'],['Conversaciones sin leer',state.contacts.filter(c => c.unread > 0).length,'▤'],['Sin asignar',state.contacts.filter(c => c.owner === 'Sin asignar').length,'♙'],['Visitas agendadas',state.contacts.filter(c => c.stage === 'Visita agendada').length,'▦']];
  $('#metrics').innerHTML = values.map(([label,value,icon]) => `<div class="metric"><div><small>${label}</small><strong>${value}</strong></div><span class="metric-icon" aria-hidden="true">${icon}</span></div>`).join('');
  $('#nav-count').textContent = values[1][1];
}
function contacts() {
  const list = searchContacts(state,query,filter); $('#list-count').textContent = list.length;
  $('#contacts').innerHTML = list.length ? list.map(c => `<button class="contact ${c.id === selected ? 'active' : ''}" data-contact="${esc(c.id)}" aria-pressed="${c.id === selected}"><span class="avatar">${esc(initials(c.name))}</span><span class="contact-content"><span class="contact-line"><strong>${esc(c.name)}</strong><time>${time(c.messages.at(-1)?.at)}</time></span><p>${esc(c.messages.at(-1)?.text || 'Sin mensajes todavía')}</p><span class="contact-bottom"><span class="source-label">${esc(c.source)} · ${esc(c.stage)}</span>${c.unread ? `<span class="unread">${c.unread}</span>` : ''}</span></span></button>`).join('') : '<p class="empty">No hay conversaciones con este filtro.</p>';
}
function chat() {
  const c = chosen(); if (!c) { $('#chat').innerHTML = '<p class="empty">Crea o selecciona un contacto para comenzar.</p>'; $('#profile').innerHTML = ''; return; }
  let previousDay = '';
  const messages = c.messages.map(m => { const day = new Date(m.at).toLocaleDateString('es-PE',{ day:'numeric',month:'long' }); const divider = day !== previousDay ? `<div class="date-divider">${esc(day)}</div>` : ''; previousDay = day; return `${divider}<div class="bubble ${m.direction}">${esc(m.text)}<small>${time(m.at)}${m.direction === 'out' ? ' · Simulado' : ''}</small></div>`; }).join('');
  $('#chat').innerHTML = `<div class="chat-head"><span class="avatar">${esc(initials(c.name))}</span><div><h2>${esc(c.name)}</h2><p>${esc(c.phone)} · Contacto de prueba</p></div><span class="chat-source">${esc(c.source)}</span></div><div class="chat-property"><span>⌂</span><span>${esc(c.property || 'Sin propiedad vinculada')}</span></div><div class="messages" aria-label="Historial de mensajes">${messages || '<p class="empty">Esta conversación está vacía.<br>Simula un mensaje entrante para probar la bienvenida.</p>'}</div><div class="chat-tools"><button id="quick-availability">Consultar disponibilidad</button><button id="quick-visit">Proponer una visita</button><button id="simulate-incoming">＋ Simular mensaje entrante</button></div><form id="composer" class="composer"><div><textarea id="message" rows="1" maxlength="4000" placeholder="Escribe una respuesta de prueba…" aria-label="Respuesta de prueba" required></textarea><button class="primary" type="submit">Enviar</button></div><small>Simulación local · Este mensaje no se enviará a WhatsApp</small></form>`;
  $('.messages').scrollTop = $('.messages').scrollHeight;
  $('#composer').onsubmit = e => { e.preventDefault(); try { state = addMessage(state,c.id,$('#message').value,'out'); const ok = save(); render(); if (ok) toast('Respuesta simulada guardada.'); } catch (err) { toast(err.message,true); } };
  $('#message').onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#composer').requestSubmit(); } };
  $('#quick-availability').onclick = () => { $('#message').value = '¡Hola! Gracias por tu consulta. Voy a confirmar la disponibilidad de la propiedad y te comparto la información.'; $('#message').focus(); };
  $('#quick-visit').onclick = () => { $('#message').value = '¿Qué día y horario te vendría bien para visitar la propiedad?'; $('#message').focus(); };
  $('#simulate-incoming').onclick = () => { const text = prompt('Mensaje entrante de prueba:','Hola, me interesa esta propiedad. ¿Podemos coordinar una visita?'); if (text?.trim()) { state = addMessage(state,c.id,text,'in'); save(); render(); toast('Mensaje entrante simulado.'); } };
  profile(c);
}
function profile(c) {
  const opts = (values,value) => values.map(v => `<option ${v === value ? 'selected' : ''}>${esc(v)}</option>`).join('');
  $('#profile').innerHTML = `<h2>Detalle del interesado</h2><div class="profile-summary"><span class="avatar">${esc(initials(c.name))}</span><h3>${esc(c.name)}</h3><p>${esc(c.phone)}</p></div><form id="profile-form"><label class="field">Estado del interesado<select name="stage">${opts(stages,c.stage)}</select></label><label class="field">Responsable<select name="owner">${opts(['Sin asignar','Yo'],c.owner)}</select></label><label class="field">Origen de la consulta<select name="source">${opts(['Web','Facebook','WhatsApp directo'],c.source)}</select></label><label class="field">Propiedad publicada<select name="propertyId"><option value="">${esc(c.property || 'Selecciona una propiedad')}</option>${catalog.map(p => `<option value="${esc(p.id)}" ${String(p.id) === c.propertyId ? 'selected' : ''}>#${esc(p.id)} · ${esc(p.title)}</option>`).join('')}</select></label><label class="field">Próxima visita<input name="visit" type="datetime-local" value="${esc(c.visit)}"></label><label class="field">Notas internas<textarea name="notes" maxlength="4000" placeholder="Preferencias, presupuesto o próximo paso…">${esc(c.notes)}</textarea></label><button type="submit" class="primary save-profile">Guardar seguimiento</button></form>${c.propertyId ? `<a class="profile-link" href="https://www.inmobiliariaalbertoalfaro.com.pe/propiedades/resumen/${encodeURIComponent(c.propertyId)}" target="_blank" rel="noopener">Ver ficha en la web ↗</a>` : ''}<p class="profile-help">Los cambios se guardan en este navegador. Vincula una propiedad del catálogo para identificar el interés del cliente.</p>`;
  $('#profile-form').onsubmit = e => { e.preventDefault(); const data = Object.fromEntries(new FormData(e.currentTarget)); const p = catalog.find(p => String(p.id) === data.propertyId); state = updateContact(state,c.id,{ ...data,property:p ? p.title : c.property,stage:data.visit && ['Nuevo','En conversación'].includes(data.stage) ? 'Visita agendada' : data.stage }); const ok = save(); render(); if (ok) toast('Seguimiento guardado en este navegador.'); };
}
function pipeline() {
  $('#pipeline').innerHTML = stages.map(stage => { const cs = state.contacts.filter(c => c.stage === stage); return `<div class="pipeline-column"><h3>${stage}<span>${cs.length}</span></h3>${cs.map(c => `<button class="pipeline-card" data-contact="${esc(c.id)}"><strong>${esc(c.name)}</strong><p>${esc(c.property || 'Sin propiedad vinculada')}</p><p>${esc(c.source)} · ${esc(c.owner)}</p>${c.visit ? `<p>Visita: ${esc(new Date(c.visit).toLocaleString('es-PE'))}</p>` : ''}<small>Abrir conversación ↗</small></button>`).join('') || '<p class="muted">Sin contactos en esta etapa</p>'}</div>`; }).join('');
}
function render() { metrics(); contacts(); chat(); pipeline(); $('#welcome').checked = state.welcome; }
function showView(view) {
  if (!['bandeja','seguimiento','catalogo','automatizaciones','conexion'].includes(view)) return;
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('hidden',el.id !== view)); document.querySelectorAll('.nav').forEach(el => el.classList.toggle('active',el.dataset.view === view));
  $('#page-title').textContent = { bandeja:'Bandeja de entrada',seguimiento:'Seguimiento de interesados',catalogo:'Catálogo de propiedades',automatizaciones:'Automatizaciones',conexion:'Conexiones' }[view]; history.replaceState(null,'',`#${view}`);
}
document.addEventListener('click',e => {
  const view = e.target.closest('[data-view]'); if (view) showView(view.dataset.view);
  const contact = e.target.closest('[data-contact]'); if (contact) { selected = contact.dataset.contact; state = updateContact(state,selected,{ unread:0 }); save(); render(); showView('bandeja'); }
  const button = e.target.closest('[data-filter]'); if (button) { filter = button.dataset.filter; document.querySelectorAll('[data-filter]').forEach(el => el.classList.toggle('active',el === button)); contacts(); }
  const property = e.target.closest('[data-property]'); if (property) { const p = catalog.find(p => String(p.id) === property.dataset.property); if (!chosen()) { toast('Primero crea un contacto para vincular la propiedad.',true); return; } state = updateContact(state,selected,{ property:p.title,propertyId:String(p.id) }); save(); render(); showView('bandeja'); toast('Propiedad vinculada al contacto seleccionado.'); }
});
$('#search').oninput = e => { query = e.target.value; contacts(); };
$('#new-contact').onclick = () => { $('#form-error').textContent = ''; $('#contact-dialog').showModal(); };
$('#close-dialog').onclick = () => $('#contact-dialog').close();
$('#contact-form').onsubmit = e => { e.preventDefault(); try { const id = crypto.randomUUID(); state = addContact(state,Object.fromEntries(new FormData(e.currentTarget)),id); selected = id; save(); render(); showView('bandeja'); $('#contact-dialog').close(); e.currentTarget.reset(); toast('Contacto de prueba creado.'); } catch (err) { $('#form-error').textContent = err.message; } };
$('#welcome').onchange = e => { state = { ...state,welcome:e.target.checked }; save(); toast(state.welcome ? 'Bienvenida activada en la simulación.' : 'Bienvenida de prueba desactivada.'); };
$('#export').onclick = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{ type:'application/json' })); const a = document.createElement('a'); a.href = url; a.download = `alfaro-crm-prueba-${new Date().toISOString().slice(0,10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000); toast('Datos de prueba exportados.'); };
$('#reset').onclick = () => { if (confirm('¿Borrar las conversaciones y notas simuladas de este navegador?')) { state = initialState(); selected = state.contacts[0].id; save(); render(); toast('Demostración reiniciada.'); } };
function propertyCards() {
  const q = $('#property-search').value.trim().toLocaleLowerCase('es'); const items = catalog.filter(p => `${p.title} ${p.location} ${p.address}`.toLocaleLowerCase('es').includes(q));
  $('#properties').innerHTML = items.map(p => { let image = ''; try { const url = new URL(p.image); if (url.protocol === 'https:' && url.hostname === 'media.inmobiliariaalbertoalfaro.com.pe') image = `<img src="${esc(url.href)}" alt="${esc(p.title)}" loading="lazy" referrerpolicy="no-referrer">`; } catch {} return `<article class="property-card">${image}<div><span class="eyebrow">${esc(p.status)} · #${esc(p.id)}</span><h3>${esc(p.title)}</h3><p>${esc(p.location)} · ${esc(p.area)} m²</p><strong>${esc(p.moneda)} ${Number(p.price).toLocaleString('es-PE')}</strong><div class="property-card-actions"><a class="secondary" href="https://www.inmobiliariaalbertoalfaro.com.pe/propiedades/resumen/${encodeURIComponent(p.id)}" target="_blank" rel="noopener">Ver ficha ↗</a><button class="secondary" data-property="${esc(p.id)}">Vincular al contacto</button></div></div></article>`; }).join('') || '<p class="empty catalog-empty">No hay propiedades que coincidan con la búsqueda.</p>';
}
async function loadCatalog() {
  try {
    let response, live = false;
    try { response = await fetch('./api/catalog',{ signal:AbortSignal.timeout(12000) }); if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw Error(); live = true; } catch { response = await fetch('./catalog.json',{ signal:AbortSignal.timeout(10000) }); }
    if (!response.ok) throw Error(); const data = await response.json(); if (!Array.isArray(data.properties)) throw Error(); catalog = data.properties;
    $('#catalog-status').textContent = `${catalog.length} propiedades · ${live ? 'Consulta actual de la web' : 'Copia del catálogo público'} · ${new Date(data.fetchedAt).toLocaleString('es-PE')}`;
    propertyCards(); if (chosen()) profile(chosen());
  } catch { $('#catalog-status').textContent = 'No se pudo obtener el catálogo. Puedes abrir la web para consultarlo.'; $('#properties').innerHTML = '<p class="empty">Catálogo no disponible.</p>'; }
}
$('#property-search').oninput = propertyCards;
render(); showView(location.hash.slice(1) || 'bandeja'); loadCatalog();
if (storageProblem) toast('No se pudieron recuperar los datos locales. Se cargó la demostración inicial.',true);
