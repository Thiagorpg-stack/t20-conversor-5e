// Mapeamentos de D&D 5e para Tormenta20: CR de referência, tamanho, tipo, tipos de dano,
// deslocamento e atributos. Funções puras, sem dependência do Foundry.
//
// Códigos do sistema Tormenta20 conferidos no foundryTemplate.js do Crias de Megalokk:
//   tipo:    ani, con, esp, hum, mon, mor
//   tamanho: min, peq, med, gra, eno, col
//   dano:    acido, corte, eletricidade, essencia, fogo, frio, impacto, luz, psiquico,
//            perfuracao, trevas, perda, dano

// ---------- Códigos do sistema ----------

export const CODIGOS_TAMANHO = ['min', 'peq', 'med', 'gra', 'eno', 'col'];
export const CODIGOS_TIPO = ['ani', 'con', 'esp', 'hum', 'mon', 'mor'];
export const CHAVES_DANO = [
  'acido', 'corte', 'eletricidade', 'essencia', 'fogo', 'frio', 'impacto', 'luz',
  'psiquico', 'perfuracao', 'trevas', 'perda', 'dano',
];

// ---------- ND e CR ----------

// Mesma regra do Ajustar ND (tabelas.js): '1/4' = 0,25; '1/2' = 0,5; 'S' = 21; 'S+' = 22.
export function valorND(nd) {
  const texto = String(nd).trim();
  if (texto === '1/4') return 0.25;
  if (texto === '1/2') return 0.5;
  if (texto === 'S') return 21;
  if (texto === 'S+') return 22;
  const n = parseInt(texto, 10);
  return Number.isNaN(n) ? 0 : n;
}

// Aceita número ou texto ("1/8", "1/4", "1/2", "3"). Devolve número ou NaN.
export function parseCR(cr) {
  if (typeof cr === 'number') return cr;
  const texto = String(cr).trim();
  const fracao = /^(\d+)\s*\/\s*(\d+)$/.exec(texto);
  if (fracao) return Number(fracao[1]) / Number(fracao[2]);
  return /^\d+(\.\d+)?$/.test(texto) ? Number(texto) : NaN;
}

// ND em "potência pura": o ND que a criatura teria no ritmo T20 (1 a 2 combates por descanso).
// CR 0, 1/8 e 1/4 → 1/4; 1/2 → 1/2; 1 a 20 → igual; 21 a 25 → S; 26 ou mais → S+.
export function ndDeReferencia(cr) {
  const valor = parseCR(cr);
  if (Number.isNaN(valor)) throw new Error(`CR inválido: "${cr}"`);
  if (valor <= 0.25) return '1/4';
  if (valor <= 0.5) return '1/2';
  if (valor <= 20) return String(Math.round(valor));
  if (valor <= 25) return 'S';
  return 'S+';
}

// ---------- Atributos ----------

// T20 guarda o modificador direto (não o valor de 1 a 30).
export const modificadorAtributo = (valor) => Math.floor((Number(valor) - 10) / 2);

// ---------- Deslocamento ----------

// pés × 0,3, arredondado ao múltiplo de 1,5 m mais próximo (30 pés = 9 m; 60 pés = 18 m).
export function pesParaMetros(pes) {
  const metros = (Number(pes) * 3) / 10;
  return Math.round(metros / 1.5) * 1.5;
}

// Distâncias e áreas do texto em termos do T20: áreas em metros (linha, cone, esfera...) e alcances em curto, médio e longo.
const FORMAS = { line: 'linha', cone: 'cone', sphere: 'esfera', cube: 'cubo', cylinder: 'cilindro', emanation: 'emanação' };
const emMetros = (pes) => `${String(pesParaMetros(pes)).replace('.', ',')} m`;
// Até 10 pés é alcance de toque ou adjacente e vira metros; acima, vale a categoria: até 30 pés curto, até 90 médio, mais que isso longo.
const alcanceT20 = (pes) => (pes <= 10 ? emMetros(pes) : pes <= 30 ? 'alcance curto' : pes <= 90 ? 'alcance médio' : 'alcance longo');

export function termosT20(texto) {
  return String(texto ?? '')
    .replace(/(\d+)-foot-radius (Sphere|Cylinder|Emanation)\b/gi, (_, n, f) => `${FORMAS[f.toLowerCase()]} de ${emMetros(n)} de raio`)
    .replace(/(\d+)-foot-long,? (?:and )?(\d+)-foot-wide Line\b/gi, (_, c, l) => `linha de ${emMetros(c)} de comprimento e ${emMetros(l)} de largura`)
    .replace(/(\d+)-foot (Cone|Cube|Sphere|Cylinder|Emanation|Line)\b/gi, (_, n, f) => `${FORMAS[f.toLowerCase()]} de ${emMetros(n)}${/cube/i.test(f) ? ' de lado' : ''}`)
    // "120 ft. Hit": o ponto de "ft." fica quando ele fecha a frase
    .replace(/(?<!×\s*)\b(\d+)(?:-|\s*)(?:feet|foot|ft)(\.)?(?![\w-])/gi, (todo, n, ponto, pos, texto) => `${alcanceT20(Number(n))}${ponto && /^(\s+[A-Z]|$)/.test(texto.slice(pos + todo.length)) ? '.' : ''}`)
    .replace(/\b(cone|sphere|cube|cylinder|emanation)\b/gi, (f) => FORMAS[f.toLowerCase()])
    .replace(/\bLine\b(?! of)/g, 'linha');
}

