// Modelos de ator (NPC) e de itens do sistema Tormenta20 v1.5.x.
// Portado do foundryTemplate.js do Crias de Megalokk (mesmo autor). Funções puras.
// As armas usam o formato de rolagens das fichas oficiais: ["1d20","",""], [perícia,"",""], ["0","",""].

// [chave, atributo, st (só treinada), pda, size]
const PERICIAS_DEF = [
  ['acro', 'des', false, true, false], ['ades', 'car', true, false, false],
  ['atle', 'for', false, false, false], ['atua', 'car', true, false, false],
  ['cava', 'des', false, false, false], ['conh', 'int', true, false, false],
  ['cura', 'sab', false, false, false], ['dipl', 'car', false, false, false],
  ['enga', 'car', false, false, false], ['fort', 'con', false, false, false],
  ['furt', 'des', false, true, true], ['guer', 'int', true, false, false],
  ['inic', 'des', false, false, false], ['inti', 'car', false, false, false],
  ['intu', 'sab', false, false, false], ['inve', 'int', false, false, false],
  ['joga', 'car', true, false, false], ['ladi', 'des', true, true, false],
  ['luta', 'for', false, false, false], ['mist', 'int', true, false, false],
  ['nobr', 'int', true, false, false], ['perc', 'sab', false, false, false],
  ['pilo', 'des', true, false, false], ['pont', 'des', false, false, false],
  ['refl', 'des', false, false, false], ['reli', 'sab', true, false, false],
  ['sobr', 'sab', false, false, false], ['vont', 'sab', false, false, false],
  ['alfa', 'int', true, false, false], ['alqu', 'int', true, false, false],
  ['arme', 'int', true, false, false], ['arte', 'int', true, false, false],
  ['cozi', 'int', true, false, false], ['enge', 'int', true, true, false],
];

const TIPOS_RESISTENCIA = [
  'dano', 'perda', 'acido', 'corte', 'eletricidade', 'essencia', 'fogo',
  'frio', 'impacto', 'luz', 'psiquico', 'perfuracao', 'trevas',
];

const criarPericia = ([, atributo, st, pda, size]) => ({
  atributo, treinado: false, st, pda, size,
  value: 0, outros: 0, condi: 0, bonus: [], custom: false, label: '',
});
const criarAtributo = () => ({ value: 0, base: 0, racial: 0, bonus: 0 });
const criarResistencia = () => ({
  value: 0, base: 0, bonus: [], excecao: 0,
  imunidade: false, vulnerabilidade: false, danoPorDado: false,
});

export function criarActorTemplate() {
  const pericias = {};
  PERICIAS_DEF.forEach((def) => { pericias[def[0]] = criarPericia(def); });
  const resistencias = {};
  TIPOS_RESISTENCIA.forEach((t) => { resistencias[t] = criarResistencia(); });

  return {
    name: '',
    type: 'npc',
    img: 'systems/tormenta20/icons/svg/orc-head.svg',
    system: {
      atributos: {
        for: criarAtributo(), des: criarAtributo(), con: criarAtributo(),
        int: criarAtributo(), sab: criarAtributo(), car: criarAtributo(),
      },
      attributes: {
        carga: { value: 0, atributo: 'for', base: 10, bonus: [], limit: 0, max: 0, pct: 0, encumbered: false },
        cd: 10,
        conjuracao: 'int',
        defesa: { atributo: 'des', pda: 0, value: 10, base: 10, outros: 0, condi: 0, bonus: [] },
        movement: {
          walk: { base: 9, bonus: [] }, climb: { base: 0, bonus: [] },
          burrow: { base: 0, bonus: [] }, swim: { base: 0, bonus: [] },
          fly: { base: 0, bonus: [] }, hover: false, unit: 'm', tags: [],
        },
        nivel: { value: 0, xp: { value: 0, pct: 0, proximo: 0 } },
        pv: { value: 0, temp: 0, min: 0, max: 0 },
        pm: { value: 0, temp: 0, min: 0, max: 0 },
        sentidos: { value: [] },
        treino: 0,
        nd: '1',
      },
      detalhes: {
        origem: '', divindade: '', raca: '', tipo: 'mon',
        biography: { value: '', public: '' },
        equipamento: '', resistencias: '', movimento: '',
        ataquescac: '', ataquesad: '', tesouro: '', role: 'solo',
      },
      dinheiro: { tc: 0, tl: 0, to: 0, tp: 0 },
      modificadores: {
        custoPM: 0,
        atributos: { for: [], des: [], con: [], int: [], sab: [], car: [], fisicos: [], mentais: [], geral: [] },
        ataque: { geral: [], cac: [], ad: [] },
        cura: { geral: [], mag: [] },
        dano: { ad: [], alq: [], cac: [], geral: [], mag: [] },
        pericias: { geral: [], resistencia: [], semataque: [], ataque: [], atr: { for: [], des: [], con: [], int: [], sab: [], car: [] } },
      },
      pericias,
      resources: {
        primary: { value: 0, max: 0, label: 'Recurso 1' },
        secondary: { value: 0, max: 0, label: 'Recurso 2' },
        tertiary: { value: 0, max: 0, label: 'Recurso 3' },
        deathsave: { value: 0, max: 3, label: 'Falha na Morte' },
        shadow: { value: 0, max: 5, label: 'Pontos de Sombra' },
        catarse: { value: 0, max: 3, label: 'Catarse' },
      },
      tracos: {
        ic: { value: [] }, idiomas: { value: [] },
        profArmaduras: { value: [] }, profArmas: { value: [] },
        resistencias, tamanho: 'med',
      },
    },
    prototypeToken: {
      name: '', displayName: 0, actorLink: false, width: 1, height: 1,
      texture: {
        src: 'systems/tormenta20/icons/svg/orc-head.svg',
        anchorX: 0.5, anchorY: 0.5, offsetX: 0, offsetY: 0, fit: 'contain',
        scaleX: 1, scaleY: 1, rotation: 0, tint: '#ffffff', alphaThreshold: 0.75,
      },
      lockRotation: false, rotation: 0, alpha: 1, disposition: -1,
      displayBars: 0,
      bar1: { attribute: 'attributes.pv' }, bar2: { attribute: 'attributes.pm' },
      light: {
        negative: false, priority: 0, alpha: 0.5, angle: 360, bright: 0,
        color: null, coloration: 1, dim: 0, attenuation: 0.5, luminosity: 0.5,
        saturation: 0, contrast: 0, shadows: 0,
        animation: { type: null, speed: 5, intensity: 5, reverse: false },
        darkness: { min: 0, max: 1 },
      },
      sight: {
        enabled: false, range: 0, angle: 360, visionMode: 'basic', color: null,
        attenuation: 0.1, brightness: 0, saturation: 0, contrast: 0,
      },
      detectionModes: [], occludable: { radius: 0 },
      ring: { enabled: false, colors: { ring: null, background: null }, effects: 1, subject: { scale: 1, texture: null } },
      turnMarker: { mode: 1, animation: null, src: null, disposition: false },
      movementAction: null, flags: {}, randomImg: false,
      appendNumber: false, prependAdjective: false,
    },
    items: [],
    effects: [],
    folder: null,
    flags: {},
    ownership: { default: 0 },
  };
}

