// v2: leitura do JSON exportado de um ator de D&D 5e (sistema dnd5e 3.x a 5.x). Função pura: devolve os
// campos do formulário e um relatório do que foi importado, do que pede revisão e do que ficou de fora.
import {
  modificadorAtributo, pesParaMetros, mapearTamanho, mapearTipo, mapearTipoDano, ndDeReferencia, parseCR, trocarDCporCD,
} from './mapeamentos.js';
import { sugerirPapel } from './papel.js';

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
export function limparTexto5e(html) {
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
    .replace(/@\w+\[([^\]]*)\](?:\{([^}]*)\})?/g, (_, partes, rotulo) => {
      const p = partes.split('|');
      return rotulo ?? (p[2] || p[0]);
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

// "one Bite attack and two Tentacle attacks" → { Bite: 1, Tentacle: 2 }. Sem correspondência: null.
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

// Idiomas conhecidos viram chaves; o resto (e a telepatia) vai como nota para a biografia.
function lerIdiomas(languages) {
  const todos = (languages?.value ?? []).map(semPrefixo);
  const idiomas = todos.filter((k) => IDIOMAS[k]).map((k) => IDIOMAS[k]);
  const sobras = [
    ...todos.filter((k) => !IDIOMAS[k]),
    languages?.custom,
    languages?.communication?.telepathy?.value ? `telepatia ${languages.communication.telepathy.value} ${languages.communication.telepathy.units ?? 'ft'}` : null,
  ].filter(Boolean).join('; ');
  return { idiomas, nota: sobras ? `Idiomas: ${sobras}` : null };
}

// Resistências, imunidades e vulnerabilidades a dano viram uma linha de texto (a 5e reduz à metade; o T20 usa RD).
function lerResistencias(traits) {
  const parte = (traco, rotulo) => {
    const tipos = (traco?.value ?? []).map(rotuloDano);
    const naoMagico = (traco?.bypasses ?? []).includes('mgc') ? ' (ataques não mágicos)' : '';
    return [tipos.length ? `${rotulo} ${tipos.join(', ')}${naoMagico}` : null, traco?.custom].filter(Boolean);
  };
  return [...parte(traits?.di, 'imunidade a'), ...parte(traits?.dr, 'resistência a'), ...parte(traits?.dv, 'vulnerabilidade a')].join('; ');
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
  if (!andar) revisar('Sem deslocamento terrestre: assumido 9 m.');
  else {
    const emMetros = movimento.units === 'm';
    deslocamento = emMetros ? Math.round(andar / 1.5) * 1.5 : pesParaMetros(andar);
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
    const qtdEncontrada = multiataque ? quantidadeNoMultiataque(textoMulti, item.name) : null;
    if (multiataque && qtdEncontrada === null) semQuantidade.push(item.name);
    const ataque = {
      nome: item.name,
      tipo: distanciaDe(item) ? 'ad' : 'cac',
      dano: dano.chave,
      qtd: qtdEncontrada ?? 1,
      qtd5e: qtdEncontrada ?? 1, // o mestre escolhe no diálogo se segue o multiataque da 5e ou não
      descricao: trocarDCporCD(limparTexto5e(item.system?.description?.value)),
    };
    (dano.revisar ? revisar : ok)(`Ataque ${ataque.nome}: ${ataque.tipo === 'ad' ? 'à distância' : 'corpo a corpo'}, dano ${ataque.dano}${dano.revisar ? ' (aproximação)' : ''}, ×${ataque.qtd}`);
    return ataque;
  });
  if (!ataques.length) revisar('Nenhum ataque encontrado: adicione os ataques à mão.');
  if (semQuantidade.length) revisar(`Multiataque não cita: ${semQuantidade.join(', ')} (assumido 1 ataque cada).`);

  // papel sugerido
  let pvSolo;
  try { pvSolo = ndReferencia && pvSoloNoND ? pvSoloNoND(ndReferencia) : undefined; } catch { pvSolo = undefined; }
  const sugestao = sugerirPapel({
    acoesLendarias: Number(s.resources?.legact?.max) > 0,
    resistenciaLendaria: Number(s.resources?.legres?.max) > 0,
    acoesCovil: Boolean(s.resources?.lair?.value),
    conjurador: itens.some((i) => i.type === 'spell') || Boolean(s.attributes?.spellcasting),
    pv: Number(s.attributes?.hp?.max), pvSoloNoND: pvSolo,
  });
  revisar(`Papel sugerido: ${sugestao.papel} (${MOTIVOS_PAPEL[sugestao.motivo]})${sugestao.chefeFinalSugerido ? '; Chefe Final marcado' : ''}.`);

  // habilidades (inclusive o Multiataque) viram poderes só com o texto; contam para os poderes do patamar no Ajustar ND
  const habilidades = itens.filter((i) => i.type === 'feat' && i.name && !ehAtaque(i))
    .map((i) => ({ nome: i.name, texto: trocarDCporCD(limparTexto5e(i.system?.description?.value)) }));
  if (habilidades.length) revisar(`${habilidades.length} habilidade(s) viram poderes só com o texto: ${habilidades.map((h) => h.nome).join(', ')}.`);

  // sentidos, idiomas, resistências e imunidades a condição
  const traits = s.traits ?? {};
  const sentidos = lerSentidos(s.attributes?.senses);
  if (sentidos.value.length) ok(`Sentidos: ${sentidos.value.join(', ')}`);
  if (sentidos.custom) revisar(`Sentidos sem equivalente (texto em Sentidos): ${sentidos.custom}.`);
  const { idiomas, nota } = lerIdiomas(traits.languages);
  if (idiomas.length) ok(`Idiomas: ${idiomas.join(', ')}`);
  if (nota) revisar(`${nota} (vai para a biografia).`);
  const resistencias = lerResistencias(traits);
  if (resistencias) revisar(`Resistências em texto (converta em RD se quiser): ${resistencias}.`);
  const imunidadesCondicao = lerCondicoes(traits.ci);
  if (imunidadesCondicao.value.length) ok(`Imunidade a condições: ${imunidadesCondicao.value.join(', ')}`);
  if (imunidadesCondicao.custom) revisar(`Condições sem equivalente (texto em Imunidades): ${imunidadesCondicao.custom}.`);

  // o que não entra
  const fora = [];
  if (Object.values(s.skills ?? {}).some((p) => p.value > 0)) fora.push('perícias treinadas');
  if (Object.values(s.abilities).some((a) => a.proficient)) fora.push('testes de resistência proficientes');
  if (['fly', 'swim', 'climb', 'burrow'].some((k) => Number(movimento[k]) > 0)) fora.push('deslocamentos especiais');
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
      nome: ator.name ?? '', cr, tamanho: tamanho.codigo, tipo: tipo.codigo, deslocamento, atributos,
      ataques, modoAtaques: '5e', habilidades, papel: sugestao.papel, chefeFinal: sugestao.chefeFinalSugerido,
      sentidos, idiomas, resistencias, imunidadesCondicao, notas: nota ? [nota] : [],
    },
    relatorio,
  };
}
