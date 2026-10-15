import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  valorND, parseCR, ndDeReferencia, modificadorAtributo, pesParaMetros,
  mapearTamanho, mapearTipo, mapearTipoDano, trocarDCporCD, papelDoSistema, periciaDoAtributo5e, trocarSalvaguardaPt,
} from '../scripts/conversor/mapeamentos.js';

test('valorND entende frações e S/S+ como o Ajustar ND', () => {
  assert.equal(valorND('1/4'), 0.25);
  assert.equal(valorND('1/2'), 0.5);
  assert.equal(valorND('5'), 5);
  assert.equal(valorND('S'), 21);
  assert.equal(valorND('S+'), 22);
  assert.equal(valorND('22'), 22);
});

test('parseCR aceita número, fração e texto', () => {
  assert.equal(parseCR('1/8'), 0.125);
  assert.equal(parseCR('1/4'), 0.25);
  assert.equal(parseCR(' 3 '), 3);
  assert.equal(parseCR(0.5), 0.5);
  assert.ok(Number.isNaN(parseCR('abc')));
});

test('ndDeReferencia segue a tabela do plano', () => {
  const casos = {
    0: '1/4', '1/8': '1/4', '1/4': '1/4', '1/2': '1/2', 1: '1', 5: '5', 20: '20',
    21: 'S', 25: 'S', 26: 'S+', 30: 'S+',
  };
  for (const [cr, nd] of Object.entries(casos)) assert.equal(ndDeReferencia(cr), nd, `CR ${cr}`);
  assert.throws(() => ndDeReferencia('x'));
});

test('modificador de atributo: T20 guarda o modificador direto', () => {
  assert.equal(modificadorAtributo(10), 0);
  assert.equal(modificadorAtributo(8), -1);
  assert.equal(modificadorAtributo(9), -1);
  assert.equal(modificadorAtributo(16), 3);
  assert.equal(modificadorAtributo(30), 10);
  assert.equal(modificadorAtributo(1), -5);
});

test('pés para metros, em múltiplos de 1,5 m', () => {
  assert.equal(pesParaMetros(30), 9);
  assert.equal(pesParaMetros(60), 18);
  assert.equal(pesParaMetros(40), 12);
  assert.equal(pesParaMetros(20), 6);
  assert.equal(pesParaMetros(10), 3);
  assert.equal(pesParaMetros(5), 1.5);
  assert.equal(pesParaMetros(0), 0);
});

test('tamanhos: nomes de 5e e códigos do sistema dnd5e', () => {
  const casos = { Tiny: 'min', small: 'peq', Medium: 'med', LARGE: 'gra', huge: 'eno', Gargantuan: 'col', grg: 'col', sm: 'peq' };
  for (const [entrada, codigo] of Object.entries(casos)) {
    assert.deepEqual(mapearTamanho(entrada), { codigo, revisar: false }, entrada);
  }
  assert.deepEqual(mapearTamanho('???'), { codigo: 'med', revisar: true });
});

test('tipos da criatura', () => {
  assert.deepEqual(mapearTipo('beast'), { codigo: 'ani', revisar: false });
  assert.deepEqual(mapearTipo('Undead'), { codigo: 'mor', revisar: false });
  assert.deepEqual(mapearTipo('humanoid'), { codigo: 'hum', revisar: false });
  assert.deepEqual(mapearTipo('construct'), { codigo: 'con', revisar: false });
  assert.deepEqual(mapearTipo('dragon'), { codigo: 'mon', revisar: false });
  assert.deepEqual(mapearTipo('fiend'), { codigo: 'esp', revisar: true });
  assert.deepEqual(mapearTipo('desconhecido'), { codigo: 'mon', revisar: true });
});

