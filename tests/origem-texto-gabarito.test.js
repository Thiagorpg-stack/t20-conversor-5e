// Gabarito local da v3: o bloco de texto copiado do livro (tests/fixtures/<nome>-5e.txt) tem de dar o mesmo formulário que o
// JSON exportado do Foundry (tests/fixtures/<nome>-5e.json). Os dois ficam fora do repositório (direitos autorais): sem eles, o teste pula.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { textoParaAtor5e } from '../scripts/conversor/origem-texto.js';
import { lerAtor5e } from '../scripts/conversor/origem-json.js';

const CRIATURAS = ['otyugh', 'dragao-azul', 'arquimago'];

// As descrições ficam de fora: o JSON traz enriquecedores ([[/damage ...]], @UUID) e o texto colado não.
const resumo = (e) => ({
  nome: e.nome, cr: e.cr, tamanho: e.tamanho, tipo: e.tipo, deslocamento: e.deslocamento, deslocamentosExtra: e.deslocamentosExtra,
  atributos: e.atributos, papel: e.papel, chefeFinal: e.chefeFinal, conjurador: e.conjurador, conjuracao: e.conjuracao,
  sentidos: e.sentidos, idiomas: e.idiomas, resistenciasDano: e.resistenciasDano, imunidadesCondicao: e.imunidadesCondicao,
  ataques: e.ataques.map(({ descricao, ...resto }) => resto),
  habilidades: e.habilidades.map(({ texto, ...resto }) => resto),
});

for (const nome of CRIATURAS) {
  const txt = new URL(`./fixtures/${nome}-5e.txt`, import.meta.url);
  const json = new URL(`./fixtures/${nome}-5e.json`, import.meta.url);
  const falta = [txt, json].some((a) => !existsSync(a)) && `sem tests/fixtures/${nome}-5e.txt e .json`;
  test(`gabarito ${nome}: o texto dá o mesmo formulário que o JSON`, { skip: falta }, () => {
    const opcoes = { pvSoloNoND: () => 400 };
    const lido = textoParaAtor5e(readFileSync(txt, 'utf8'));
    assert.equal(lido.ok, true);
    const doTexto = lerAtor5e(lido.ator, opcoes).estado;
    const doJson = lerAtor5e(JSON.parse(readFileSync(json, 'utf8')), opcoes).estado;
    assert.deepEqual(resumo(doTexto), resumo(doJson));
  });
}
