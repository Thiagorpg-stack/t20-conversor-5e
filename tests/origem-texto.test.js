// Parser de bloco de estatísticas colado (v3). Os blocos abaixo são criaturas inventadas: o módulo não leva texto de livro.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizar, textoParaAtor5e } from '../scripts/conversor/origem-texto.js';
import { lerAtor5e } from '../scripts/conversor/origem-json.js';

const EN2014 = `Marsh Wyrmling
Medium dragon, neutral evil
Armor Class 15 (natural armor)
Hit Points 52 (7d8 + 21)
Speed 30 ft., fly 60 ft., swim 40 ft.
STR DEX CON INT WIS CHA
15 (+2) 12 (+1) 17 (+3) 8 (-1) 11 (+0) 10 (+0)
Saving Throws Dex +3, Con +5
Skills Perception +4, Stealth +3
Damage Resistances acid; bludgeoning, piercing, and slashing from nonmagical attacks
Damage Immunities poison
Condition Immunities poisoned
Senses blindsight 10 ft., darkvision 60 ft., passive Perception 14
Languages Common, Draconic
Challenge 3 (700 XP)
Amphibious. The wyrmling can breathe air and water.
Legendary Resistance (2/Day). If the wyrmling fails a saving throw, it can choose to succeed instead.
ACTIONS
Multiattack. The wyrmling makes one Bite attack and one Spit attack.
Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 8 (1d10 + 3) piercing damage plus 3 (1d6) poison damage.
Spit. Ranged Weapon Attack: +3 to hit, range 30/90 ft., one target. Hit: 5 (1d6 + 2) acid damage.
Poison Breath (Recharge 5-6). The wyrmling exhales poisonous gas in a 15-foot cone. Each creature in that area must make a DC 13 Constitution saving throw, taking 21 (6d6) poison damage on a failed save, or half as much damage on a successful one. A creature that fails is also poisoned for 1 minute.
REACTIONS
Tail Swipe. When a creature within 5 feet hits the wyrmling, the wyrmling makes a tail attack.
LEGENDARY ACTIONS
The wyrmling can take 2 legendary actions, choosing from the options below. Only one legendary action can be used at a time.
Detect. The wyrmling makes a Wisdom (Perception) check.
Tail Attack. The wyrmling makes a tail attack.`;

const EN2024 = `Marsh Wyrmling
Medium Dragon, Neutral Evil
AC 15 Initiative +1 (11)
HP 52 (7d8 + 21)
Speed 30 ft., Fly 60 ft., Swim 40 ft.
Str 15 +2 +2 Dex 12 +1 +3 Con 17 +3 +5
Int 8 -1 -1 Wis 11 +0 +0 Cha 10 +0 +0
Skills Perception +4, Stealth +3
Resistances Acid
Immunities Poison; Poisoned
Senses Blindsight 10 ft., Darkvision 60 ft.; Passive Perception 14
Languages Common, Draconic
CR 3 (XP 700; PB +2)
Traits
Amphibious. The wyrmling can breathe air and water.
Actions
Multiattack. The wyrmling makes one Bite attack and one Spit attack.
Bite. Melee Attack Roll: +4, reach 5 ft. Hit: 8 (1d10 + 3) Piercing damage plus 3 (1d6) Poison damage.
Spit. Ranged Attack Roll: +3, range 30/90 ft. Hit: 5 (1d6 + 2) Acid damage.
Poison Breath (Recharge 5-6). Constitution Saving Throw: DC 13, each creature in a 15-foot Cone. Failure: 21 (6d6) Poison damage, and the target has the Poisoned condition until the end of its next turn. Success: Half damage.`;

const PT2014 = `Filhote do Pântano
Médio dragão, neutro e mau
Classe de Armadura 15 (armadura natural)
Pontos de Vida 52 (7d8 + 21)
Deslocamento 9 m, voo 18 m, natação 12 m
FOR DES CON INT SAB CAR
15 (+2) 12 (+1) 17 (+3) 8 (-1) 11 (+0) 10 (+0)
Testes de Resistência Des +3, Con +5
Perícias Percepção +4, Furtividade +3
Resistência a Dano ácido; contundente, perfurante e cortante de ataques não mágicos
Imunidade a Dano veneno
Imunidade a Condição envenenado
Sentidos visão cega 3 m, visão no escuro 18 m, Percepção passiva 14
Idiomas Comum, Dracônico, telepatia 18 m
Desafio 3 (700 XP)
Anfíbio. O filhote pode respirar ar e água.
Resistência Lendária (2/Dia). Se o filhote falhar num teste de resistência, pode escolher ser bem-sucedido.
AÇÕES
Ataque Múltiplo. O filhote faz dois ataques de Mordida e um ataque de Cuspe.
Mordida. Ataque Corpo a Corpo com Arma: +4 para atingir, alcance 1,5 m, um alvo. Acerto: 8 (1d10 + 3) de dano perfurante mais 3 (1d6) de dano de veneno.
Cuspe. Ataque à Distância com Arma: +3 para atingir, alcance 9/27 m, um alvo. Acerto: 5 (1d6 + 2) de dano ácido.
Sopro Venenoso (Recarga 5-6). O filhote exala gás venenoso em um cone de 4,5 metros. Cada criatura na área deve fazer um teste de resistência de Constituição CD 13, sofrendo 21 (6d6) de dano de veneno se falhar, ou metade do dano se passar. A criatura que falhar também fica envenenada por 1 minuto.
REAÇÕES
Rabada. Quando uma criatura a 1,5 m acerta o filhote, ele faz um ataque de cauda.`;

