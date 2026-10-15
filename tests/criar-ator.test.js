import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criaturaDeFormulario, aplicarModoAtaques } from '../scripts/conversor/origem-cr.js';
import { montarDadosAtor, ataquesPorArmaDe, rdDoND, ID_CONVERSOR } from '../scripts/conversor/criar-ator.js';
import { CODIGOS_TAMANHO, CODIGOS_TIPO, CHAVES_DANO, mapearTamanho, mapearTipo, mapearTipoDano } from '../scripts/conversor/mapeamentos.js';

const formulario = (extra = {}) => ({
  nome: ' Lobo Gigante ', conceito: 'Caçador <rápido>', cr: '3', papel: 'solo', nivelGrupo: '',
  ritmo: 'estilo5e', tamanho: 'gra', tipo: 'ani', deslocamento: '12',
  atributos: { for: '3', des: '2', con: '2', int: '-4', sab: '1', car: '-1' },
  ataques: [
    { nome: 'Mordida', tipo: 'cac', dano: 'perfuracao', qtd: '2' },
    { nome: 'Arremesso', tipo: 'ad', dano: 'impacto', qtd: 1 },
  ],
  chefeFinal: false,
  ...extra,
});

let contador = 0;
const gerarId = () => `id${++contador}`;

test('os códigos do sistema cobrem todos os mapeamentos', () => {
  for (const t of ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']) {
    assert.ok(CODIGOS_TAMANHO.includes(mapearTamanho(t).codigo), t);
  }
  for (const t of ['beast', 'construct', 'undead', 'humanoid', 'dragon', 'fiend']) {
    assert.ok(CODIGOS_TIPO.includes(mapearTipo(t).codigo), t);
  }
  for (const t of ['slashing', 'fire', 'force', 'poison', 'qualquer']) {
    assert.ok(CHAVES_DANO.includes(mapearTipoDano(t).chave), t);
  }
});

test('formulário válido vira criatura neutra', () => {
  const r = criaturaDeFormulario(formulario());
  assert.equal(r.ok, true);
  const c = r.criatura;
  assert.equal(c.nome, 'Lobo Gigante');
  assert.equal(c.cr, 3);
  assert.equal(c.nivelGrupo, null);
  assert.deepEqual(c.atributos, { for: 3, des: 2, con: 2, int: -4, sab: 1, car: -1 });
  assert.deepEqual(c.ataques[0], { nome: 'Mordida', distancia: false, tipoDano: 'perfuracao', qtd: 2, descricao: '', danoExtra: [], proporcaoExtra: 0, extraNoBalanceamento: true });
  assert.deepEqual(c.habilidades, []);
  assert.equal(c.ataques[1].distancia, true);
});

test('nível do grupo: vazio e 0 significam "não informado"; fora de 1 a 20 é erro', () => {
  assert.equal(criaturaDeFormulario(formulario({ nivelGrupo: '0' })).criatura.nivelGrupo, null);
  assert.equal(criaturaDeFormulario(formulario({ nivelGrupo: '10' })).criatura.nivelGrupo, 10);
  assert.deepEqual(criaturaDeFormulario(formulario({ nivelGrupo: '25' })).erros, ['nivelGrupo']);
  assert.deepEqual(criaturaDeFormulario(formulario({ nivelGrupo: 'x' })).erros, ['nivelGrupo']);
});

test('erros de validação voltam como códigos', () => {
  const r = criaturaDeFormulario(formulario({ nome: ' ', cr: '99', papel: 'chefe', ritmo: 'x', tamanho: 'zz', tipo: 'zz' }));
  assert.equal(r.ok, false);
  assert.deepEqual(r.erros, ['nome', 'cr', 'papel', 'ritmo', 'tamanho', 'tipo']);
  const semNomeAtaque = criaturaDeFormulario(formulario({ ataques: [{ nome: '', tipo: 'cac', dano: 'corte', qtd: 1 }] }));
  assert.deepEqual(semNomeAtaque.erros, ['ataque-0-nome']);
});

test('CR aceita frações e rejeita valores sem XP conhecido', () => {
  assert.equal(criaturaDeFormulario(formulario({ cr: '1/4' })).criatura.cr, 0.25);
  assert.equal(criaturaDeFormulario(formulario({ cr: '31' })).ok, false);
});

