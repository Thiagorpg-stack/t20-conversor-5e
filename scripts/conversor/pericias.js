// O sistema Tormenta20 1.6.6 (Foundry 14) preenche com o padrão ("for", outros 0...) o que falta numa perícia atualizada
// por caminho parcial, e o envio do formulário da ficha ao fechá-la faz isso. Completa a atualização com os valores atuais
// de cada perícia tocada, antes de o Foundry limpar os dados. Função pura; `atuais` = _source.system.pericias.
const CAMINHO = /^system\.pericias\.([^.]+)\.([^.]+)/;

export function completarPericiasParciais(atuais, dados) {
  if (!atuais || !dados) return dados;
  const completa = (chave, presentes) => Object.fromEntries(Object.entries(atuais[chave]).filter(([campo]) => !presentes.has(campo)));
  const resultado = { ...dados };

  // caminhos achatados: "system.pericias.fort.treinado": false
  const tocadas = new Map();
  for (const caminho of Object.keys(dados)) {
    const m = CAMINHO.exec(caminho);
    if (m && atuais[m[1]]) tocadas.set(m[1], (tocadas.get(m[1]) ?? new Set()).add(m[2]));
  }
  for (const [chave, presentes] of tocadas) {
    for (const [campo, valor] of Object.entries(completa(chave, presentes))) {
      resultado[`system.pericias.${chave}.${campo}`] = structuredClone(valor);
    }
  }

  // objeto aninhado: { system: { pericias: { fort: { treinado: false } } } }
  const aninhadas = dados.system?.pericias;
  if (aninhadas && typeof aninhadas === 'object') {
    const pericias = { ...aninhadas };
    for (const [chave, parcial] of Object.entries(aninhadas)) {
      if (atuais[chave] && parcial && typeof parcial === 'object') {
        pericias[chave] = { ...structuredClone(completa(chave, new Set(Object.keys(parcial)))), ...parcial };
      }
    }
    resultado.system = { ...dados.system, pericias };
  }
  return resultado;
}
