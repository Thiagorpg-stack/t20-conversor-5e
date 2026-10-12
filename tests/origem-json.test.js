import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { lerAtor5e, limparTexto5e, quantidadeNoMultiataque } from '../scripts/conversor/origem-json.js';
import { criaturaDeFormulario } from '../scripts/conversor/origem-cr.js';
import { montarDadosAtor } from '../scripts/conversor/criar-ator.js';

test('limparTexto5e: tira HTML, rolagens, referências e entidades', () => {
  const html = '<p><i>Melee Attack Roll:</i> [[/r 1d20+6]]{+6}, reach 5 ft. <i>Hit:</i> 12 ([[/damage 2d8 + 3 type=piercing]]) damage, '
    + 'and the target has the &amp;Reference[condition=Poisoned] condition after a @variantrule[Long Rest|XPHB]; '
    + 'max decreases by 5 ([[/r 1d10]]) &amp; @variantrule[Hit Points|XPHB|Hit Point].</p><p>Segundo parágrafo</p>';
  assert.equal(limparTexto5e(html),
    'Melee Attack Roll: +6, reach 5 ft. Hit: 12 (2d8 + 3 Piercing) damage, and the target has the Poisoned condition after a Long Rest; '
    + 'max decreases by 5 (1d10) & Hit Point.\nSegundo parágrafo');
  assert.equal(limparTexto5e(undefined), '');
});

test('multiataque: lê a quantidade de cada ataque pelo nome', () => {
  const texto = 'The otyugh makes one Bite attack and two Tentacle attacks.';
  assert.equal(quantidadeNoMultiataque(texto, 'Bite'), 1);
  assert.equal(quantidadeNoMultiataque(texto, 'Tentacle'), 2);
  assert.equal(quantidadeNoMultiataque(texto, 'Claw'), null);
  assert.equal(quantidadeNoMultiataque('makes three Claw attacks', 'Claw'), 3);
});

test('rejeita o que não é NPC do dnd5e', () => {
  assert.deepEqual(lerAtor5e({ type: 'character', system: {} }), { ok: false, erro: 'T20C5E.ErroImportarNpc' });
  assert.equal(lerAtor5e(null).ok, false);
});

const atividade = (tipo, extra = {}) => ({ type: tipo, ...extra });
const ator5e = (extra = {}) => ({
  name: 'Atirador', type: 'npc',
  system: {
    abilities: { str: { value: 8 }, dex: { value: 18 }, con: { value: 10 }, int: { value: 10 }, wis: { value: 12 }, cha: { value: 10 } },
    details: { cr: 0.25, type: { value: 'humanoid' } },
    traits: { size: 'sm' },
    attributes: { movement: { walk: 30, units: 'ft' }, hp: { max: 20 } },
    ...extra.system,
  },
  items: [
    { type: 'weapon', name: 'Shortbow', system: { activities: { a: atividade('attack', { attack: { type: { value: 'ranged' } }, damage: { parts: [{ types: ['thunder'] }] } }) }, description: { value: '<p>DC 12 test</p>' } } },
    { type: 'feat', name: 'Nimble Escape', system: { description: { value: '<p>Foge.</p>' } } },
    { type: 'feat', name: 'Multiattack', system: { identifier: 'multiattack', description: { value: 'makes two Shortbow attacks' } } },
    { type: 'equipment', name: 'Cota' },
  ],
  ...extra.ator,
});

