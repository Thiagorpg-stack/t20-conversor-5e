// Acesso à API do módulo Ajustar ND (tormenta20-ajuste-nd), versão 0.9.0 ou mais recente.
export const ID_AJUSTE_ND = 'tormenta20-ajuste-nd';
export const VERSAO_API_MINIMA = 1;

// Devolve a API ou lança um Error com a chave de texto do problema (T20C5E.*).
export function obterApi() {
  const modulo = game.modules.get(ID_AJUSTE_ND);
  if (!modulo?.active) throw new Error('T20C5E.ErroAjusteNdAusente');
  const api = modulo.api;
  if (!api || (api.versaoApi ?? 0) < VERSAO_API_MINIMA) throw new Error('T20C5E.ErroAjusteNdAntigo');
  return api;
}
