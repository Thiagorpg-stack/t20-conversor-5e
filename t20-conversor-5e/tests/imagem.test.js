import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nomeDoArquivo, ehUrl, tokenDoCdn5e, urlsCandidatas } from '../scripts/conversor/imagem.js';

test('nome do arquivo vem da URL, sem caracteres perigosos', () => {
  assert.equal(nomeDoArquivo('https://cdn.5e.tools/2024/img/bestiary/XMM/Otyugh.webp'), 'Otyugh.webp');
  assert.equal(nomeDoArquivo('https://x.com/a/Lobo%20Gigante.png?v=2#topo'), 'Lobo_Gigante.png');
  const traversal = nomeDoArquivo('https://x.com/a/..%2F..%2Fsegredo.png');
  assert.doesNotMatch(traversal, /[\\/]/);   // nunca escapa da pasta
  assert.doesNotMatch(traversal, /^\./);
  assert.match(traversal, /segredo\.png$/);
  assert.equal(nomeDoArquivo('https://x.com/a/token', 'image/png'), 'token.png');
  assert.equal(nomeDoArquivo('https://x.com/', 'image/svg+xml'), 'imagem.svg');
  assert.equal(nomeDoArquivo('isto não é url', 'image/webp'), 'imagem.webp');
});

test('token do CDN do 5e.tools é deduzido do retrato', () => {
  assert.equal(tokenDoCdn5e('https://cdn.5e.tools/2024/img/bestiary/XMM/Otyugh.webp'),
    'https://cdn.5e.tools/2024/img/bestiary/tokens/XMM/Otyugh.webp');
  assert.equal(tokenDoCdn5e('https://cdn.5e.tools/img/bestiary/MM/Aboleth.webp'), ''); // sem o ano: não é o padrão conhecido
  assert.equal(tokenDoCdn5e('https://outro.com/2024/img/bestiary/XMM/Otyugh.webp'), '');
  assert.equal(tokenDoCdn5e(''), '');
  assert.equal(tokenDoCdn5e(undefined), '');
});

test('URL do 5e.tools ganha candidatas no CDN (com e sem o ano), e o original vai por último', () => {
  assert.deepEqual(urlsCandidatas('https://5e.tools/img/bestiary/tokens/XMM/Otyugh.webp'), [
    'https://cdn.5e.tools/2024/img/bestiary/tokens/XMM/Otyugh.webp',
    'https://cdn.5e.tools/img/bestiary/tokens/XMM/Otyugh.webp',
    'https://5e.tools/img/bestiary/tokens/XMM/Otyugh.webp',
  ]);
  assert.deepEqual(urlsCandidatas(' https://www.5e.tools/img/a.png ')[0], 'https://cdn.5e.tools/2024/img/a.png');
  const cdn = 'https://cdn.5e.tools/2024/img/bestiary/XMM/Otyugh.webp';
  assert.deepEqual(urlsCandidatas(cdn), [cdn]);                       // já é o CDN: nada a tentar
  assert.deepEqual(urlsCandidatas('https://outro.com/img/a.png'), ['https://outro.com/img/a.png']);
  assert.deepEqual(urlsCandidatas('https://5e.tools/book.html'), ['https://5e.tools/book.html']); // fora de /img/
});

test('só http e https contam como URL', () => {
  assert.equal(ehUrl('https://x.com/a.png'), true);
  assert.equal(ehUrl(' http://x.com/a.png '), true);
  assert.equal(ehUrl('assets/srd5e/Otyugh.webp'), false);
  assert.equal(ehUrl('javascript:alert(1)'), false);
  assert.equal(ehUrl(''), false);
});
