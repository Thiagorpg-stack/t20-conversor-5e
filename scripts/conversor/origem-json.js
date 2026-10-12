// v2: leitura do JSON exportado de um ator de D&D 5e (sistema dnd5e 3.x a 5.x). Função pura: devolve os
// campos do formulário e um relatório do que foi importado, do que pede revisão e do que ficou de fora.
import {
  modificadorAtributo, pesParaMetros, mapearTamanho, mapearTipo, mapearTipoDano, ndDeReferencia, parseCR, trocarDCporCD,
  trocarTesteResistencia, termosT20, periciaDoAtributo5e, ehAtributoPadraoDeVontade, NOME_DA_PERICIA,
} from './mapeamentos.js';
import { sugerirPapel } from './papel.js';
import { mediaFormula } from './dano.js';

// chave do formulário → chave do dnd5e
const ATRIBUTOS_5E = { for: 'str', des: 'dex', con: 'con', int: 'int', sab: 'wis', car: 'cha' };
const FRACOES_CR = { 0.125: '1/8', 0.25: '1/4', 0.5: '1/2' };
const QUANTIDADES = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const MOTIVOS_PAPEL = {
  lendaria: 'tem ações lendárias, resistência lendária ou ações de covil',
  conjuracao: 'conjura magias',
  'pv-baixo': 'PV menores que a metade do PV de um Solo no ND de referência',
  padrao: 'nenhuma regra de Lacaio ou Especial se aplicou',
};
// Chaves do sistema Tormenta20 (CONFIG.T20.senses, .idiomas e os ids das condições).
const SENTIDOS = { darkvision: 'escuro', blindsight: 'cegas' }; // tremorsense e truesight não existem: vão como texto
const IDIOMAS = {
  common: 'comum', dwarvish: 'anao', elvish: 'elfico', goblin: 'goblin', halfling: 'hynne', sylvan: 'silvestre',
  abyssal: 'abissal', aquan: 'aquan', auran: 'auran', celestial: 'celestial', draconic: 'draconico', giant: 'gigante',
  gnoll: 'gnoll', ignan: 'ignan', infernal: 'infernal', orc: 'orc', terran: 'terran',
};
const CONDICOES = {
  blinded: 'cego', charmed: 'enfeiticado', deafened: 'surdo', diseased: 'doente', exhaustion: 'exausto',
  frightened: 'apavorado', grappled: 'agarrado', paralyzed: 'paralisado', petrified: 'petrificado',
  poisoned: 'envenenado', prone: 'caido', restrained: 'enredado', stunned: 'atordoado', unconscious: 'inconsciente',
};
const ROTULO_DANO = {
  acido: 'ácido', corte: 'corte', eletricidade: 'eletricidade', essencia: 'essência', fogo: 'fogo', frio: 'frio',
  impacto: 'impacto', luz: 'luz', psiquico: 'psíquico', perfuracao: 'perfuração', trevas: 'trevas',
};
const ENTIDADES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

// Texto das descrições do dnd5e: tira HTML, enriquecedores ([[/r 1d20+6]]{+6}, @tag[...], &Reference[...]) e entidades.
// `nomesPorId` (_id → nome dos itens do ator) resolve os links relativos sem rótulo (@UUID[.id]) para o nome do item.
export function limparTexto5e(html, nomesPorId = {}) {
  return String(html ?? '')
    .replace(/<\/(?:p|li|div|tr)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTIDADES[m])
    .replace(/\[\[\/(?:r|roll|damage|heal)\s+([^\]]*?)\]\](?:\{([^}]*)\})?/gi, (_, formula, rotulo) => {
      if (rotulo) return rotulo;
      // "2d8 + 3 type=piercing" → "2d8 + 3 Piercing", como o Foundry mostra o enriquecedor
      const m = /^(.*\d)\s+(?:type=)?([a-z][a-z|,]*)$/i.exec(formula.replace(/\s+average\b/gi, '').trim());
      return m ? `${m[1]} ${m[2].split(/[|,]/).map((t) => t[0].toUpperCase() + t.slice(1).toLowerCase()).join('/')}` : formula.replace(/\s+average\b/gi, '').trim();
    })
    .replace(/&Reference\[(?:[^=\]|]+=)?([^\]|]+)[^\]]*\]/g, '$1')
    .replace(/\[\[\/save\s+([^\]]*)\]\]/gi, (_, args) => {
      const pericia = periciaDoAtributo5e(/ability=(\w+)/i.exec(args)?.[1]);
      const cd = /dc=(\d+)/i.exec(args)?.[1];
      return `${pericia ? NOME_DA_PERICIA[pericia] : 'teste'}${cd ? ` CD ${cd}` : ''}`;
    })
    .replace(/@\w+\[((?:[^[\]]|\[[^\]]*\])*)\](?:\{([^}]*)\})?/g, (_, partes, rotulo) => {
      const p = partes.split('|');
      return rotulo ?? ((p[0].startsWith('.') && nomesPorId[p[0].slice(1)]) || p[2] || p[0]);
    })
    .replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}

