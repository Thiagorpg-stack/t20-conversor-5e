// Diálogo "5e para T20" (v1: criar ameaça a partir de CR). Mostra o ND de referência e o ND calibrado
// pelo ritmo, simula o ajuste num ator não salvo e só cria o ator quando o mestre confirma.
import { obterApi } from './api-ajuste-nd.js';
import { calcularND, linhaDoND, RITMOS } from './conversor/ritmo.js';
import { lerAtor5e } from './conversor/origem-json.js';
import { textoParaAtor5e } from './conversor/origem-texto.js';
import { PASTA_IMAGENS, nomeDoArquivo, ehUrl, tokenDoCdn5e, urlsCandidatas } from './conversor/imagem.js';
import { papelDoSistema, ndDeReferencia, CODIGOS_TAMANHO, CODIGOS_TIPO, CHAVES_DANO, NOME_DA_PERICIA } from './conversor/mapeamentos.js';
import { criaturaDeFormulario, aplicarModoAtaques, poderDaTela, MODOS_ATAQUES, EXECUCOES, ATRIBUTOS } from './conversor/origem-cr.js';
import { montarDadosAtor, ataquesPorArmaDe, ID_CONVERSOR, NOME_PASTA } from './conversor/criar-ator.js';
import { aplicarProporcaoExtras, descricaoDeArma } from './conversor/dano.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const NDS = ['1/4', '1/2', ...Array.from({ length: 20 }, (_, i) => String(i + 1)), 'S', 'S+'];
const PAPEIS = [['solo', 'Solo'], ['lacaio', 'Lacaio'], ['especial', 'Especial']];
const NOMES_RITMO = { t20: 'Estilo T20 (1 a 2 combates)', intermediario: 'Intermediário (3 a 4)', estilo5e: 'Estilo 5e (6 a 8)' };
const NOMES_TAMANHO = { min: 'Minúsculo', peq: 'Pequeno', med: 'Médio', gra: 'Grande', eno: 'Enorme', col: 'Colossal' };
const NOMES_TIPO = { ani: 'Animal', con: 'Construto', esp: 'Espírito', hum: 'Humanoide', mon: 'Monstro', mor: 'Morto-vivo' };
const NOMES_DANO = {
  acido: 'Ácido', corte: 'Corte', eletricidade: 'Eletricidade', essencia: 'Essência', fogo: 'Fogo', frio: 'Frio',
  impacto: 'Impacto', luz: 'Luz', psiquico: 'Psíquico', perfuracao: 'Perfuração', trevas: 'Trevas', perda: 'Perda de PV', dano: 'Dano',
};
const TESTES = { fort: 'Fortitude', refl: 'Reflexos', vont: 'Vontade' };
const NOMES_ATRIBUTO = { for: 'FOR', des: 'DES', con: 'CON', int: 'INT', sab: 'SAB', car: 'CAR' };
const CAMPOS_QUE_RECALCULAM_ND = ['cr', 'papel', 'nivelGrupo', 'ritmo'];

const t = (chave) => game.i18n.localize(chave);

const PREFIXO_IMAGEM = { img: 'retrato', token: 'token' };

// Plano B quando o `fetch` é bloqueado (o Foundry pode restringir conexões, mas deixa carregar imagens):
// carrega como imagem com CORS e redesenha num canvas. Só serve a sites que liberam CORS; sai em WebP sem perdas.
const baixarComoImagem = (url) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onerror = () => reject(new Error('a imagem não carrega com CORS'));
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('canvas vazio'))), 'image/webp', 1);
    } catch (erro) { reject(erro); } // canvas "sujo" (sem CORS) lança SecurityError
  };
  img.src = `${url}${url.includes('?') ? '&' : '?'}cors=${Date.now()}`; // outra URL: ignora a cópia em cache sem CORS
});

// A imagem do arquivo (URL ou caminho de outro mundo) só entra se abrir aqui.
const imagemAbre = (src) => new Promise((resolve) => {
  const img = new Image();
  const espera = setTimeout(() => resolve(false), 5000);
  img.onload = () => { clearTimeout(espera); resolve(true); };
  img.onerror = () => { clearTimeout(espera); resolve(false); };
  img.src = src;
});

