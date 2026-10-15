// v3: bloco de estatísticas de 5e colado como texto (inglês ou português, layouts 2014 e 2024). Função pura: devolve um
// ator dnd5e "de mentira", no formato que o lerAtor5e (v2) lê, e os avisos do que não deu para ler com certeza.
// Rótulos e palavras ficam em tabelas SEM acento e em minúsculas: o texto é comparado depois de `semAcento`.

const semAcento = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Quebras de linha, aspas e travessões tipográficos, hifenização de PDF e linhas quebradas no meio da frase.
export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/­/g, '')
    .replace(/([a-zà-ÿ])-\n([a-zà-ÿ])/g, '$1$2')
    .replace(/\n(?=[a-zà-ÿ])/g, ' ') // shortcut: linha que começa em minúscula é continuação; frase quebrada antes de maiúscula vira entrada separada
    .replace(/[ \t ]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .trim();
}

// ---------- tabelas ----------

const TAMANHOS = {
  tiny: 'tiny', minusculo: 'tiny', miudo: 'tiny', small: 'small', pequeno: 'small', pequena: 'small',
  medium: 'medium', medio: 'medium', media: 'medium', large: 'large', grande: 'large', huge: 'huge', enorme: 'huge',
  gargantuan: 'gargantuan', imenso: 'gargantuan', imensa: 'gargantuan', colossal: 'gargantuan', gigantesco: 'gargantuan',
};
const TIPOS = {
  aberration: 'aberration', aberracao: 'aberration', beast: 'beast', fera: 'beast', besta: 'beast', celestial: 'celestial',
  construct: 'construct', constructo: 'construct', construto: 'construct', dragon: 'dragon', dragao: 'dragon',
  elemental: 'elemental', fey: 'fey', fada: 'fey', fiend: 'fiend', infero: 'fiend', giant: 'giant', gigante: 'giant',
  humanoid: 'humanoid', humanoide: 'humanoid', monstrosity: 'monstrosity', monstruosidade: 'monstrosity',
  corruptor: 'fiend', ooze: 'ooze', limo: 'ooze', plant: 'plant', planta: 'plant', undead: 'undead', 'morto-vivo': 'undead',
};
const DANO = {
  bludgeoning: 'bludgeoning', contundente: 'bludgeoning', concussao: 'bludgeoning', piercing: 'piercing', perfurante: 'piercing',
  slashing: 'slashing', cortante: 'slashing', fire: 'fire', fogo: 'fire', igneo: 'fire', cold: 'cold', frio: 'cold', acid: 'acid', acido: 'acid',
  lightning: 'lightning', eletrico: 'lightning', eletricidade: 'lightning', necrotic: 'necrotic', necrotico: 'necrotic',
  radiant: 'radiant', radiante: 'radiant', psychic: 'psychic', psiquico: 'psychic', force: 'force', energia: 'force',
  energetico: 'force', forca: 'force', thunder: 'thunder', trovejante: 'thunder', trovao: 'thunder',
  poison: 'poison', veneno: 'poison', venenoso: 'poison',
};
const CONDICOES = {
  blinded: 'blinded', cego: 'blinded', charmed: 'charmed', enfeiticado: 'charmed', deafened: 'deafened', surdo: 'deafened',
  exhaustion: 'exhaustion', exaustao: 'exhaustion', frightened: 'frightened', amedrontado: 'frightened', assustado: 'frightened',
  apavorado: 'frightened', grappled: 'grappled', agarrado: 'grappled', incapacitated: 'incapacitated', incapacitado: 'incapacitated',
  paralyzed: 'paralyzed', paralisado: 'paralyzed', petrified: 'petrified', petrificado: 'petrified', poisoned: 'poisoned',
  envenenado: 'poisoned', prone: 'prone', caido: 'prone', derrubado: 'prone', restrained: 'restrained', impedido: 'restrained',
  contido: 'restrained', stunned: 'stunned', atordoado: 'stunned', unconscious: 'unconscious', inconsciente: 'unconscious',
};
const IDIOMAS = {
  common: 'common', comum: 'common', dwarvish: 'dwarvish', anao: 'dwarvish', elvish: 'elvish', elfico: 'elvish',
  goblin: 'goblin', halfling: 'halfling', sylvan: 'sylvan', silvestre: 'sylvan', abyssal: 'abyssal', abissal: 'abyssal',
  aquan: 'aquan', auran: 'auran', celestial: 'celestial', draconic: 'draconic', draconico: 'draconic', giant: 'giant',
  gigante: 'giant', gnoll: 'gnoll', ignan: 'ignan', infernal: 'infernal', orc: 'orc', terran: 'terran',
};
const SENTIDOS = {
  darkvision: 'darkvision', 'visao no escuro': 'darkvision', blindsight: 'blindsight', 'visao cega': 'blindsight', 'percepcao as cegas': 'blindsight',
  tremorsense: 'tremorsense', 'sentido sismico': 'tremorsense', truesight: 'truesight', 'visao verdadeira': 'truesight',
};
const MODOS = {
  walk: 'walk', andar: 'walk', burrow: 'burrow', escavar: 'burrow', escavacao: 'burrow', climb: 'climb', escalar: 'climb',
  escalada: 'climb', fly: 'fly', voo: 'fly', voar: 'fly', swim: 'swim', nadar: 'swim', natacao: 'swim',
};
const ATRIBUTOS = [['str', 'for'], ['dex', 'des'], ['con', 'con'], ['int', 'int'], ['wis', 'sab'], ['cha', 'car']];
const ATRIBUTO_POR_NOME = {
  strength: 'str', forca: 'str', dexterity: 'dex', destreza: 'dex', constitution: 'con', constituicao: 'con',
  intelligence: 'int', inteligencia: 'int', wisdom: 'wis', sabedoria: 'wis', charisma: 'cha', carisma: 'cha',
};
const NOMES_ATRIBUTO = Object.keys(ATRIBUTO_POR_NOME).join('|');

