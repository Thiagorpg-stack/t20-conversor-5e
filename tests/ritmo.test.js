import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcularND, custoQ, linhaDoND, xpDoCR, RITMOS } from '../scripts/conversor/ritmo.js';
import { sugerirPapel } from '../scripts/conversor/papel.js';

// Cópia das tabelas do Ajustar ND só para teste (o módulo não copia tabelas em tempo de execução).
const tabelas = JSON.parse(readFileSync(new URL('./dados/tables.json', import.meta.url), 'utf8'));

test('as tabelas têm os três papéis e as linhas de 1/4 a S+', () => {
  for (const papel of ['solo', 'lacaio', 'especial']) {
    assert.equal(tabelas[papel].length, 24, papel);
    assert.equal(String(tabelas[papel][0].ND), '1/4');
    assert.equal(String(tabelas[papel].at(-1).ND), 'S+');
  }
});

test('Q = Dano × PV (Solo)', () => {
  assert.equal(custoQ(linhaDoND(tabelas.solo, '1')), 525);
  assert.equal(custoQ(linhaDoND(tabelas.solo, '5')), 8000);
  assert.equal(custoQ(linhaDoND(tabelas.solo, '10')), 32000);
  assert.equal(custoQ(linhaDoND(tabelas.solo, '20')), 388800);
});

test('XP por CR (DMG 2014)', () => {
  assert.equal(xpDoCR('1'), 200);
  assert.equal(xpDoCR(5), 1800);
  assert.equal(xpDoCR('10'), 5900);
  assert.equal(xpDoCR('1/4'), 50);
  assert.throws(() => xpDoCR('31'));
});

test('XP por CR: tabela completa do DMG (2014), conferida no livro', () => {
  const esperado = {
    0: 10, '1/8': 25, '1/4': 50, '1/2': 100, 1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800,
    6: 2300, 7: 2900, 8: 3900, 9: 5000, 10: 5900, 11: 7200, 12: 8400, 13: 10000,
    14: 11500, 15: 13000, 16: 15000, 17: 18000, 18: 20000, 19: 22000, 20: 25000,
    21: 33000, 22: 41000, 23: 50000, 24: 62000, 25: 75000, 26: 90000, 27: 105000,
    28: 120000, 29: 135000, 30: 155000,
  };
  for (const [cr, xp] of Object.entries(esperado)) assert.equal(xpDoCR(cr), xp, `CR ${cr}`);
});

test('ritmo T20 puro (k = 1,5) com CR igual ao nível devolve ND = nível', () => {
  for (const nivel of [1, 3, 5, 8, 10, 12, 15, 17, 20]) {
    const r = calcularND({ tabelas, papel: 'solo', cr: nivel, ritmo: 't20' });
    assert.equal(r.nd, String(nivel), `nível ${nivel}`);
  }
});

test('tabela do plano: ND por CR e ritmo (Solo)', () => {
  const esperado = {
    1: { 3: '1/2', 5: '1/2', 7: '1/2' },
    5: { 3: '4', 5: '3', 7: '3' },
    10: { 3: '7', 5: '5', 7: '5' },
    15: { 3: '11', 5: '10', 7: '10' },
    20: { 3: '16', 5: '14', 7: '12' },
  };
  for (const [nivel, porRitmo] of Object.entries(esperado)) {
    for (const [k, nd] of Object.entries(porRitmo)) {
      const r = calcularND({ tabelas, papel: 'solo', cr: Number(nivel), ritmo: Number(k) });
      assert.equal(r.nd, nd, `nível ${nivel}, k = ${k}`);
    }
  }
});

test('usa o ND de referência como base', () => {
  const puro = calcularND({ tabelas, papel: 'solo', cr: '1/4', ritmo: 't20' });
  assert.equal(puro.nd, '1/4');
  const r5 = calcularND({ tabelas, papel: 'solo', cr: 10, ritmo: 'estilo5e' });
  assert.equal(r5.nd, '5');
  assert.equal(r5.ndReferencia, '10');
});

test('CR acima de 20: só a tabela de referência, sem a fórmula', () => {
  const r = calcularND({ tabelas, papel: 'solo', cr: 23, ritmo: 'estilo5e' });
  assert.equal(r.usouFormula, false);
  assert.equal(r.nd, 'S');
  assert.equal(calcularND({ tabelas, papel: 'solo', cr: 30, ritmo: 't20' }).nd, 'S+');
});

test('papel aceita as chaves do sistema e da tabela', () => {
  const a = calcularND({ tabelas, papel: 'lackey', cr: 5, ritmo: 't20' });
  const b = calcularND({ tabelas, papel: 'lacaio', cr: 5, ritmo: 't20' });
  assert.equal(a.nd, '5');
  assert.deepEqual(a, b);
  assert.equal(calcularND({ tabelas, papel: 'special', cr: 5, ritmo: 't20' }).nd, '5');
});

test('o ND nunca sai da tabela e nunca cai abaixo de 1/4', () => {
  const r = calcularND({ tabelas, papel: 'solo', cr: '1/8', ritmo: 'estilo5e' });
  assert.equal(r.nd, '1/4');
  assert.ok(tabelas.solo.some((l) => String(l.ND) === r.nd));
});

test('entradas inválidas geram erro claro', () => {
  assert.throws(() => calcularND({ tabelas, papel: 'chefe', cr: 5 }), /Papel desconhecido/);
  assert.throws(() => calcularND({ tabelas, papel: 'solo', cr: 'x' }), /CR inválido/);
  assert.throws(() => calcularND({ tabelas, papel: 'solo', cr: 5, ritmo: 'devagar' }), /Ritmo inválido/);
  assert.equal(RITMOS.t20, 1.5);
});

test('heurística de papel: primeira regra que se aplica', () => {
  assert.deepEqual(sugerirPapel({ acoesLendarias: true, conjurador: true }), { papel: 'solo', chefeFinalSugerido: true, motivo: 'lendaria' });
  assert.equal(sugerirPapel({ acoesCovil: true }).chefeFinalSugerido, true);
  assert.equal(sugerirPapel({ conjurador: true }).papel, 'especial');
  assert.equal(sugerirPapel({ pv: 20, pvSoloNoND: 70 }).papel, 'lacaio');
  assert.equal(sugerirPapel({ pv: 40, pvSoloNoND: 70 }).papel, 'solo');
  assert.equal(sugerirPapel({ pv: 35, pvSoloNoND: 70 }).papel, 'solo'); // exatamente a metade não é "menor"
  assert.equal(sugerirPapel().papel, 'solo');
});