const PT2024 = `Filhote do Pântano
Dragão Médio, Neutro e Mau
CA 15 Iniciativa +1 (11)
PV 52 (7d8 + 21)
Deslocamento 9 m, Voo 18 m, Natação 12 m
For 15 +2 +2 Des 12 +1 +3 Con 17 +3 +5
Int 8 -1 -1 Sab 11 +0 +0 Car 10 +0 +0
Resistências Ácido
Imunidades Veneno; Envenenado
Sentidos Visão no Escuro 18 m; Percepção Passiva 14
Idiomas Comum, Dracônico
ND 3 (XP 700; BP +2)
Ações
Mordida. Ataque Corpo a Corpo: +4, alcance 1,5 m. Acerto: 8 (1d10 + 3) de dano Perfurante mais 3 (1d6) de dano de Veneno.
Sopro Venenoso (Recarga 5-6). Teste de Resistência de Constituição: CD 13, cada criatura em um Cone de 4,5 metros. Falha: 21 (6d6) de dano de Veneno. Sucesso: metade do dano.`;

// Texto de PDF: linhas quebradas no meio da frase, palavra hifenizada, lista de magias, dano que continua na linha seguinte.
const PDF = `GRAND MAGE
Medium humanoid (any race), any alignment
Armor Class 12 (15 with
mage armor)
Hit Points 40 (9d8)
Speed 30 ft.
STR DEX CON INT WIS CHA
9 (-1) 14 (+2) 11 (+0) 17 (+3) 12 (+1) 11 (+0)
Languages any four lan-
guages
Challenge 6 (2,300 XP) Proficiency Bonus +3
Spellcasting. The mage is a 9th-level spellcaster. Its spellcasting ability is Intelligence (spell save DC 14, +6 to hit with spell attacks).
The mage has the following wizard spells prepared:
Cantrips (at will): fire bolt, mage hand
3rd level (3 slots): fireball, fly
Fire Staff. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) bludgeoning damage plus
3 (1d6) fire damage.
LAIR ACTIONS
On initiative count 20, the mage can use a lair action.
Flame Wave. Each creature in a 20-foot-radius sphere must make a DC 14 Dexterity saving throw.`;

const ler = (texto) => {
  const r = textoParaAtor5e(texto);
  assert.equal(r.ok, true, JSON.stringify(r));
  return { ...r, ...lerAtor5e(r.ator, { pvSoloNoND: () => 100 }) };
};
const porNome = (lista, nome) => lista.find((x) => x.nome === nome);

test('normalizar: aspas, travessões, hifenização e linha que começa em minúscula', () => {
  assert.equal(normalizar('It’s “ok”\r\nRecharge 5–6\r\nHP −2'), 'It\'s "ok"\nRecharge 5-6\nHP -2');
  assert.equal(normalizar('non-\nmagical attacks\nand more\nNova Linha'), 'nonmagical attacks and more\nNova Linha');
});