test('tipos de dano: diretos e aproximações marcadas para revisão', () => {
  assert.deepEqual(mapearTipoDano('slashing'), { chave: 'corte', revisar: false });
  assert.deepEqual(mapearTipoDano('Necrotic'), { chave: 'trevas', revisar: false });
  assert.deepEqual(mapearTipoDano('lightning'), { chave: 'eletricidade', revisar: false });
  assert.deepEqual(mapearTipoDano('force'), { chave: 'essencia', revisar: true });
  assert.deepEqual(mapearTipoDano('poison'), { chave: 'dano', revisar: true });
  assert.deepEqual(mapearTipoDano('outro'), { chave: 'dano', revisar: true });
});

test('DC vira CD no texto, sem mexer em outras palavras', () => {
  assert.equal(trocarDCporCD('DC 15 de Destreza'), 'CD 15 de Destreza');
  assert.equal(trocarDCporCD('um DC17 e um DC 12'), 'um CD17 e um CD 12');
  assert.equal(trocarDCporCD('ADC 15 e CD 10'), 'ADC 15 e CD 10');
  assert.equal(trocarDCporCD(undefined), '');
});

test('papelDoSistema converte as chaves da tabela para os códigos do sistema', () => {
  assert.equal(papelDoSistema('solo'), 'solo');
  assert.equal(papelDoSistema('lacaio'), 'lackey');
  assert.equal(papelDoSistema('especial'), 'special');
  assert.equal(papelDoSistema('lackey'), 'lackey');
  assert.equal(papelDoSistema('Special'), 'special');
  assert.throws(() => papelDoSistema('chefe'), /Papel desconhecido/);
});

test('todo atributo da 5e cai em Fortitude, Reflexos ou Vontade (Força é Fortitude)', () => {
  assert.deepEqual(['str', 'dex', 'con', 'int', 'wis', 'cha'].map(periciaDoAtributo5e), ['fort', 'refl', 'fort', 'vont', 'vont', 'vont']);
});

test('trocarSalvaguardaPt: "salvaguarda" vira teste de resistência e o atributo vira Fortitude, Reflexos ou Vontade', () => {
  const t = trocarSalvaguardaPt;
  assert.equal(t('Salvaguarda de Constituição: CD 14, cada criatura em um Cone'), 'Teste de Fortitude: CD 14, cada criatura em um Cone');
  assert.equal(t('Salvaguarda de Força: CD 12'), 'Teste de Fortitude: CD 12');
  assert.equal(t('Salvaguarda de Destreza: CD 13'), 'Teste de Reflexos: CD 13');
  for (const a of ['Inteligência', 'Sabedoria', 'Carisma']) assert.equal(t(`Salvaguarda de ${a}: CD 16`), 'Teste de Vontade: CD 16');
  // artigo feminino concorda com "teste" (masculino)
  assert.equal(t('deve ser bem-sucedido em uma salvaguarda de Destreza CD 13'), 'deve ser bem-sucedido em um teste de Reflexos CD 13');
  assert.equal(t('Se o aboleth falhar em uma salvaguarda, ele pode escolher ter sucesso.'), 'Se o aboleth falhar em um teste de resistência, ele pode escolher ter sucesso.');
  assert.equal(t('Sucesso na salvaguarda e as salvaguardas da criatura'), 'Sucesso no teste de resistência e os testes de resistência da criatura');
  assert.equal(t('Faça às salvaguardas de Destreza'), 'Faça aos testes de Reflexos');
  assert.equal(t('vantagem em salvaguardas contra magias'), 'vantagem em testes de resistência contra magias');
  // lista de atributos: as categorias se juntam
  assert.equal(t('Vantagem em salvaguardas de Inteligência, Sabedoria e Carisma contra magia.'), 'Vantagem em testes de Vontade contra magia.');
  assert.equal(t('salvaguardas de Força, Destreza e Sabedoria'), 'testes de Fortitude, Reflexos e Vontade');
  // o "teste de resistência de X" da tradução antiga
  assert.equal(t('um teste de resistência de Constituição CD 14 ou ficará doente'), 'um teste de Fortitude CD 14 ou ficará doente');
  assert.equal(t('nada a trocar: salvou, Falha ou Sucesso'), 'nada a trocar: salvou, Falha ou Sucesso');
  assert.equal(t(undefined), '');
});