// Campo "área" do poder, como nos poderes oficiais ("cubo 3m de lado"), a partir do modelo de área do dnd5e ({ type, size, width, units }).
export function areaT20({ type, size, width, units } = {}) {
  const metros = (n) => String(units === 'm' ? n : pesParaMetros(n)).replace('.', ',');
  if (!type || !(Number(size) > 0)) return '';
  const forma = {
    line: () => `linha ${metros(size)}m x ${metros(width || 5)}m`, cone: () => `cone ${metros(size)}m`,
    sphere: () => `esfera ${metros(size)}m de raio`, radius: () => `esfera ${metros(size)}m de raio`,
    cylinder: () => `cilindro ${metros(size)}m de raio`, cube: () => `cubo ${metros(size)}m de lado`, emanation: () => `emanação ${metros(size)}m`,
  }[type];
  return forma ? forma() : '';
}

// Condições da 5e em texto livre (imunidades "charmed (with Mind Blank)") pelos nomes do T20.
const CONDICOES_T20 = {
  blinded: 'cego', charmed: 'enfeitiçado', deafened: 'surdo', diseased: 'doente', exhaustion: 'exausto', frightened: 'apavorado',
  grappled: 'agarrado', paralyzed: 'paralisado', petrified: 'petrificado', poisoned: 'envenenado', prone: 'caído',
  restrained: 'enredado', stunned: 'atordoado', unconscious: 'inconsciente',
};
export const condicoesT20 = (texto) => String(texto ?? '').replace(new RegExp(String.raw`\b(${Object.keys(CONDICOES_T20).join('|')})\b`, 'gi'), (c) => CONDICOES_T20[c.toLowerCase()]);

// ---------- Tamanho ----------

const TAMANHOS = {
  tiny: 'min', small: 'peq', medium: 'med', large: 'gra', huge: 'eno', gargantuan: 'col',
  // códigos do sistema dnd5e
  sm: 'peq', med: 'med', lg: 'gra', grg: 'col',
};

export function mapearTamanho(tamanho) {
  const chave = String(tamanho).trim().toLowerCase();
  const codigo = TAMANHOS[chave];
  return codigo ? { codigo, revisar: false } : { codigo: 'med', revisar: true };
}

// ---------- Tipo da criatura ----------

const TIPOS = {
  beast: { codigo: 'ani', revisar: false },
  construct: { codigo: 'con', revisar: false },
  undead: { codigo: 'mor', revisar: false },
  humanoid: { codigo: 'hum', revisar: false },
  // sugestões: o mestre confirma na prévia
  celestial: { codigo: 'esp', revisar: true },
  elemental: { codigo: 'esp', revisar: true },
  fey: { codigo: 'esp', revisar: true },
  fiend: { codigo: 'esp', revisar: true },
  aberration: { codigo: 'mon', revisar: false },
  dragon: { codigo: 'mon', revisar: false },
  giant: { codigo: 'mon', revisar: false },
  monstrosity: { codigo: 'mon', revisar: false },
  ooze: { codigo: 'mon', revisar: false },
  plant: { codigo: 'mon', revisar: false },
};

export function mapearTipo(tipo) {
  const chave = String(tipo).trim().toLowerCase();
  return TIPOS[chave] ?? { codigo: 'mon', revisar: true };
}

// ---------- Tipos de dano ----------

const TIPOS_DANO = {
  bludgeoning: { chave: 'impacto', revisar: false },
  piercing: { chave: 'perfuracao', revisar: false },
  slashing: { chave: 'corte', revisar: false },
  fire: { chave: 'fogo', revisar: false },
  cold: { chave: 'frio', revisar: false },
  acid: { chave: 'acido', revisar: false },
  lightning: { chave: 'eletricidade', revisar: false },
  necrotic: { chave: 'trevas', revisar: false },
  radiant: { chave: 'luz', revisar: false },
  psychic: { chave: 'psiquico', revisar: false },
  // aproximações: ficam marcadas para revisão
  force: { chave: 'essencia', revisar: true },
  thunder: { chave: 'impacto', revisar: true },
  poison: { chave: 'dano', revisar: true },
};

export function mapearTipoDano(tipo) {
  const chave = String(tipo).trim().toLowerCase();
  return TIPOS_DANO[chave] ?? { chave: 'dano', revisar: true };
}

// ---------- Papel ----------

// A API do Ajustar ND usa os códigos do sistema (solo, lackey, special);
// as tabelas e o conversor usam as chaves da tabela (solo, lacaio, especial).
const PAPEL_DO_SISTEMA = { solo: 'solo', lacaio: 'lackey', lackey: 'lackey', especial: 'special', special: 'special' };