// Rótulos do cabeçalho (comparados em minúsculas e sem acento, no começo da linha).
const ROTULOS = {
  cr: /^(?:challenge|cr|nivel de desafio|desafio|nd)\s+/,
  velocidade: /^(?:speed|deslocamento)\s+/,
  sentidos: /^(?:senses|sentidos)\s+/,
  idiomas: /^(?:languages|idiomas|linguas)\s+/,
  pv: /^(?:hit points|hp|pontos de vida|pv)\s+/,
  pericias: /^(?:skills|pericias)\s+/,
  salvaguardas: /^(?:saving throws|saves|testes de resistencia|salvaguardas)\s+/,
  dr: /^(?:damage resistances?|resistances?|resistencias?(?: a dano)?)\s+/,
  di: /^(?:damage immunities|immunities|imunidades?(?: a dano)?)\s+(?!a condic)/,
  dv: /^(?:damage vulnerabilit(?:y|ies)|vulnerabilit(?:y|ies)|vulnerabilidades?(?: a dano)?)\s+/,
  ci: /^(?:condition immunities|imunidades? a condic(?:ao|oes))\s+/,
};
const IGNORAR = /^(?:proficiency bonus|bonus de proficiencia|gear|equipamento)\b/;

const SECOES = [
  ['traco', /^(?:traits|caracteristicas)$/],
  ['acao', /^(?:actions|acoes)$/],
  ['bonus', /^(?:bonus actions|acoes bonus|acoes bonificadas)$/],
  ['reacao', /^(?:reactions|reacoes)$/],
  ['lendaria', /^(?:legendary actions|acoes lendarias)$/],
  ['covil', /^(?:lair actions|acoes de covil)$/],
];
const ATIVACAO = { acao: 'action', bonus: 'bonus', reacao: 'reaction', lendaria: 'legendary', covil: 'lair' };
const secaoDe = (linha) => SECOES.find(([, re]) => re.test(semAcento(linha).replace(/[:.]$/, '')))?.[0];