export class DialogoConversor extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `${ID_CONVERSOR}-dialogo`,
    classes: ['t20-conversor-5e'],
    position: { width: 720, height: 'auto' },
    window: { resizable: true, icon: 'fas fa-dragon' },
    actions: {
      criar: DialogoConversor.#criar,
      cancelar: DialogoConversor.#cancelar,
      addAtaque: DialogoConversor.#addAtaque,
      removerAtaque: DialogoConversor.#removerAtaque,
      escolherImagem: DialogoConversor.#escolherImagem,
      enviarImagem: DialogoConversor.#enviarImagem,
      baixarImagem: DialogoConversor.#baixarImagem,
      importar5e: DialogoConversor.#importar5e,
      importarTexto: DialogoConversor.#lerTexto,
      addPoder: DialogoConversor.#addPoder,
      removerPoder: DialogoConversor.#removerPoder,
    },
  };

  static PARTS = { corpo: { template: `modules/${ID_CONVERSOR}/templates/dialogo-conversor.hbs` } };

  constructor(options = {}) {
    super(options);
    const nivelPadrao = Number(game.settings.get(ID_CONVERSOR, 'nivelGrupo')) || '';
    this.estado = {
      nome: '', conceito: '', img: '', token: '', texto5e: '', cr: '5', papel: 'solo', nivelGrupo: nivelPadrao,
      ritmo: game.settings.get(ID_CONVERSOR, 'ritmo'),
      nd: null, ndManual: false, chefeFinal: false, conjurador: false, conjuracao: 'int',
      tamanho: 'med', tipo: 'mon', deslocamento: 9,
      atributos: Object.fromEntries(ATRIBUTOS.map((a) => [a, 0])),
      ordem: ['fort', 'refl', 'vont'],
      ataques: [{ nome: 'Ataque', tipo: 'cac', dano: 'corte', qtd: 1, descricao: '' }],
      modoAtaques: '5e', // ver aplicarModoAtaques
      // abaixo: só vêm da importação
      habilidades: [], // viram poderes só com o texto
      sentidos: { value: [], custom: '' }, idiomas: [], idiomasCustom: '', resistencias: '',
      resistenciasDano: { imunidade: [], vulnerabilidade: [], reducao: [] }, imunidadesCondicao: { value: [], custom: '' },
    };
    this.relatorio = []; // da última importação: [{ tipo: 'ok' | 'revisar' | 'ignorado', texto }]
    this.pronto = null; // { dados, criatura, ndFinal, opcoes }
    this.tocado = false; // só mostra erros de validação depois da primeira edição do mestre
  }

  get title() { return t('T20C5E.Titulo'); }

  // ---------- cálculo ----------

  async #preparar() {
    const api = obterApi();
    const e = this.estado;
    const tabelas = await api.obterTabelas();

    const validacao = criaturaDeFormulario(e);
    if (!validacao.ok) return { erros: validacao.erros.map((c) => this.#erroLegivel(c)) };

    const calculo = calcularND({
      tabelas, papel: validacao.criatura.papel, cr: validacao.criatura.cr,
      nivelGrupo: validacao.criatura.nivelGrupo ?? undefined, ritmo: validacao.criatura.ritmo,
    });
    const ndFinal = e.ndManual && e.nd ? e.nd : calculo.nd;
    e.nd = ndFinal;

    // A quantidade de ataques depende do ND (modo "limite"), então entra depois dele.
    const limiteAtaques = api.maxAtaques(ndFinal);
    e.ataques = aplicarModoAtaques(e.ataques, e.modoAtaques, limiteAtaques);
    const { criatura } = criaturaDeFormulario(e);

    const ndReferencia = ndDeReferencia(criatura.cr);
    const dados = montarDadosAtor(criatura, {
      nd: ndFinal, ndReferencia, gerarId: () => foundry.utils.randomID(),
    });
    const opcoes = {
      nd: ndFinal, papel: papelDoSistema(criatura.papel), ordemResistencias: e.ordem,
      templates: { chefeFinal: criatura.chefeFinal },
    };
    // Dano adicional que segue a proporção da 5e: o total por golpe vem de uma simulação prévia do Ajustar ND.
    if (criatura.ataques.some((a) => a.extraNoBalanceamento && a.proporcaoExtra > 0 && a.danoExtra.length)) {
      const previo = new CONFIG.Actor.documentClass(dados);
      const r = await api.simular(previo, { ...opcoes, ataquesPorArma: ataquesPorArmaDe(previo.toObject().items, criatura) });
      aplicarProporcaoExtras(dados, criatura, r.plano.dano?.porArma);
    }
    return { api, criatura, calculo, ndFinal, ndReferencia, limiteAtaques, dados, opcoes };
  }

  #erroLegivel(codigo) {
    const ataque = /^ataque-(\d+)-nome$/.exec(codigo);
    if (ataque) return `${t('T20C5E.ErroAtaqueNome')} (${Number(ataque[1]) + 1})`;
    return t(`T20C5E.Erro.${codigo}`);
  }

  async _prepareContext() {
    const e = this.estado;
    const ctx = {
      e, papeis: PAPEIS.map(([v, r]) => ({ valor: v, rotulo: r, selecionado: v === e.papel })),
      ritmos: Object.keys(RITMOS).map((v) => ({ valor: v, rotulo: NOMES_RITMO[v], selecionado: v === e.ritmo })),
      tamanhos: CODIGOS_TAMANHO.map((v) => ({ valor: v, rotulo: NOMES_TAMANHO[v], selecionado: v === e.tamanho })),
      tipos: CODIGOS_TIPO.map((v) => ({ valor: v, rotulo: NOMES_TIPO[v], selecionado: v === e.tipo })),
      atributos: ATRIBUTOS.map((a) => ({ chave: a, rotulo: NOMES_ATRIBUTO[a], valor: e.atributos[a] })),
      ataques: e.ataques.map((a, indice) => ({
        indice, nome: a.nome, qtd: a.qtd,
        tipos: [['cac', t('T20C5E.CorpoACorpo')], ['ad', t('T20C5E.ADistancia')]].map(([v, r]) => ({ valor: v, rotulo: r, selecionado: v === a.tipo })),
        danos: CHAVES_DANO.map((v) => ({ valor: v, rotulo: NOMES_DANO[v], selecionado: v === a.dano })),
        extras: (a.danoExtra ?? []).map((x, j) => ({
          indice: j, formula: x.formula,
          danos: CHAVES_DANO.map((v) => ({ valor: v, rotulo: NOMES_DANO[v], selecionado: v === x.tipo })),
        })),
        extraNoBalanceamento: a.extraNoBalanceamento !== false,
        proporcaoExtra: Math.round((a.proporcaoExtra ?? 0) * 100),
      })),
      ordem: ['Forte', 'Média', 'Fraca'].map((rotulo, i) => ({
        indice: i, rotulo,
        opcoes: Object.entries(TESTES).map(([valor, nome]) => ({ valor, nome, selecionado: valor === e.ordem[i] })),
      })),
      poderes: e.habilidades.map((h, indice) => ({
        indice, nome: h.nome, texto: h.texto,
        temDano: Boolean(h.dano?.length),
        ajustarDano: h.ajustarDano !== false, efeito: Boolean(h.efeito),
        padrao: ['action', 'full'].includes(h.execucao), // só ação padrão ou completa usa o fator "com efeito"
        danoTexto: (h.dano ?? []).map((d) => `${d.formula} (${NOMES_DANO[d.tipo]})`).join(' + '),
        teste: h.resistencia ? `${NOME_DA_PERICIA[h.resistencia.pericia]}${h.resistencia.metade ? ' (metade)' : ''}` : '',
        depois: null,
        execucoes: EXECUCOES.map((v) => ({ valor: v, rotulo: t(`T20C5E.Exec.${v || 'nenhuma'}`), selecionado: v === (h.execucao ?? '') })),
      })),
      modosAtaques: MODOS_ATAQUES.map((v) => ({ valor: v, rotulo: t(`T20C5E.ModoAtaques.${v}`), selecionado: v === e.modoAtaques })),
      importacao: this.relatorio.map((r) => ({ tipo: r.tipo, rotulo: t(`T20C5E.Rel.${r.tipo}`), texto: r.texto })),
      nds: [], erros: [], previa: null, aviso: null,
    };
    this.pronto = null;

    let p;
    try {
      p = await this.#preparar();
    } catch (erro) {
      console.error(`${ID_CONVERSOR} |`, erro);
      ctx.erros = [erro.message?.startsWith('T20C5E.') ? t(erro.message) : erro.message];
      return ctx;
    }
    if (p.erros) { ctx.erros = this.tocado ? p.erros : []; return ctx; }

    ctx.nds = NDS.map((v) => ({ valor: v, selecionado: v === p.ndFinal }));
    ctx.limiteAtaques = p.limiteAtaques;
    ctx.totalAtaques = p.criatura.ataques.reduce((s, a) => s + a.qtd, 0);
    ctx.referencia = p.ndReferencia;
    ctx.calibrado = p.calculo.nd;
    ctx.usouFormula = p.calculo.usouFormula;
    ctx.ndManual = e.ndManual && p.ndFinal !== p.calculo.nd;

    try {
      const rascunho = new CONFIG.Actor.documentClass(p.dados);
      const itens = rascunho.toObject().items;
      const opcoes = { ...p.opcoes, ataquesPorArma: ataquesPorArmaDe(itens, p.criatura) };
      const idPorIndice = Object.fromEntries(itens.map((i) => [i.flags?.[ID_CONVERSOR]?.indiceAtaque, i._id]));
      const r = await p.api.simular(rascunho, opcoes);
      ctx.previa = this.#montarPrevia(r, p.criatura, idPorIndice);
      // Os poderes do ator seguem a ordem dos poderes da criatura (os sem nome ficam de fora); a linha da tela
      // é a posição entre os que têm nome.
      const idsDosPoderes = itens.filter((i) => i.type === 'poder').map((i) => i._id);
      let seguinte = 0;
      e.habilidades.forEach((h, i) => {
        if (!String(h.nome ?? '').trim()) return;
        const previa = r.poderesPrevia?.find((x) => x.id === idsDosPoderes[seguinte++]);
        ctx.poderes[i].depois = previa?.depois ?? null;
      });
      this.pronto = { dados: p.dados, criatura: p.criatura, ndFinal: p.ndFinal, opcoes: p.opcoes };
    } catch (erro) {
      console.error(`${ID_CONVERSOR} |`, erro);
      ctx.erros = [erro.message];
    }
    return ctx;
  }

  #montarPrevia(r, criatura, idPorIndice) {
    const linha = (rotulo, valor) => ({ rotulo, valor });
    const usaLuta = criatura.ataques.length > 0;
    const linhas = [
      linha('PV', r.update['system.attributes.pv.max']),
      linha('CD', r.update['system.attributes.cd']),
      linha('Defesa (total na ficha)', r.depois.defesa),
      ...(usaLuta ? [linha('Ataque (Luta)', r.depois.pericias.luta)] : []),
      ...Object.entries(TESTES).map(([k, nome]) => linha(nome, r.depois.pericias[k])),
    ];
    const armas = criatura.ataques.map((a, i) => {
      return { nome: a.nome, qtd: a.qtd, formula: r.plano.dano?.porArma?.[idPorIndice[i]]?.formula ?? '—' };
    });
    const poderes = (r.poderesPrevia ?? []).filter((x) => x.depois)
      .map(({ nome, antes, depois }) => ({ nome, antes, depois }));
    return {
      linhas, armas, poderes, danoAlvo: r.plano.linha.Dano,
      avisos: r.avisos, patamar: r.patamar, revisar: r.plano.revisar,
    };
  }

  // ---------- leitura do formulário ----------

  #lerFormulario() {
    this.tocado = true;
    const el = this.element;
    const e = this.estado;
    const valor = (nome) => el.querySelector(`[name=${nome}]`)?.value;
    e.nome = valor('nome') ?? e.nome;
    e.conceito = valor('conceito') ?? e.conceito;
    e.img = valor('img') ?? e.img;
    e.token = valor('token') ?? e.token;
    e.texto5e = valor('texto5e') ?? e.texto5e;
    e.cr = valor('cr') ?? e.cr;
    e.papel = valor('papel') ?? e.papel;
    e.nivelGrupo = valor('nivelGrupo') ?? e.nivelGrupo;
    e.ritmo = valor('ritmo') ?? e.ritmo;
    e.tamanho = valor('tamanho') ?? e.tamanho;
    e.tipo = valor('tipo') ?? e.tipo;
    e.deslocamento = valor('deslocamento') ?? e.deslocamento;
    e.chefeFinal = el.querySelector('[name=chefeFinal]')?.checked ?? e.chefeFinal;
    e.conjurador = el.querySelector('[name=conjurador]')?.checked ?? e.conjurador;
    e.modoAtaques = valor('modoAtaques') ?? e.modoAtaques;
    ATRIBUTOS.forEach((a) => { e.atributos[a] = valor(`atributo-${a}`) ?? e.atributos[a]; });
    e.ordem = [0, 1, 2].map((i) => valor(`ordem-${i}`) ?? e.ordem[i]);
    const ndEscolhido = valor('nd');
    if (ndEscolhido) e.nd = ndEscolhido;
    // As linhas na tela espelham o estado, então lista vazia na tela é lista vazia no estado.
    const anterioresPoderes = e.habilidades;
    e.habilidades = [...el.querySelectorAll('[data-poder]')].map((linha, i) => poderDaTela(anterioresPoderes[i], {
      nome: linha.querySelector('[data-campo-poder=nome]').value,
      texto: linha.querySelector('[data-campo-poder=texto]').value,
      execucao: linha.querySelector('[data-campo-poder=execucao]').value,
      ajustarDano: linha.querySelector('[data-campo-poder=ajustarDano]')?.checked,
      efeito: linha.querySelector('[data-campo-poder=efeito]')?.checked,
    }));
    const linhas = [...el.querySelectorAll('[data-ataque]')];
    if (linhas.length) {
      const anteriores = e.ataques; // a descrição vem da importação e não tem campo na tela
      e.ataques = linhas.map((linha, i) => ({
        nome: linha.querySelector('[data-campo=nome]').value,
        tipo: linha.querySelector('[data-campo=tipo]').value,
        dano: linha.querySelector('[data-campo=dano]').value,
        qtd: linha.querySelector('[data-campo=qtd]').value,
        descricao: anteriores[i]?.descricao ?? '',
        danoExtra: (anteriores[i]?.danoExtra ?? []).map((x, j) => ({
          ...x, tipo: linha.querySelector(`[data-campo-extra=tipo][data-extra="${j}"]`)?.value ?? x.tipo,
        })),
        proporcaoExtra: anteriores[i]?.proporcaoExtra,
        extraNoBalanceamento: linha.querySelector('[data-campo-extra=balanceamento]')?.checked ?? anteriores[i]?.extraNoBalanceamento,
        qtd5e: anteriores[i]?.qtd5e,
      }));
    }
  }

  _onRender() {
    this.element.querySelectorAll('input:not([type=file]), select, textarea').forEach((campo) => {
      campo.addEventListener('change', (ev) => this.#aoMudar(ev));
    });
    this.element.querySelector('[data-importar]')?.addEventListener('change', (ev) => {
      const arquivo = ev.target.files?.[0];
      if (arquivo) this.#importar(arquivo);
    });
    this.element.querySelectorAll('[data-enviar]').forEach((campo) => {
      campo.addEventListener('change', async (ev) => {
        const arquivo = ev.target.files?.[0];
        if (!arquivo) return;
        try {
          const campoImagem = ev.target.dataset.enviar;
          this.estado[campoImagem] = await this.#guardarImagem(new File([arquivo], `${PREFIXO_IMAGEM[campoImagem]}-${arquivo.name}`, { type: arquivo.type }));
        } catch (erro) {
          console.error(`${ID_CONVERSOR} |`, erro);
          ui.notifications.error(`${t('T20C5E.ErroEnviarImagem')}: ${erro.message}`);
        }
        await this.render();
      });
    });
  }

  // Grava a imagem na pasta do módulo (em Data) e devolve o caminho. Precisa da permissão de enviar arquivos.
  async #guardarImagem(arquivo) {
    const FilePicker = foundry.applications.apps.FilePicker.implementation;
    let caminho = '';
    for (const parte of PASTA_IMAGENS.split('/')) { // cria a pasta passo a passo; se já existe, segue
      caminho = caminho ? `${caminho}/${parte}` : parte;
      await FilePicker.createDirectory('data', caminho).catch((erro) => {
        if (!/exist/i.test(erro.message)) console.warn(`${ID_CONVERSOR} | criar pasta ${caminho}:`, erro);
      });
    }
    const resposta = await FilePicker.upload('data', PASTA_IMAGENS, arquivo, {});
    // O Foundry devolve {} sem explicar quando o envio falha por dentro, e false quando já mostrou o erro.
    if (!resposta?.path) throw new Error(resposta?.message ?? t('T20C5E.ErroUploadSemResposta'));
    return resposta.path;
  }

  // Baixa uma URL (o pedido sai do navegador, então o site precisa permitir CORS) e devolve o File.
  async #baixarArquivo(url, campo) {
    let blob;
    let nome;
    try {
      // cache "reload": a mesma URL já carregada como <img> fica no cache sem o cabeçalho de CORS e quebraria este pedido
      const resposta = await fetch(url, { cache: 'reload' });
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      blob = await resposta.blob();
      if (!blob.type.startsWith('image/')) throw new Error(t('T20C5E.ErroNaoImagem'));
      nome = nomeDoArquivo(url, blob.type);
    } catch (erroFetch) {
      if (/^HTTP 4\d\d$/.test(erroFetch.message)) throw erroFetch; // o site respondeu: o endereço não existe, não adianta o plano B
      try {
        blob = await baixarComoImagem(url);
      } catch (erroImagem) {
        throw new Error(`${erroFetch.message}; ${erroImagem.message}`, { cause: erroImagem });
      }
      nome = nomeDoArquivo(url).replace(/\.\w{2,5}$/, '.webp'); // o canvas sempre devolve WebP
    }
    return new File([blob], `${PREFIXO_IMAGEM[campo]}-${nome}`, { type: blob.type });
  }

  // Baixa a imagem da URL e guarda no Foundry; devolve o caminho.
  // `campo` ('img' ou 'token') vira prefixo do nome: o retrato e o token do 5e.tools têm o mesmo nome de arquivo.
  async #trazerDaUrl(url, campo) {
    let arquivo;
    let ultimoErro;
    for (const candidata of urlsCandidatas(url)) { // 5e.tools: tenta antes o equivalente no CDN, que libera CORS
      try {
        arquivo = await this.#baixarArquivo(candidata, campo);
        break;
      } catch (erro) {
        console.warn(`${ID_CONVERSOR} | não baixou ${candidata}:`, erro);
        ultimoErro = erro;
      }
    }
    if (!arquivo) throw new Error(`${t('T20C5E.EtapaBaixar')}: ${ultimoErro.message}`, { cause: ultimoErro });
    try {
      return await this.#guardarImagem(arquivo);
    } catch (erro) {
      throw new Error(`${t('T20C5E.EtapaGuardar')}: ${erro.message}`, { cause: erro });
    }
  }

  // Lê o JSON de um ator de 5e e preenche o formulário; o que não é importado fica como está.
  async #importar(arquivo) {
    await this.#aplicarOrigem(async () => ({ ator: JSON.parse(await arquivo.text()), avisos: [] }));
  }

  // Lê o bloco de estatísticas colado: o parser monta um ator dnd5e de mentira e o lerAtor5e faz o resto, como no JSON.
  async #importarTexto() {
    this.#lerFormulario();
    const texto = this.estado.texto5e;
    await this.#aplicarOrigem(async () => textoParaAtor5e(texto));
  }

  // Passos comuns às duas origens. `ler` devolve { ator, avisos } (ou { ok: false, erro }); o relatório começa pelos avisos.
  async #aplicarOrigem(ler) {
    let resultado;
    let avisos = [];
    try {
      const tabelas = await obterApi().obterTabelas();
      const lido = await ler();
      if (lido.ok === false) { ui.notifications.error(t(lido.erro)); return; }
      avisos = lido.avisos;
      resultado = lerAtor5e(lido.ator, { pvSoloNoND: (nd) => linhaDoND(tabelas.solo, nd).PV });
    } catch (erro) {
      console.error(`${ID_CONVERSOR} |`, erro);
      const msg = erro instanceof SyntaxError ? t('T20C5E.ErroImportarJson')
        : (erro.message?.startsWith('T20C5E.') ? t(erro.message) : erro.message);
      ui.notifications.error(msg);
      return;
    }
    if (!resultado.ok) { ui.notifications.error(t(resultado.erro)); return; }
    this.#lerFormulario();
    const relatorio = [...avisos.map((texto) => ({ tipo: 'revisar', texto })), ...resultado.relatorio];
    const imagens = {}; // só o que abriu; senão fica a escolha que o mestre já tinha
    const candidatos = { // o token do arquivo pode ser de outro mundo; o do CDN do 5e.tools serve de reserva
      img: [resultado.imagens.img],
      token: [resultado.imagens.token, tokenDoCdn5e(resultado.imagens.img)],
    };
    for (const [campo, rotulo] of [['img', 'Retrato'], ['token', 'Token']]) {
      const lista = candidatos[campo].filter(Boolean);
      if (!lista.length) continue;
      let achada = null;
      for (const src of lista) {
        if (await imagemAbre(src)) { achada = src; break; }
      }
      if (achada) {
        imagens[campo] = achada;
        relatorio.push({ tipo: 'ok', texto: `${rotulo}: ${achada}` });
      } else {
        relatorio.push({ tipo: 'revisar', texto: `${rotulo} do arquivo não abre neste mundo (${lista[0]}): escolha outro em Retrato/Token.` });
      }
    }
    if (!resultado.imagens.img && !resultado.imagens.token) {
      relatorio.push({ tipo: 'ignorado', texto: 'imagem e token: o arquivo não traz (escolha-os em Retrato/Token).' });
    }
    Object.assign(this.estado, resultado.estado, imagens, { nd: null, ndManual: false });
    this.relatorio = relatorio;
    await this.render();
  }

  async #aoMudar(ev) {
    const nome = ev.target.name;
    // O texto colado não muda nenhum cálculo: redesenhar no blur trocaria o botão "Ler texto" antes do clique terminar.
    if (nome === 'texto5e') { this.estado.texto5e = ev.target.value; return; }
    this.#lerFormulario();
    if (ev.target.dataset.campo === 'qtd') this.estado.modoAtaques = 'manual'; // editar a quantidade vale como escolha manual
    if (nome === 'nd') this.estado.ndManual = true;
    else if (CAMPOS_QUE_RECALCULAM_ND.includes(nome)) this.estado.ndManual = false;
    await this.render();
  }

  // ---------- ações ----------

  static async #addAtaque() {
    this.#lerFormulario();
    this.estado.ataques.push({ nome: '', tipo: 'cac', dano: 'corte', qtd: 1 });
    await this.render();
  }

  static async #removerAtaque(_ev, alvo) {
    this.#lerFormulario();
    this.estado.ataques.splice(Number(alvo.dataset.indice), 1);
    await this.render();
  }

  static #importar5e() {
    this.element.querySelector('[data-importar]').click();
  }

  static async #lerTexto() {
    await this.#importarTexto();
  }

  static #enviarImagem(_ev, alvo) {
    this.element.querySelector(`[data-enviar=${alvo.dataset.campo}]`).click();
  }

  // Baixa a imagem da URL que está no campo (o navegador faz o pedido) e guarda no Foundry.
  static async #baixarImagem(_ev, alvo) {
    this.#lerFormulario();
    const campo = alvo.dataset.campo;
    const url = String(this.estado[campo] ?? '').trim();
    if (!ehUrl(url)) { ui.notifications.warn(t('T20C5E.AvisoSemUrl')); return; }
    try {
      this.estado[campo] = await this.#trazerDaUrl(url, campo);
      ui.notifications.info(game.i18n.format('T20C5E.ImagemSalva', { caminho: this.estado[campo] }));
    } catch (erro) {
      console.error(`${ID_CONVERSOR} |`, erro);
      ui.notifications.error(`${t('T20C5E.ErroBaixarImagem')} (${erro.message}) ${t('T20C5E.DicaBaixar')}`);
    }
    await this.render();
  }

  // `data-campo` diz se a imagem escolhida é o retrato (img) ou o token.
  static async #escolherImagem(_ev, alvo) {
    this.#lerFormulario();
    const campo = alvo.dataset.campo;
    new foundry.applications.apps.FilePicker.implementation({
      type: 'image',
      current: this.estado[campo],
      callback: (caminho) => { this.estado[campo] = caminho; this.render(); },
    }).render(true);
  }

  static async #addPoder() {
    this.#lerFormulario();
    this.estado.habilidades.push({ nome: '', texto: '', execucao: '' });
    await this.render();
  }

  static async #removerPoder(_ev, alvo) {
    this.#lerFormulario();
    this.estado.habilidades.splice(Number(alvo.dataset.indice), 1);
    await this.render();
  }

  static async #cancelar() {
    await this.close();
  }

  // Atributo de cada perícia = o da regra (Fortitude = Constituição...). Grava o system.pericias inteiro: o sistema Tormenta20
  // preenche com os valores padrão (atributo "for", outros 0) o que falta numa perícia atualizada por caminho parcial.
  async #normalizarPericias(ator) {
    const pericias = ator.toObject().system.pericias;
    let mudou = false;
    for (const [chave, regra] of Object.entries(CONFIG.T20.pericias)) {
      if (pericias[chave] && regra.abl && pericias[chave].atributo !== regra.abl) { pericias[chave].atributo = regra.abl; mudou = true; }
    }
    if (mudou) await ator.update({ 'system.pericias': pericias });
  }

  // O ajuste de ND troca o bônus e o dano das armas; o texto da 5e na descrição passa a mostrar os valores finais.
  async #atualizarTextoDasArmas(ator) {
    const mudancas = ator.items.filter((i) => i.type === 'arma').map((arma) => {
      const rolls = arma.system.rolls;
      const pericia = rolls.find((r) => r.type === 'ataque')?.parts?.[1]?.[0] || 'luta';
      const partes = (rolls.find((r) => r.type === 'dano')?.parts ?? []).filter((p, i) => i !== 1);
      return { _id: arma.id, 'system.description.value': descricaoDeArma(arma.system.description.value, ator.system.pericias[pericia].value, partes) };
    });
    if (mudancas.length) await ator.updateEmbeddedDocuments('Item', mudancas);
  }

  static async #criar() {
    this.#lerFormulario();
    // O ator não fica com link remoto: o navegador e módulos como o Tokenizer só carregam imagens que o site libera (CORS).
    for (const campo of ['img', 'token']) {
      const url = String(this.estado[campo] ?? '').trim();
      if (!ehUrl(url)) continue;
      try {
        this.estado[campo] = await this.#trazerDaUrl(url, campo);
      } catch (erro) {
        console.error(`${ID_CONVERSOR} |`, erro);
        ui.notifications.warn(`${t('T20C5E.AvisoImagemFicouUrl')} (${erro.message}) ${t('T20C5E.DicaBaixar')}`);
      }
    }
    await this.render(); // recalcula e preenche this.pronto
    if (!this.pronto) return;
    const { dados, criatura, opcoes } = this.pronto;

    let ator;
    try {
      const api = obterApi();
      const pasta = game.folders.find((f) => f.type === 'Actor' && f.name === NOME_PASTA)
        ?? await Folder.create({ name: NOME_PASTA, type: 'Actor' });
      ator = await Actor.create({ ...dados, folder: pasta.id });
      await this.#normalizarPericias(ator);
      // Duas passadas: a segunda calibra de novo sobre o ator como ele ficou, para o que a ficha mostra bater com a tabela.
      for (let passada = 0; passada < 2; passada++) {
        const resultado = await api.simular(ator, {
          ...opcoes, ataquesPorArma: ataquesPorArmaDe(ator.toObject().items, criatura),
        });
        await api.aplicarAjuste(ator, resultado, { copiar: false });
        if (passada === 1) await this.#atualizarTextoDasArmas(ator);
        console.info(`${ID_CONVERSOR} | perícias após a passada ${passada + 1}: ${['luta', 'fort', 'refl', 'vont']
          .map((k) => `${k}=${ator.system.pericias[k].atributo}/outros ${ator.system.pericias[k].outros}/total ${ator.system.pericias[k].value}`).join('; ')}`);
      }
    } catch (erro) {
      console.error(`${ID_CONVERSOR} |`, erro);
      if (ator) await ator.delete().catch(() => {});
      ui.notifications.error(`${t('T20C5E.ErroCriar')}: ${erro.message}`);
      return;
    }
    ui.notifications.info(game.i18n.format('T20C5E.Criado', { nome: ator.name }));
    await this.close();
    ator.sheet?.render(true);
  }
}

export function abrirConversor() {
  try { obterApi(); } catch (erro) {
    ui.notifications.error(t(erro.message));
    return null;
  }
  return new DialogoConversor().render({ force: true });
}
