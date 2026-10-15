// O Foundry expande chaves com ponto em objetos: uma chave não pode ser texto e prefixo de outra ao mesmo tempo,
// senão o idioma inteiro falha ao carregar e a tela mostra as chaves cruas (T20C5E.Botao).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), 'utf8');
const lang = JSON.parse(ler('../lang/pt-BR.json'));
const chaves = Object.keys(lang);

test('lang: nenhuma chave é prefixo de outra', () => {
  const colisoes = chaves.flatMap((a) => chaves.filter((b) => b.startsWith(`${a}.`)).map((b) => `${a} x ${b}`));
  assert.deepEqual(colisoes, []);
});

test('lang: todo texto usado no template e no código existe', () => {
  const usadas = new Set([
    ...[...ler('../templates/dialogo-conversor.hbs').matchAll(/(?:localize|T20C5E\.)\s*["']?(T20C5E\.[\w.]+)/g)].map((m) => m[1]),
    ...[...ler('../scripts/dialogo-conversor.js').matchAll(/['"`](T20C5E\.[\w.]+)['"`]/g)].map((m) => m[1]),
    ...[...ler('../scripts/imagem-foundry.js').matchAll(/['"`](T20C5E\.[\w.]+)['"`]/g)].map((m) => m[1]),
    ...[...ler('../scripts/main.js').matchAll(/['"`](T20C5E\.[\w.]+)['"`]/g)].map((m) => m[1]),
    ...[...ler('../scripts/conversor/origem-texto.js').matchAll(/['"`](T20C5E\.[\w.]+)['"`]/g)].map((m) => m[1]),
  ]);
  const faltam = [...usadas].filter((k) => !(k in lang));
  assert.deepEqual(faltam, []);
});

test('o nível do grupo saiu: sem configuração, sem campo na tela e sem textos soltos no idioma', () => {
  assert.doesNotMatch(ler('../scripts/main.js'), /nivelGrupo/);
  assert.doesNotMatch(ler('../templates/dialogo-conversor.hbs'), /nivelGrupo|alternarCalibragem/);
  const sobras = chaves.filter((k) => /NivelGrupo|Calibrar|CalibradoIgual|ConfigNivel|Erro\.nivelGrupo/.test(k));
  assert.deepEqual(sobras, []);
});