const atividadesDe = (item) => Object.values(item.system?.activities ?? {});

// Ataque = item com atividade de ataque (dnd5e 4+) ou actionType de ataque (dnd5e 3 e anteriores).
const ehAtaque = (item) => ['weapon', 'feat'].includes(item.type) && (
  atividadesDe(item).some((a) => a.type === 'attack') || ['mwak', 'rwak'].includes(item.system?.actionType));
const ehMultiataque = (item) => item.system?.identifier === 'multiattack' || /^multiattack$/i.test(item.name);

function distanciaDe(item) {
  const atividade = atividadesDe(item).find((a) => a.type === 'attack');
  return atividade ? atividade.attack?.type?.value === 'ranged' : item.system?.actionType === 'rwak';
}

function tipoDanoDe(item) {
  for (const atividade of atividadesDe(item)) {
    const tipo = atividade.damage?.parts?.[0]?.types?.[0];
    if (tipo) return tipo;
  }
  return item.system?.damage?.base?.types?.[0] ?? item.system?.damage?.parts?.[0]?.[1];
}

// Dano adicional do golpe (as partes de dano depois da principal, como o 1d10 elétrico do Rend) e a fração dele no
// dano total (médias; "@mod" vira o modificador do atributo do ataque). O Ajustar ND recalcula só a parte principal.
function danoExtraDe(item, modDe) {
  const atividade = atividadesDe(item).find((a) => a.type === 'attack' && a.damage?.parts?.length);
  const base = item.system?.damage?.base;
  const partes = [...(base?.number ? [base] : []), ...(atividade ? atividade.damage.parts : (item.system?.damage?.parts ?? []))];
  const habilidade = atividade?.attack?.ability;
  const mod = modDe(Object.values(ATRIBUTOS_5E).includes(habilidade) ? habilidade : (distanciaDe(item) ? 'dex' : 'str'));
  const lidas = partes.map((p) => parteDeDano(p, mod));
  const danoExtra = lidas.slice(1).filter((p) => p.formula)
    .map((p) => ({ formula: p.formula, tipo: mapearTipoDano(p.tipo ?? '').chave }));
  const principal = mediaFormula(lidas[0]?.formula);
  const extra = danoExtra.reduce((s, d) => s + mediaFormula(d.formula), 0);
  return { danoExtra, proporcaoExtra: principal + extra > 0 ? Math.round(extra / (principal + extra) * 1000) / 1000 : 0 };
}

// "one Bite attack and two Tentacle attacks → { Bite: 1, Tentacle: 2 }. Sem correspondência: null.
export function quantidadeNoMultiataque(texto, nome) {
  const escapado = String(nome).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`\\b(one|two|three|four|five|six|seven|eight|nine|ten|\\d+)\\s+(?:(?:melee|ranged|weapon)\\s+)?${escapado}s?\\b`, 'i').exec(texto);
  if (!m) return null;
  return QUANTIDADES[m[1].toLowerCase()] ?? Number(m[1]);
}

// dnd5e 5.x grava "standard:common"; antes era só "common".
const semPrefixo = (chave) => String(chave).split(':').pop();

// Tipo de dano em português; aproximações (trovejante, energia, veneno) ficam com o nome original.
const rotuloDano = (tipo) => {
  const m = mapearTipoDano(tipo);
  return m.revisar ? tipo : ROTULO_DANO[m.chave];
};