test('inglês 2014: cabeçalho, listas, ataques, dano extra, recarga, usos, área, seções e lendárias', () => {
  const r = ler(EN2014);
  assert.deepEqual(r.avisos, []);
  const e = r.estado;
  assert.deepEqual([e.nome, e.cr, e.tamanho, e.tipo, e.deslocamento], ['Marsh Wyrmling', '3', 'med', 'mon', 9]);
  assert.deepEqual(e.deslocamentosExtra, { fly: 18, swim: 12 });
  assert.deepEqual(e.atributos, { for: 2, des: 1, con: 3, int: -1, sab: 0, car: 0 });
  assert.deepEqual(e.sentidos, { value: ['escuro', 'cegas'], custom: '' });
  assert.deepEqual(e.idiomas, ['comum', 'draconico']);
  assert.deepEqual(e.resistenciasDano.reducao, ['acido', 'impacto', 'perfuracao', 'corte']);
  assert.deepEqual(e.imunidadesCondicao, { value: ['envenenado'], custom: '' });
  assert.equal(e.papel, 'solo');
  assert.equal(e.chefeFinal, true); // resistência lendária e ações lendárias
  assert.deepEqual(e.ataques.map((a) => [a.nome, a.tipo, a.dano, a.qtd]), [['Bite', 'cac', 'perfuracao', 1], ['Spit', 'ad', 'acido', 1]]);
  assert.deepEqual(e.ataques[0].danoExtra, [{ formula: '1d6', tipo: 'dano' }]);
  assert.equal(e.ataques[0].proporcaoExtra, 0.292);
  assert.deepEqual(e.habilidades.map((h) => [h.nome, h.execucao]), [
    ['Amphibious', ''], ['Legendary Resistance', ''], ['Multiattack', 'action'], ['Poison Breath', 'action'],
    ['Tail Swipe', 'reaction'], ['Detect', 'special'], ['Tail Attack', 'special'],
  ]);
  assert.equal(porNome(e.habilidades, 'Legendary Resistance').usos, 2);
  const sopro = porNome(e.habilidades, 'Poison Breath');
  assert.deepEqual(sopro.dano, [{ formula: '6d6', tipo: 'dano' }]);
  assert.deepEqual(sopro.resistencia, { pericia: 'fort', metade: true });
  assert.equal(sopro.area, 'cone 4,5m');
  assert.equal(sopro.efeito, true);
  assert.match(sopro.texto, /^\(Recarga \(movimento\)\)/);
  assert.match(sopro.texto, /CD 13 Fortitude/);
  assert.ok(r.relatorio.some((l) => l.tipo === 'ignorado' && /perícias treinadas/.test(l.texto)));
});

test('inglês 2024: tabela de atributos, "Immunities" com condição, rolagem de ataque e salvaguarda em duas linhas', () => {
  const e = ler(EN2024).estado;
  assert.deepEqual(e.atributos, { for: 2, des: 1, con: 3, int: -1, sab: 0, car: 0 });
  assert.deepEqual(e.imunidadesCondicao, { value: ['envenenado'], custom: '' });
  assert.deepEqual(e.resistenciasDano.reducao, ['acido']);
  assert.equal(e.cr, '3');
  assert.deepEqual(e.ataques.map((a) => [a.nome, a.tipo, a.dano]), [['Bite', 'cac', 'perfuracao'], ['Spit', 'ad', 'acido']]);
  const sopro = porNome(e.habilidades, 'Poison Breath');
  assert.deepEqual(sopro.resistencia, { pericia: 'fort', metade: true }); // "Success: Half damage."
  assert.equal(sopro.area, 'cone 4,5m');
  assert.deepEqual(sopro.dano, [{ formula: '6d6', tipo: 'dano' }]);
});

test('português 2014: rótulos, metros, tipos de dano, "Ataque Múltiplo" e salvaguarda em português', () => {
  const r = ler(PT2014);
  const e = r.estado;
  assert.deepEqual([e.nome, e.cr, e.tamanho, e.tipo, e.deslocamento], ['Filhote do Pântano', '3', 'med', 'mon', 9]);
  assert.deepEqual(e.deslocamentosExtra, { fly: 18, swim: 12 });
  assert.deepEqual(e.atributos, { for: 2, des: 1, con: 3, int: -1, sab: 0, car: 0 });
  assert.deepEqual(e.sentidos, { value: ['escuro', 'cegas'], custom: '' });
  assert.deepEqual(e.idiomas, ['comum', 'draconico']);
  assert.equal(e.idiomasCustom, 'telepatia 18 m');
  assert.deepEqual(e.resistenciasDano.reducao, ['acido', 'impacto', 'perfuracao', 'corte']);
  assert.deepEqual(e.imunidadesCondicao, { value: ['envenenado'], custom: '' });
  assert.deepEqual(e.ataques.map((a) => [a.nome, a.tipo, a.dano, a.qtd]), [['Mordida', 'cac', 'perfuracao', 2], ['Cuspe', 'ad', 'acido', 1]]);
  assert.deepEqual(e.ataques[0].danoExtra, [{ formula: '1d6', tipo: 'dano' }]);
  const sopro = porNome(e.habilidades, 'Sopro Venenoso');
  assert.deepEqual(sopro.resistencia, { pericia: 'fort', metade: true });
  assert.equal(sopro.area, 'cone 4,5m');
  assert.equal(porNome(e.habilidades, 'Resistência Lendária').usos, 2);
  assert.equal(porNome(e.habilidades, 'Rabada').execucao, 'reaction');
  assert.ok(!r.relatorio.some((l) => /Multiataque não cita/.test(l.texto)));
});