// Poder no formato das fichas oficiais. Sem `dano` ele só tem texto e o mestre liga as rolagens à mão; com `dano`
// ([{ formula, tipo }]) leva uma rolagem de dano real, e `resistenciaTxt` ("Reflexos Metade") vai no teste de resistência.
export function criarItemPoder({ nome, descricao = '', execucao = '', dano = [], resistenciaTxt = '' }) {
  return {
    name: nome,
    type: 'poder',
    img: 'icons/svg/aura.svg',
    system: {
      description: { value: descricao, unidentified: '' },
      source: '',
      ativacao: { execucao, custo: 0, qtd: '', condicao: '', special: '' },
      duracao: { value: 0, units: 'inst', special: '' },
      range: { value: null, units: '' },
      efeito: '', alcance: 'none', area: '',
      resistencia: { pericia: '', atributo: '', bonus: 0, txt: resistenciaTxt },
      rolls: dano.length
        ? [{ name: 'Dano', key: 'dano0', type: 'dano', parts: dano.map((d) => [d.formula, d.tipo, '']), versatil: '', adaptavel: '' }]
        : [],
      tipo: 'ability', subtipo: '',
      origin: '', tags: [], chatFlavor: '', chatGif: '', rolltags: [], automationtags: [],
    },
    effects: [], folder: null, sort: 0, flags: {}, ownership: { default: 0 },
  };
}

// Item de arma. `distancia` troca propósito, alcance e propriedades; `tipoDano` é uma chave de dano do sistema.
export function criarItemArma({ nome, distancia = false, tipoDano = 'corte', ataques = 1, pericia = 'luta', descricao = '', danoExtra = [] }) {
  return {
    name: nome,
    type: 'arma',
    img: 'icons/svg/sword.svg',
    system: {
      description: { value: descricao, unidentified: '' },
      source: '',
      ativacao: { execucao: 'passive', custo: 0, qtd: '', condicao: '', special: '' },
      alcance: distancia ? 'medium' : '',
      resistencia: { pericia: '', atributo: '', bonus: 0, txt: '' },
      origin: '', tags: [], chatFlavor: '', chatGif: '', rolltags: [], automationtags: [],
      carregado: true, espacos: 0, peso: 0, qtd: 1, preco: 0,
      pv: { value: 0, max: 0 }, rd: 0,
      ataques,
      equipado: 1, equipado2: { slot: 0, type: '' },
      tipoUso: 'sim', proficiencia: 'simples',
      proposito: distancia ? 'disparo' : 'corpo-a-corpo',
      empunhadura: 'uma', criticoM: 20, criticoX: 2,
      propriedades: distancia ? { ataqueDistancia: true } : {},
      size: 'normal',
      upgrades: {
        melhoria1: '', melhoria2: '', melhoria3: '', melhoria4: '',
        material: '', encanto1: '', encanto2: '', encanto3: '',
      },
      enableAutoUpgrades: true,
      rolls: [
        { name: 'Ataque', key: 'ataque0', type: 'ataque', adaptavel: '', parts: [['1d20', '', ''], [pericia, '', ''], ['0', '', '']] },
        // Na arma, parts[1] é o atributo somado ao dano (campo da ficha, fica vazio); o dano adicional começa em parts[2].
        { name: 'Dano', key: 'dano1', type: 'dano', adaptavel: '', parts: [['1d6', tipoDano, ''], ['', '', ''], ...danoExtra.map((d) => [d.formula, d.tipo, ''])] },
      ],
    },
    effects: [], folder: null, sort: 0, flags: {}, ownership: { default: 0 },
  };
}
