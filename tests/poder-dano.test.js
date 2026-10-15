import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { trocarTesteResistencia } from '../scripts/conversor/mapeamentos.js';
import { lerAtor5e } from '../scripts/conversor/origem-json.js';
import { criaturaDeFormulario, poderDaTela } from '../scripts/conversor/origem-cr.js';
import { montarDadosAtor } from '../scripts/conversor/criar-ator.js';

const arquivoOtyugh = new URL('./fixtures/otyugh-5e.json', import.meta.url);
const semOtyugh = !existsSync(arquivoOtyugh) && 'sem tests/fixtures/otyugh-5e.json';
const otyugh = () => JSON.parse(readFileSync(arquivoOtyugh, 'utf8'));
const FLAG_AJUSTE = 'tormenta20-ajuste-nd';

// NPC mínimo com um poder (feat) de atividades dadas.
function comPoder(atividades, { texto = '<p>x</p>', sistema = {} } = {}) {
  return {
    name: 'Teste', type: 'npc',
    system: {
      abilities: { str: { value: 10 }, dex: { value: 10 }, con: { value: 10 }, int: { value: 10 }, wis: { value: 10 }, cha: { value: 10 } },
      details: { cr: 5, type: { value: 'monstrosity' } }, traits: { size: 'lg' },
      attributes: { movement: { walk: 30, units: 'ft' }, hp: { max: 100 } },
    },
    items: [{ type: 'feat', name: 'Sopro', system: { activities: atividades, description: { value: texto }, ...sistema } }],
  };
}
const poderDe = (ator) => lerAtor5e(ator).estado.habilidades[0];
const parte = (number, denomination, tipo, bonus = '') => ({ number, denomination, bonus, types: [tipo], custom: { enabled: false } });
const salvamento = (habilidade, onSave, partes) => ({ a: { type: 'save', activation: { type: 'action' }, save: { ability: [habilidade], dc: { formula: '14' } }, damage: { onSave, parts: partes } } });

test('trocarTesteResistencia: "Constitution Saving Throw" vira Fortitude e os outros seguem a tabela', () => {
  assert.equal(trocarTesteResistencia('Constitution Saving Throw: DC 14'), 'Fortitude: DC 14');
  assert.equal(trocarTesteResistencia('Strength Saving Throw'), 'Fortitude'); // todo teste de resistência é Fortitude, Reflexos ou Vontade
  assert.equal(trocarTesteResistencia('Dexterity saving throw'), 'Reflexos');
  for (const nome of ['Wisdom', 'Charisma', 'Intelligence']) assert.equal(trocarTesteResistencia(`${nome} Saving Throw`), 'Vontade');
  assert.equal(trocarTesteResistencia('um teste qualquer'), 'um teste qualquer');
});

test('Otyugh, Tentacle Slam: dano 3d8+3 de impacto, Fortitude com metade, com efeito, texto em T20', { skip: semOtyugh }, () => {
  const r = lerAtor5e(otyugh());
  const slam = r.estado.habilidades.find((h) => h.nome === 'Tentacle Slam');
  assert.deepEqual(slam.dano, [{ formula: '3d8+3', tipo: 'impacto' }]);
  assert.deepEqual(slam.resistencia, { pericia: 'fort', metade: true });
  assert.equal(slam.efeito, true);
  assert.equal(slam.ajustarDano, true);
  assert.match(slam.texto, /^Fortitude: CD 14\b/);
  assert.match(slam.texto, /16 \(3d8 \+ 3 Bludgeoning\)/);
  assert.ok(r.relatorio.some((l) => l.tipo === 'ok' && /Tentacle Slam/.test(l.texto) && /3d8\+3/.test(l.texto)));
});

test('poder sem dano (Multiattack) continua só com nome, texto e execução', { skip: semOtyugh }, () => {
  const multi = lerAtor5e(otyugh()).estado.habilidades.find((h) => h.nome === 'Multiattack');
  assert.deepEqual(Object.keys(multi), ['nome', 'texto', 'execucao']);
});

test('o teste de resistência do ataque também usa o nome T20 (Bite do Otyugh)', { skip: semOtyugh }, () => {
  const bite = lerAtor5e(otyugh()).estado.ataques.find((a) => a.nome === 'Bite');
  assert.match(bite.descricao, /Fortitude: CD 15/);
});

