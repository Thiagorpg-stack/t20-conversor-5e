// Imagens do retrato e do token que o módulo guarda no Foundry. Funções puras, sem dependência do Foundry.

// Pasta (na raiz de dados do usuário) onde ficam as imagens enviadas ou baixadas.
export const PASTA_IMAGENS = 'uploads/t20-conversor-5e';

// Nome de arquivo seguro a partir da URL ("…/XMM/Otyugh.webp?v=2" → "Otyugh.webp"); sem extensão, usa o tipo MIME.
export function nomeDoArquivo(url, tipoMime = '') {
  let base = '';
  try { base = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() ?? ''); } catch { /* URL inválida: cai no nome padrão */ }
  base = base.replace(/[^\w.-]+/g, '_').replace(/^\.+/, '');
  if (!base) base = 'imagem';
  if (!/\.\w{2,5}$/.test(base)) base += `.${(tipoMime.split('/')[1] ?? 'webp').replace(/\+.*$/, '')}`;
  return base;
}

// O retrato do 5e.tools ("…/img/bestiary/XMM/Otyugh.webp") tem o token ao lado, em "…/img/bestiary/tokens/XMM/Otyugh.webp".
// Só o CDN (cdn.5e.tools) libera o uso em outros sites (CORS); o 5e.tools direto não. Sem correspondência: ''.
export function tokenDoCdn5e(urlRetrato) {
  const m = /^(https:\/\/cdn\.5e\.tools\/\d+\/img\/bestiary\/)([^/?#]+\/[^/?#]+)$/.exec(String(urlRetrato ?? ''));
  return m ? `${m[1]}tokens/${m[2]}` : '';
}

// O 5e.tools direto não libera CORS, então o navegador não deixa baixar. O mesmo arquivo costuma estar no CDN
// (cdn.5e.tools), com o ano da edição no caminho. Devolve os endereços a tentar, em ordem; o original fica por último.
export function urlsCandidatas(url) {
  const texto = String(url ?? '').trim();
  const m = /^https?:\/\/(?:www\.)?5e\.tools(\/img\/\S+)$/i.exec(texto);
  return m ? [`https://cdn.5e.tools/2024${m[1]}`, `https://cdn.5e.tools${m[1]}`, texto] : [texto];
}

export const ehUrl = (texto) => /^https?:\/\/\S+$/i.test(String(texto ?? '').trim());