test('português 2024: tipo antes do tamanho, "ND", "Imunidades" com condição e área em metros', () => {
  const e = ler(PT2024).estado;
  assert.deepEqual([e.nome, e.cr, e.tamanho, e.tipo], ['Filhote do Pântano', '3', 'med', 'mon']);
  assert.deepEqual(e.atributos, { for: 2, des: 1, con: 3, int: -1, sab: 0, car: 0 });
  assert.deepEqual(e.sentidos, { value: ['escuro'], custom: '' });
  assert.deepEqual(e.imunidadesCondicao, { value: ['envenenado'], custom: '' });
  assert.deepEqual(e.ataques.map((a) => [a.nome, a.dano]), [['Mordida', 'perfuracao']]);
  const sopro = porNome(e.habilidades, 'Sopro Venenoso');
  assert.deepEqual(sopro.resistencia, { pericia: 'fort', metade: true });
  assert.equal(sopro.area, 'cone 4,5m');
});

test('texto de PDF: linhas quebradas, palavra hifenizada, conjurador, dano na linha seguinte e covil', () => {
  const r = ler(PDF);
  const e = r.estado;
  assert.deepEqual(r.avisos, []);
  assert.equal(e.nome, 'GRAND MAGE');
  assert.equal(e.cr, '6');
  assert.equal(e.idiomasCustom, 'any four languages');
  assert.equal(e.conjurador, true);
  assert.equal(e.conjuracao, 'int');
  assert.equal(e.papel, 'solo'); // ação de covil
  assert.deepEqual(e.habilidades.map((h) => [h.nome, h.oficial, h.execucao]), [['Spellcasting', 'magias', ''], ['Flame Wave', undefined, 'special']]);
  assert.match(porNome(e.habilidades, 'Spellcasting').texto, /3rd level \(3 slots\): fireball, fly/); // lista de magias é continuação, não habilidade
  assert.deepEqual(e.ataques[0].danoExtra, [{ formula: '1d6', tipo: 'fogo' }]);
  assert.equal(porNome(e.habilidades, 'Flame Wave').area, 'esfera 6m de raio');
});

test('texto que não é bloco de estatísticas: erro; bloco incompleto: aceito com aviso', () => {
  assert.deepEqual(textoParaAtor5e('olá\nisto não é uma ficha'), { ok: false, erro: 'T20C5E.ErroTexto' });
  assert.deepEqual(textoParaAtor5e(''), { ok: false, erro: 'T20C5E.ErroTexto' });
  assert.deepEqual(textoParaAtor5e(undefined), { ok: false, erro: 'T20C5E.ErroTexto' });
  const parcial = textoParaAtor5e('Rato\nSmall beast, unaligned\nChallenge 1/8 (25 XP)\nBite. Melee Weapon Attack: +0 to hit, reach 5 ft. Hit: 1 piercing damage.');
  assert.equal(parcial.ok, true);
  assert.match(parcial.avisos.join('|'), /Atributos não encontrados \(assumido 10\): str, dex, con, int, wis, cha/);
  const r = lerAtor5e(parcial.ator);
  assert.equal(r.estado.cr, '1/8');
  assert.equal(r.estado.tamanho, 'peq');
  assert.equal(r.estado.tipo, 'ani');
});

test('primeira linha é o tamanho e tipo: sem nome, com aviso', () => {
  const r = textoParaAtor5e('Large aberration, neutral\nSTR 16 DEX 11 CON 19 INT 6 WIS 13 CHA 6\nChallenge 5 (1,800 XP)');
  assert.equal(r.ok, true);
  assert.equal(r.ator.name, '');
  assert.match(r.avisos.join('|'), /Nome não encontrado/);
  assert.equal(r.ator.system.abilities.str.value, 16);
});

test('linha solta sem nome de habilidade, fora da introdução de lendárias, é descartada com aviso', () => {
  const r = textoParaAtor5e('Rato\nSmall beast, unaligned\nSTR 2 DEX 11 CON 9 INT 2 WIS 10 CHA 4\nChallenge 0 (10 XP)\nFrase solta sem ponto de nome que passa de sessenta caracteres de comprimento total');
  assert.equal(r.ok, true);
  assert.match(r.avisos.join('|'), /Texto sem nome de habilidade ignorado/);
  assert.deepEqual(r.ator.items, []);
});