test('duas partes de dano (impacto + fogo) viram duas partes, na ordem', () => {
  const p = poderDe(comPoder(salvamento('dex', 'half', [parte(3, 8, 'bludgeoning', '3'), parte(2, 6, 'fire')])));
  assert.deepEqual(p.dano, [{ formula: '3d8+3', tipo: 'impacto' }, { formula: '2d6', tipo: 'fogo' }]);
  assert.deepEqual(p.resistencia, { pericia: 'refl', metade: true });
});

test('bônus: número entra com sinal; @mod e vazio ficam de fora', () => {
  const formulas = (bonus) => poderDe(comPoder(salvamento('con', 'half', [parte(2, 6, 'fire', bonus)]))).dano[0].formula;
  assert.equal(formulas('5'), '2d6+5');
  assert.equal(formulas('-1'), '2d6-1');
  assert.equal(formulas('@mod'), '2d6');
  assert.equal(formulas(''), '2d6');
});

test('dano personalizado: tira as variáveis (@mod) e ignora o que não vira fórmula, avisando', () => {
  const custom = (formula) => comPoder(salvamento('con', 'none', [{ custom: { enabled: true, formula }, types: ['fire'] }]));
  assert.deepEqual(poderDe(custom('2d6 + @mod')).dano, [{ formula: '2d6', tipo: 'fogo' }]);
  const sem = lerAtor5e(custom('@prof * 3'));
  assert.equal(sem.estado.habilidades[0].dano, undefined);
  assert.ok(sem.relatorio.some((l) => l.tipo === 'revisar' && /Sopro/.test(l.texto)));
});

test('salvamento: sem dano no sucesso não é metade; Carisma e Inteligência viram Vontade e avisam', () => {
  const nenhum = poderDe(comPoder(salvamento('wis', 'none', [parte(1, 8, 'psychic')])));
  assert.deepEqual(nenhum.resistencia, { pericia: 'vont', metade: false });
  const car = lerAtor5e(comPoder(salvamento('cha', 'half', [parte(1, 8, 'psychic')])));
  assert.equal(car.estado.habilidades[0].resistencia.pericia, 'vont');
  assert.ok(car.relatorio.some((l) => l.tipo === 'revisar' && /Vontade/.test(l.texto)));
});

test('efeito: salvamento ou condição citada no texto = com efeito; dano simples = sem efeito', () => {
  const simples = poderDe(comPoder({ a: { type: 'damage', activation: { type: 'action' }, damage: { parts: [parte(2, 6, 'fire')] } } }));
  assert.equal(simples.efeito, false);
  assert.equal(simples.resistencia, undefined);
  const condicao = poderDe(comPoder(
    { a: { type: 'damage', activation: { type: 'action' }, damage: { parts: [parte(2, 6, 'fire')] } } },
    { texto: '<p>and the target has the &amp;Reference[condition=Stunned] condition.</p>' }));
  assert.equal(condicao.efeito, true);
});

test('dnd5e antigo: dano em system.damage.parts e teste em system.save', () => {
  const p = poderDe(comPoder({}, { sistema: { damage: { parts: [['2d6 + 3', 'fire']] }, save: { ability: 'dex' }, actionType: 'save' }, texto: '<p>Half as much damage on a success.</p>' }));
  assert.deepEqual(p.dano, [{ formula: '2d6+3', tipo: 'fogo' }]);
  assert.deepEqual(p.resistencia, { pericia: 'refl', metade: true });
});

test('formulário: dano, resistência e escolhas do poder são limpos; sem dano o poder fica como antes', () => {
  const base = {
    nome: 'X', cr: '3', papel: 'solo', ritmo: 'estilo5e', tamanho: 'med', tipo: 'ani', deslocamento: 9, atributos: {}, ataques: [],
  };
  const { criatura } = criaturaDeFormulario({
    ...base,
    habilidades: [
      { nome: 'Sopro', texto: 't', execucao: 'action', dano: [{ formula: '2d6 + 3', tipo: 'fogo' }, { formula: 'lixo', tipo: 'fogo' }, { formula: '1d8', tipo: 'inventado' }],
        resistencia: { pericia: 'refl', metade: true }, efeito: true, ajustarDano: true },
      { nome: 'Simples', texto: 'y', execucao: '' },
    ],
  });
  assert.deepEqual(criatura.habilidades[0].dano, [{ formula: '2d6+3', tipo: 'fogo' }, { formula: '1d8', tipo: 'dano' }]);
  assert.deepEqual(criatura.habilidades[0].resistencia, { pericia: 'refl', metade: true });
  assert.equal(criatura.habilidades[0].efeito, true);
  assert.equal(criatura.habilidades[0].ajustarDano, true);
  assert.deepEqual(Object.keys(criatura.habilidades[1]), ['nome', 'texto', 'execucao']);
});

