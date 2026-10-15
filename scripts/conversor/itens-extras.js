// Itens arrastados para o diálogo (poder e magia do T20): vão para o ator como estão, só ganham id novo na criação.
import { ID_CONVERSOR } from './criar-ator.js';

export const TIPOS_ITEM_EXTRA = ['poder', 'magia'];

// Dados de um item (item.toObject()) → item extra sem os campos do documento, ou null se o tipo não serve.
export function itemExtraDe(dados) {
  if (!dados || !TIPOS_ITEM_EXTRA.includes(dados.type)) return null;
  const { _id, folder, sort, ownership, _stats, ...resto } = structuredClone(dados);
  return { ...resto, flags: { ...resto.flags, [ID_CONVERSOR]: { extra: true } } };
}