export function papelDoSistema(papel) {
  const codigo = PAPEL_DO_SISTEMA[String(papel).trim().toLowerCase()];
  if (!codigo) throw new Error(`Papel desconhecido: "${papel}"`);
  return codigo;
}

// ---------- Texto ----------

// O Ajustar ND só reconhece "CD" (CD 17). O texto de 5e usa "DC 15".
export function trocarDCporCD(texto) {
  return String(texto ?? '').replace(/\bDC(\s*\d+)/g, 'CD$1');
}

// ---------- Teste de resistência ----------

// Todo teste de resistência do T20 é Fortitude, Reflexos ou Vontade: Força e Constituição → Fortitude, Destreza → Reflexos,
// Sabedoria → Vontade; Carisma e Inteligência também viram Vontade (padrão assumido, a mestre pode trocar).
const PERICIA_DO_ATRIBUTO_5E = { str: 'fort', dex: 'refl', con: 'fort', wis: 'vont', cha: 'vont', int: 'vont' };
const ATRIBUTO_5E_POR_NOME = { strength: 'str', dexterity: 'dex', constitution: 'con', wisdom: 'wis', charisma: 'cha', intelligence: 'int' };
export const NOME_DA_PERICIA = { atle: 'Atletismo', refl: 'Reflexos', fort: 'Fortitude', vont: 'Vontade' };

// 'dex' → 'refl'. Atributo desconhecido: null.
export const periciaDoAtributo5e = (atributo) => PERICIA_DO_ATRIBUTO_5E[String(atributo ?? '').trim().toLowerCase()] ?? null;
export const ehAtributoPadraoDeVontade = (atributo) => ['cha', 'int'].includes(String(atributo ?? '').trim().toLowerCase());

// "Constitution Saving Throw" → "Fortitude".
export function trocarTesteResistencia(texto) {
  return String(texto ?? '').replace(/\b(Strength|Dexterity|Constitution|Wisdom|Charisma|Intelligence)\s+Saving\s+Throw\b/gi,
    (_, nome) => NOME_DA_PERICIA[periciaDoAtributo5e(ATRIBUTO_5E_POR_NOME[nome.toLowerCase()])]);
}

// Textos em português do SRD: no Tormenta20 "salvaguarda" é teste de resistência, e o atributo vira a categoria do teste.
// "Salvaguarda de Constituição: CD 14" → "Teste de Fortitude: CD 14"; "uma salvaguarda" → "um teste de resistência";
// "salvaguardas de Inteligência, Sabedoria e Carisma" → "testes de Vontade"; "teste de resistência de Destreza" → "teste de Reflexos".
const ATRIBUTO_5E_POR_NOME_PT = { 'força': 'str', destreza: 'dex', 'constituição': 'con', 'inteligência': 'int', sabedoria: 'wis', carisma: 'cha' };
const ATRIBUTO_PT = 'Força|Destreza|Constituição|Inteligência|Sabedoria|Carisma';
const LISTA_ATRIBUTO_PT = `(?:${ATRIBUTO_PT})(?:(?:, | e )(?:${ATRIBUTO_PT}))*`;
const ARTIGO_MASCULINO = { uma: 'um', numa: 'num', na: 'no', nas: 'nos', da: 'do', das: 'dos', pela: 'pelo', pelas: 'pelos', 'às': 'aos', a: 'o', as: 'os' };
const categoriasPt = (lista) => [...new Set(lista.split(/, | e /).map((nome) => NOME_DA_PERICIA[periciaDoAtributo5e(ATRIBUTO_5E_POR_NOME_PT[nome.toLowerCase()])]))];
const juntar = (itens) => (itens.length > 1 ? `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}` : itens[0]);
const maiuscula = (palavra) => palavra[0].toUpperCase() + palavra.slice(1);

export function trocarSalvaguardaPt(texto) {
  // O `\b` não vê o "à" como letra, então o artigo vem de um lookbehind Unicode (flag `u`).
  const salvaguarda = new RegExp(String.raw`(?:(?<![\p{L}])(uma|numa|nas?|das?|pelas?|às|as?)\s+)?\b(salvaguardas?)\b(?: de (${LISTA_ATRIBUTO_PT}))?`, 'giu');
  const testeDeResistencia = new RegExp(String.raw`\b(testes? de resistência) de (${LISTA_ATRIBUTO_PT})`, 'gi');
  return String(texto ?? '')
    .replace(salvaguarda, (_, artigo, nome, lista) => {
      const teste = `${/^S/.test(nome) ? 'T' : 't'}este${/s$/i.test(nome) ? 's' : ''} de ${lista ? juntar(categoriasPt(lista)) : 'resistência'}`;
      if (!artigo) return teste;
      const masculino = ARTIGO_MASCULINO[artigo.toLowerCase()];
      return `${/^[A-ZÀ]/.test(artigo) ? maiuscula(masculino) : masculino} ${teste}`;
    })
    .replace(testeDeResistencia, (_, termo, lista) => `${/^T/.test(termo) ? 'T' : 't'}este${/^testes/i.test(termo) ? 's' : ''} de ${juntar(categoriasPt(lista))}`);
}
