import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { lerAtor5e, limparTexto5e, quantidadeNoMultiataque } from '../scripts/conversor/origem-json.js';
import { completarPericiasParciais } from '../scripts/conversor/pericias.js';
import { termosT20, condicoesT20 } from '../scripts/conversor/mapeamentos.js';
import { mediaFormula, formulaDeMedia, aplicarProporcaoExtras } from '../scripts/conversor/dano.js';
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
  assert.deepEqual(e.ataques, [{ nome: 'Shortbow', tipo: 'ad', dano: 'impacto', qtd: 2, qtd5e: 2, descricao: 'CD 12 test', danoExtra: [], proporcaoExtra: 0, extraNoBalanceamento: true }]);
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

test('limparTexto5e: link relativo sem rótulo vira o nome do item do ator', () => {
  assert.equal(limparTexto5e('@UUID[.abc123], @UUID[.xyz]{Shatter}, @UUID[.nada]', { abc123: 'Invisibility' }),
    'Invisibility, Shatter, .nada');
});

test('lerAtor5e: magias por nome, voo e usos/recarga dos poderes (dragão)', () => {
  const dragao = ator5e({ system: { attributes: { movement: { walk: 40, fly: 80, burrow: 30, units: 'ft' }, hp: { max: 212 } } } });
  dragao.items.push(
    { _id: 'sp1', type: 'spell', name: 'Shatter' },
    { type: 'feat', name: 'Spellcasting', system: { description: { value: '<p>@UUID[.sp1]</p>' } } },
    { type: 'feat', name: 'Legendary Resistance', system: { uses: { max: '3', recovery: [{ period: 'day', type: 'recoverAll' }] }, description: { value: '<p>Succeeds.</p>' } } },
    { type: 'feat', name: 'Breath', system: { uses: { max: '1', recovery: [{ period: 'recharge', formula: '5' }] }, description: { value: '<p>Sopro.</p>' } } },
  );
  const e = lerAtor5e(dragao).estado;
  const texto = (n) => e.habilidades.find((h) => h.nome === n).texto;
  assert.equal(texto('Spellcasting'), 'Shatter');
  assert.equal(texto('Legendary Resistance'), '(3/dia) Succeeds.');
  assert.equal(texto('Breath'), '(Recarga (movimento)) Sopro.');
  assert.deepEqual(e.deslocamentosExtra, { fly: 24, burrow: 9 });

  const { criatura } = criaturaDeFormulario({ ...e, ritmo: 't20', nd: '1' });
  assert.deepEqual(criatura.deslocamentosExtra, { fly: 24, swim: 0, climb: 0, burrow: 9 });
  const dados = montarDadosAtor(criatura, { nd: '1', gerarId: () => 'id' });
  assert.equal(dados.system.attributes.movement.fly.base, 24);
  assert.equal(dados.system.attributes.movement.burrow.base, 9);
});