// Valor do primeiro rótulo que casa (o rótulo sai, o resto mantém acento e caixa originais).
const valorDe = (linhas, re) => {
  for (const linha of linhas) {
    const m = re.exec(semAcento(linha));
    if (m) return linha.slice(m[0].length).trim();
  }
  return null;
};

// ---------- cabeçalho ----------

// "Large aberration, neutral" / "Grande aberração, neutro" / "Dragão Médio, Neutro e Mau": tamanho e tipo antes da vírgula, em qualquer ordem.
function lerTamanhoTipo(linhas) {
  for (const linha of linhas.slice(0, 3)) {
    if (!linha.includes(',')) continue;
    const palavras = semAcento(linha.split(',')[0]).match(/[a-z-]+/g) ?? [];
    const tamanho = palavras.map((p) => TAMANHOS[p]).find(Boolean);
    const tipo = palavras.map((p) => TIPOS[p] ?? TIPOS[p.replace(/s$/, '')]).find(Boolean);
    if (tamanho && tipo) return { linha, tamanho, tipo };
  }
  return null;
}

// 2014 compacto: "STR DEX CON INT WIS CHA" e, na linha seguinte, "16 (+3) 11 (+0)..."; 2024 e listas: sigla seguida do valor.
function lerAtributos(linhas) {
  const todo = linhas.map(semAcento).join(' ');
  const compacto = /\b(?:str|for)\s+(?:dex|des)\s+con\s+int\s+(?:wis|sab)\s+(?:cha|car)\s+((?:\d{1,2}\s*\(\s*[+-]\d+\s*\)\s*){6})/.exec(todo);
  if (compacto) {
    const valores = [...compacto[1].matchAll(/(\d{1,2})\s*\(/g)];
    return Object.fromEntries(ATRIBUTOS.map(([chave], i) => [chave, Number(valores[i][1])]));
  }
  const lidos = {};
  for (const [chave, pt] of ATRIBUTOS) {
    const m = new RegExp(String.raw`\b(?:${chave}|${pt})\s+(\d{1,2})\b`).exec(todo);
    if (m) lidos[chave] = Number(m[1]);
  }
  return lidos;
}

const numero = (texto) => Number(String(texto).replace(',', '.'));
const ehMetro = (unidade) => /^m/.test(unidade);

function lerDeslocamento(valor) {
  const movimento = {};
  let metros = false;
  for (const parte of semAcento(valor).split(/[,;]/)) {
    const m = /^\s*(?:([a-z]+)\s+)?(\d+(?:[.,]\d+)?)\s*(ft|feet|foot|pes?|metros?|m)(?![a-z])/.exec(parte);
    const modo = m && MODOS[m[1] ?? 'walk'];
    if (!modo) continue;
    movimento[modo] = numero(m[2]);
    if (ehMetro(m[3])) metros = true;
  }
  return { ...movimento, units: metros ? 'm' : 'ft' };
}

function lerSentidos(valor, avisos) {
  const ranges = {};
  for (const original of valor.split(/[,;]/).filter((p) => p.trim())) {
    const parte = semAcento(original);
    const m = /^\s*([a-z ]+?)\s+(\d+(?:[.,]\d+)?)\s*(ft|feet|pes?|metros?|m)(?![a-z])/.exec(parte);
    const chave = m && SENTIDOS[m[1].trim()];
    if (chave) ranges[chave] = ehMetro(m[3]) ? Math.round(numero(m[2]) / 0.3) : numero(m[2]); // o lerAtor5e escreve "pés"
    else if (!/percepcao passiva|passive perception/.test(parte)) avisos.push(`Sentido não reconhecido: ${original.trim()}.`);
  }
  return { ranges, special: '' };
}

function lerIdiomas(valor) {
  const value = [];
  const custom = [];
  let telepatia;
  for (const parte of valor.split(/[,;]/).map((p) => p.trim()).filter(Boolean)) {
    const f = semAcento(parte);
    if (/^-+$/.test(f)) continue;
    const tel = /(?:telepathy|telepatia)\s+(\d+)\s*(ft|feet|pes?|metros?|m)(?![a-z])/.exec(f);
    if (tel) { telepatia = { value: Number(tel[1]), units: ehMetro(tel[2]) ? 'm' : 'ft' }; continue; }
    if (IDIOMAS[f]) value.push(IDIOMAS[f]); else custom.push(parte);
  }
  return { value, custom: custom.join('; '), ...(telepatia && { communication: { telepathy: telepatia } }) };
}

// Resistências, imunidades e vulnerabilidades: só as palavras que têm chave do dnd5e; o resto é descartado com aviso.
function lerLista(valor) {
  const f = semAcento(valor);
  const palavras = f.match(/[a-z]+/g) ?? [];
  const unicos = (tabela) => [...new Set(palavras.map((p) => tabela[p]).filter(Boolean))];
  return {
    dano: unicos(DANO), condicoes: unicos(CONDICOES),
    mgc: /nonmagical|non-magical|nao magic|nao-magic/.test(f),
  };
}

// ---------- entradas (habilidades, ações) ----------

const NAO_NOME = /\b(?:damage|saving throw|dano|teste de resistencia)\b/;
const COMECO_DE_FRASE = /^(?:the|a|an|if|when|each|until|se|quando|cada)$/;

// "Nome. texto": o nome tem até 6 palavras (sem contar parênteses), sem ":" e sem dado de dano, começa em maiúscula e é
// seguido de texto na mesma linha. Pedaço de frase quebrada ("Fire damage.", "The target is grappled (escape DC 13).") não é nome.
function separarNome(linha) {
  const m = /^([A-ZÀ-Ý][^.:]{0,59})\.(?:\s+([\s\S]*))?$/.exec(linha);
  if (!m?.[2] || /\dd\d/.test(m[1]) || NAO_NOME.test(semAcento(m[1]))) return null;
  const palavras = m[1].replace(/\([^)]*\)/g, '').trim().split(/\s+/);
  if (palavras.length > 6 || (palavras.length >= 4 && COMECO_DE_FRASE.test(semAcento(palavras[0])))) return null;
  return { nome: m[1].trim(), texto: m[2] };
}