// Sentidos: darkvision/blindsight viram chaves do sistema; o resto e o texto livre vão em `custom`.
function lerSentidos(senses) {
  const faixas = senses?.ranges ?? senses ?? {};
  const value = Object.entries(SENTIDOS).filter(([k5e]) => Number(faixas[k5e]) > 0).map(([, chave]) => chave);
  const custom = [
    ...['tremorsense', 'truesight'].filter((k) => Number(faixas[k]) > 0).map((k) => `${k} ${faixas[k]} pés`),
    senses?.special,
  ].filter(Boolean).join('; ');
  return { value, custom };
}

// "120 ft." → "36 m" (as distâncias do T20 são em metros).
const pesEmMetros = (texto) => String(texto ?? '').replace(/(\d+)\s*(?:ft\.?|feet|foot)/gi, (_, n) => `${pesParaMetros(n)} m`);

// Idiomas conhecidos viram chaves; o resto (idiomas próprios e a telepatia) vai para o texto livre dos idiomas.
function lerIdiomas(languages) {
  const todos = (languages?.value ?? []).map(semPrefixo);
  const idiomas = todos.filter((k) => IDIOMAS[k]).map((k) => IDIOMAS[k]);
  const telepatia = languages?.communication?.telepathy;
  const custom = [
    ...todos.filter((k) => !IDIOMAS[k]),
    pesEmMetros(languages?.custom),
    telepatia?.value ? `telepatia ${telepatia.units === 'm' ? telepatia.value : pesParaMetros(telepatia.value)} m` : null,
  ].filter(Boolean).join('; ');
  return { idiomas, custom };
}

const TIPOS_FISICOS = ['corte', 'impacto', 'perfuracao'];

// Só tipos com equivalente exato viram chave do sistema; aproximações (trovejante, veneno...) ficariam erradas
// como resistência de verdade (veneno → "dano" valeria para tudo) e ficam só no texto.
const chavesDeDano = (traco) => (traco?.value ?? []).flatMap((tipo) => {
  if (tipo === 'physical') return TIPOS_FISICOS;
  const m = mapearTipoDano(tipo);
  return m.revisar ? [] : [m.chave];
});

// Resistências, imunidades e vulnerabilidades a dano: o texto completo (para a ficha e para revisão) e as chaves
// exatas (`reducao` é a resistência da 5e, que o T20 trata como RD por tipo; o valor sai do ND na criação do ator).
function lerResistencias(traits) {
  const parte = (traco, rotulo) => {
    const tipos = (traco?.value ?? []).map(rotuloDano);
    const naoMagico = (traco?.bypasses ?? []).includes('mgc') ? ' (ataques não mágicos)' : '';
    return [tipos.length ? `${rotulo} ${tipos.join(', ')}${naoMagico}` : null, traco?.custom].filter(Boolean);
  };
  const texto = [...parte(traits?.di, 'imunidade a'), ...parte(traits?.dr, 'resistência a'), ...parte(traits?.dv, 'vulnerabilidade a')].join('; ');
  const dano = {
    imunidade: chavesDeDano(traits?.di), vulnerabilidade: chavesDeDano(traits?.dv), reducao: chavesDeDano(traits?.dr),
  };
  const soTexto = ['di', 'dr', 'dv'].flatMap((k) => (traits?.[k]?.value ?? []).filter((tipo) => tipo !== 'physical' && mapearTipoDano(tipo).revisar));
  return { texto, dano, soTexto };
}

// Tipo de ação do T20 (chaves de CONFIG.T20.abilityActivationTypes) a partir da ativação da 5e. '' = sem ativação (passivo).
const EXECUCAO = { action: 'action', bonus: 'move', reaction: 'reaction', legendary: 'special', mythic: 'special', lair: 'special', special: 'special', minute: 'minute', hour: 'hour', day: 'day' };
const execucaoDe = (item) => {
  const ativacao = atividadesDe(item).map((a) => a.activation?.type).find(Boolean) ?? item.system?.activation?.type;
  return EXECUCAO[ativacao] ?? '';
};

// Descrição da 5e em texto T20: sem HTML, "DC" vira "CD" e "Constitution Saving Throw" vira "Fortitude".
const textoT20 = (html, nomesPorId) => termosT20(trocarDCporCD(trocarTesteResistencia(limparTexto5e(html, nomesPorId))));