const BORDAS = [
  'Gárgula', 'Medium elemental, chaotic neutral', 'Armor Class 15', 'Speed 5 ft., fly 60 ft. (hover)',
  'STR 14 DEX 16 CON 14 INT 6 WIS 11 CHA 6', 'Damage Vulnerabilities fire', 'Languages \u2014', 'Challenge 2 (450 XP)',
  'Innate Spellcasting. The gargoyle\u2019s innate spellcasting ability is Charisma. It can innately cast the following spells:',
  'At will: mage hand',
  'Javelin. Melee or Ranged Weapon Attack: +5 to hit, reach 5 ft. or range 30/120 ft., one target. Hit: 6 (1d6 + 3) piercing damage.',
  'LEGENDARY ACTIONS',
  'Slam. The gargoyle makes a slam attack.',
].join('\r\n').replace(/ /g, '\u00a0');

test('bordas: CRLF e espaço não separável, vulnerabilidade, idioma "—", voo pairando, ataque "Melee or Ranged", conjuração inata, lendárias sem número', () => {
  const r = ler(BORDAS);
  const e = r.estado;
  assert.equal(e.nome, 'Gárgula');
  assert.equal(e.deslocamento, 1.5);
  assert.deepEqual(e.deslocamentosExtra, { fly: 18 });
  assert.deepEqual(e.resistenciasDano.vulnerabilidade, ['fogo']);
  assert.deepEqual(e.idiomas, []);
  assert.equal(e.idiomasCustom, '');
  assert.equal(r.ator.items[0].name, 'Innate Spellcasting');
  assert.equal(r.ator.items[0].system.identifier, undefined); // só o "Spellcasting" vira o poder oficial "Magias"
  assert.equal(e.conjurador, true);
  assert.equal(e.conjuracao, 'car');
  assert.deepEqual(e.ataques.map((a) => [a.nome, a.tipo, a.dano]), [['Javelin', 'cac', 'perfuracao']]); // "Melee or Ranged" é corpo a corpo
  assert.match(r.avisos.join('|'), /Ações lendárias sem a quantidade no texto: assumidas 3/);
  assert.equal(r.ator.system.resources.legact.max, 3);
});

test('bordas: deslocamento e sentidos em metros com vírgula; sentido sem equivalente vira texto em pés', () => {
  const r = ler('Verme\nHuge monstrosity, unaligned\nSTR 20 DEX 8 CON 20 INT 2 WIS 10 CHA 3\nSpeed 4,5 m, burrow 9 m\nSenses tremorsense 18 m\nChallenge 5 (1,800 XP)');
  assert.equal(r.estado.deslocamento, 4.5);
  assert.deepEqual(r.estado.deslocamentosExtra, { burrow: 9 });
  assert.match(r.relatorio.find((l) => /Sentidos sem equivalente/.test(l.texto)).texto, /tremorsense 60 pés/);
});

// ---------- achados da revisão final ----------

test('dano condicional da mordida (salvaguarda depois do golpe) não vira dano extra fixo; parágrafo seguinte também não', () => {
  const aranha = ler([
    'Aranha', 'Large beast, unaligned', 'STR 14 DEX 16 CON 12 INT 2 WIS 11 CHA 4', 'Challenge 1 (200 XP)', 'ACTIONS',
    'Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one creature. Hit: 7 (1d8 + 3) piercing damage, and the target must make a DC 11 Constitution saving throw, taking 9 (2d8) poison damage on a failed save, or half as much damage on a successful one.',
  ].join('\n')).estado;
  assert.deepEqual(aranha.ataques[0].danoExtra, []);
  const aranhaPt = ler([
    'Aranha', 'Grande fera, sem tendência', 'FOR 14 DES 16 CON 12 INT 2 SAB 11 CAR 4', 'Desafio 1 (200 XP)', 'AÇÕES',
    'Mordida. Ataque Corpo a Corpo com Arma: +5 para atingir, alcance 1,5 m, uma criatura. Acerto: 7 (1d8 + 3) de dano perfurante, e o alvo deve realizar um teste de resistência de Constituição CD 11, sofrendo 9 (2d8) de dano de veneno se falhar.',
  ].join('\n')).estado;
  assert.deepEqual(aranhaPt.ataques[0].danoExtra, []);
  const fogo = ler([
    'Brasa', 'Medium elemental, neutral', 'STR 10 DEX 12 CON 10 INT 4 WIS 10 CHA 4', 'Challenge 1 (200 XP)', 'ACTIONS',
    'Touch. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) fire damage.',
    'If the target is a creature wearing flammable armor, it takes 10 (3d6) fire damage at the start of each of its turns.',
  ].join('\n')).estado;
  assert.deepEqual(fogo.ataques[0].danoExtra, []);
});