const REFERENCIAS = new RegExp(String.raw`\b(${[
  'blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated', 'paralyzed', 'petrified', 'poisoned', 'prone',
  'restrained', 'stunned', 'unconscious', 'cego', 'enfeitiçado', 'surdo', 'amedrontado', 'agarrado', 'incapacitado',
  'paralisado', 'petrificado', 'envenenado', 'impedido', 'atordoado', 'inconsciente',
].join('|')})\b`, 'gi');

const FORMAS = {
  cone: 'cone', cube: 'cube', sphere: 'sphere', cylinder: 'cylinder', emanation: 'emanation', line: 'line',
  cubo: 'cube', esfera: 'sphere', cilindro: 'cylinder', emanacao: 'emanation', linha: 'line',
};

// Modelo de área do dnd5e ({ type, size, width, units }) a partir de "30-foot cone", "cone de 9 metros"...
function lerArea(f) {
  let m = /(\d+)-foot-radius (sphere|cylinder|emanation|cube)/.exec(f);
  if (m) return { type: FORMAS[m[2]], size: Number(m[1]), units: 'ft' };
  m = /(\d+)-foot-long,? (?:and )?(\d+)-foot-wide line/.exec(f);
  if (m) return { type: 'line', size: Number(m[1]), width: Number(m[2]), units: 'ft' };
  m = /(\d+)-foot (cone|cube|sphere|cylinder|emanation|line)/.exec(f);
  if (m) {
    const largura = /(\d+)[- ]f(?:ee|oo)t wide/.exec(f);
    return { type: FORMAS[m[2]], size: Number(m[1]), ...(m[2] === 'line' && { width: largura ? Number(largura[1]) : 5 }), units: 'ft' };
  }
  m = /\bline (\d+) feet long(?: and (\d+) feet wide)?/.exec(f);
  if (m) return { type: 'line', size: Number(m[1]), width: m[2] ? Number(m[2]) : 5, units: 'ft' };
  m = /(cone|esfera|cubo|cilindro|emanacao|linha) de (\d+(?:,\d+)?) ?(?:m|metros?)(?![a-z])/.exec(f);
  if (m) {
    const largura = /(\d+(?:,\d+)?) ?(?:m|metros?) de largura/.exec(f);
    return { type: FORMAS[m[1]], size: numero(m[2]), ...(m[1] === 'linha' && { width: largura ? numero(largura[1]) : 1.5 }), units: 'm' };
  }
  return null;
}

