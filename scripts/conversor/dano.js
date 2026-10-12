// Dano adicional do golpe (o 1d10 elétrico do Rend): média das fórmulas e proporção entre dano principal e adicional.
// Funções puras, sem dependência do Foundry.
import { ID_CONVERSOR } from './criar-ator.js';

// "2d8+7" → 16. Só aceita dados e números somados ("1d10", "6d6+40"); o resto vale 0.
export function mediaFormula(formula) {
  let soma = 0;
  for (const [, sinal, dados, faces, fixo] of String(formula ?? '').replace(/\s+/g, '').matchAll(/([+-]?)(\d*)d(\d+)|([+-]?\d+)/g)) {
    soma += faces ? (sinal === '-' ? -1 : 1) * (dados === '' ? 1 : Number(dados)) * (Number(faces) + 1) / 2 : Number(fixo);
  }
  return soma;
}

// Fórmula "NdF+B" com média próxima de `media`, mantendo o dado `faces`; os dados carregam cerca de metade da média.
export function formulaDeMedia(media, faces) {
  const dado = (faces + 1) / 2;
  const n = Math.max(1, Math.round(media / 2 / dado));
  const bonus = Math.round(media - n * dado);
  return `${n}d${faces}${bonus > 0 ? `+${bonus}` : bonus < 0 ? bonus : ''}`;
}

// Com `extraNoBalanceamento`, o dano adicional segue a proporção da 5e (`proporcaoExtra`) sobre o dano total por golpe:
// reescreve as fórmulas adicionais nos itens de `dados` e o Ajustar ND recalcula o principal com elas fixas.
// `danoPorGolpe` = { idDaArma: média do dano principal por golpe } vindo da simulação do Ajustar ND.
export function aplicarProporcaoExtras(dados, criatura, danoPorGolpe = {}) {
  for (const item of dados.items) {
    const ataque = criatura.ataques[item.flags?.[ID_CONVERSOR]?.indiceAtaque];
    const principal = danoPorGolpe[item._id]?.danoPorGolpe;
    if (item.type !== 'arma' || !ataque?.extraNoBalanceamento || !(ataque.proporcaoExtra > 0) || principal === undefined) continue;
    const partes = item.system.rolls.find((r) => r.type === 'dano').parts.slice(2).filter((p) => p[0]);
    if (!partes.length) continue;
    const medias = partes.map((p) => mediaFormula(p[0]));
    const somaExtras = medias.reduce((s, m) => s + m, 0);
    const alvo = ataque.proporcaoExtra * (principal + somaExtras);
    partes.forEach((p, i) => {
      const faces = Number(/d(\d+)/.exec(p[0])?.[1]);
      if (faces) p[0] = formulaDeMedia(alvo * medias[i] / somaExtras, faces);
    });
  }
  return dados;
}

const ROTULOS_DANO = {
  acido: 'ácido', corte: 'corte', eletricidade: 'eletricidade', essencia: 'essência', fogo: 'fogo', frio: 'frio', impacto: 'impacto',
  luz: 'luz', psiquico: 'psíquico', perfuracao: 'perfuração', trevas: 'trevas', perda: 'perda',
};

// Texto da arma depois do ajuste de ND: troca o bônus de ataque e o dano da 5e ("Attack Roll: +9 ... Hit: 27 (4d10 + 5 Force)
// damage plus 5 (1d10 Lightning) damage") pelos valores finais da ficha. `partes` = [[fórmula, tipo]] da rolagem de dano.
// Sem o padrão da 5e no texto, devolve o texto como está.
export function descricaoDeArma(texto, ataque, partes) {
  const dano = partes.filter((p) => p[0]).map(([formula, tipo]) => {
    const rotulo = ROTULOS_DANO[tipo];
    return `${Math.floor(mediaFormula(formula))} (${formula}${rotulo ? ` de ${rotulo}` : ''}) damage`;
  });
  return String(texto)
    .replace(/(Attack Roll:\s*)\+\d+/i, `$1+${ataque}`)
    .replace(/Hit:\s*\d+\s*\([^)]*\)\s*damage(?:\s*plus\s*\d+\s*\([^)]*\)\s*damage)*/i, dano.length ? `Hit: ${dano.join(' plus ')}` : '$&');
}