const PERIODOS = { day: 'dia', lr: 'descanso longo', sr: 'descanso curto', dawn: 'amanhecer', dusk: 'anoitecer' };

// Usos limitados ("3/dia") ou recarga ("Recarga: ação de movimento") do item: a 5e guarda em `uses`/`recharge`, fora do
// texto. `max` > 0 só nos usos limitados: viram um contador de recurso da ficha. A resistência lendária não tem `uses`:
// consome `resources.legres`, cujo máximo são os usos por dia.
function usosDe(item, recursos = {}) {
  if (atividadesDe(item).some((a) => a.consumption?.targets?.some((c) => c.target === 'resources.legres.value')) && recursos.legres?.max > 0) {
    return { texto: `${recursos.legres.max}/dia`, max: Number(recursos.legres.max) };
  }
  const uses = item.system?.uses ?? {};
  const recuperacao = uses.recovery ?? [];
  // A recarga por dado (5–6) da 5e vira o padrão do T20: recarregar gastando uma ação de movimento.
  if (recuperacao.some((r) => r.period === 'recharge') || Number(item.system?.recharge?.value)) return { texto: 'Recarga: ação de movimento', max: 0 };
  const max = Number(uses.max);
  const periodo = PERIODOS[recuperacao[0]?.period ?? uses.per];
  return max > 0 && periodo ? { texto: `${max}/${periodo}`, max } : { texto: '', max: 0 };
}

const FORMULA_DANO = /^\d*d\d+(?:[+-]\d+)*$/;

// Fórmula de dano do T20 ("3d8+3") ou null: tira as variáveis (@mod) e o que sobra de operador; o que não
// vira dado e número fica de fora.
function formulaDeDano(formula) {
  const limpa = String(formula ?? '').replace(/@[\w.]+/g, '').replace(/\s+/g, '').replace(/^\++|[+\-*/]+$/g, '');
  return FORMULA_DANO.test(limpa) ? limpa : null;
}

// dnd5e 4+: parte = { number, denomination, bonus, types[], custom }; antes: [fórmula, tipo].
// `mod` resolve o bônus "@mod" (modificador do atributo do ataque) quando quem chama precisa da média real.
function parteDeDano(parte, mod) {
  if (Array.isArray(parte)) return { formula: formulaDeDano(parte[0]), original: parte[0], tipo: parte[1] };
  const tipo = parte.types?.[0];
  if (parte.custom?.enabled) return { formula: formulaDeDano(parte.custom.formula), original: parte.custom.formula, tipo };
  if (!parte.number || !parte.denomination) return { formula: null, original: '', tipo };
  const bruto = String(parte.bonus ?? '').trim();
  const bonus = /^[+-]?\d+$/.test(bruto) ? Number(bruto) : (bruto === '@mod' && mod !== undefined ? mod : 0);
  return { formula: `${parte.number}d${parte.denomination}${bonus > 0 ? `+${bonus}` : bonus < 0 ? bonus : ''}`, tipo };
}