function atorComPoder(poder) {
  const { criatura } = criaturaDeFormulario({
    nome: 'X', cr: '3', papel: 'solo', ritmo: 'estilo5e', tamanho: 'med', tipo: 'ani', deslocamento: 9, atributos: {}, ataques: [],
    habilidades: [poder],
  });
  let n = 0;
  return montarDadosAtor(criatura, { nd: '3', gerarId: () => `id${++n}` }).items.find((i) => i.type === 'poder');
}

test('poder com dano nasce com a rolagem de dano, o teste em texto e a flag do Ajustar ND', () => {
  const item = atorComPoder({
    nome: 'Sopro', texto: 't', execucao: 'action', dano: [{ formula: '3d8+3', tipo: 'impacto' }, { formula: '2d6', tipo: 'fogo' }],
    resistencia: { pericia: 'refl', metade: true }, efeito: true, ajustarDano: true,
  });
  assert.deepEqual(item.system.rolls, [
    { name: 'Dano', key: 'dano0', type: 'dano', parts: [['3d8+3', 'impacto', ''], ['2d6', 'fogo', '']], versatil: '', adaptavel: '' },
  ]);
  assert.equal(item.system.resistencia.txt, 'Reflexos Metade');
  assert.deepEqual(item.flags[FLAG_AJUSTE], { danoPoder: { ajustar: true, efeito: true } });
});

test('texto do teste: sem dano no sucesso vira "anula"; com metade, "Metade"', () => {
  const poder = (resistencia) => atorComPoder({ nome: 'P', texto: 't', dano: [{ formula: '1d6', tipo: 'fogo' }], resistencia, efeito: true, ajustarDano: true });
  assert.equal(poder({ pericia: 'vont', metade: false }).system.resistencia.txt, 'Vontade anula');
  assert.equal(poder({ pericia: 'atle', metade: true }).system.resistencia.txt, 'Atletismo Metade');
});

test('ajustarDano desligado grava a flag desligada; poder sem dano não tem rolagem nem flag', () => {
  const desligado = atorComPoder({ nome: 'P', texto: 't', dano: [{ formula: '1d6', tipo: 'fogo' }], efeito: false, ajustarDano: false });
  assert.deepEqual(desligado.flags[FLAG_AJUSTE], { danoPoder: { ajustar: false, efeito: false } });
  assert.equal(desligado.system.resistencia.txt, '');
  const simples = atorComPoder({ nome: 'P', texto: 't', execucao: '' });
  assert.deepEqual(simples.system.rolls, []);
  assert.deepEqual(simples.flags, {});
});

test('poderDaTela: mantém dano e teste vindos da importação e troca só o que a tela edita', () => {
  const anterior = { nome: 'Sopro', texto: 'a', execucao: 'action', dano: [{ formula: '2d6', tipo: 'fogo' }], resistencia: { pericia: 'refl', metade: true }, efeito: true, ajustarDano: true };
  assert.deepEqual(
    poderDaTela(anterior, { nome: 'Sopro de fogo', texto: 'b', execucao: 'full', ajustarDano: false, efeito: false }),
    { ...anterior, nome: 'Sopro de fogo', texto: 'b', execucao: 'full', ajustarDano: false, efeito: false });
});

test('poderDaTela: poder sem dano não ganha campos de dano, mesmo que a tela mande as caixas', () => {
  const r = poderDaTela({ nome: 'Fuga', texto: 'a', execucao: '' }, { nome: 'Fuga', texto: 'b', execucao: 'move', ajustarDano: true, efeito: true });
  assert.deepEqual(r, { nome: 'Fuga', texto: 'b', execucao: 'move' });
  assert.deepEqual(poderDaTela(undefined, { nome: 'Novo', texto: '', execucao: '' }), { nome: 'Novo', texto: '', execucao: '' });
});