test('quantidade de ataques nunca fica abaixo de 1 e dano desconhecido vira "dano"', () => {
  const r = criaturaDeFormulario(formulario({ ataques: [{ nome: 'Golpe', tipo: 'cac', dano: 'inexistente', qtd: '0' }] }));
  assert.equal(r.criatura.ataques[0].qtd, 1);
  assert.equal(r.criatura.ataques[0].tipoDano, 'dano');
});

test('sem ataques é permitido (o Ajustar ND avisa)', () => {
  const r = criaturaDeFormulario(formulario({ ataques: [] }));
  assert.equal(r.ok, true);
  assert.deepEqual(r.criatura.ataques, []);
});

test('dados do ator: campos do sistema, tamanho do token e flag de rastreio', () => {
  const { criatura } = criaturaDeFormulario(formulario({ papel: 'lacaio' }));
  const d = montarDadosAtor(criatura, { nd: '7', gerarId, pasta: 'pasta1', ndReferencia: '3', agora: '2026-10-11T00:00:00.000Z' });
  assert.equal(d.type, 'npc');
  assert.equal(d.name, 'Lobo Gigante');
  assert.equal(d.folder, 'pasta1');
  assert.equal(d.system.attributes.nd, '7');
  assert.equal(d.system.detalhes.role, 'lackey');
  assert.equal(d.system.detalhes.tipo, 'ani');
  assert.equal(d.system.tracos.tamanho, 'gra');
  assert.equal(d.system.atributos.int.base, -4);
  assert.equal(d.system.attributes.movement.walk.base, 12);
  assert.equal(d.prototypeToken.width, 2);
  assert.equal(d.prototypeToken.height, 2);
  assert.equal(d.prototypeToken.name, 'Lobo Gigante');
  assert.equal(d.system.detalhes.biography.value, '<p>Caçador &lt;rápido&gt;</p>');
  assert.deepEqual(d.flags[ID_CONVERSOR], {
    origem: 'cr', cr: 3, ritmo: 'estilo5e', nivelGrupo: null, ndReferencia: '3', criadoEm: '2026-10-11T00:00:00.000Z',
  });
});

test('modo de ataques: 5e, um por ataque, até o limite do ND ou manual', () => {
  const ataques = [{ nome: 'Bite', qtd: 1, qtd5e: 1 }, { nome: 'Tentacle', qtd: 2, qtd5e: 2 }, { nome: 'Extra', qtd: 3 }];
  const qtds = (modo, limite) => aplicarModoAtaques(ataques, modo, limite).map((a) => a.qtd);
  assert.deepEqual(qtds('5e'), [1, 2, 3]);          // sem qtd5e (ataque à mão): fica como está
  assert.deepEqual(qtds('t20'), [1, 1, 3]);
  assert.deepEqual(qtds('limite', 4), [1, 1, 2]);   // tira do ataque que mais repete, até caber
  assert.deepEqual(qtds('limite', 6), [1, 2, 3]);   // já cabe: não mexe
  assert.deepEqual(qtds('limite', 1), [1, 1, 1]);   // nunca abaixo de 1 por ataque
  assert.equal(aplicarModoAtaques(ataques, 'manual', 1), ataques);
  assert.deepEqual(ataques.map((a) => a.qtd), [1, 2, 3]); // não altera a lista original
});

test('linha de ataques, sentidos, idiomas, resistências e imunidades vão para a ficha', () => {
  const { criatura } = criaturaDeFormulario(formulario({
    ataques: [
      { nome: 'Mordida', tipo: 'cac', dano: 'perfuracao', qtd: 1 },
      { nome: 'Garra', tipo: 'cac', dano: 'fogo', qtd: 2 },
      { nome: 'Cuspe', tipo: 'ad', dano: 'acido', qtd: 1 },
    ],
    sentidos: { value: ['escuro'], custom: 'tremorsense 30 pés' }, idiomas: ['comum'],
    resistencias: 'imunidade a fogo', imunidadesCondicao: { value: ['envenenado'], custom: '' }, idiomasCustom: 'Otyugh; telepatia 36 m',
  }));
  const d = montarDadosAtor(criatura, { nd: '3', gerarId });
  assert.equal(d.system.detalhes.ataquescac, 'Mordida +0 (1d6) e 2 Garra +0 (1d6 de fogo).');
  assert.equal(d.system.detalhes.ataquesad, 'Cuspe +0 (1d6 de ácido).');
  assert.deepEqual(d.system.attributes.sentidos, { value: ['escuro'], custom: 'tremorsense 30 pés' });
  assert.deepEqual(d.system.tracos.idiomas, { value: ['comum'], custom: 'Otyugh; telepatia 36 m' });
  assert.deepEqual(d.system.tracos.ic, { value: ['envenenado'], custom: '' });
  assert.equal(d.system.detalhes.resistencias, 'imunidade a fogo');
  assert.equal(d.system.detalhes.biography.value, '<p>Caçador &lt;rápido&gt;</p>');
  const semAtaques = montarDadosAtor(criaturaDeFormulario(formulario({ ataques: [] })).criatura, { nd: '3', gerarId });
  assert.equal(semAtaques.system.detalhes.ataquescac, '');
});

