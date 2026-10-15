// Calibração de ritmo. Função pura, sem dependência do Foundry.
//
// Q alvo = Q(ND de referência) × (1,5 ÷ k), com Q = Dano × PV da linha da tabela do papel e
// k = combates até o descanso.
// O ND escolhido é o da tabela do papel cuja Q fica mais perto de Q alvo (escala logarítmica).
import { valorND, parseCR, ndDeReferencia } from './mapeamentos.js';

export const FATOR_T20 = 1.5;
export const RITMOS = { t20: 1.5, intermediario: 3, estilo5e: 7 };

// XP por CR do DMG de D&D 5e (2014). Conferido no livro pelo autor do módulo.
const XP_POR_CR = {
  0: 10, 0.125: 25, 0.25: 50, 0.5: 100, 1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800,
  6: 2300, 7: 2900, 8: 3900, 9: 5000, 10: 5900, 11: 7200, 12: 8400, 13: 10000,
  14: 11500, 15: 13000, 16: 15000, 17: 18000, 18: 20000, 19: 22000, 20: 25000,
  21: 33000, 22: 41000, 23: 50000, 24: 62000, 25: 75000, 26: 90000, 27: 105000,
  28: 120000, 29: 135000, 30: 155000,
};

const CHAVE_TABELA = { solo: 'solo', lackey: 'lacaio', lacaio: 'lacaio', special: 'especial', especial: 'especial' };

export function xpDoCR(cr) {
  const valor = parseCR(cr);
  const xp = XP_POR_CR[valor];
  if (xp === undefined) throw new Error(`CR sem XP conhecido: "${cr}"`);
  return xp;
}

export const custoQ = (linha) => linha.Dano * linha.PV;

export function linhaDoND(linhas, nd) {
  const alvo = valorND(nd);
  const linha = linhas.find((l) => valorND(l.ND) === alvo);
  if (!linha) throw new Error(`ND "${nd}" não existe na tabela`);
  return linha;
}

export function escolherNDPorQ(linhas, qAlvo) {
  let melhor = null;
  for (const linha of linhas) {
    const distancia = Math.abs(Math.log(custoQ(linha) / qAlvo));
    if (melhor === null || distancia < melhor.distancia) melhor = { linha, distancia };
  }
  return melhor.linha;
}

function valorDoRitmo(ritmo) {
  const k = typeof ritmo === 'number' ? ritmo : RITMOS[ritmo];
  if (!(k > 0)) throw new Error(`Ritmo inválido: "${ritmo}"`);
  return k;
}

// tabelas: { solo: [...], lacaio: [...], especial: [...] } (formato do tables.json do Ajustar ND).
export function calcularND({ tabelas, papel, cr, ritmo = 't20' }) {
  const chave = CHAVE_TABELA[papel];
  if (!chave) throw new Error(`Papel desconhecido: "${papel}"`);
  const linhas = tabelas[chave];
  const crNumero = parseCR(cr);
  if (Number.isNaN(crNumero)) throw new Error(`CR inválido: "${cr}"`);
  const k = valorDoRitmo(ritmo);
  const ndReferencia = ndDeReferencia(crNumero);

  // Acima de CR 20 só vale a tabela de referência, sem a fórmula.
  if (crNumero > 20) {
    return { nd: ndReferencia, ndReferencia, usouFormula: false, motivo: 'cr-acima-de-20', k };
  }

  const qAlvo = custoQ(linhaDoND(linhas, ndReferencia)) * (FATOR_T20 / k);
  const escolhida = escolherNDPorQ(linhas, qAlvo);
  return { nd: String(escolhida.ND), ndReferencia, usouFormula: true, qAlvo, k };
}