// Dano e teste de resistência de um poder (feat sem ataque). Sem dano numérico devolve null.
// `efeito` é o padrão sugerido: teste de resistência, condição ou área; o mestre confere.
function lerDanoPoder(item, htmlDescricao) {
  const atividades = atividadesDe(item);
  const comDano = atividades.find((a) => a.damage?.parts?.length);
  const brutas = comDano ? comDano.damage.parts : (item.system?.damage?.parts ?? []);
  const partes = brutas.map(parteDeDano);
  const dano = partes.filter((p) => p.formula).map((p) => ({ formula: p.formula, tipo: mapearTipoDano(p.tipo ?? '').chave }));
  const invalidas = partes.filter((p) => !p.formula && p.original).map((p) => p.original);
  if (!dano.length) return { dano: null, invalidas };

  const comTeste = atividades.find((a) => a.save?.ability?.[0]);
  const atributo = comTeste ? comTeste.save.ability[0] : item.system?.save?.ability;
  const pericia = periciaDoAtributo5e(atributo);
  const onSave = comTeste?.damage?.onSave || comDano?.damage?.onSave;
  const metade = onSave ? onSave === 'half' : /half (?:as much )?damage/i.test(limparTexto5e(htmlDescricao));
  const condicaoOuArea = /&(?:amp;)?Reference\[condition=|\b(?:cone|sphere|cube|cylinder|emanation)\b/i.test(htmlDescricao ?? '');
  return {
    dano, invalidas,
    resistencia: pericia ? { pericia, metade } : null,
    assumidoVontade: pericia ? ehAtributoPadraoDeVontade(atributo) : false,
    efeito: Boolean(pericia) || condicaoOuArea,
  };
}

function lerCondicoes(ci) {
  const todas = (ci?.value ?? []).map(semPrefixo);
  return {
    value: todas.filter((k) => CONDICOES[k]).map((k) => CONDICOES[k]),
    custom: [...todas.filter((k) => !CONDICOES[k]), ci?.custom].filter(Boolean).join('; '),
  };
}

// `pvSoloNoND(nd)` (opcional) devolve o PV da linha Solo da tabela no ND dado; sem ele a regra de Lacaio não roda.
export function lerAtor5e(ator, { pvSoloNoND } = {}) {
  const s = ator?.system;
  if (ator?.type !== 'npc' || !s?.abilities) return { ok: false, erro: 'T20C5E.ErroImportarNpc' };
  const itens = ator.items ?? [];
  const relatorio = [];
  const ok = (texto) => relatorio.push({ tipo: 'ok', texto });
  const revisar = (texto) => relatorio.push({ tipo: 'revisar', texto });

  // CR e ND de referência
  const crNumero = parseCR(s.details?.cr ?? '');
  const cr = Number.isNaN(crNumero) ? '' : (FRACOES_CR[crNumero] ?? String(crNumero));
  let ndReferencia = null;
  if (cr === '') revisar('O arquivo não tem CR: informe o CR no formulário.');
  else {
    try { ndReferencia = ndDeReferencia(crNumero); ok(`CR ${cr} (ND de referência ${ndReferencia})`); } catch { revisar(`CR ${cr} fora da tabela.`); }
  }

  // tamanho e tipo
  const tamanho = mapearTamanho(s.traits?.size ?? '');
  (tamanho.revisar ? revisar : ok)(`Tamanho ${s.traits?.size ?? '?'} → ${tamanho.codigo}`);
  const tipo = mapearTipo(s.details?.type?.value ?? '');
  (tipo.revisar ? revisar : ok)(`Tipo ${s.details?.type?.value ?? '?'} → ${tipo.codigo}${tipo.revisar ? ' (aproximação)' : ''}`);

  // deslocamento
  const movimento = s.attributes?.movement ?? {};
  const andar = Number(movimento.walk) || 0;
  let deslocamento = 9;
  const emMetros = movimento.units === 'm';
  const paraMetros = (v) => (emMetros ? Math.round(v / 1.5) * 1.5 : pesParaMetros(v));
  const deslocamentosExtra = {};
  for (const [k, rotulo] of [['fly', 'Voo'], ['swim', 'Natação'], ['climb', 'Escalada'], ['burrow', 'Escavação']]) {
    const v = Number(movimento[k]) || 0;
    if (v > 0) { deslocamentosExtra[k] = paraMetros(v); ok(`${rotulo} ${v} ${emMetros ? 'm' : 'pés'} → ${deslocamentosExtra[k]} m`); }
  }
  if (!andar) revisar('Sem deslocamento terrestre: assumido 9 m.');
  else {
    deslocamento = paraMetros(andar);
    ok(`Deslocamento ${andar} ${emMetros ? 'm' : 'pés'} → ${deslocamento} m`);
  }

  // atributos (T20 guarda o modificador)
  const atributos = Object.fromEntries(Object.entries(ATRIBUTOS_5E).map(([chave, chave5e]) => (
    [chave, modificadorAtributo(s.abilities[chave5e]?.value ?? 10)])));
  ok(`Atributos (modificadores): ${Object.entries(atributos).map(([k, v]) => `${k.toUpperCase()} ${v >= 0 ? '+' : ''}${v}`).join(', ')}`);

  // ataques
  const multiataque = itens.find(ehMultiataque);
  const textoMulti = limparTexto5e(multiataque?.system?.description?.value);
  const semQuantidade = [];
  const ataques = itens.filter(ehAtaque).map((item) => {
    const dano = mapearTipoDano(tipoDanoDe(item) ?? '');
    const extras = danoExtraDe(item, (ab) => modificadorAtributo(s.abilities[ab]?.value ?? 10));
    const qtdEncontrada = multiataque ? quantidadeNoMultiataque(textoMulti, item.name) : null;
    if (multiataque && qtdEncontrada === null) semQuantidade.push(item.name);
    const ataque = {
      nome: item.name,
      tipo: distanciaDe(item) ? 'ad' : 'cac',
      dano: dano.chave,
      qtd: qtdEncontrada ?? 1,
      qtd5e: qtdEncontrada ?? 1, // o mestre escolhe no diálogo se segue o multiataque da 5e ou não
      descricao: textoT20(item.system?.description?.value),
      ...extras,
      extraNoBalanceamento: true,
    };
    (dano.revisar ? revisar : ok)(`Ataque ${ataque.nome}: ${ataque.tipo === 'ad' ? 'à distância' : 'corpo a corpo'}, dano ${ataque.dano}${ataque.danoExtra.map((d) => ` + ${d.formula} ${d.tipo}`).join('')}${ataque.danoExtra.length ? ` (${Math.round(ataque.proporcaoExtra * 100)}% do golpe)` : ''}${dano.revisar ? ' (aproximação)' : ''}, ×${ataque.qtd}`);
    return ataque;
  });
  if (!ataques.length) revisar('Nenhum ataque encontrado: adicione os ataques à mão.');
  if (semQuantidade.length) revisar(`Multiataque não cita: ${semQuantidade.join(', ')} (assumido 1 ataque cada).`);

  // papel sugerido
  let pvSolo;
  try { pvSolo = ndReferencia && pvSoloNoND ? pvSoloNoND(ndReferencia) : undefined; } catch { pvSolo = undefined; }
  const habilidadeDeConjuracao = { int: 'int', wis: 'sab', cha: 'car' }[s.attributes?.spellcasting];
  const conjurador = itens.some((i) => i.type === 'spell') || Boolean(s.attributes?.spellcasting);
  const sugestao = sugerirPapel({
    acoesLendarias: Number(s.resources?.legact?.max) > 0,
    resistenciaLendaria: Number(s.resources?.legres?.max) > 0,
    acoesCovil: Boolean(s.resources?.lair?.value),
    conjurador,
    pv: Number(s.attributes?.hp?.max), pvSoloNoND: pvSolo,
  });
  revisar(`Papel sugerido: ${sugestao.papel} (${MOTIVOS_PAPEL[sugestao.motivo]})${sugestao.chefeFinalSugerido ? '; Chefe Final marcado' : ''}.`);

  if (conjurador) ok('Conjurador: PM = 5 × ND (a conjuração segue o atributo da 5e)');

  // habilidades (inclusive o Multiataque) viram poderes só com o texto; contam para os poderes do patamar no Ajustar ND
  const nomesPorId = Object.fromEntries(itens.filter((i) => i._id).map((i) => [i._id, i.name]));
  const habilidades = itens.filter((i) => i.type === 'feat' && i.name && !ehAtaque(i)).map((i) => {
    const usos = usosDe(i, s.resources);
    const texto = textoT20(i.system?.description?.value, nomesPorId);
    const habilidade = {
      nome: i.name, texto: usos.texto ? `(${usos.texto}) ${texto}` : texto, execucao: execucaoDe(i),
      ...(usos.max > 0 && { usos: usos.max }),
    };
    const poder = lerDanoPoder(i, i.system?.description?.value);
    if (poder.invalidas.length) revisar(`Poder ${i.name}: dano sem fórmula numérica (${poder.invalidas.join(', ')}); ajuste o dano à mão.`);
    if (!poder.dano) return habilidade;
    ok(`Poder ${i.name}: dano ${poder.dano.map((d) => `${d.formula} ${d.tipo}`).join(' + ')}, `
      + `${poder.resistencia ? `${NOME_DA_PERICIA[poder.resistencia.pericia]}${poder.resistencia.metade ? ' (metade)' : ''}` : 'sem teste'}, `
      + `${poder.efeito ? 'com' : 'sem'} efeito`);
    if (poder.assumidoVontade) revisar(`Poder ${i.name}: teste de Carisma ou Inteligência virou Vontade (padrão assumido).`);
    return {
      ...habilidade, dano: poder.dano, ...(poder.resistencia && { resistencia: poder.resistencia }),
      efeito: poder.efeito, ajustarDano: true,
    };
  });
  if (habilidades.length) revisar(`${habilidades.length} habilidade(s) viram poderes só com o texto: ${habilidades.map((h) => h.nome).join(', ')}.`);

  // sentidos, idiomas, resistências e imunidades a condição
  const traits = s.traits ?? {};
  const sentidos = lerSentidos(s.attributes?.senses);
  if (sentidos.value.length) ok(`Sentidos: ${sentidos.value.join(', ')}`);
  if (sentidos.custom) revisar(`Sentidos sem equivalente (texto em Sentidos): ${sentidos.custom}.`);
  const { idiomas, custom: idiomasCustom } = lerIdiomas(traits.languages);
  if (idiomas.length) ok(`Idiomas: ${idiomas.join(', ')}`);
  if (idiomasCustom) revisar(`Idiomas sem equivalente (texto em Idiomas): ${idiomasCustom}.`);
  const { texto: resistencias, dano: resistenciasDano, soTexto } = lerResistencias(traits);
  const estruturadas = [
    resistenciasDano.imunidade.length ? `imunidade a ${resistenciasDano.imunidade.join(', ')}` : '',
    resistenciasDano.vulnerabilidade.length ? `vulnerabilidade a ${resistenciasDano.vulnerabilidade.join(', ')}` : '',
    resistenciasDano.reducao.length ? `RD por tipo (valor pelo patamar do ND) em ${resistenciasDano.reducao.join(', ')}` : '',
  ].filter(Boolean);
  if (estruturadas.length) ok(`Resistências na ficha: ${estruturadas.join('; ')}`);
  if (resistencias) revisar(`Resistências 5e (texto em Resistências; a 5e reduz à metade, o T20 usa RD): ${resistencias}${soTexto.length ? `. Só no texto, sem equivalente exato: ${soTexto.join(', ')}` : ''}.`);
  const imunidadesCondicao = lerCondicoes(traits.ci);
  if (imunidadesCondicao.value.length) ok(`Imunidade a condições: ${imunidadesCondicao.value.join(', ')}`);
  if (imunidadesCondicao.custom) revisar(`Condições sem equivalente (texto em Imunidades): ${imunidadesCondicao.custom}.`);

  // o que não entra
  const fora = [];
  if (Object.values(s.skills ?? {}).some((p) => p.value > 0)) fora.push('perícias treinadas');
  if (Object.values(s.abilities).some((a) => a.proficient)) fora.push('testes de resistência proficientes');
  const magias = itens.filter((i) => i.type === 'spell').length;
  if (magias) fora.push(`${magias} magia(s)`);
  if (itens.some((i) => !['weapon', 'feat', 'spell'].includes(i.type))) fora.push('equipamentos');
  if (fora.length) relatorio.push({ tipo: 'ignorado', texto: fora.join(', ') });

  // Caminhos da imagem e do token como vieram (URL ou arquivo do mundo de origem); ícones padrão do Foundry não contam.
  // Quem chama confere se abrem neste mundo.
  const util = (src) => (src && !String(src).startsWith('icons/svg/') ? String(src) : '');
  const imagens = { img: util(ator.img), token: util(ator.prototypeToken?.texture?.src) };

  return {
    ok: true,
    imagens,
    estado: {
      nome: ator.name ?? '', cr, tamanho: tamanho.codigo, tipo: tipo.codigo, deslocamento, deslocamentosExtra, atributos,
      ataques, modoAtaques: '5e', habilidades, papel: sugestao.papel, chefeFinal: sugestao.chefeFinalSugerido,
      sentidos, idiomas, idiomasCustom, resistencias, resistenciasDano, imunidadesCondicao,
      conjurador, conjuracao: habilidadeDeConjuracao ?? 'int',
    },
    relatorio,
  };
}
