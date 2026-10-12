// v1: entrada por CR digitado pelo mestre. Valida o formulário e devolve a criatura neutra.
// Função pura: os erros voltam como códigos (nome, cr, papel...), que o diálogo traduz.
import { parseCR, CODIGOS_TAMANHO, CODIGOS_TIPO, CHAVES_DANO } from './mapeamentos.js';
import { RITMOS, xpDoCR } from './ritmo.js';

export const ATRIBUTOS = ['for', 'des', 'con', 'int', 'sab', 'car'];
export const PAPEIS_TABELA = ['solo', 'lacaio', 'especial'];
export const TIPOS_ATAQUE = ['cac', 'ad'];

const inteiro = (valor, padrao = 0) => {
  const n = parseInt(valor, 10);
  return Number.isNaN(n) ? padrao : n;
};

export const MODOS_ATAQUES = ['5e', 't20', 'limite', 'manual'];

// Tipos de ação de um poder (chaves de CONFIG.T20.abilityActivationTypes); '' = sem ativação (passivo).
export const EXECUCOES = ['', 'action', 'move', 'full', 'reaction', 'free', 'special'];

// Perícias do teste de resistência de um poder (o alvo rola contra a CD) e fórmula de dano aceita ("3d8+3").
export const PERICIAS_RESISTENCIA = ['atle', 'refl', 'fort', 'vont'];
const FORMULA_DANO = /^\d*d\d+(?:[+-]\d+)*$/;

const quantidade = (a) => Math.max(1, inteiro(a.qtd, 1));

// Quantidade de ataques por rodada, à escolha do mestre. A 5e dá multiataque a quase toda criatura de CR 2+;
// em T20 o limite cai com o ND e o Ajustar ND reparte o dano pelos ataques. `qtd5e` é a quantidade original.
//   5e: como no multiataque da 5e · t20: um por ataque · limite: como na 5e, tirando ataques até caber · manual: não mexe.
export function aplicarModoAtaques(ataques, modo, limite) {
  if (modo === 'manual' || !MODOS_ATAQUES.includes(modo)) return ataques;
  const novos = ataques.map((a) => ({
    ...a,
    qtd: a.qtd5e === undefined ? quantidade(a) : (modo === 't20' ? 1 : Math.max(1, inteiro(a.qtd5e, 1))),
  }));
  if (modo !== 'limite' || !(limite > 0)) return novos;
  let total = novos.reduce((s, a) => s + a.qtd, 0);
  while (total > limite) {
    const maior = novos.reduce((m, a) => (a.qtd > m.qtd ? a : m), novos[0]);
    if (maior.qtd <= 1) break; // todos em 1: o Ajustar ND avisa que passou do limite
    maior.qtd -= 1;
    total -= 1;
  }
  return novos;
}

const lista = (v) => (Array.isArray(v) ? v.map(String) : []);

