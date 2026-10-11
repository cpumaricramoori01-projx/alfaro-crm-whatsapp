export const stages = ['Nuevo', 'En conversación', 'Visita agendada', 'Cerrado'];
export function initialState() {
  const now = Date.now();
  const contact = (id, name, phone, property, stage, unread, text, age, owner = 'Sin asignar', source = 'Web') => ({ id, name, phone, property, propertyId: '', source, stage, unread, owner, notes: '', visit: '', messages: [{ id: `seed-${id}`, direction: 'in', text, at: new Date(now - age * 60000).toISOString() }] });
  return { version: 1, welcome: false, contacts: [
    contact('lucia', 'Lucía Fernández', '+51 900 000 101', 'Departamento · Nuevo Chimbote', 'Nuevo', 1, 'Hola, vi el departamento en la web. ¿Sigue disponible?', 4),
    contact('martin', 'Martín Acosta', '+51 900 000 102', 'Casa · Buenos Aires', 'En conversación', 0, 'Vi su publicación en Facebook. ¿Podemos coordinar una visita esta semana?', 23, 'Yo', 'Facebook'),
    contact('carolina', 'Carolina Ruiz', '+51 900 000 103', 'Departamento · Chimbote', 'Visita agendada', 0, 'Perfecto, confirmo la visita. ¡Gracias!', 65, 'Yo'),
    contact('diego', 'Diego Torres', '+51 900 000 104', 'Local · Av. Pardo', 'Nuevo', 1, 'Buenas tardes. Quisiera consultar los requisitos para alquilar el local.', 112, 'Sin asignar', 'Facebook'),
    contact('sofia', 'Sofía Méndez', '+51 900 000 105', 'Casa · Nuevo Chimbote', 'Cerrado', 0, 'Por ahora vamos a esperar. Gracias por la atención.', 1440, 'Yo', 'WhatsApp directo'),
  ] };
}
export function validState(value) {
  return value?.version === 1 && typeof value.welcome === 'boolean' && Array.isArray(value.contacts) && value.contacts.every(c =>
    typeof c.id === 'string' && typeof c.name === 'string' && typeof c.phone === 'string' && typeof c.property === 'string' && typeof c.propertyId === 'string' && ['Web', 'Facebook', 'WhatsApp directo'].includes(c.source) &&
    stages.includes(c.stage) && typeof c.owner === 'string' && typeof c.notes === 'string' && typeof c.visit === 'string' &&
    Number.isInteger(c.unread) && c.unread >= 0 && Array.isArray(c.messages) && c.messages.every(m =>
      typeof m.id === 'string' && ['in', 'out'].includes(m.direction) && typeof m.text === 'string' && !Number.isNaN(Date.parse(m.at)))) && new Set(value.contacts.map(c => c.id)).size === value.contacts.length;
}
export function addContact(state, input, id = crypto.randomUUID()) {
  const name = input.name.trim();
  const phone = input.phone.trim();
  if (!name || !/^\+?[\d\s()-]{7,24}$/.test(phone) || phone.replace(/\D/g, '').length < 7) throw new Error('Ingresá un nombre y un teléfono válido.');
  if (state.contacts.some(c => c.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''))) throw new Error('Ese teléfono ya tiene un contacto.');
  const c = { id, name, phone, property: input.property.trim(), propertyId: '', source: ['Web', 'Facebook', 'WhatsApp directo'].includes(input.source) ? input.source : 'WhatsApp directo', stage: 'Nuevo', unread: 0, owner: 'Sin asignar', notes: '', visit: '', messages: [] };
  return { ...state, contacts: [c, ...state.contacts] };
}
export function updateContact(state, id, changes) {
  return { ...state, contacts: state.contacts.map(c => c.id === id ? { ...c, ...changes, id: c.id } : c) };
}
export function addMessage(state, id, text, direction, at = new Date().toISOString()) {
  if (!text.trim()) throw new Error('Escribí un mensaje.');
  if (!['in', 'out'].includes(direction)) throw new Error('Dirección inválida.');
  const c = state.contacts.find(c => c.id === id);
  if (!c) throw new Error('Contacto no encontrado.');
  const messages = [...c.messages, { id: crypto.randomUUID(), text: text.trim(), direction, at }];
  if (direction === 'in' && state.welcome && c.messages.length === 0) messages.push({ id: crypto.randomUUID(), direction: 'out', at, text: '¡Hola! Gracias por comunicarte con Alfaro. ¿Qué propiedad te interesa y cuándo te gustaría visitarla?' });
  return updateContact(state, id, { messages, unread: direction === 'in' ? c.unread + 1 : 0, stage: direction === 'out' && c.stage === 'Nuevo' ? 'En conversación' : c.stage });
}
export function searchContacts(state, query = '', filter = 'Todos') {
  const q = query.trim().toLocaleLowerCase('es');
  return state.contacts.filter(c => `${c.name} ${c.phone} ${c.property}`.toLocaleLowerCase('es').includes(q) &&
    (filter === 'Todos' || (filter === 'Sin leer' && c.unread > 0) || (filter === 'Sin asignar' && c.owner === filter) || c.stage === filter))
    .sort((a, b) => (b.messages.at(-1)?.at || '').localeCompare(a.messages.at(-1)?.at || ''));
}