const DADO = /\((\d*)d(\d+)(?:\s*([+-])\s*(\d+))?\)\s*(?:(?:de\s+)?dano\s+(?:de\s+)?)?([a-z]+)?/g;

const CORTA_DANO = /\b(?:or|ou)\b|,?\s*\b(?:and|e)\s+(?:the|o|a)\s+(?:target|creature|alvo|criatura)\b|\b(?:must|deve)\b/;

// Partes de dano da frase do primeiro dado ("Hit: 16 (2d8 + 7) slashing damage plus 5 (1d10) lightning damage"), sem a
// alternativa depois de "or"/"ou" (", or 17 (...) if used with two hands") e sem o dano condicional ("and the target must make
// a saving throw, taking 9 (2d8) poison damage"), que é de uma salvaguarda, não do golpe.
function lerDano(f) {
  const inicio = f.search(/\(\d*d\d+/);
  if (inicio < 0) return [];
  const fim = f.slice(inicio).search(/\.(?:\s|$)/);
  const frase = f.slice(inicio, fim < 0 ? undefined : inicio + fim).split(CORTA_DANO)[0];
  return [...frase.matchAll(DADO)].map(([, n, d, sinal, bonus, tipo]) => ({
    number: Number(n || 1), denomination: Number(d), bonus: bonus ? `${sinal === '-' ? '-' : ''}${bonus}` : '', types: DANO[tipo] ? [DANO[tipo]] : [],
  }));
}

const ATAQUE = /(?:attack(?: roll)?|arma|magia|ataque|corpo a corpo|distancia)\s*:\s*[+-]\d+/;
const SALVAGUARDA = [
  new RegExp(String.raw`\b(${NOMES_ATRIBUTO})\s+(?:saving throw|teste de resistencia|salvaguarda)`),
  new RegExp(String.raw`(?:saving throw|teste de resistencia|salvaguarda)s?\s+(?:de |of )?(${NOMES_ATRIBUTO})\b`),
];
const PERIODOS = {
  day: 'day', dia: 'day', 'short rest': 'sr', 'descanso curto': 'sr', 'long rest': 'lr', 'descanso longo': 'lr',
};

// Item `feat` do dnd5e com as atividades que o lerAtor5e procura: ataque, salvaguarda com dano, área, usos e recarga.
function montarItem({ nome: bruto, texto, secao }, ator) {
  const fNome = semAcento(bruto);
  const f = semAcento(texto);
  const usos = /\(\s*(\d+)\s*\/\s*(dia|day|short rest|long rest|descanso curto|descanso longo)/.exec(fNome);
  const recarga = /\(\s*(?:recharge|recarga)\s+(\d)/.exec(fNome);
  const descanso = /\(\s*(?:recharges? after (?:a|an) |recarga apos (?:um |uma )?descanso )(short|long|curto|longo)/.exec(fNome);
  const nome = bruto.replace(/\s*\(\s*(?:\d+\s*\/|recharge|recarga)[^)]*\)/i, '').trim();
  const item = { type: 'feat', name: nome, system: { description: { value: texto.replace(REFERENCIAS, '&Reference[condition=$1]') } } };
  if (ATIVACAO[secao]) item.system.activation = { type: ATIVACAO[secao] };
  if (usos) item.system.uses = { max: usos[1], recovery: [{ period: PERIODOS[usos[2]] }] };
  if (recarga) item.system.uses = { max: '', recovery: [{ period: 'recharge', formula: recarga[1] }] };
  if (descanso) item.system.uses = { max: '1', recovery: [{ period: /^(?:short|curto)$/.test(descanso[1]) ? 'sr' : 'lr' }] };
  if (/^(?:multiattack|multiataque|ataques? multiplos?)$/.test(semAcento(nome))) item.system.identifier = 'multiattack';
  if (/^(?:spellcasting|conjuracao)$/.test(semAcento(nome))) item.system.identifier = 'spellcasting';
  if (/^(?:innate )?spellcasting(?: \(.*\))?$|^conjuracao(?: inata)?(?: \(.*\))?$/.test(semAcento(nome))) {
    const atributo = (f.match(new RegExp(`\\b(?:intelligence|wisdom|charisma|inteligencia|sabedoria|carisma)\\b`)) ?? [])[0];
    if (atributo) ator.system.attributes.spellcasting = ATRIBUTO_POR_NOME[atributo];
  }

  const ataque = ATAQUE.exec(f);
  const area = lerArea(f);
  const partes = lerDano(f);
  const salvaguarda = ataque ? null : SALVAGUARDA.map((re) => re.exec(f)).find(Boolean);
  const atividade = {};
  if (ataque) {
    const prefixo = f.slice(0, ataque.index + ataque[0].length);
    const distancia = /ranged|distancia/.test(prefixo) && !/melee|corpo a corpo/.test(prefixo);
    Object.assign(atividade, { type: 'attack', attack: { type: { value: distancia ? 'ranged' : 'melee' } }, damage: { parts: partes } });
  } else if (salvaguarda) {
    Object.assign(atividade, {
      type: 'save', save: { ability: [ATRIBUTO_POR_NOME[salvaguarda[1]]] },
      damage: { onSave: /half (?:as much )?damage|metade d(?:o|esse) dano/.test(f) ? 'half' : 'none', parts: partes },
    });
  } else if (partes.length) {
    Object.assign(atividade, { type: 'utility', damage: { parts: partes } });
  }
  if (area) { atividade.type ??= 'utility'; atividade.target = { template: area }; }
  if (/^(?:legendary resistance|resistencia lendaria)$/.test(semAcento(nome))) {
    atividade.type ??= 'utility';
    atividade.consumption = { targets: [{ target: 'resources.legres.value' }] };
    if (usos) ator.system.resources.legres = { max: Number(usos[1]) };
  }
  if (atividade.type) item.system.activities = { a: atividade };
  return item;
}

// ---------- ponto de entrada ----------

export function textoParaAtor5e(bruto) {
  const linhas = normalizar(bruto).split('\n').filter(Boolean);
  const avisos = [];
  const primeiraSecao = linhas.findIndex((l) => secaoDe(l));
  const linhaCR = linhas.findIndex((l) => ROTULOS.cr.test(semAcento(l)));
  const fimCabecalho = linhaCR >= 0 ? linhaCR + 1 : (primeiraSecao < 0 ? linhas.length : primeiraSecao);
  const cabecalho = linhas.slice(0, fimCabecalho);
  const corpo = linhas.slice(fimCabecalho);

  const atributos = lerAtributos(cabecalho);
  const crTexto = valorDe(cabecalho, ROTULOS.cr)?.match(/^(\d+\/\d+|\d+(?:[.,]\d+)?)/)?.[1];
  if (!Object.keys(atributos).length && !crTexto) return { ok: false, erro: 'T20C5E.ErroTexto' };

  const tamanhoTipo = lerTamanhoTipo(cabecalho);
  const nome = cabecalho[0] && cabecalho[0] !== tamanhoTipo?.linha ? cabecalho[0] : '';
  if (!nome) avisos.push('Nome não encontrado na primeira linha: informe o nome no formulário.');
  const faltam = ATRIBUTOS.map(([k]) => k).filter((k) => atributos[k] === undefined);
  if (faltam.length) avisos.push(`Atributos não encontrados (assumido 10): ${faltam.join(', ')}.`);

  const ator = {
    name: nome, type: 'npc',
    system: {
      abilities: Object.fromEntries(ATRIBUTOS.map(([k]) => [k, { value: atributos[k] ?? 10 }])),
      details: { cr: crTexto ? crTexto.replace(',', '.') : '', type: { value: tamanhoTipo?.tipo ?? '' } },
      traits: { size: tamanhoTipo?.tamanho ?? '' },
      attributes: {}, resources: {},
    },
    items: [],
  };
  const s = ator.system;
  const velocidade = valorDe(cabecalho, ROTULOS.velocidade);
  if (velocidade) s.attributes.movement = lerDeslocamento(velocidade);
  const pv = valorDe(cabecalho, ROTULOS.pv)?.match(/^\d+/)?.[0];
  if (pv) s.attributes.hp = { max: Number(pv) }; // só alimenta a sugestão de papel; o PV final vem da tabela
  const sentidos = valorDe(cabecalho, ROTULOS.sentidos);
  if (sentidos) s.attributes.senses = lerSentidos(sentidos, avisos);
  const idiomas = valorDe(cabecalho, ROTULOS.idiomas);
  if (idiomas) s.traits.languages = lerIdiomas(idiomas);
  if (valorDe(cabecalho, ROTULOS.pericias)) s.skills = { lidas: { value: 1 } }; // só para o relatório "perícias treinadas"
  const salvaguardas = valorDe(cabecalho, ROTULOS.salvaguardas);
  for (const sigla of semAcento(salvaguardas ?? '').match(/\b[a-z]{3}\b/g) ?? []) {
    const chave = ATRIBUTOS.find(([k, pt]) => k === sigla || pt === sigla)?.[0];
    if (chave) s.abilities[chave].proficient = 1;
  }
  for (const campo of ['dr', 'di', 'dv', 'ci']) {
    const valor = valorDe(cabecalho, ROTULOS[campo]);
    if (!valor) continue;
    const { dano, condicoes, mgc } = lerLista(valor);
    if (campo === 'ci') s.traits.ci = { value: condicoes, custom: '' };
    else {
      s.traits[campo] = { value: dano, bypasses: mgc ? ['mgc'] : [], custom: '' };
      if (campo === 'di' && condicoes.length) s.traits.ci = { value: condicoes, custom: '' };
    }
    if (!dano.length && !condicoes.length && !/^-*$/.test(valor)) avisos.push(`Texto não reconhecido em ${campo}: ${valor}`);
  }

  // entradas por seção
  let secao = 'traco';
  const entradas = [];
  for (const linha of corpo) {
    const nova = secaoDe(linha);
    if (nova) { secao = nova; if (nova === 'covil') s.resources.lair = { value: true }; continue; }
    if (IGNORAR.test(semAcento(linha))) continue;
    const entrada = separarNome(linha);
    if (entrada) { entradas.push({ ...entrada, secao }); continue; }
    const anterior = entradas.at(-1);
    if (anterior?.secao === secao) { anterior.texto += `\n${linha}`; continue; }
    const n = /(\d+)\s+(?:legendary actions|acoes lendarias)/.exec(semAcento(linha));
    if (secao === 'lendaria' && n) { s.resources.legact = { max: Number(n[1]) }; continue; }
    if (secao === 'lendaria' || secao === 'covil') continue; // introdução da seção
    avisos.push(`Texto sem nome de habilidade ignorado: "${linha.slice(0, 50)}".`);
  }
  if (entradas.some((e) => e.secao === 'lendaria') && !s.resources.legact) {
    s.resources.legact = { max: 3 };
    avisos.push('Ações lendárias sem a quantidade no texto: assumidas 3.');
  }
  ator.items = entradas.map((e) => montarItem(e, ator));
  return { ok: true, ator, avisos };
}