test('PDF: linha que continua depois de quebra e começa em maiúscula não vira habilidade nem leva o dano ou o teste', () => {
  const e = ler([
    'Dragão', 'Large dragon, lawful evil', 'STR 20 DEX 10 CON 18 INT 12 WIS 12 CHA 14', 'Challenge 8 (3,900 XP)', 'ACTIONS',
    'Rend. Melee Weapon Attack: +9 to hit, reach 10 ft., one target. Hit: 13 (2d8 + 4) Slashing damage plus 7 (2d6)',
    'Fire damage.',
    'Gaze. The target must succeed on a DC 13',
    'Wisdom saving throw. On a failure, it takes 10 (3d6) psychic damage.',
    'Tentacle. Melee Weapon Attack: +7 to hit, reach 10 ft., one target. Hit: 10 (2d6 + 3) bludgeoning damage.',
    'The target is grappled (escape DC 13). Until this grapple ends, the target takes 7 (2d6) acid damage at the start of each of its turns.',
  ].join('\n')).estado;
  assert.deepEqual(e.ataques.map((a) => a.nome), ['Rend', 'Tentacle']);
  assert.deepEqual(e.ataques[0].danoExtra, [{ formula: '2d6', tipo: 'fogo' }]);
  assert.deepEqual(e.ataques[1].danoExtra, []);
  assert.deepEqual(e.habilidades.map((h) => h.nome), ['Gaze']);
  assert.deepEqual(e.habilidades[0].dano, [{ formula: '3d6', tipo: 'psiquico' }]);
  assert.deepEqual(e.habilidades[0].resistencia, { pericia: 'vont', metade: false });
});

test('vocabulário dos livros em português: corruptor, concussão, ígneo, percepção às cegas, "metade desse dano"', () => {
  const r = ler([
    'Diabrete', 'Miúdo corruptor, leal e mau', 'FOR 6 DES 17 CON 13 INT 11 SAB 12 CAR 14',
    'Resistência a Dano frio; concussão, perfurante e cortante de ataques não mágicos',
    'Sentidos percepção às cegas 9 m, sentido estranho 9 m, Percepção passiva 11',
    'Desafio 1 (200 XP)', 'AÇÕES',
    'Ferrão. Ataque Corpo a Corpo com Arma: +5 para atingir, alcance 1,5 m, um alvo. Acerto: 5 (1d4 + 3) de dano perfurante mais 10 (3d6) de dano ígneo.',
    'Chama. O diabrete deve realizar um teste de resistência de Destreza CD 12, sofrendo 10 (3d6) de dano ígneo se falhar, ou metade desse dano se obtiver sucesso.',
  ].join('\n'));
  const e = r.estado;
  assert.deepEqual([e.tamanho, e.tipo], ['min', 'esp']);
  assert.deepEqual(e.resistenciasDano.reducao, ['frio', 'impacto', 'perfuracao', 'corte']);
  assert.deepEqual(e.sentidos.value, ['cegas']);
  assert.match(r.avisos.join('|'), /Sentido não reconhecido: sentido estranho 9 m/);
  assert.doesNotMatch(r.avisos.join('|'), /Percepção passiva/);
  assert.deepEqual(e.ataques[0].danoExtra, [{ formula: '3d6', tipo: 'fogo' }]);
  assert.deepEqual(porNome(e.habilidades, 'Chama').resistencia, { pericia: 'refl', metade: true });
});

test('"Recharges after a Short or Long Rest" vira 1/descanso curto; "Innate Spellcasting (Psionics)" é conjuração; "line 30 feet long"', () => {
  const r = ler([
    'Devorador', 'Medium aberration, lawful evil', 'STR 11 DEX 12 CON 12 INT 19 WIS 17 CHA 17', 'Challenge 7 (2,900 XP)',
    'Innate Spellcasting (Psionics). The mind flayer\u2019s innate spellcasting ability is Intelligence (spell save DC 15). It can innately cast detect thoughts.',
    'ACTIONS',
    'Mind Blast (Recharges after a Short or Long Rest). The mind flayer magically emits psychic energy in a line 30 feet long and 5 feet wide. Each creature in that line must make a DC 15 Intelligence saving throw, taking 22 (4d8 + 4) psychic damage on a failed save.',
  ].join('\n'));
  const e = r.estado;
  assert.equal(e.conjurador, true);
  assert.equal(e.conjuracao, 'int');
  const rajada = porNome(e.habilidades, 'Mind Blast');
  assert.equal(rajada.usos, 1);
  assert.match(rajada.texto, /^\(1\/descanso curto\)/);
  assert.equal(rajada.area, 'linha 9m x 1,5m');
});

// ---------- formato copiado do pocketdm.com.br (uma linha por campo, com o lixo da página) ----------