test('RD por patamar do ND: 5, 10, 15 e 20', () => {
  const casos = { '1/4': 5, 4: 5, 5: 10, 10: 10, 11: 15, 16: 15, 17: 20, S: 20 };
  for (const [nd, rd] of Object.entries(casos)) assert.equal(rdDoND(nd), rd, `ND ${nd}`);
});

test('resistências a dano: imunidade, vulnerabilidade e RD por tipo (valor pelo ND)', () => {
  const { criatura } = criaturaDeFormulario(formulario({
    resistenciasDano: { imunidade: ['fogo'], vulnerabilidade: ['frio'], reducao: ['corte', 'impacto'] },
  }));
  const d = montarDadosAtor(criatura, { nd: '12', gerarId });
  const r = d.system.tracos.resistencias;
  assert.equal(r.fogo.imunidade, true);
  assert.equal(r.frio.vulnerabilidade, true);
  assert.deepEqual([r.corte.base, r.impacto.base, r.perfuracao.base], [15, 15, 0]); // ND 12 = Campeão = RD 15
  assert.equal(r.dano.base, 0);                                                      // RD geral fica para o Ajustar ND (Chefe Final)
  assert.equal(r.fogo.base, 0);
  const sem = montarDadosAtor(criaturaDeFormulario(formulario()).criatura, { nd: '12', gerarId });
  assert.equal(sem.system.tracos.resistencias.fogo.imunidade, false);                // sem resistências: nada marcado
});

test('token nasce com nome (dono passa o mouse) e barra de vida (dono), como no original', () => {
  const d = montarDadosAtor(criaturaDeFormulario(formulario()).criatura, { nd: '3', gerarId });
  assert.equal(d.prototypeToken.displayName, 20);
  assert.equal(d.prototypeToken.displayBars, 40);
  assert.equal(d.prototypeToken.bar1.attribute, 'attributes.pv');
});

test('poder leva o tipo de ação escolhido; tipo inválido vira passivo', () => {
  const { criatura } = criaturaDeFormulario(formulario({
    habilidades: [
      { nome: 'Pancada', texto: 'x', execucao: 'action' }, { nome: 'Fuga', texto: 'y', execucao: 'move' },
      { nome: 'Passivo', texto: 'z', execucao: '' }, { nome: 'Estranho', texto: 'w', execucao: 'voar' }, { nome: 'Sem campo', texto: 'v' },
    ],
  }));
  const d = montarDadosAtor(criatura, { nd: '3', gerarId });
  const poderes = d.items.filter((i) => i.type === 'poder');
  assert.deepEqual(poderes.map((p) => p.system.ativacao.execucao), ['action', 'move', '', '', '']);
});

test('imagem: retrato e token escolhidos; sem token, o token usa o retrato; sem nada, ficam os ícones do modelo', () => {
  const monta = (extra) => montarDadosAtor(criaturaDeFormulario(formulario(extra)).criatura, { nd: '3', gerarId });
  const padrao = monta({});
  assert.equal(padrao.img, 'systems/tormenta20/icons/svg/orc-head.svg');
  assert.equal(padrao.prototypeToken.texture.src, 'systems/tormenta20/icons/svg/orc-head.svg');

  const soRetrato = monta({ img: ' uploads/lobo.webp ' });
  assert.equal(soRetrato.img, 'uploads/lobo.webp');
  assert.equal(soRetrato.prototypeToken.texture.src, 'uploads/lobo.webp');

  const ambos = monta({ img: 'uploads/lobo.webp', token: 'uploads/lobo-token.webp' });
  assert.equal(ambos.img, 'uploads/lobo.webp');
  assert.equal(ambos.prototypeToken.texture.src, 'uploads/lobo-token.webp');
});

