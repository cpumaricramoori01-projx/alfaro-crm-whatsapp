import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, validState, addContact, addMessage, searchContacts, updateContact } from '../dist/model.js';

test('el seguimiento y los mensajes se conservan al serializar la sesión', () => {
  let state = initialState();
  state = updateContact(state, 'lucia', { owner: 'Yo', notes: 'Busca dos ambientes', visit: '2026-11-01T10:00' });
  state = addMessage(state, 'lucia', 'Sí, sigue disponible.', 'out');
  const restored = JSON.parse(JSON.stringify(state));
  assert.ok(validState(restored));
  const contact = restored.contacts.find(c => c.id === 'lucia');
  assert.equal(contact.stage, 'En conversación');
  assert.equal(contact.unread, 0);
  assert.equal(contact.notes, 'Busca dos ambientes');
  assert.equal(contact.messages.at(-1).text, 'Sí, sigue disponible.');
});
test('la bienvenida ocurre una sola vez al recibir el primer mensaje', () => {
  let state = addContact({ ...initialState(), welcome: true }, { name: 'Nuevo', phone: '+5491155550199', property: '' }, 'nuevo');
  state = addMessage(state, 'nuevo', 'Hola', 'in');
  state = addMessage(state, 'nuevo', 'Busco casa', 'in');
  assert.equal(state.contacts[0].messages.filter(m => m.direction === 'out').length, 1);
  assert.equal(state.contacts[0].unread, 2);
});
test('los filtros y la búsqueda combinan nombre, propiedad y pendientes', () => {
  const state = initialState();
  assert.equal(searchContacts(state, 'Nuevo Chimbote', 'Sin leer')[0].id, 'lucia');
  assert.equal(searchContacts(state, 'Martín', 'Sin leer').length, 0);
  assert.equal(searchContacts(state, '000 104')[0].id, 'diego');
});
test('rechaza teléfonos duplicados y datos locales dañados', () => {
  assert.throws(() => addContact(initialState(), { name: 'Duplicado', phone: '+51 (900) 000 101', property: '' }));
  assert.equal(validState({ version: 1, contacts: [{}] }), false);
  const state = initialState();
  state.contacts[0].messages[0].at = 'fecha inválida';
  assert.equal(validState(state), false);
});