// Dragão Azul Adulto (MM 2025): magias por link relativo, voo, resistência lendária e recarga; fora do repositório.
const arquivoDragao = new URL('./fixtures/dragao-azul-5e.json', import.meta.url);
test('Dragão azul real: magias, voo, usos e recarga', { skip: !existsSync(arquivoDragao) && 'sem tests/fixtures/dragao-azul-5e.json' }, () => {
  const e = lerAtor5e(JSON.parse(readFileSync(arquivoDragao, 'utf8')), { pvSoloNoND: () => 800 }).estado;
  const texto = (n) => e.habilidades.find((h) => h.nome === n).texto;
  assert.match(texto('Spellcasting'), /At will: Detect Magic, Invisibility, Mage Hand, Shatter/);
  assert.match(texto('Spellcasting'), /1\/day each: Scrying, Sending/);
  assert.match(texto('Legendary Resistance'), /^\(3\/dia\) /);
  assert.match(texto('Lightning Breath'), /^\(Recarga \(movimento\)\) /);
  assert.deepEqual(e.deslocamentosExtra, { fly: 24, burrow: 9 });
  assert.deepEqual(e.ataques[0].danoExtra, [{ formula: '1d10', tipo: 'eletricidade' }]);
  assert.equal(e.ataques[0].proporcaoExtra, 0.256); // 2d8+7 (16) e 1d10 (5,5): 5,5 / 21,5
  assert.doesNotMatch(texto('Lightning Breath'), /\[Area/);
  assert.equal(e.habilidades.find((h) => h.nome === 'Lightning Breath').area, 'linha 27m x 1,5m');
  assert.match(texto('Lightning Breath'), /linha de 27 m de comprimento e 1,5 m de largura/);
  assert.match(texto('Regional Effects'), /Reflexos CD 15/);
  assert.equal(e.conjurador, true);
  assert.equal(e.conjuracao, 'car');
  assert.equal(e.habilidades.find((h) => h.nome === 'Legendary Resistance').usos, 3);
  assert.equal(e.papel, 'solo');
});

test('dano adicional do golpe (1d10 elétrico do Rend) vira segunda parte do dano, sem mexer na principal', () => {
  const parte = (tipo, number, denomination, bonus = '') => ({ types: [tipo], number, denomination, bonus, custom: { enabled: false } });
  const rend = { type: 'weapon', name: 'Rend', system: {
    description: { value: '<p>Hit.</p>' }, damage: { base: { types: [] } },
    activities: { a: atividade('attack', { attack: { type: { value: 'melee' } }, damage: { parts: [parte('slashing', 2, 8, '@mod'), parte('lightning', 1, 10)] } }) },
  } };
  const e = lerAtor5e(ator5e({ ator: { items: [rend] } })).estado;
  assert.deepEqual(e.ataques[0].danoExtra, [{ formula: '1d10', tipo: 'eletricidade' }]);
  assert.equal(e.ataques[0].dano, 'corte');
  assert.equal(e.ataques[0].proporcaoExtra, 0.407); // principal 2d8-1 = 8 ("@mod" = FOR 8 = -1), extra 5,5 → 5,5 / 13,5
  const { criatura } = criaturaDeFormulario({ ...e, ritmo: 't20', nd: '1' });
  const dados = montarDadosAtor(criatura, { nd: '1', gerarId: () => 'id' });
  assert.deepEqual(dados.items[0].system.rolls[1].parts, [['1d6', 'corte', ''], ['', '', ''], ['1d10', 'eletricidade', '']]);
});

test('limparTexto5e: tags com colchetes aninhados e [[/save]]', () => {
  assert.equal(limparTexto5e('5-foot-wide @variantrule[Line [Area of Effect]|XPHB|Line]. A [[/save ability=dex dc=15]] saving throw'),
    '5-foot-wide Line. A Reflexos CD 15 saving throw');
});

test('médias e fórmulas de dano', () => {
  assert.equal(mediaFormula('2d8+7'), 16);
  assert.equal(mediaFormula('1d10'), 5.5);
  assert.equal(mediaFormula('6d6+40'), 61);
  assert.equal(formulaDeMedia(17, 10), '2d10+6');
  assert.equal(formulaDeMedia(5.5, 10), '1d10');
});

test('dano adicional entra no balanceamento: segue a proporção da 5e sobre o dano total do golpe', () => {
  const dados = { items: [
    { _id: 'a', type: 'arma', flags: { 't20-conversor-5e': { indiceAtaque: 0 } }, system: { rolls: [
      { type: 'ataque', parts: [] },
      { type: 'dano', parts: [['1d6', 'corte', ''], ['', '', ''], ['1d10', 'eletricidade', '']] }] } },
    { _id: 'b', type: 'arma', flags: { 't20-conversor-5e': { indiceAtaque: 1 } }, system: { rolls: [
      { type: 'dano', parts: [['1d6', 'corte', ''], ['', '', ''], ['1d10', 'eletricidade', '']] }] } },
  ] };
  const criatura = { ataques: [
    { extraNoBalanceamento: true, proporcaoExtra: 0.256 },
    { extraNoBalanceamento: false, proporcaoExtra: 0.256 }] };
  aplicarProporcaoExtras(dados, criatura, { a: { danoPorGolpe: 61.17 }, b: { danoPorGolpe: 61.17 } });
  assert.equal(dados.items[0].system.rolls[1].parts[2][0], '2d10+6'); // 0,256 × 66,67 ≈ 17
  assert.equal(dados.items[1].system.rolls[0].parts[2][0], '1d10'); // desmarcado: fica fixo
});

test('termosT20: áreas em metros e alcances curto, médio e longo', () => {
  assert.equal(termosT20('each creature in a 90-foot-long, 5-foot-wide Line.'), 'each creature in a linha de 27 m de comprimento e 1,5 m de largura.');
  assert.equal(termosT20('a 30-foot Cone, a 20-foot-radius Sphere, a 15-foot Cube, a 10-foot Emanation'),
    'a cone de 9 m, a esfera de 6 m de raio, a cubo de 4,5 m de lado, a emanação de 3 m');
  assert.equal(termosT20('within 30 feet, range 90 ft, 120 ft away, reach 10 ft'), 'within alcance curto, range alcance médio, alcance longo away, reach 3 m');
  assert.equal(termosT20('reach 5 ft. or range 150 ft. Hit: 27 (4d10) damage, within 30 ft.'), 'reach 1,5 m or range alcance longo. Hit: 27 (4d10) damage, within alcance curto.');
  assert.equal(termosT20('fall 2d4 × 10 feet into the sinkhole'), 'fall 2d4 × 10 feet into the sinkhole'); // distância de queda não é alcance
  assert.equal(termosT20('In a Cone or a Line of Sight'), 'In a cone or a Line of Sight');
});

test('conjurador: PM = 5 × ND e atributo de conjuração; poder com usos vira contador de recurso', () => {
  const e = { ...lerAtor5e(ator5e({ system: { attributes: { movement: { walk: 30, units: 'ft' }, hp: { max: 20 }, spellcasting: 'wis' } } })).estado };
  assert.equal(e.conjurador, true);
  assert.equal(e.conjuracao, 'sab');
  const { criatura } = criaturaDeFormulario({ ...e, ritmo: 't20', nd: '4', habilidades: [{ nome: 'Resist', texto: 'x', usos: 3 }] });
  const dados = montarDadosAtor(criatura, { nd: '4', gerarId: () => 'id' });
  assert.equal(dados.system.attributes.pm.max, 20);
  assert.equal(dados.system.attributes.pm.value, 20);
  assert.equal(dados.system.attributes.conjuracao, 'sab');
  assert.deepEqual(dados.system.resources.primary, { value: 3, max: 3, label: 'Resist' });
});

test('completarPericiasParciais: atualização parcial de perícia leva os valores atuais da perícia', () => {
  const atuais = { fort: { atributo: 'con', treinado: false, outros: 16, bonus: ['1'] }, luta: { atributo: 'for', outros: 31 } };
  const achatada = completarPericiasParciais(atuais, { 'system.pericias.fort.treinado': true, 'system.attributes.pv.value': 5 });
  assert.deepEqual(achatada, {
    'system.pericias.fort.treinado': true, 'system.attributes.pv.value': 5,
    'system.pericias.fort.atributo': 'con', 'system.pericias.fort.outros': 16, 'system.pericias.fort.bonus': ['1'],
  });
  const aninhada = completarPericiasParciais(atuais, { system: { pericias: { fort: { outros: 2 }, luta: { atributo: 'des' } } } });
  assert.deepEqual(aninhada.system.pericias.fort, { atributo: 'con', treinado: false, bonus: ['1'], outros: 2 });
  assert.deepEqual(aninhada.system.pericias.luta, { outros: 31, atributo: 'des' });
  assert.deepEqual(completarPericiasParciais(atuais, { name: 'X' }), { name: 'X' });
  assert.equal(completarPericiasParciais(undefined, { a: 1 }).a, 1);
});

test('poderes oficiais: Spellcasting vira "Magias" passivo; vantagem contra magia vira Resistência a Magia +2/+5 por patamar', () => {
  const ator = ator5e({});
  ator.items.push(
    { type: 'feat', name: 'Spellcasting', system: { identifier: 'spellcasting', description: { value: '<p>Casts spells.</p>' } } },
    { type: 'feat', name: 'Magic Resistance', system: { description: { value: '<p>Advantage on saving throws against spells and other magical effects.</p>' } } },
  );
  ator.items.push({ type: 'feat', name: 'Misty Step', system: { uses: { max: '3', recovery: [{ period: 'day' }] }, description: { value: '<p>Misty Step (3/Day). Casts.</p>' } } });
  const e = lerAtor5e(ator).estado;
  assert.deepEqual(e.habilidades.filter((h) => h.oficial).map((h) => [h.nome, h.oficial]), [['Spellcasting', 'magias'], ['Magic Resistance', 'resistenciaMagia']]);
  const monta = (nd) => montarDadosAtor(criaturaDeFormulario({ ...e, ritmo: 't20', nd }).criatura, { nd, gerarId: () => 'id' }).items;
  assert.equal(e.habilidades.find((h) => h.nome === 'Misty Step').texto, 'Misty Step (3/Day). Casts.');
  const magias = monta('4').find((i) => i.name === 'Magias');
  assert.equal(magias.system.tipo, 'racial');
  assert.equal(magias.system.ativacao.execucao, 'passive');
  assert.equal(magias.img, 'systems/tormenta20/icons/poderes/ameacas/magias.webp');
  assert.equal(magias.system.description.value, '<p>Casts spells.</p>');
  const resistencia = (nd) => monta(nd).find((i) => i.name === 'Resistência a Magia');
  assert.equal(resistencia('4').effects[0].system.changes[0].value, 2);
  assert.equal(resistencia('12').effects[0].system.changes[0].value, 5);
  assert.match(resistencia('12').system.description.value, /resistência a magia \+5/);
  assert.equal(resistencia('12').effects[0].flags.tormenta20.items, 'Fortitude;Reflexos;Vontade');
});

test('condicoesT20: nomes das condições da 5e em texto livre viram os do T20', () => {
  assert.equal(condicoesT20('charmed (with Mind Blank); Poisoned, prone'), 'enfeitiçado (with Mind Blank); Envenenado, caído'.replace('Envenenado', 'envenenado'));
});