// Devolve { ok, erros, criatura }. `criatura` só existe quando ok.
export function criaturaDeFormulario(f) {
  const erros = [];

  const nome = String(f.nome ?? '').trim();
  if (!nome) erros.push('nome');

  const crNumero = parseCR(String(f.cr ?? '').trim());
  let crValido = !Number.isNaN(crNumero);
  if (crValido) {
    try { xpDoCR(crNumero); } catch { crValido = false; }
  }
  if (!crValido) erros.push('cr');

  if (!PAPEIS_TABELA.includes(f.papel)) erros.push('papel');
  if (!Object.hasOwn(RITMOS, f.ritmo)) erros.push('ritmo');
  if (!CODIGOS_TAMANHO.includes(f.tamanho)) erros.push('tamanho');
  if (!CODIGOS_TIPO.includes(f.tipo)) erros.push('tipo');

  const nivelTexto = String(f.nivelGrupo ?? '').trim();
  let nivelGrupo = null;
  if (nivelTexto !== '' && nivelTexto !== '0') {
    nivelGrupo = inteiro(nivelTexto, NaN);
    if (Number.isNaN(nivelGrupo) || nivelGrupo < 1 || nivelGrupo > 20) erros.push('nivelGrupo');
  }

  const deslocamento = Number(f.deslocamento ?? 9);
  if (!(deslocamento >= 0)) erros.push('deslocamento');

  const deslocamentosExtra = Object.fromEntries(['fly', 'swim', 'climb', 'burrow']
    .map((k) => [k, Math.max(0, Number(f.deslocamentosExtra?.[k]) || 0)]));

  const atributos = {};
  for (const chave of ATRIBUTOS) atributos[chave] = Math.min(30, Math.max(-10, inteiro(f.atributos?.[chave], 0)));

  const ataques = (f.ataques ?? []).map((a, i) => {
    const nomeAtaque = String(a.nome ?? '').trim();
    if (!nomeAtaque) erros.push(`ataque-${i}-nome`);
    const tipo = TIPOS_ATAQUE.includes(a.tipo) ? a.tipo : 'cac';
    const dano = CHAVES_DANO.includes(a.dano) ? a.dano : 'dano';
    return {
      nome: nomeAtaque, distancia: tipo === 'ad', tipoDano: dano, qtd: Math.max(1, inteiro(a.qtd, 1)),
      descricao: String(a.descricao ?? '').trim(),
      danoExtra: (a.danoExtra ?? [])
        .map((d) => ({ formula: String(d.formula ?? '').replace(/\s+/g, ''), tipo: CHAVES_DANO.includes(d.tipo) ? d.tipo : 'dano' }))
        .filter((d) => FORMULA_DANO.test(d.formula)),
      proporcaoExtra: Math.min(0.95, Math.max(0, Number(a.proporcaoExtra) || 0)),
      extraNoBalanceamento: a.extraNoBalanceamento !== false,
    };
  });

  const habilidades = (f.habilidades ?? [])
    .map((h) => {
      const habilidade = {
        nome: String(h.nome ?? '').trim(), texto: String(h.texto ?? '').trim(),
        execucao: EXECUCOES.includes(h.execucao) ? h.execucao : '',
      };
      const dano = (h.dano ?? [])
        .map((d) => ({ formula: String(d.formula ?? '').replace(/\s+/g, ''), tipo: CHAVES_DANO.includes(d.tipo) ? d.tipo : 'dano' }))
        .filter((d) => FORMULA_DANO.test(d.formula));
      if (!dano.length) return habilidade;
      return {
        ...habilidade, dano,
        ...(PERICIAS_RESISTENCIA.includes(h.resistencia?.pericia) && {
          resistencia: { pericia: h.resistencia.pericia, metade: Boolean(h.resistencia.metade) },
        }),
        efeito: Boolean(h.efeito), ajustarDano: h.ajustarDano !== false,
      };
    })
    .filter((h) => h.nome);

  if (erros.length) return { ok: false, erros };
  return {
    ok: true,
    erros: [],
    criatura: {
      nome,
      conceito: String(f.conceito ?? '').trim(),
      img: String(f.img ?? '').trim(),
      token: String(f.token ?? '').trim(),
      cr: crNumero,
      papel: f.papel,
      nivelGrupo,
      ritmo: f.ritmo,
      tamanho: f.tamanho,
      tipo: f.tipo,
      deslocamento,
      deslocamentosExtra,
      atributos,
      ataques,
      habilidades,
      sentidos: { value: lista(f.sentidos?.value), custom: String(f.sentidos?.custom ?? '').trim() },
      idiomas: lista(f.idiomas),
      idiomasCustom: String(f.idiomasCustom ?? '').trim(),
      resistencias: String(f.resistencias ?? '').trim(),
      resistenciasDano: {
        imunidade: lista(f.resistenciasDano?.imunidade),
        vulnerabilidade: lista(f.resistenciasDano?.vulnerabilidade),
        reducao: lista(f.resistenciasDano?.reducao),
      },
      imunidadesCondicao: { value: lista(f.imunidadesCondicao?.value), custom: String(f.imunidadesCondicao?.custom ?? '').trim() },
      chefeFinal: Boolean(f.chefeFinal),
    },
  };
}

// Poder lido da tela: nome, texto, ação e as caixas editam o que já havia; o dano e o teste vindos da importação
// não têm campo na tela e continuam como estavam. Poder sem dano não tem as caixas.
export function poderDaTela(anterior, { nome, texto, execucao, ajustarDano, efeito }) {
  const base = { ...anterior, nome, texto, execucao };
  return anterior?.dano?.length ? { ...base, ajustarDano, efeito } : base;
}
