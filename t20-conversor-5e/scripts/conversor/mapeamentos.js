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