const SITE = [
  'Gárgula de Barro (Mud Gargoyle)', '2024', '(clique para alterar a edição)', 'Médio feérico, neutro e mau',
  'Classe de Armadura 15', 'Pontos de Vida 52 (7d8 + 21)', 'Movimento 9 m (30 ft), voo 18 m (60 ft), nado 12 m (40 ft)', 'Iniciativa +1',
  'Resistências a Dano gélido; contundente, perfurante e cortante de armas não mágicas',
  'Imunidades a Dano ígneo; venenoso', 'Imunidades a Condição enfeitiçado; imobilizado; envenenado',
  'FOR', '15', '(+2)', 'DES', '12', '(+1)', 'CON', '17', '(+3)', 'INT', '8', '(-1)', 'SAB', '11', '(+0)', 'CAR', '10', '(+0)',
  'Sentidos visão às cegas 3 m (10 ft), visão no escuro 18 m (60 ft), sismiconsciência 9 m (30 ft), Percepção Passiva 12',
  'Idiomas Comum; telepatia 18 m (60 ft).', 'Nível de Desafio 3 (700 XP)', 'Fonte Monster Manual (2024)',
  'Resistência a Magia. O gárgula tem vantagem em salvaguardas contra magias e outros efeitos mágicos.',
  'Resistência Lendária (3/Dia, ou 4/Dia no Covil). Se o gárgula falhar em uma salvaguarda, ele pode escolher ter sucesso.',
  'Ações',
  'Ataque Múltiplo. O gárgula realiza dois ataques de Garra.',
  'Garra. Ataque Corpo a Corpo: +4, alcance 1,5 m (5 ft). 8 (1d10 + 3) de dano de concussão mais 3 (1d6) de dano de fogo, e o alvo fica com a condição Imobilizado (Grappled) (CD 12 para escapar).',
  'Sopro de Lama (Recarga 5-6). Salvaguarda de Destreza: CD 13, cada criatura em uma Linha de 9 m (30 ft) de comprimento por 1,5 m (5 ft) de largura. Falha: 14 (4d6) de dano de concussão. Sucesso: Metade do dano.',
  'Jato Gélido (Recarga 6). Salvaguarda de Constituição: CD 13, cada criatura em uma Linha de 18 m (60 ft) de comprimento e 3 m (10 ft) de largura. Falha: 10 (3d6) de dano de frio.',
  'Ações Lendárias',
  'Usos de Ação Lendária: 3 (4 no Covil). Imediatamente após o turno de outra criatura, o gárgula pode gastar um uso para realizar uma das ações a seguir.',
  'Rabada. O gárgula realiza um ataque de Garra.',
  'Regras do SRD sob CC BY 4.0 da Wizards of the Coast. Tradução em português e curadoria editorial © 2026 Pocket DM. Licença e atribuição',
].join('\n');

test('formato do pocketdm: Movimento, nado, feérico, gélido, imobilizado, visão às cegas, sismiconsciência e o lixo da página', () => {
  const r = ler(SITE);
  const e = r.estado;
  assert.deepEqual(r.avisos, []); // "2024", "(clique...)", "Fonte..." e o rodapé de licença não viram nada
  assert.deepEqual([e.nome, e.cr, e.tamanho, e.tipo], ['Gárgula de Barro (Mud Gargoyle)', '3', 'med', 'esp']);
  assert.deepEqual([e.deslocamento, e.deslocamentosExtra], [9, { fly: 18, swim: 12 }]);
  assert.deepEqual(e.atributos, { for: 2, des: 1, con: 3, int: -1, sab: 0, car: 0 });
  assert.deepEqual(e.sentidos.value, ['escuro', 'cegas']);
  assert.match(r.relatorio.find((l) => /Sentidos sem equivalente/.test(l.texto)).texto, /tremorsense 30 pés/);
  assert.deepEqual([e.idiomas, e.idiomasCustom], [['comum'], 'telepatia 18 m']);
  assert.deepEqual(e.resistenciasDano.reducao, ['frio', 'impacto', 'perfuracao', 'corte']);
  assert.deepEqual(e.resistenciasDano.imunidade, ['fogo']);
  assert.deepEqual(e.imunidadesCondicao.value, ['enfeiticado', 'agarrado', 'envenenado']);
  assert.deepEqual(e.ataques.map((a) => [a.nome, a.dano, a.qtd, a.danoExtra]), [['Garra', 'impacto', 2, [{ formula: '1d6', tipo: 'fogo' }]]]);
  assert.doesNotMatch(e.ataques[0].descricao, /\bft\b/); // o "(5 ft)" depois dos metros sai, senão o termosT20 converteria de novo
  assert.match(e.ataques[0].descricao, /alcance 1,5 m/);
  assert.equal(porNome(e.habilidades, 'Resistência a Magia').oficial, 'resistenciaMagia');
  assert.equal(porNome(e.habilidades, 'Resistência Lendária').usos, 3);
  assert.equal(r.ator.system.resources.legact.max, 3);
  assert.equal(porNome(e.habilidades, 'Rabada').execucao, 'special');
});

