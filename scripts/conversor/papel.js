// Heurística de papel sugerido (Solo, Lacaio ou Especial). Função pura.
// As regras valem de cima para baixo; vale a primeira que se aplicar:
//   1. ações lendárias, resistência lendária ou ações de covil → Solo (e sugere Chefe Final)
//   2. conjuração → Especial
//   3. PV menores que a metade do PV do Solo no mesmo ND → Lacaio
//   4. nenhum dos anteriores → Solo
// `pvSoloNoND` é o PV da linha Solo da tabela no ND usado na comparação (quem chama escolhe o ND).

export function sugerirPapel({
  acoesLendarias = false, resistenciaLendaria = false, acoesCovil = false,
  conjurador = false, pv, pvSoloNoND,
} = {}) {
  if (acoesLendarias || resistenciaLendaria || acoesCovil) {
    return { papel: 'solo', chefeFinalSugerido: true, motivo: 'lendaria' };
  }
  if (conjurador) {
    return { papel: 'especial', chefeFinalSugerido: false, motivo: 'conjuracao' };
  }
  if (Number.isFinite(pv) && Number.isFinite(pvSoloNoND) && pv < pvSoloNoND / 2) {
    return { papel: 'lacaio', chefeFinalSugerido: false, motivo: 'pv-baixo' };
  }
  return { papel: 'solo', chefeFinalSugerido: false, motivo: 'padrao' };
}