test('lerAtor5e: preenche o formulário e classifica o que importou, o que pede revisão e o que ficou de fora', () => {
  const r = lerAtor5e(ator5e(), { pvSoloNoND: () => 100 });
  assert.equal(r.ok, true);
  const e = r.estado;
  assert.equal(e.nome, 'Atirador');
  assert.equal(e.cr, '1/4');
  assert.equal(e.tamanho, 'peq');
  assert.equal(e.tipo, 'hum');
  assert.equal(e.deslocamento, 9);
  assert.deepEqual(e.atributos, { for: -1, des: 4, con: 0, int: 0, sab: 1, car: 0 });
  assert.deepEqual(e.ataques, [{ nome: 'Shortbow', tipo: 'ad', dano: 'impacto', qtd: 2, qtd5e: 2, descricao: 'CD 12 test' }]);
  assert.deepEqual(e.habilidades, [
    { nome: 'Nimble Escape', texto: 'Foge.', execucao: '' },
    { nome: 'Multiattack', texto: 'makes two Shortbow attacks', execucao: '' },
  ]);
  assert.equal(e.papel, 'lacaio');                                             // 20 PV < metade de 100
  assert.equal(e.chefeFinal, false);
  assert.ok(r.relatorio.some((l) => l.tipo === 'revisar' && /impacto \(aproxima/.test(l.texto)));
  const fora = r.relatorio.find((l) => l.tipo === 'ignorado').texto;
  assert.match(fora, /equipamentos/);
  assert.deepEqual(r.imagens, { img: '', token: '' }); // sem imagem no arquivo
  assert.deepEqual(lerAtor5e(ator5e({ ator: { img: 'icons/svg/mystery-man.svg', prototypeToken: { texture: { src: 'icons/svg/mystery-man.svg' } } } })).imagens,
    { img: '', token: '' });                          // ícone padrão do Foundry não conta
});

test('lerAtor5e: sem tabela não sugere Lacaio; lendária vira Solo com Chefe Final; magias viram Especial', () => {
  assert.equal(lerAtor5e(ator5e()).estado.papel, 'solo');
  const lendario = lerAtor5e(ator5e({ system: { resources: { legact: { max: 3 } } } }));
  assert.equal(lendario.estado.papel, 'solo');
  assert.equal(lendario.estado.chefeFinal, true);
  const conjurador = ator5e();
  conjurador.items.push({ type: 'spell', name: 'Fireball' });
  const r = lerAtor5e(conjurador);
  assert.equal(r.estado.papel, 'especial');
  assert.match(r.relatorio.find((l) => l.tipo === 'ignorado').texto, /1 magia/);
});

test('lerAtor5e: CR ausente vira pedido de revisão, não erro', () => {
  const r = lerAtor5e(ator5e({ system: { details: { cr: null, type: { value: 'beast' } } } }));
  assert.equal(r.ok, true);
  assert.equal(r.estado.cr, '');
  assert.ok(r.relatorio.some((l) => l.tipo === 'revisar' && /CR/.test(l.texto)));
});

test('lerAtor5e: sentidos, idiomas, resistências e imunidades a condição', () => {
  const r = lerAtor5e(ator5e({ system: { traits: {
    size: 'lg',
    languages: { value: ['standard:common', 'exotic:draconic', 'exotic:deep'], custom: '', communication: { telepathy: { value: 60, units: 'ft' } } },
    di: { value: ['fire'], bypasses: [] },
    dr: { value: ['bludgeoning', 'piercing', 'slashing'], bypasses: ['mgc'], custom: '' },
    dv: { value: ['cold', 'thunder'], bypasses: [] },
    ci: { value: ['poisoned', 'incapacitated'], custom: '' },
  }, attributes: {
    movement: { walk: 30, units: 'ft' }, hp: { max: 20 },
    senses: { ranges: { darkvision: 60, blindsight: 10, tremorsense: 30, truesight: 0 }, special: 'só na água' },
  } } }));
  const e = r.estado;
  assert.deepEqual(e.sentidos, { value: ['escuro', 'cegas'], custom: 'tremorsense 30 pés; só na água' });
  assert.deepEqual(e.idiomas, ['comum', 'draconico']);
  assert.equal(e.idiomasCustom, 'deep; telepatia 18 m');   // 60 pés = 18 m
  assert.equal(e.resistencias, 'imunidade a fogo; resistência a impacto, perfuração, corte (ataques não mágicos); vulnerabilidade a frio, thunder');
  // só tipos com equivalente exato viram chave; thunder (aproximação) fica só no texto
  assert.deepEqual(e.resistenciasDano, { imunidade: ['fogo'], vulnerabilidade: ['frio'], reducao: ['impacto', 'perfuracao', 'corte'] });
  const linha = r.relatorio.map((l) => l.texto).join('\n');
  assert.match(linha, /Resistências na ficha: imunidade a fogo; vulnerabilidade a frio; RD por tipo/);
  assert.match(linha, /Só no texto, sem equivalente exato: thunder/);
  assert.deepEqual(e.imunidadesCondicao, { value: ['envenenado'], custom: 'incapacitated' });
});

test('lerAtor5e: tipo de ação do poder vem da ativação da 5e', () => {
  const feat = (nome, tipo) => ({ type: 'feat', name: nome, system: { activities: tipo ? { a: { type: 'utility', activation: { type: tipo } } } : {} } });
  const ator = ator5e();
  ator.items = ['action', 'bonus', 'reaction', 'legendary', 'lair', ''].map((t) => feat(`P-${t || 'passivo'}`, t));
  ator.items.push({ type: 'feat', name: 'Antigo', system: { activation: { type: 'bonus' } } }); // dnd5e 3.x: ativação no próprio item
  const r = lerAtor5e(ator);
  assert.deepEqual(r.estado.habilidades.map((h) => [h.nome, h.execucao]), [
    ['P-action', 'action'], ['P-bonus', 'move'], ['P-reaction', 'reaction'], ['P-legendary', 'special'],
    ['P-lair', 'special'], ['P-passivo', ''], ['Antigo', 'move'],
  ]);
});

test('lerAtor5e: resistência física vira os três tipos; sem resistências nada é marcado', () => {
  const r = lerAtor5e(ator5e({ system: { traits: { size: 'med', dr: { value: ['physical'], bypasses: [] } } } }));
  assert.deepEqual(r.estado.resistenciasDano.reducao, ['corte', 'impacto', 'perfuracao']);
  const nada = lerAtor5e(ator5e());
  assert.deepEqual(nada.estado.resistenciasDano, { imunidade: [], vulnerabilidade: [], reducao: [] });
  assert.equal(nada.estado.idiomasCustom, '');
});

test('lerAtor5e: dnd5e antigo guarda os sentidos direto em senses', () => {
  const r = lerAtor5e(ator5e({ system: { attributes: { movement: { walk: 30 }, hp: { max: 20 }, senses: { darkvision: 60 } } } }));
  assert.deepEqual(r.estado.sentidos.value, ['escuro']);
});

test('o resultado da importação passa direto pela validação e vira ator com armas e poderes', () => {
  const { estado } = lerAtor5e(ator5e());
  const v = criaturaDeFormulario({ ...estado, ritmo: 't20', nivelGrupo: '' });
  assert.equal(v.ok, true, v.erros.join());
  let n = 0;
  const d = montarDadosAtor(v.criatura, { nd: '1/4', gerarId: () => `id${++n}` });
  assert.deepEqual(d.items.map((i) => [i.type, i.name]), [['arma', 'Shortbow'], ['poder', 'Nimble Escape'], ['poder', 'Multiattack']]);
  assert.equal(d.items[0].system.description.value, '<p>Shortbow. CD 12 test</p>');
  assert.equal(d.items[1].system.description.value, '<p>Foge.</p>');
  assert.equal(d.items[0].system.proposito, 'disparo');
});

// A ficha real do Otyugh (MM 2025, dnd5e 5.3.3) exportada pelo mestre; fica fora do repositório.
const arquivoOtyugh = new URL('./fixtures/otyugh-5e.json', import.meta.url);
test('Otyugh real: o que o importador acerta', { skip: !existsSync(arquivoOtyugh) && 'sem tests/fixtures/otyugh-5e.json' }, () => {
  const r = lerAtor5e(JSON.parse(readFileSync(arquivoOtyugh, 'utf8')), { pvSoloNoND: () => 250 });
  assert.equal(r.ok, true);
  const e = r.estado;
  assert.equal(e.nome, 'Otyugh');
  assert.equal(e.cr, '5');
  assert.equal(e.tamanho, 'gra');
  assert.equal(e.tipo, 'mon');
  assert.equal(e.deslocamento, 9);
  assert.deepEqual(e.atributos, { for: 3, des: 0, con: 4, int: -2, sab: 1, car: -2 });
  assert.deepEqual(e.ataques.map((a) => [a.nome, a.tipo, a.dano, a.qtd]), [['Bite', 'cac', 'perfuracao', 1], ['Tentacle', 'cac', 'perfuracao', 2]]);
  assert.match(e.ataques[0].descricao, /Poisoned/);
  assert.match(e.ataques[0].descricao, /CD 15/);
  assert.ok(e.ataques[1].descricao.includes(
    'Hit: 12 (2d8 + 3 Piercing) damage. If the target is a Medium or smaller creature, it has the Grappled condition (escape CD 13) from one of two tentacles.'));
  assert.deepEqual(e.habilidades.map((h) => h.nome), ['Multiattack', 'Tentacle Slam']);
  assert.match(e.habilidades[0].texto, /one Bite attack and two Tentacle attacks/);
  assert.match(e.habilidades[1].texto, /CD 14/);
  assert.doesNotMatch(JSON.stringify(e), /ve-rd|\[\[|&Reference/);
  assert.deepEqual(e.sentidos, { value: ['escuro'], custom: '' });
  assert.deepEqual(e.idiomas, []);
  assert.match(e.idiomasCustom, /^Otyugh; telepathy 36 m \(doesn't allow/); // 120 pés = 36 m
  assert.deepEqual(e.habilidades.map((h) => h.execucao), ['action', 'action']); // Multiattack e Tentacle Slam são ações
  assert.deepEqual(r.imagens, {
    img: 'https://cdn.5e.tools/2024/img/bestiary/XMM/Otyugh.webp',
    token: 'assets/srd5e/img/bestiary/tokens/XMM/Otyugh.webp',
  });
  assert.equal(e.modoAtaques, '5e');
  assert.deepEqual(e.ataques.map((a) => a.qtd5e), [1, 2]);
});