test('formato do pocketdm: largura da linha com pés entre parênteses', () => {
  const e = ler(SITE).estado;
  assert.equal(porNome(e.habilidades, 'Sopro de Lama').area, 'linha 9m x 1,5m');
  assert.equal(porNome(e.habilidades, 'Jato Gélido').area, 'linha 18m x 3m');
  assert.deepEqual(porNome(e.habilidades, 'Jato Gélido').dano, [{ formula: '3d6', tipo: 'frio' }]);
});

test('"Legendary Action Uses: 2" (layout 2024 em inglês) dá a quantidade sem aviso', () => {
  const r = ler([
    'Wisp', 'Small fey, neutral', 'STR 8 DEX 14 CON 10 INT 10 WIS 12 CHA 12', 'CR 2 (XP 450; PB +2)', 'Actions',
    'Zap. Melee Attack Roll: +4, reach 5 ft. 5 (1d6 + 2) Lightning damage.',
    'Legendary Actions',
    'Legendary Action Uses: 2. Immediately after another creature\u2019s turn, the wisp can expend a use to take one of the following actions.',
    'Dart. The wisp makes one Zap attack.',
  ].join('\n'));
  assert.equal(r.ator.system.resources.legact.max, 2);
  assert.doesNotMatch(r.avisos.join('|'), /assumidas 3/);
});

// ---------- defeitos que só apareceram nas fichas reais do site ----------

test('linha de tipo sem alinhamento (2014): "Médio humanoide (half-orc)" dá tamanho e tipo', () => {
  const e = ler(['Druida', 'Médio humanoide (half-orc)', 'FOR 10 DES 12 CON 12 INT 11 SAB 16 CAR 10', 'Nível de Desafio 2 (450 XP)'].join('\n')).estado;
  assert.deepEqual([e.tamanho, e.tipo], ['med', 'hum']);
});

test('"Pequeno ou Médio" e "Small or Medium" ficam com o maior; o enxame "Médio enxame de feras minúsculas" fica Médio', () => {
  const bloco = (linha) => ler(['X', linha, 'STR 10 DEX 10 CON 10 INT 10 WIS 10 CHA 10', 'CR 1 (XP 200)'].join('\n')).estado;
  assert.equal(bloco('Pequeno ou Médio humanoide (mago), neutro').tamanho, 'med');
  assert.equal(bloco('Small or Medium Humanoid (Any Race), Any Alignment').tamanho, 'med');
  assert.deepEqual([bloco('Médio enxame de feras minúsculas, sem alinhamento').tamanho, bloco('Médio enxame de feras minúsculas, sem alinhamento').tipo], ['med', 'ani']);
});

test('Multiataque com condição no nome ("Ataque Múltiplo (Só na Forma de Vampiro)") conta os ataques que também têm condição no nome', () => {
  const e = ler([
    'Vampiro', 'Médio morto-vivo, leal e mau', 'FOR 18 DES 18 CON 18 INT 17 SAB 15 CAR 18', 'Nível de Desafio 13 (10.000 XP)', 'Ações',
    'Ataque Múltiplo (Só na Forma de Vampiro). O vampiro faz dois ataques de Golpe Sepulcral.',
    'Golpe Sepulcral (Só na Forma de Vampiro). Ataque Corpo a Corpo: +9, alcance 1,5 m (5 ft). 8 (1d8 + 4) de dano de concussão mais 7 (2d6) de dano necrótico.',
  ].join('\n')).estado;
  assert.deepEqual(e.ataques.map((a) => [a.nome, a.qtd]), [['Golpe Sepulcral (Só na Forma de Vampiro)', 2]]);
});

test('rodapé das criaturas da comunidade do site não vira habilidade', () => {
  const r = ler([
    'Rato Sábio', 'Miúdo fera, sem alinhamento', 'FOR 2 DES 14 CON 10 INT 12 SAB 12 CAR 6', 'Nível de Desafio 1/8 (25 XP)', 'Fonte r/ Monster a Day',
    'Faro Aguçado. O rato tem vantagem em testes de Percepção que dependam do olfato.',
    'Criatura da comunidade r/monsteraday, usada em parceria. Não é conteúdo do SRD nem da Wizards of the Coast. Tradução em português e curadoria editorial © 2026 Pocket DM.',
  ].join('\n'));
  assert.deepEqual(r.avisos, []);
  assert.deepEqual(r.estado.habilidades.map((h) => h.nome), ['Faro Aguçado']);
  assert.doesNotMatch(r.estado.habilidades[0].texto, /comunidade/);
});
