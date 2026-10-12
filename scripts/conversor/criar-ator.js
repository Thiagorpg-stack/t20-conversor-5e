// Monta os dados do ator T20 a partir da criatura neutra. As funções daqui são puras;
// quem cria o ator no Foundry (diálogo) injeta gerarId e usa Actor.create.
import { criarActorTemplate, criarItemArma, criarItemPoder } from './modelo-ator.js';
import { papelDoSistema, valorND, NOME_DA_PERICIA } from './mapeamentos.js';
import { ID_AJUSTE_ND } from '../api-ajuste-nd.js';

export const ID_CONVERSOR = 't20-conversor-5e';
export const NOME_PASTA = 'Convertidos de 5e';

// Tamanho do token em casas da grade.
const CASAS_DO_TAMANHO = { min: 1, peq: 1, med: 1, gra: 2, eno: 3, col: 4 };

const escaparHtml = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Dano elementar aparece na linha de ataques ("1d6 de fogo"); o físico é omitido, como nas fichas oficiais.
const DANO_NA_LINHA = {
  acido: 'ácido', eletricidade: 'eletricidade', essencia: 'essência', fogo: 'fogo', frio: 'frio', luz: 'luz',
  psiquico: 'psíquico', trevas: 'trevas', perda: 'perda de PV',
};

// "Mordida +0 (1d6) e 2 Garra +0 (1d6 de fogo)." Os números são provisórios: ao ajustar, o Ajustar ND troca o
// bônus e a fórmula de cada arma citada e deixa o resto do texto como está.
function linhaDeAtaques(ataques) {
  const partes = ataques.map((a) => (
    `${a.qtd > 1 ? `${a.qtd} ` : ''}${a.nome} +0 (1d6${DANO_NA_LINHA[a.tipoDano] ? ` de ${DANO_NA_LINHA[a.tipoDano]}` : ''})`));
  if (!partes.length) return '';
  return `${partes.length > 1 ? `${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}` : partes[0]}.`;
}

// RD por tipo de dano a partir do patamar do ND (Iniciante até 4, Veterano até 10, Campeão até 16, Lenda acima).
// Sugestão: segue as fichas oficiais (Golem de Ferro ND 10 tem RD 10; Dragão Venerável ND 15 tem RD 15). O mestre ajusta.
export const rdDoND = (nd) => {
  const v = valorND(nd);
  if (v <= 4) return 5;
  if (v <= 10) return 10;
  if (v <= 16) return 15;
  return 20;
};

// Valores de CONST.TOKEN_DISPLAY_MODES: nome ao passar o mouse (dono) e barra sempre visível para o dono, como no original.
const TOKEN_NOME_DONO_PASSA_MOUSE = 20;
const TOKEN_BARRA_DONO = 40;

const paragrafos = (texto) => String(texto ?? '').split('\n').filter(Boolean).map((l) => `<p>${escaparHtml(l)}</p>`).join('');

// `nd` é o ND (texto) escolhido; `ndReferencia` e `meta` só vão para a flag de rastreio.
export function montarDadosAtor(criatura, { nd, gerarId, pasta = null, ndReferencia = null, agora = new Date().toISOString() }) {
  const dados = criarActorTemplate();
  dados.name = criatura.nome;
  dados.folder = pasta;

  const sys = dados.system;
  for (const [chave, mod] of Object.entries(criatura.atributos)) sys.atributos[chave].base = mod;
  sys.attributes.nd = String(nd);
  sys.attributes.movement.walk.base = criatura.deslocamento;
  sys.detalhes.role = papelDoSistema(criatura.papel);
  sys.detalhes.tipo = criatura.tipo;
  sys.tracos.tamanho = criatura.tamanho;
  if (criatura.conceito) sys.detalhes.biography.value = `<p>${escaparHtml(criatura.conceito)}</p>`;
  sys.detalhes.resistencias = criatura.resistencias;
  const { imunidade, vulnerabilidade, reducao } = criatura.resistenciasDano;
  const rd = rdDoND(nd);
  for (const tipo of imunidade) sys.tracos.resistencias[tipo].imunidade = true;
  for (const tipo of vulnerabilidade) sys.tracos.resistencias[tipo].vulnerabilidade = true;
  for (const tipo of reducao) sys.tracos.resistencias[tipo].base = rd; // a 5e reduz à metade; o T20 usa RD por tipo
  sys.detalhes.ataquescac = linhaDeAtaques(criatura.ataques.filter((a) => !a.distancia));
  sys.detalhes.ataquesad = linhaDeAtaques(criatura.ataques.filter((a) => a.distancia));
  sys.attributes.sentidos = { value: criatura.sentidos.value, custom: criatura.sentidos.custom };
  sys.tracos.idiomas = { value: criatura.idiomas, custom: criatura.idiomasCustom };
  sys.tracos.ic = { value: criatura.imunidadesCondicao.value, custom: criatura.imunidadesCondicao.custom };

  // Sem imagem escolhida ficam os ícones do modelo; sem token, o token usa o retrato.
  if (criatura.img) dados.img = criatura.img;
  const token = criatura.token || criatura.img;
  if (token) dados.prototypeToken.texture.src = token;

  const casas = CASAS_DO_TAMANHO[criatura.tamanho] ?? 1;
  dados.prototypeToken.name = criatura.nome;
  dados.prototypeToken.displayName = TOKEN_NOME_DONO_PASSA_MOUSE;
  dados.prototypeToken.displayBars = TOKEN_BARRA_DONO;
  dados.prototypeToken.width = casas;
  dados.prototypeToken.height = casas;

  const armas = criatura.ataques.map((ataque, indice) => {
    const item = criarItemArma({
      nome: ataque.nome, distancia: ataque.distancia, tipoDano: ataque.tipoDano, ataques: ataque.qtd,
      descricao: ataque.descricao ? paragrafos(`${ataque.nome}. ${ataque.descricao}`) : '',
    });
    item._id = gerarId();
    item.flags = { [ID_CONVERSOR]: { indiceAtaque: indice } };
    return item;
  });
  const poderes = (criatura.habilidades ?? []).map((h) => {
    const item = criarItemPoder({
      nome: h.nome, descricao: paragrafos(h.texto), execucao: h.execucao, dano: h.dano,
      resistenciaTxt: h.resistencia ? `${NOME_DA_PERICIA[h.resistencia.pericia]} ${h.resistencia.metade ? 'Metade' : 'anula'}` : '',
    });
    item._id = gerarId();
    // O Ajustar ND só mexe no dano do poder que tem esta flag.
    if (h.dano?.length) item.flags = { [ID_AJUSTE_ND]: { danoPoder: { ajustar: h.ajustarDano, efeito: h.efeito } } };
    return item;
  });
  dados.items = [...armas, ...poderes];

  dados.flags = {
    [ID_CONVERSOR]: {
      origem: 'cr', cr: criatura.cr, ritmo: criatura.ritmo, nivelGrupo: criatura.nivelGrupo,
      ndReferencia, criadoEm: agora,
    },
  };
  return dados;
}

// { idDaArma: quantidade } a partir dos itens do ator (toObject().items), lendo a flag de cada arma.
export function ataquesPorArmaDe(itens, criatura) {
  const resultado = {};
  for (const item of itens) {
    if (item.type !== 'arma') continue;
    const indice = item.flags?.[ID_CONVERSOR]?.indiceAtaque;
    if (indice === undefined) continue;
    resultado[item._id] = criatura.ataques[indice]?.qtd ?? 1;
  }
  return resultado;
}