test('armas no formato oficial, com system.ataques preenchido', () => {
  const { criatura } = criaturaDeFormulario(formulario());
  const d = montarDadosAtor(criatura, { nd: '3', gerarId });
  assert.equal(d.items.length, 2);
  const [mordida, arremesso] = d.items;

  assert.equal(mordida.type, 'arma');
  assert.equal(mordida.system.ataques, 2);
  assert.equal(mordida.system.proposito, 'corpo-a-corpo');
  assert.equal(mordida.system.alcance, '');
  assert.deepEqual(mordida.system.rolls[0].parts, [['1d20', '', ''], ['luta', '', ''], ['0', '', '']]);
  assert.deepEqual(mordida.system.rolls[1].parts[0], ['1d6', 'perfuracao', '']);
  assert.equal(mordida.system.description.value, '');
  assert.equal(mordida.system.source, '');

  assert.equal(arremesso.system.ataques, 1);
  assert.equal(arremesso.system.proposito, 'disparo');
  assert.equal(arremesso.system.alcance, 'medium');
  assert.equal(arremesso.system.propriedades.ataqueDistancia, true);
  assert.deepEqual(arremesso.system.rolls[0].parts[1], ['luta', '', '']); // luta nas duas, como nas fichas oficiais
  assert.notEqual(mordida._id, arremesso._id);
});

test('ataquesPorArmaDe lê a flag de cada arma, mesmo depois de o Foundry trocar os ids', () => {
  const { criatura } = criaturaDeFormulario(formulario());
  const d = montarDadosAtor(criatura, { nd: '3', gerarId });
  const comOutrosIds = d.items.map((item, i) => ({ ...item, _id: `novo${i}` }));
  assert.deepEqual(ataquesPorArmaDe(comOutrosIds, criatura), { novo0: 2, novo1: 1 });
  assert.deepEqual(ataquesPorArmaDe([{ type: 'poder', _id: 'x' }], criatura), {});
});

test('cada ator novo traz um modelo independente (sem estado compartilhado)', () => {
  const { criatura } = criaturaDeFormulario(formulario());
  const a = montarDadosAtor(criatura, { nd: '3', gerarId });
  const b = montarDadosAtor(criatura, { nd: '3', gerarId });
  a.system.atributos.for.base = 99;
  assert.equal(b.system.atributos.for.base, 3);
  assert.equal(a.system.pericias.luta.atributo, 'for');
  assert.equal(Object.keys(a.system.pericias).length, 34);
});

const extraPoder = { name: 'Sopro Arrastado', type: 'poder', img: 'icons/svg/aura.svg', effects: [{ name: 'Efeito' }], flags: { [ID_CONVERSOR]: { extra: true } }, system: { rolls: [] } };

test('itens arrastados: entram na ficha depois das armas e poderes, com id novo, e o formulário descarta o que não é poder ou magia', () => {
  const { criatura } = criaturaDeFormulario(formulario({ itensExtras: [extraPoder, { ...extraPoder, name: 'Espada', type: 'arma' }, null] }));
  assert.deepEqual(criatura.itensExtras.map((i) => i.name), ['Sopro Arrastado']);
  const dados = montarDadosAtor(criatura, { nd: '3', gerarId });
  const nomes = dados.items.map((i) => i.name);
  assert.equal(nomes.at(-1), 'Sopro Arrastado');
  assert.equal(dados.items.filter((i) => i.type === 'arma').length, 2); // só as armas dos ataques
  const extra = dados.items.at(-1);
  assert.match(extra._id, /^id\d+$/);
  assert.deepEqual(extra.effects, [{ name: 'Efeito' }]);
  assert.equal(extraPoder._id, undefined); // o item do estado não é alterado
  assert.equal(new Set(dados.items.map((i) => i._id)).size, dados.items.length);
  assert.deepEqual(criaturaDeFormulario(formulario()).criatura.itensExtras, []);
});

test('criaturaDeFormulario: sem o nome, devolve os parâmetros do ND; com CR ou nível inválido, não', () => {
  const sem = criaturaDeFormulario(formulario({ nome: '', cr: '5', nivelGrupo: '3', ritmo: 't20' }));
  assert.equal(sem.ok, false);
  assert.deepEqual(sem.parametrosND, { papel: 'solo', cr: 5, nivelGrupo: 3, ritmo: 't20' });
  assert.equal(criaturaDeFormulario(formulario({ nome: '', cr: 'xx' })).parametrosND, null);
  assert.equal(criaturaDeFormulario(formulario({ nivelGrupo: '99' })).parametrosND, null);
  assert.equal(criaturaDeFormulario(formulario()).ok, true);
});
