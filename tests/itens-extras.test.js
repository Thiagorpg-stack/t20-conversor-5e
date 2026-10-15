import { test } from 'node:test';
import assert from 'node:assert/strict';
import { itemExtraDe, TIPOS_ITEM_EXTRA } from '../scripts/conversor/itens-extras.js';

const poder = { _id: 'abc', name: 'Sopro', type: 'poder', img: 'icons/svg/aura.svg', folder: 'f', sort: 5, ownership: { default: 0 },
  _stats: { systemVersion: '1.6.6' }, flags: { outro: { x: 1 } }, effects: [{ name: 'Efeito' }], system: { rolls: [{ name: 'Dano' }] } };

test('itemExtraDe: aceita poder e magia, tira os campos do documento e marca a origem', () => {
  assert.deepEqual(TIPOS_ITEM_EXTRA, ['poder', 'magia']);
  const extra = itemExtraDe(poder);
  assert.equal(extra.name, 'Sopro');
  for (const campo of ['_id', 'folder', 'sort', 'ownership', '_stats']) assert.equal(campo in extra, false);
  assert.deepEqual(extra.effects, [{ name: 'Efeito' }]);
  assert.deepEqual(extra.flags, { outro: { x: 1 }, 't20-conversor-5e': { extra: true } });
  assert.equal(poder._id, 'abc'); // não altera o original
  assert.equal(itemExtraDe({ ...poder, type: 'magia' }).type, 'magia');
});

test('itemExtraDe: recusa arma, equipamento, feat do dnd5e e entrada vazia', () => {
  for (const type of ['arma', 'equipamento', 'consumivel', 'feat']) assert.equal(itemExtraDe({ ...poder, type }), null);
  assert.equal(itemExtraDe(null), null);
  assert.equal(itemExtraDe({}), null);
});
