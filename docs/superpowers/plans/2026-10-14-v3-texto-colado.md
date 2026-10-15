# v3: bloco de estatísticas colado como texto — Plano de implementação

> **Para agentes:** SUB-HABILIDADE OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa por tarefa. Os passos usam caixas `- [ ]` para acompanhar.

**Objetivo:** o mestre cola o texto de uma criatura de D&D 5e (inglês ou português, layouts 2014 e 2024) e o formulário do conversor é preenchido como na importação de JSON (v2).

**Arquitetura:** um parser puro (`origem-texto.js`) lê o texto e monta um ator dnd5e "de mentira", no formato que o `lerAtor5e` (v2) já lê; o `lerAtor5e` faz toda a conversão. O diálogo ganha um campo de texto e reparte o `#importar` em duas origens que compartilham `#aplicarOrigem`.

**Tecnologia:** JavaScript ES modules, `node --test` (sem dependências), Foundry VTT v13+ (ApplicationV2 + Handlebars).

**Spec:** `docs/superpowers/specs/2026-10-14-v3-texto-colado-design.md`

**Branch:** `versao-0.5.0` (já criada, com a spec commitada). Todos os comandos rodam na raiz do repositório.

## Restrições globais

- Versão alvo **0.5.0** (`module.json` e `package.json`).
- Compatibilidade do módulo inalterada: Foundry v13 ou mais recente; sistema Tormenta20 1.5.0+; Ajustar ND 0.10.0+.
- **Nenhuma dependência nova.** Os testes rodam com `npm test` (`node --test`), sem o Foundry.
- `origem-texto.js` é **puro**: sem Foundry, sem `game`, sem `ui`, importável em Node.
- **Nada de texto de livro no repositório.** Os testes versionados usam criaturas inventadas; blocos copiados de livro ficam em `tests/fixtures/*.txt`, que o `.gitignore` já ignora (feito no commit da spec).
- O código da v2 só muda em dois lugares: `quantidadeNoMultiataque` (Tarefa 1) e a repartição do `#importar` no diálogo (Tarefa 3).
- Textos da tela em `lang/pt-BR.json`, chaves `T20C5E.*`; nenhuma chave pode ser prefixo de outra seguida de ponto (o `lang.test.js` confere).
- Código e comentários em português, no estilo do código vizinho; comentário só para o porquê. Um atalho com limite conhecido leva `shortcut: <limite>, <quando trocar>`.
- Mensagens de commit em português, no formato `Versão 0.5.0: ...` (como `Versão 0.4.2: ...`).

## Foco da revisão

O que a spec implica mas as tarefas de código não cobrem por acaso; cada linha tem o teste que a fixa, na Tarefa 2:

1. **Texto copiado da web ou do Word** (CRLF, espaço não separável, aspas e travessões tipográficos, "—" no campo Idiomas): o bloco de "bordas" e o teste de `normalizar`.
2. **Ações Lendárias sem a quantidade no texto**: deve assumir 3 e avisar, não falhar.
3. **Deslocamento e sentidos em metros com vírgula** ("4,5 m"): o deslocamento sai certo e o sentido sem equivalente em T20 aparece em pés no relatório.
4. **PDF**: nome em maiúsculas, palavra hifenizada, linha de lista de magias e dano que continua na linha seguinte não podem virar habilidade falsa nem perder dano.
5. **Texto que não é ficha** (vazio, `undefined`, frase solta): erro `T20C5E.ErroTexto` e o formulário não é tocado; bloco incompleto (sem atributos) é aceito com aviso.

Limites conhecidos, sem teste porque ficam fora do escopo: duas criaturas coladas juntas (as linhas da segunda viram habilidades da primeira); colunas misturadas de PDF; o texto do poder em português continua dizendo "teste de resistência de Destreza" (só o inglês é trocado por "Reflexos"; o campo de resistência do poder sai certo).

---

### Tarefa 1: Multiataque em português

**Arquivos:**
- Modificar: `scripts/conversor/origem-json.js` (constante `QUANTIDADES` e função `quantidadeNoMultiataque`)
- Testar: `tests/origem-json.test.js`

**Interfaces:**
- Consome: nada.
- Produz: `quantidadeNoMultiataque(texto, nome)` passa a devolver a quantidade também para "dois ataques de Mordida" e "um ataque com a Garra" (a Tarefa 2 depende disso: o bloco PT 2014 usa "dois ataques de Mordida").

- [ ] **Passo 1: Escrever o teste que falha**

Em `tests/origem-json.test.js`, logo depois do teste `multiataque: lê a quantidade de cada ataque pelo nome`, acrescente:

```js
test('multiataque em português: "dois ataques de Mordida" e "um ataque com a Garra"', () => {
  const texto = 'O filhote faz dois ataques de Mordida e um ataque com a Garra. Três ataques de Cauda.';
  assert.equal(quantidadeNoMultiataque(texto, 'Mordida'), 2);
  assert.equal(quantidadeNoMultiataque(texto, 'Garra'), 1);
  assert.equal(quantidadeNoMultiataque(texto, 'Cauda'), 3);
  assert.equal(quantidadeNoMultiataque(texto, 'Chifre'), null);
});
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `node --test tests/origem-json.test.js`
Expected: FAIL no teste novo (`null !== 2`); os demais passam.

- [ ] **Passo 3: Implementar**

Em `scripts/conversor/origem-json.js`, troque a linha de `QUANTIDADES`:

```js
const QUANTIDADES = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
```

por:

```js
const QUANTIDADES = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
};
```

E troque a função inteira, comentário incluído (o comentário atual começa com `// "one Bite attack and two Tentacle attacks → ...` e a função termina em `return QUANTIDADES[m[1].toLowerCase()] ?? Number(m[1]);\n}`):

```js
// "one Bite attack and two Tentacle attacks" → { Bite: 1, Tentacle: 2 }; em português, "um ataque de Mordida e dois ataques de
// Tentáculo". Sem correspondência: null.
export function quantidadeNoMultiataque(texto, nome) {
  const escapado = String(nome).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`\\b(one|two|three|four|five|six|seven|eight|nine|ten|\\d+)\\s+(?:(?:melee|ranged|weapon)\\s+)?${escapado}s?\\b`, 'i').exec(texto)
    ?? new RegExp(`\\b(uma?|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez|\\d+)\\s+ataques?\\s+(?:de|com)\\s+(?:o\\s+|a\\s+)?${escapado}s?\\b`, 'i').exec(texto);
  if (!m) return null;
  return QUANTIDADES[m[1].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')] ?? Number(m[1]);
}
```

- [ ] **Passo 4: Rodar e ver passar**

Run: `npm test`
Expected: todos passam (101 testes existentes mais 1).

- [ ] **Passo 5: Commit**

```bash
git add scripts/conversor/origem-json.js tests/origem-json.test.js
git commit -m "Versão 0.5.0: multiataque entende números e frase em português"
```

---

### Tarefa 2: Parser do bloco de texto

**Arquivos:**
- Criar: `scripts/conversor/origem-texto.js` (hoje é um stub de duas linhas: substituir o conteúdo inteiro)
- Criar: `tests/origem-texto.test.js`

**Interfaces:**
- Consome: `lerAtor5e(ator, { pvSoloNoND })` e `quantidadeNoMultiataque` de `origem-json.js` (só nos testes).
- Produz:
  - `normalizar(texto: string): string`
  - `textoParaAtor5e(texto: string | undefined): { ok: true, ator: Ator5e, avisos: string[] } | { ok: false, erro: 'T20C5E.ErroTexto' }`, onde `Ator5e` é o objeto que `lerAtor5e` lê (`name`, `type: 'npc'`, `system.{abilities,details,traits,attributes,resources,skills}`, `items[]`). A Tarefa 3 consome `textoParaAtor5e` e usa `ok`, `ator`, `avisos` e `erro`.

- [ ] **Passo 1: Escrever os testes (arquivo completo)**

Crie `tests/origem-texto.test.js`:

```js
// Parser de bloco de estatísticas colado (v3). Os blocos abaixo são criaturas inventadas: o módulo não leva texto de livro.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizar, textoParaAtor5e } from '../scripts/conversor/origem-texto.js';
import { lerAtor5e } from '../scripts/conversor/origem-json.js';

const EN2014 = `Marsh Wyrmling
Medium dragon, neutral evil
Armor Class 15 (natural armor)
Hit Points 52 (7d8 + 21)
Speed 30 ft., fly 60 ft., swim 40 ft.
STR DEX CON INT WIS CHA
15 (+2) 12 (+1) 17 (+3) 8 (-1) 11 (+0) 10 (+0)
Saving Throws Dex +3, Con +5
Skills Perception +4, Stealth +3
Damage Resistances acid; bludgeoning, piercing, and slashing from nonmagical attacks
Damage Immunities poison
Condition Immunities poisoned
Senses blindsight 10 ft., darkvision 60 ft., passive Perception 14
Languages Common, Draconic
Challenge 3 (700 XP)
Amphibious. The wyrmling can breathe air and water.
Legendary Resistance (2/Day). If the wyrmling fails a saving throw, it can choose to succeed instead.
ACTIONS
Multiattack. The wyrmling makes one Bite attack and one Spit attack.
Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 8 (1d10 + 3) piercing damage plus 3 (1d6) poison damage.
Spit. Ranged Weapon Attack: +3 to hit, range 30/90 ft., one target. Hit: 5 (1d6 + 2) acid damage.
Poison Breath (Recharge 5-6). The wyrmling exhales poisonous gas in a 15-foot cone. Each creature in that area must make a DC 13 Constitution saving throw, taking 21 (6d6) poison damage on a failed save, or half as much damage on a successful one. A creature that fails is also poisoned for 1 minute.
REACTIONS
Tail Swipe. When a creature within 5 feet hits the wyrmling, the wyrmling makes a tail attack.
LEGENDARY ACTIONS
The wyrmling can take 2 legendary actions, choosing from the options below. Only one legendary action can be used at a time.
Detect. The wyrmling makes a Wisdom (Perception) check.
Tail Attack. The wyrmling makes a tail attack.`;

const EN2024 = `Marsh Wyrmling
Medium Dragon, Neutral Evil
AC 15 Initiative +1 (11)
HP 52 (7d8 + 21)
Speed 30 ft., Fly 60 ft., Swim 40 ft.
Str 15 +2 +2 Dex 12 +1 +3 Con 17 +3 +5
Int 8 -1 -1 Wis 11 +0 +0 Cha 10 +0 +0
Skills Perception +4, Stealth +3
Resistances Acid
Immunities Poison; Poisoned
Senses Blindsight 10 ft., Darkvision 60 ft.; Passive Perception 14
Languages Common, Draconic
CR 3 (XP 700; PB +2)
Traits
Amphibious. The wyrmling can breathe air and water.
Actions
Multiattack. The wyrmling makes one Bite attack and one Spit attack.
Bite. Melee Attack Roll: +4, reach 5 ft. Hit: 8 (1d10 + 3) Piercing damage plus 3 (1d6) Poison damage.
Spit. Ranged Attack Roll: +3, range 30/90 ft. Hit: 5 (1d6 + 2) Acid damage.
Poison Breath (Recharge 5-6). Constitution Saving Throw: DC 13, each creature in a 15-foot Cone. Failure: 21 (6d6) Poison damage, and the target has the Poisoned condition until the end of its next turn. Success: Half damage.`;

const PT2014 = `Filhote do Pântano
Médio dragão, neutro e mau
Classe de Armadura 15 (armadura natural)
Pontos de Vida 52 (7d8 + 21)
Deslocamento 9 m, voo 18 m, natação 12 m
FOR DES CON INT SAB CAR
15 (+2) 12 (+1) 17 (+3) 8 (-1) 11 (+0) 10 (+0)
Testes de Resistência Des +3, Con +5
Perícias Percepção +4, Furtividade +3
Resistência a Dano ácido; contundente, perfurante e cortante de ataques não mágicos
Imunidade a Dano veneno
Imunidade a Condição envenenado
Sentidos visão cega 3 m, visão no escuro 18 m, Percepção passiva 14
Idiomas Comum, Dracônico, telepatia 18 m
Desafio 3 (700 XP)
Anfíbio. O filhote pode respirar ar e água.
Resistência Lendária (2/Dia). Se o filhote falhar num teste de resistência, pode escolher ser bem-sucedido.
AÇÕES
Ataque Múltiplo. O filhote faz dois ataques de Mordida e um ataque de Cuspe.
Mordida. Ataque Corpo a Corpo com Arma: +4 para atingir, alcance 1,5 m, um alvo. Acerto: 8 (1d10 + 3) de dano perfurante mais 3 (1d6) de dano de veneno.
Cuspe. Ataque à Distância com Arma: +3 para atingir, alcance 9/27 m, um alvo. Acerto: 5 (1d6 + 2) de dano ácido.
Sopro Venenoso (Recarga 5-6). O filhote exala gás venenoso em um cone de 4,5 metros. Cada criatura na área deve fazer um teste de resistência de Constituição CD 13, sofrendo 21 (6d6) de dano de veneno se falhar, ou metade do dano se passar. A criatura que falhar também fica envenenada por 1 minuto.
REAÇÕES
Rabada. Quando uma criatura a 1,5 m acerta o filhote, ele faz um ataque de cauda.`;

const PT2024 = `Filhote do Pântano
Dragão Médio, Neutro e Mau
CA 15 Iniciativa +1 (11)
PV 52 (7d8 + 21)
Deslocamento 9 m, Voo 18 m, Natação 12 m
For 15 +2 +2 Des 12 +1 +3 Con 17 +3 +5
Int 8 -1 -1 Sab 11 +0 +0 Car 10 +0 +0
Resistências Ácido
Imunidades Veneno; Envenenado
Sentidos Visão no Escuro 18 m; Percepção Passiva 14
Idiomas Comum, Dracônico
ND 3 (XP 700; BP +2)
Ações
Mordida. Ataque Corpo a Corpo: +4, alcance 1,5 m. Acerto: 8 (1d10 + 3) de dano Perfurante mais 3 (1d6) de dano de Veneno.
Sopro Venenoso (Recarga 5-6). Teste de Resistência de Constituição: CD 13, cada criatura em um Cone de 4,5 metros. Falha: 21 (6d6) de dano de Veneno. Sucesso: metade do dano.`;

// Texto de PDF: linhas quebradas no meio da frase, palavra hifenizada, lista de magias, dano que continua na linha seguinte.
const PDF = `GRAND MAGE
Medium humanoid (any race), any alignment
Armor Class 12 (15 with
mage armor)
Hit Points 40 (9d8)
Speed 30 ft.
STR DEX CON INT WIS CHA
9 (-1) 14 (+2) 11 (+0) 17 (+3) 12 (+1) 11 (+0)
Languages any four lan-
guages
Challenge 6 (2,300 XP) Proficiency Bonus +3
Spellcasting. The mage is a 9th-level spellcaster. Its spellcasting ability is Intelligence (spell save DC 14, +6 to hit with spell attacks).
The mage has the following wizard spells prepared:
Cantrips (at will): fire bolt, mage hand
3rd level (3 slots): fireball, fly
Fire Staff. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) bludgeoning damage plus
3 (1d6) fire damage.
LAIR ACTIONS
On initiative count 20, the mage can use a lair action.
Flame Wave. Each creature in a 20-foot-radius sphere must make a DC 14 Dexterity saving throw.`;

const ler = (texto) => {
  const r = textoParaAtor5e(texto);
  assert.equal(r.ok, true, JSON.stringify(r));
  return { ...r, ...lerAtor5e(r.ator, { pvSoloNoND: () => 100 }) };
};
const porNome = (lista, nome) => lista.find((x) => x.nome === nome);

test('normalizar: aspas, travessões, hifenização e linha que começa em minúscula', () => {
  assert.equal(normalizar('It’s “ok”\r\nRecharge 5–6\r\nHP −2'), 'It\'s "ok"\nRecharge 5-6\nHP -2');
  assert.equal(normalizar('non-\nmagical attacks\nand more\nNova Linha'), 'nonmagical attacks and more\nNova Linha');
});

test('inglês 2014: cabeçalho, listas, ataques, dano extra, recarga, usos, área, seções e lendárias', () => {
  const r = ler(EN2014);
  assert.deepEqual(r.avisos, []);
  const e = r.estado;
  assert.deepEqual([e.nome, e.cr, e.tamanho, e.tipo, e.deslocamento], ['Marsh Wyrmling', '3', 'med', 'mon', 9]);
  assert.deepEqual(e.deslocamentosExtra, { fly: 18, swim: 12 });
  assert.deepEqual(e.atributos, { for: 2, des: 1, con: 3, int: -1, sab: 0, car: 0 });
  assert.deepEqual(e.sentidos, { value: ['escuro', 'cegas'], custom: '' });
  assert.deepEqual(e.idiomas, ['comum', 'draconico']);
  assert.deepEqual(e.resistenciasDano.reducao, ['acido', 'impacto', 'perfuracao', 'corte']);
  assert.deepEqual(e.imunidadesCondicao, { value: ['envenenado'], custom: '' });
  assert.equal(e.papel, 'solo');
  assert.equal(e.chefeFinal, true); // resistência lendária e ações lendárias
  assert.deepEqual(e.ataques.map((a) => [a.nome, a.tipo, a.dano, a.qtd]), [['Bite', 'cac', 'perfuracao', 1], ['Spit', 'ad', 'acido', 1]]);
  assert.deepEqual(e.ataques[0].danoExtra, [{ formula: '1d6', tipo: 'dano' }]);
  assert.equal(e.ataques[0].proporcaoExtra, 0.292);
  assert.deepEqual(e.habilidades.map((h) => [h.nome, h.execucao]), [
    ['Amphibious', ''], ['Legendary Resistance', ''], ['Multiattack', 'action'], ['Poison Breath', 'action'],
    ['Tail Swipe', 'reaction'], ['Detect', 'special'], ['Tail Attack', 'special'],
  ]);
  assert.equal(porNome(e.habilidades, 'Legendary Resistance').usos, 2);
  const sopro = porNome(e.habilidades, 'Poison Breath');
  assert.deepEqual(sopro.dano, [{ formula: '6d6', tipo: 'dano' }]);
  assert.deepEqual(sopro.resistencia, { pericia: 'fort', metade: true });
  assert.equal(sopro.area, 'cone 4,5m');
  assert.equal(sopro.efeito, true);
  assert.match(sopro.texto, /^\(Recarga \(movimento\)\)/);
  assert.match(sopro.texto, /CD 13 Fortitude/);
  assert.ok(r.relatorio.some((l) => l.tipo === 'ignorado' && /perícias treinadas/.test(l.texto)));
});

test('inglês 2024: tabela de atributos, "Immunities" com condição, rolagem de ataque e salvaguarda em duas linhas', () => {
  const e = ler(EN2024).estado;
  assert.deepEqual(e.atributos, { for: 2, des: 1, con: 3, int: -1, sab: 0, car: 0 });
  assert.deepEqual(e.imunidadesCondicao, { value: ['envenenado'], custom: '' });
  assert.deepEqual(e.resistenciasDano.reducao, ['acido']);
  assert.equal(e.cr, '3');
  assert.deepEqual(e.ataques.map((a) => [a.nome, a.tipo, a.dano]), [['Bite', 'cac', 'perfuracao'], ['Spit', 'ad', 'acido']]);
  const sopro = porNome(e.habilidades, 'Poison Breath');
  assert.deepEqual(sopro.resistencia, { pericia: 'fort', metade: true }); // "Success: Half damage."
  assert.equal(sopro.area, 'cone 4,5m');
  assert.deepEqual(sopro.dano, [{ formula: '6d6', tipo: 'dano' }]);
});

test('português 2014: rótulos, metros, tipos de dano, "Ataque Múltiplo" e salvaguarda em português', () => {
  const r = ler(PT2014);
  const e = r.estado;
  assert.deepEqual([e.nome, e.cr, e.tamanho, e.tipo, e.deslocamento], ['Filhote do Pântano', '3', 'med', 'mon', 9]);
  assert.deepEqual(e.deslocamentosExtra, { fly: 18, swim: 12 });
  assert.deepEqual(e.atributos, { for: 2, des: 1, con: 3, int: -1, sab: 0, car: 0 });
  assert.deepEqual(e.sentidos, { value: ['escuro', 'cegas'], custom: '' });
  assert.deepEqual(e.idiomas, ['comum', 'draconico']);
  assert.equal(e.idiomasCustom, 'telepatia 18 m');
  assert.deepEqual(e.resistenciasDano.reducao, ['acido', 'impacto', 'perfuracao', 'corte']);
  assert.deepEqual(e.imunidadesCondicao, { value: ['envenenado'], custom: '' });
  assert.deepEqual(e.ataques.map((a) => [a.nome, a.tipo, a.dano, a.qtd]), [['Mordida', 'cac', 'perfuracao', 2], ['Cuspe', 'ad', 'acido', 1]]);
  assert.deepEqual(e.ataques[0].danoExtra, [{ formula: '1d6', tipo: 'dano' }]);
  const sopro = porNome(e.habilidades, 'Sopro Venenoso');
  assert.deepEqual(sopro.resistencia, { pericia: 'fort', metade: true });
  assert.equal(sopro.area, 'cone 4,5m');
  assert.equal(porNome(e.habilidades, 'Resistência Lendária').usos, 2);
  assert.equal(porNome(e.habilidades, 'Rabada').execucao, 'reaction');
  assert.ok(!r.relatorio.some((l) => /Multiataque não cita/.test(l.texto)));
});

test('português 2024: tipo antes do tamanho, "ND", "Imunidades" com condição e área em metros', () => {
  const e = ler(PT2024).estado;
  assert.deepEqual([e.nome, e.cr, e.tamanho, e.tipo], ['Filhote do Pântano', '3', 'med', 'mon']);
  assert.deepEqual(e.atributos, { for: 2, des: 1, con: 3, int: -1, sab: 0, car: 0 });
  assert.deepEqual(e.sentidos, { value: ['escuro'], custom: '' });
  assert.deepEqual(e.imunidadesCondicao, { value: ['envenenado'], custom: '' });
  assert.deepEqual(e.ataques.map((a) => [a.nome, a.dano]), [['Mordida', 'perfuracao']]);
  const sopro = porNome(e.habilidades, 'Sopro Venenoso');
  assert.deepEqual(sopro.resistencia, { pericia: 'fort', metade: true });
  assert.equal(sopro.area, 'cone 4,5m');
});

test('texto de PDF: linhas quebradas, palavra hifenizada, conjurador, dano na linha seguinte e covil', () => {
  const r = ler(PDF);
  const e = r.estado;
  assert.deepEqual(r.avisos, []);
  assert.equal(e.nome, 'GRAND MAGE');
  assert.equal(e.cr, '6');
  assert.equal(e.idiomasCustom, 'any four languages');
  assert.equal(e.conjurador, true);
  assert.equal(e.conjuracao, 'int');
  assert.equal(e.papel, 'solo'); // ação de covil
  assert.deepEqual(e.habilidades.map((h) => [h.nome, h.oficial, h.execucao]), [['Spellcasting', 'magias', ''], ['Flame Wave', undefined, 'special']]);
  assert.match(porNome(e.habilidades, 'Spellcasting').texto, /3rd level \(3 slots\): fireball, fly/); // lista de magias é continuação, não habilidade
  assert.deepEqual(e.ataques[0].danoExtra, [{ formula: '1d6', tipo: 'fogo' }]);
  assert.equal(porNome(e.habilidades, 'Flame Wave').area, 'esfera 6m de raio');
});

test('texto que não é bloco de estatísticas: erro; bloco incompleto: aceito com aviso', () => {
  assert.deepEqual(textoParaAtor5e('olá\nisto não é uma ficha'), { ok: false, erro: 'T20C5E.ErroTexto' });
  assert.deepEqual(textoParaAtor5e(''), { ok: false, erro: 'T20C5E.ErroTexto' });
  assert.deepEqual(textoParaAtor5e(undefined), { ok: false, erro: 'T20C5E.ErroTexto' });
  const parcial = textoParaAtor5e('Rato\nSmall beast, unaligned\nChallenge 1/8 (25 XP)\nBite. Melee Weapon Attack: +0 to hit, reach 5 ft. Hit: 1 piercing damage.');
  assert.equal(parcial.ok, true);
  assert.match(parcial.avisos.join('|'), /Atributos não encontrados \(assumido 10\): str, dex, con, int, wis, cha/);
  const r = lerAtor5e(parcial.ator);
  assert.equal(r.estado.cr, '1/8');
  assert.equal(r.estado.tamanho, 'peq');
  assert.equal(r.estado.tipo, 'ani');
});

test('primeira linha é o tamanho e tipo: sem nome, com aviso', () => {
  const r = textoParaAtor5e('Large aberration, neutral\nSTR 16 DEX 11 CON 19 INT 6 WIS 13 CHA 6\nChallenge 5 (1,800 XP)');
  assert.equal(r.ok, true);
  assert.equal(r.ator.name, '');
  assert.match(r.avisos.join('|'), /Nome não encontrado/);
  assert.equal(r.ator.system.abilities.str.value, 16);
});

test('linha solta sem nome de habilidade, fora da introdução de lendárias, é descartada com aviso', () => {
  const r = textoParaAtor5e('Rato\nSmall beast, unaligned\nSTR 2 DEX 11 CON 9 INT 2 WIS 10 CHA 4\nChallenge 0 (10 XP)\nFrase solta sem ponto de nome que passa de sessenta caracteres de comprimento total');
  assert.equal(r.ok, true);
  assert.match(r.avisos.join('|'), /Texto sem nome de habilidade ignorado/);
  assert.deepEqual(r.ator.items, []);
});

const BORDAS = [
  'Gárgula', 'Medium elemental, chaotic neutral', 'Armor Class 15', 'Speed 5 ft., fly 60 ft. (hover)',
  'STR 14 DEX 16 CON 14 INT 6 WIS 11 CHA 6', 'Damage Vulnerabilities fire', 'Languages \u2014', 'Challenge 2 (450 XP)',
  'Innate Spellcasting. The gargoyle\u2019s innate spellcasting ability is Charisma. It can innately cast the following spells:',
  'At will: mage hand',
  'Javelin. Melee or Ranged Weapon Attack: +5 to hit, reach 5 ft. or range 30/120 ft., one target. Hit: 6 (1d6 + 3) piercing damage.',
  'LEGENDARY ACTIONS',
  'Slam. The gargoyle makes a slam attack.',
].join('\r\n').replace(/ /g, '\u00a0');

test('bordas: CRLF e espaço não separável, vulnerabilidade, idioma "—", voo pairando, ataque "Melee or Ranged", conjuração inata, lendárias sem número', () => {
  const r = ler(BORDAS);
  const e = r.estado;
  assert.equal(e.nome, 'Gárgula');
  assert.equal(e.deslocamento, 1.5);
  assert.deepEqual(e.deslocamentosExtra, { fly: 18 });
  assert.deepEqual(e.resistenciasDano.vulnerabilidade, ['fogo']);
  assert.deepEqual(e.idiomas, []);
  assert.equal(e.idiomasCustom, '');
  assert.equal(r.ator.items[0].name, 'Innate Spellcasting');
  assert.equal(r.ator.items[0].system.identifier, undefined); // só o "Spellcasting" vira o poder oficial "Magias"
  assert.equal(e.conjurador, true);
  assert.equal(e.conjuracao, 'car');
  assert.deepEqual(e.ataques.map((a) => [a.nome, a.tipo, a.dano]), [['Javelin', 'cac', 'perfuracao']]); // "Melee or Ranged" é corpo a corpo
  assert.match(r.avisos.join('|'), /Ações lendárias sem a quantidade no texto: assumidas 3/);
  assert.equal(r.ator.system.resources.legact.max, 3);
});

test('bordas: deslocamento e sentidos em metros com vírgula; sentido sem equivalente vira texto em pés', () => {
  const r = ler('Verme\nHuge monstrosity, unaligned\nSTR 20 DEX 8 CON 20 INT 2 WIS 10 CHA 3\nSpeed 4,5 m, burrow 9 m\nSenses tremorsense 18 m\nChallenge 5 (1,800 XP)');
  assert.equal(r.estado.deslocamento, 4.5);
  assert.deepEqual(r.estado.deslocamentosExtra, { burrow: 9 });
  assert.match(r.relatorio.find((l) => /Sentidos sem equivalente/.test(l.texto)).texto, /tremorsense 60 pés/);
});
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `node --test tests/origem-texto.test.js`
Expected: FAIL com `ERR_MODULE_NOT_FOUND`/exportação ausente (`normalizar`, `textoParaAtor5e` não existem; o arquivo atual só tem `export {}`).

- [ ] **Passo 3: Escrever o parser**

Substitua todo o conteúdo de `scripts/conversor/origem-texto.js` por:

```js
// v3: bloco de estatísticas de 5e colado como texto (inglês ou português, layouts 2014 e 2024). Função pura: devolve um
// ator dnd5e "de mentira", no formato que o lerAtor5e (v2) lê, e os avisos do que não deu para ler com certeza.
// Rótulos e palavras ficam em tabelas SEM acento e em minúsculas: o texto é comparado depois de `semAcento`.

const semAcento = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Quebras de linha, aspas e travessões tipográficos, hifenização de PDF e linhas quebradas no meio da frase.
export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/­/g, '')
    .replace(/([a-zà-ÿ])-\n([a-zà-ÿ])/g, '$1$2')
    .replace(/\n(?=[a-zà-ÿ])/g, ' ') // shortcut: linha que começa em minúscula é continuação; frase quebrada antes de maiúscula vira entrada separada
    .replace(/[ \t ]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .trim();
}

// ---------- tabelas ----------

const TAMANHOS = {
  tiny: 'tiny', minusculo: 'tiny', miudo: 'tiny', small: 'small', pequeno: 'small', pequena: 'small',
  medium: 'medium', medio: 'medium', media: 'medium', large: 'large', grande: 'large', huge: 'huge', enorme: 'huge',
  gargantuan: 'gargantuan', imenso: 'gargantuan', imensa: 'gargantuan', colossal: 'gargantuan', gigantesco: 'gargantuan',
};
const TIPOS = {
  aberration: 'aberration', aberracao: 'aberration', beast: 'beast', fera: 'beast', besta: 'beast', celestial: 'celestial',
  construct: 'construct', constructo: 'construct', construto: 'construct', dragon: 'dragon', dragao: 'dragon',
  elemental: 'elemental', fey: 'fey', fada: 'fey', fiend: 'fiend', infero: 'fiend', giant: 'giant', gigante: 'giant',
  humanoid: 'humanoid', humanoide: 'humanoid', monstrosity: 'monstrosity', monstruosidade: 'monstrosity',
  ooze: 'ooze', limo: 'ooze', plant: 'plant', planta: 'plant', undead: 'undead', 'morto-vivo': 'undead',
};
const DANO = {
  bludgeoning: 'bludgeoning', contundente: 'bludgeoning', piercing: 'piercing', perfurante: 'piercing',
  slashing: 'slashing', cortante: 'slashing', fire: 'fire', fogo: 'fire', cold: 'cold', frio: 'cold', acid: 'acid', acido: 'acid',
  lightning: 'lightning', eletrico: 'lightning', eletricidade: 'lightning', necrotic: 'necrotic', necrotico: 'necrotic',
  radiant: 'radiant', radiante: 'radiant', psychic: 'psychic', psiquico: 'psychic', force: 'force', energia: 'force',
  energetico: 'force', forca: 'force', thunder: 'thunder', trovejante: 'thunder', trovao: 'thunder',
  poison: 'poison', veneno: 'poison', venenoso: 'poison',
};
const CONDICOES = {
  blinded: 'blinded', cego: 'blinded', charmed: 'charmed', enfeiticado: 'charmed', deafened: 'deafened', surdo: 'deafened',
  exhaustion: 'exhaustion', exaustao: 'exhaustion', frightened: 'frightened', amedrontado: 'frightened', assustado: 'frightened',
  apavorado: 'frightened', grappled: 'grappled', agarrado: 'grappled', incapacitated: 'incapacitated', incapacitado: 'incapacitated',
  paralyzed: 'paralyzed', paralisado: 'paralyzed', petrified: 'petrified', petrificado: 'petrified', poisoned: 'poisoned',
  envenenado: 'poisoned', prone: 'prone', caido: 'prone', derrubado: 'prone', restrained: 'restrained', impedido: 'restrained',
  contido: 'restrained', stunned: 'stunned', atordoado: 'stunned', unconscious: 'unconscious', inconsciente: 'unconscious',
};
const IDIOMAS = {
  common: 'common', comum: 'common', dwarvish: 'dwarvish', anao: 'dwarvish', elvish: 'elvish', elfico: 'elvish',
  goblin: 'goblin', halfling: 'halfling', sylvan: 'sylvan', silvestre: 'sylvan', abyssal: 'abyssal', abissal: 'abyssal',
  aquan: 'aquan', auran: 'auran', celestial: 'celestial', draconic: 'draconic', draconico: 'draconic', giant: 'giant',
  gigante: 'giant', gnoll: 'gnoll', ignan: 'ignan', infernal: 'infernal', orc: 'orc', terran: 'terran',
};
const SENTIDOS = {
  darkvision: 'darkvision', 'visao no escuro': 'darkvision', blindsight: 'blindsight', 'visao cega': 'blindsight',
  tremorsense: 'tremorsense', 'sentido sismico': 'tremorsense', truesight: 'truesight', 'visao verdadeira': 'truesight',
};
const MODOS = {
  walk: 'walk', andar: 'walk', burrow: 'burrow', escavar: 'burrow', escavacao: 'burrow', climb: 'climb', escalar: 'climb',
  escalada: 'climb', fly: 'fly', voo: 'fly', voar: 'fly', swim: 'swim', nadar: 'swim', natacao: 'swim',
};
const ATRIBUTOS = [['str', 'for'], ['dex', 'des'], ['con', 'con'], ['int', 'int'], ['wis', 'sab'], ['cha', 'car']];
const ATRIBUTO_POR_NOME = {
  strength: 'str', forca: 'str', dexterity: 'dex', destreza: 'dex', constitution: 'con', constituicao: 'con',
  intelligence: 'int', inteligencia: 'int', wisdom: 'wis', sabedoria: 'wis', charisma: 'cha', carisma: 'cha',
};
const NOMES_ATRIBUTO = Object.keys(ATRIBUTO_POR_NOME).join('|');

// Rótulos do cabeçalho (comparados em minúsculas e sem acento, no começo da linha).
const ROTULOS = {
  cr: /^(?:challenge|cr|nivel de desafio|desafio|nd)\s+/,
  velocidade: /^(?:speed|deslocamento)\s+/,
  sentidos: /^(?:senses|sentidos)\s+/,
  idiomas: /^(?:languages|idiomas|linguas)\s+/,
  pv: /^(?:hit points|hp|pontos de vida|pv)\s+/,
  pericias: /^(?:skills|pericias)\s+/,
  salvaguardas: /^(?:saving throws|saves|testes de resistencia|salvaguardas)\s+/,
  dr: /^(?:damage resistances?|resistances?|resistencias?(?: a dano)?)\s+/,
  di: /^(?:damage immunities|immunities|imunidades?(?: a dano)?)\s+(?!a condic)/,
  dv: /^(?:damage vulnerabilit(?:y|ies)|vulnerabilit(?:y|ies)|vulnerabilidades?(?: a dano)?)\s+/,
  ci: /^(?:condition immunities|imunidades? a condic(?:ao|oes))\s+/,
};
const IGNORAR = /^(?:proficiency bonus|bonus de proficiencia|gear|equipamento)\b/;

const SECOES = [
  ['traco', /^(?:traits|caracteristicas)$/],
  ['acao', /^(?:actions|acoes)$/],
  ['bonus', /^(?:bonus actions|acoes bonus|acoes bonificadas)$/],
  ['reacao', /^(?:reactions|reacoes)$/],
  ['lendaria', /^(?:legendary actions|acoes lendarias)$/],
  ['covil', /^(?:lair actions|acoes de covil)$/],
];
const ATIVACAO = { acao: 'action', bonus: 'bonus', reacao: 'reaction', lendaria: 'legendary', covil: 'lair' };
const secaoDe = (linha) => SECOES.find(([, re]) => re.test(semAcento(linha).replace(/[:.]$/, '')))?.[0];

// Valor do primeiro rótulo que casa (o rótulo sai, o resto mantém acento e caixa originais).
const valorDe = (linhas, re) => {
  for (const linha of linhas) {
    const m = re.exec(semAcento(linha));
    if (m) return linha.slice(m[0].length).trim();
  }
  return null;
};

// ---------- cabeçalho ----------

// "Large aberration, neutral" / "Grande aberração, neutro" / "Dragão Médio, Neutro e Mau": tamanho e tipo antes da vírgula, em qualquer ordem.
function lerTamanhoTipo(linhas) {
  for (const linha of linhas.slice(0, 3)) {
    if (!linha.includes(',')) continue;
    const palavras = semAcento(linha.split(',')[0]).match(/[a-z-]+/g) ?? [];
    const tamanho = palavras.map((p) => TAMANHOS[p]).find(Boolean);
    const tipo = palavras.map((p) => TIPOS[p] ?? TIPOS[p.replace(/s$/, '')]).find(Boolean);
    if (tamanho && tipo) return { linha, tamanho, tipo };
  }
  return null;
}

// 2014 compacto: "STR DEX CON INT WIS CHA" e, na linha seguinte, "16 (+3) 11 (+0)..."; 2024 e listas: sigla seguida do valor.
function lerAtributos(linhas) {
  const todo = linhas.map(semAcento).join(' ');
  const compacto = /\b(?:str|for)\s+(?:dex|des)\s+con\s+int\s+(?:wis|sab)\s+(?:cha|car)\s+((?:\d{1,2}\s*\(\s*[+-]\d+\s*\)\s*){6})/.exec(todo);
  if (compacto) {
    const valores = [...compacto[1].matchAll(/(\d{1,2})\s*\(/g)];
    return Object.fromEntries(ATRIBUTOS.map(([chave], i) => [chave, Number(valores[i][1])]));
  }
  const lidos = {};
  for (const [chave, pt] of ATRIBUTOS) {
    const m = new RegExp(String.raw`\b(?:${chave}|${pt})\s+(\d{1,2})\b`).exec(todo);
    if (m) lidos[chave] = Number(m[1]);
  }
  return lidos;
}

const numero = (texto) => Number(String(texto).replace(',', '.'));
const ehMetro = (unidade) => /^m/.test(unidade);

function lerDeslocamento(valor) {
  const movimento = {};
  let metros = false;
  for (const parte of semAcento(valor).split(/[,;]/)) {
    const m = /^\s*(?:([a-z]+)\s+)?(\d+(?:[.,]\d+)?)\s*(ft|feet|foot|pes?|metros?|m)(?![a-z])/.exec(parte);
    const modo = m && MODOS[m[1] ?? 'walk'];
    if (!modo) continue;
    movimento[modo] = numero(m[2]);
    if (ehMetro(m[3])) metros = true;
  }
  return { ...movimento, units: metros ? 'm' : 'ft' };
}

function lerSentidos(valor) {
  const ranges = {};
  for (const parte of semAcento(valor).split(/[,;]/)) {
    const m = /^\s*([a-z ]+?)\s+(\d+(?:[.,]\d+)?)\s*(ft|feet|pes?|metros?|m)(?![a-z])/.exec(parte);
    const chave = m && SENTIDOS[m[1].trim()];
    if (chave) ranges[chave] = ehMetro(m[3]) ? Math.round(numero(m[2]) / 0.3) : numero(m[2]); // o lerAtor5e escreve "pés"
  }
  return { ranges, special: '' };
}

function lerIdiomas(valor) {
  const value = [];
  const custom = [];
  let telepatia;
  for (const parte of valor.split(/[,;]/).map((p) => p.trim()).filter(Boolean)) {
    const f = semAcento(parte);
    if (/^-+$/.test(f)) continue;
    const tel = /(?:telepathy|telepatia)\s+(\d+)\s*(ft|feet|pes?|metros?|m)(?![a-z])/.exec(f);
    if (tel) { telepatia = { value: Number(tel[1]), units: ehMetro(tel[2]) ? 'm' : 'ft' }; continue; }
    if (IDIOMAS[f]) value.push(IDIOMAS[f]); else custom.push(parte);
  }
  return { value, custom: custom.join('; '), ...(telepatia && { communication: { telepathy: telepatia } }) };
}

// Resistências, imunidades e vulnerabilidades: só as palavras que têm chave do dnd5e; o resto é descartado com aviso.
function lerLista(valor) {
  const f = semAcento(valor);
  const palavras = f.match(/[a-z]+/g) ?? [];
  const unicos = (tabela) => [...new Set(palavras.map((p) => tabela[p]).filter(Boolean))];
  return {
    dano: unicos(DANO), condicoes: unicos(CONDICOES),
    mgc: /nonmagical|non-magical|nao magic|nao-magic/.test(f),
  };
}

// ---------- entradas (habilidades, ações) ----------

// "Nome. texto": o nome tem até 6 palavras (sem contar parênteses), sem ":" e sem dado de dano, e começa em maiúscula.
function separarNome(linha) {
  const m = /^([A-ZÀ-Ý][^.:]{0,59})\.(?:\s+([\s\S]*))?$/.exec(linha);
  if (!m || /\dd\d/.test(m[1])) return null;
  if (m[1].replace(/\([^)]*\)/g, '').trim().split(/\s+/).length > 6) return null;
  return { nome: m[1].trim(), texto: m[2] ?? '' };
}

const REFERENCIAS = new RegExp(String.raw`\b(${[
  'blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated', 'paralyzed', 'petrified', 'poisoned', 'prone',
  'restrained', 'stunned', 'unconscious', 'cego', 'enfeitiçado', 'surdo', 'amedrontado', 'agarrado', 'incapacitado',
  'paralisado', 'petrificado', 'envenenado', 'impedido', 'atordoado', 'inconsciente',
].join('|')})\b`, 'gi');

const FORMAS = {
  cone: 'cone', cube: 'cube', sphere: 'sphere', cylinder: 'cylinder', emanation: 'emanation', line: 'line',
  cubo: 'cube', esfera: 'sphere', cilindro: 'cylinder', emanacao: 'emanation', linha: 'line',
};

// Modelo de área do dnd5e ({ type, size, width, units }) a partir de "30-foot cone", "cone de 9 metros"...
function lerArea(f) {
  let m = /(\d+)-foot-radius (sphere|cylinder|emanation|cube)/.exec(f);
  if (m) return { type: FORMAS[m[2]], size: Number(m[1]), units: 'ft' };
  m = /(\d+)-foot-long,? (?:and )?(\d+)-foot-wide line/.exec(f);
  if (m) return { type: 'line', size: Number(m[1]), width: Number(m[2]), units: 'ft' };
  m = /(\d+)-foot (cone|cube|sphere|cylinder|emanation|line)/.exec(f);
  if (m) {
    const largura = /(\d+)[- ]f(?:ee|oo)t wide/.exec(f);
    return { type: FORMAS[m[2]], size: Number(m[1]), ...(m[2] === 'line' && { width: largura ? Number(largura[1]) : 5 }), units: 'ft' };
  }
  m = /(cone|esfera|cubo|cilindro|emanacao|linha) de (\d+(?:,\d+)?) ?(?:m|metros?)(?![a-z])/.exec(f);
  if (m) {
    const largura = /(\d+(?:,\d+)?) ?(?:m|metros?) de largura/.exec(f);
    return { type: FORMAS[m[1]], size: numero(m[2]), ...(m[1] === 'linha' && { width: largura ? numero(largura[1]) : 1.5 }), units: 'm' };
  }
  return null;
}

const DADO = /\((\d*)d(\d+)(?:\s*([+-])\s*(\d+))?\)\s*(?:(?:de\s+)?dano\s+(?:de\s+)?)?([a-z]+)?/g;

// Partes de dano da frase do primeiro dado ("Hit: 16 (2d8 + 7) slashing damage plus 5 (1d10) lightning damage"), sem a
// alternativa depois de "or"/"ou" (", or 17 (...) if used with two hands").
function lerDano(f) {
  const inicio = f.search(/\(\d*d\d+/);
  if (inicio < 0) return [];
  const fim = f.indexOf('. ', inicio);
  const frase = f.slice(inicio, fim < 0 ? undefined : fim).split(/\b(?:or|ou)\b/)[0];
  return [...frase.matchAll(DADO)].map(([, n, d, sinal, bonus, tipo]) => ({
    number: Number(n || 1), denomination: Number(d), bonus: bonus ? `${sinal === '-' ? '-' : ''}${bonus}` : '', types: DANO[tipo] ? [DANO[tipo]] : [],
  }));
}

const ATAQUE = /(?:attack(?: roll)?|arma|magia|ataque|corpo a corpo|distancia)\s*:\s*[+-]\d+/;
const SALVAGUARDA = [
  new RegExp(String.raw`\b(${NOMES_ATRIBUTO})\s+(?:saving throw|teste de resistencia|salvaguarda)`),
  new RegExp(String.raw`(?:saving throw|teste de resistencia|salvaguarda)s?\s+(?:de |of )?(${NOMES_ATRIBUTO})\b`),
];
const PERIODOS = {
  day: 'day', dia: 'day', 'short rest': 'sr', 'descanso curto': 'sr', 'long rest': 'lr', 'descanso longo': 'lr',
};

// Item `feat` do dnd5e com as atividades que o lerAtor5e procura: ataque, salvaguarda com dano, área, usos e recarga.
function montarItem({ nome: bruto, texto, secao }, ator) {
  const fNome = semAcento(bruto);
  const f = semAcento(texto);
  const usos = /\(\s*(\d+)\s*\/\s*(dia|day|short rest|long rest|descanso curto|descanso longo)/.exec(fNome);
  const recarga = /\(\s*(?:recharge|recarga)\s+(\d)/.exec(fNome);
  const nome = bruto.replace(/\s*\(\s*(?:\d+\s*\/|recharge|recarga)[^)]*\)/i, '').trim();
  const item = { type: 'feat', name: nome, system: { description: { value: texto.replace(REFERENCIAS, '&Reference[condition=$1]') } } };
  if (ATIVACAO[secao]) item.system.activation = { type: ATIVACAO[secao] };
  if (usos) item.system.uses = { max: usos[1], recovery: [{ period: PERIODOS[usos[2]] }] };
  if (recarga) item.system.uses = { max: '', recovery: [{ period: 'recharge', formula: recarga[1] }] };
  if (/^(?:multiattack|multiataque|ataques? multiplos?)$/.test(semAcento(nome))) item.system.identifier = 'multiattack';
  if (/^(?:spellcasting|conjuracao)$/.test(semAcento(nome))) item.system.identifier = 'spellcasting';
  if (/^(?:innate )?spellcasting$|^conjuracao(?: inata)?$/.test(semAcento(nome))) {
    const atributo = (f.match(new RegExp(`\\b(?:intelligence|wisdom|charisma|inteligencia|sabedoria|carisma)\\b`)) ?? [])[0];
    if (atributo) ator.system.attributes.spellcasting = ATRIBUTO_POR_NOME[atributo];
  }

  const ataque = ATAQUE.exec(f);
  const area = lerArea(f);
  const partes = lerDano(f);
  const salvaguarda = ataque ? null : SALVAGUARDA.map((re) => re.exec(f)).find(Boolean);
  const atividade = {};
  if (ataque) {
    const prefixo = f.slice(0, ataque.index + ataque[0].length);
    const distancia = /ranged|distancia/.test(prefixo) && !/melee|corpo a corpo/.test(prefixo);
    Object.assign(atividade, { type: 'attack', attack: { type: { value: distancia ? 'ranged' : 'melee' } }, damage: { parts: partes } });
  } else if (salvaguarda) {
    Object.assign(atividade, {
      type: 'save', save: { ability: [ATRIBUTO_POR_NOME[salvaguarda[1]]] },
      damage: { onSave: /half (?:as much )?damage|metade do dano/.test(f) ? 'half' : 'none', parts: partes },
    });
  } else if (partes.length) {
    Object.assign(atividade, { type: 'utility', damage: { parts: partes } });
  }
  if (area) { atividade.type ??= 'utility'; atividade.target = { template: area }; }
  if (/^(?:legendary resistance|resistencia lendaria)$/.test(semAcento(nome))) {
    atividade.type ??= 'utility';
    atividade.consumption = { targets: [{ target: 'resources.legres.value' }] };
    if (usos) ator.system.resources.legres = { max: Number(usos[1]) };
  }
  if (atividade.type) item.system.activities = { a: atividade };
  return item;
}

// ---------- ponto de entrada ----------

export function textoParaAtor5e(bruto) {
  const linhas = normalizar(bruto).split('\n').filter(Boolean);
  const avisos = [];
  const primeiraSecao = linhas.findIndex((l) => secaoDe(l));
  const linhaCR = linhas.findIndex((l) => ROTULOS.cr.test(semAcento(l)));
  const fimCabecalho = linhaCR >= 0 ? linhaCR + 1 : (primeiraSecao < 0 ? linhas.length : primeiraSecao);
  const cabecalho = linhas.slice(0, fimCabecalho);
  const corpo = linhas.slice(fimCabecalho);

  const atributos = lerAtributos(cabecalho);
  const crTexto = valorDe(cabecalho, ROTULOS.cr)?.match(/^(\d+\/\d+|\d+(?:[.,]\d+)?)/)?.[1];
  if (!Object.keys(atributos).length && !crTexto) return { ok: false, erro: 'T20C5E.ErroTexto' };

  const tamanhoTipo = lerTamanhoTipo(cabecalho);
  const nome = cabecalho[0] && cabecalho[0] !== tamanhoTipo?.linha ? cabecalho[0] : '';
  if (!nome) avisos.push('Nome não encontrado na primeira linha: informe o nome no formulário.');
  const faltam = ATRIBUTOS.map(([k]) => k).filter((k) => atributos[k] === undefined);
  if (faltam.length) avisos.push(`Atributos não encontrados (assumido 10): ${faltam.join(', ')}.`);

  const ator = {
    name: nome, type: 'npc',
    system: {
      abilities: Object.fromEntries(ATRIBUTOS.map(([k]) => [k, { value: atributos[k] ?? 10 }])),
      details: { cr: crTexto ? crTexto.replace(',', '.') : '', type: { value: tamanhoTipo?.tipo ?? '' } },
      traits: { size: tamanhoTipo?.tamanho ?? '' },
      attributes: {}, resources: {},
    },
    items: [],
  };
  const s = ator.system;
  const velocidade = valorDe(cabecalho, ROTULOS.velocidade);
  if (velocidade) s.attributes.movement = lerDeslocamento(velocidade);
  const pv = valorDe(cabecalho, ROTULOS.pv)?.match(/^\d+/)?.[0];
  if (pv) s.attributes.hp = { max: Number(pv) }; // só alimenta a sugestão de papel; o PV final vem da tabela
  const sentidos = valorDe(cabecalho, ROTULOS.sentidos);
  if (sentidos) s.attributes.senses = lerSentidos(sentidos);
  const idiomas = valorDe(cabecalho, ROTULOS.idiomas);
  if (idiomas) s.traits.languages = lerIdiomas(idiomas);
  if (valorDe(cabecalho, ROTULOS.pericias)) s.skills = { lidas: { value: 1 } }; // só para o relatório "perícias treinadas"
  const salvaguardas = valorDe(cabecalho, ROTULOS.salvaguardas);
  for (const sigla of semAcento(salvaguardas ?? '').match(/\b[a-z]{3}\b/g) ?? []) {
    const chave = ATRIBUTOS.find(([k, pt]) => k === sigla || pt === sigla)?.[0];
    if (chave) s.abilities[chave].proficient = 1;
  }
  for (const campo of ['dr', 'di', 'dv', 'ci']) {
    const valor = valorDe(cabecalho, ROTULOS[campo]);
    if (!valor) continue;
    const { dano, condicoes, mgc } = lerLista(valor);
    if (campo === 'ci') s.traits.ci = { value: condicoes, custom: '' };
    else {
      s.traits[campo] = { value: dano, bypasses: mgc ? ['mgc'] : [], custom: '' };
      if (campo === 'di' && condicoes.length) s.traits.ci = { value: condicoes, custom: '' };
    }
    if (!dano.length && !condicoes.length && !/^-*$/.test(valor)) avisos.push(`Texto não reconhecido em ${campo}: ${valor}`);
  }

  // entradas por seção
  let secao = 'traco';
  const entradas = [];
  for (const linha of corpo) {
    const nova = secaoDe(linha);
    if (nova) { secao = nova; if (nova === 'covil') s.resources.lair = { value: true }; continue; }
    if (IGNORAR.test(semAcento(linha))) continue;
    const entrada = separarNome(linha);
    if (entrada) { entradas.push({ ...entrada, secao }); continue; }
    const anterior = entradas.at(-1);
    if (anterior?.secao === secao) { anterior.texto += `\n${linha}`; continue; }
    const n = /(\d+)\s+(?:legendary actions|acoes lendarias)/.exec(semAcento(linha));
    if (secao === 'lendaria' && n) { s.resources.legact = { max: Number(n[1]) }; continue; }
    if (secao === 'lendaria' || secao === 'covil') continue; // introdução da seção
    avisos.push(`Texto sem nome de habilidade ignorado: "${linha.slice(0, 50)}".`);
  }
  if (entradas.some((e) => e.secao === 'lendaria') && !s.resources.legact) {
    s.resources.legact = { max: 3 };
    avisos.push('Ações lendárias sem a quantidade no texto: assumidas 3.');
  }
  ator.items = entradas.map((e) => montarItem(e, ator));
  return { ok: true, ator, avisos };
}
```

- [ ] **Passo 4: Rodar e ver passar**

Run: `node --test tests/origem-texto.test.js`
Expected: 11 testes passam. Depois `npm test`: tudo passa (nenhum teste da v2 muda).

- [ ] **Passo 5: Commit**

```bash
git add scripts/conversor/origem-texto.js tests/origem-texto.test.js
git commit -m "Versão 0.5.0: parser do bloco de estatísticas colado como texto"
```

---

### Tarefa 3: Diálogo, template, idioma e estilo

**Arquivos:**
- Modificar: `scripts/dialogo-conversor.js` (import, `actions`, estado inicial, `#lerFormulario`, `#importar`, ação `#lerTexto`)
- Modificar: `templates/dialogo-conversor.hbs` (bloco `conversor__importar`)
- Modificar: `lang/pt-BR.json`
- Modificar: `styles/conversor.css`
- Modificar: `tests/lang.test.js`

**Interfaces:**
- Consome: `textoParaAtor5e(texto)` da Tarefa 2 (`ok`, `ator`, `avisos`, `erro`).
- Produz: o botão "Ler texto" funcionando; `#aplicarOrigem(ler)` compartilhado com a importação de JSON.

- [ ] **Passo 1: Escrever o teste que falha**

Em `tests/lang.test.js`, no teste `lang: todo texto usado no template e no código existe`, acrescente uma linha depois da leitura de `main.js`, para que o `T20C5E.ErroTexto` do parser também seja conferido:

```js
    ...[...ler('../scripts/conversor/origem-texto.js').matchAll(/['"`](T20C5E\.[\w.]+)['"`]/g)].map((m) => m[1]),
```

(o bloco fica: leitura do `.hbs`, do `dialogo-conversor.js`, do `main.js` e, agora, do `origem-texto.js`.)

- [ ] **Passo 2: Rodar e ver falhar**

Run: `node --test tests/lang.test.js`
Expected: FAIL, com `T20C5E.ErroTexto` em `faltam` (o parser já o usa; a chave ainda não existe no idioma).

- [ ] **Passo 3: Idioma**

Em `lang/pt-BR.json`, antes da linha `"T20C5E.SecaoImportacao": "Importação",`, acrescente:

```json
  "T20C5E.ColarTexto": "Ou colar o bloco de estatísticas como texto",
  "T20C5E.ColarTextoDica": "Cole aqui o bloco de uma criatura de D&D 5e, em inglês ou português (livro, site ou PDF).",
  "T20C5E.LerTexto": "Ler texto",
  "T20C5E.ErroTexto": "O texto não parece um bloco de estatísticas de D&D 5e: não achei atributos nem CR.",
```

- [ ] **Passo 4: Template**

Em `templates/dialogo-conversor.hbs`, troque

```hbs
    <span class="conversor__nota">{{localize "T20C5E.ImportarDica"}}</span>
  </div>
```

por

```hbs
    <span class="conversor__nota">{{localize "T20C5E.ImportarDica"}}</span>
    <details class="conversor__texto" {{#if e.texto5e}}open{{/if}}>
      <summary>{{localize "T20C5E.ColarTexto"}}</summary>
      <textarea name="texto5e" rows="8" placeholder="{{localize 'T20C5E.ColarTextoDica'}}">{{e.texto5e}}</textarea>
      <button type="button" data-action="importarTexto"><i class="fas fa-paste"></i> {{localize "T20C5E.LerTexto"}}</button>
    </details>
  </div>
```

O `<details>` abre sozinho se já houver texto (o diálogo se redesenha a cada mudança de campo e o texto fica guardado em `estado.texto5e`).

- [ ] **Passo 5: Estilo**

Em `styles/conversor.css`, logo depois da linha `.t20-conversor-5e .conversor__importar button { width: auto; flex: 0 0 auto; }`, acrescente:

```css
.t20-conversor-5e .conversor__texto { flex: 1 1 100%; display: flex; flex-direction: column; gap: 0.35rem; }
.t20-conversor-5e .conversor__texto textarea { width: 100%; font-family: monospace; resize: vertical; }
```

- [ ] **Passo 6: Diálogo**

Em `scripts/dialogo-conversor.js`, seis edições:

(a) Depois de `import { lerAtor5e } from './conversor/origem-json.js';` acrescente:

```js
import { textoParaAtor5e } from './conversor/origem-texto.js';
```

(b) No objeto `actions`, depois de `importar5e: DialogoConversor.#importar5e,`:

```js
      importarTexto: DialogoConversor.#lerTexto,
```

(c) No estado inicial do construtor, troque `nome: '', conceito: '', img: '', token: '', cr: '5', papel: 'solo', nivelGrupo: nivelPadrao,` por:

```js
      nome: '', conceito: '', img: '', token: '', texto5e: '', cr: '5', papel: 'solo', nivelGrupo: nivelPadrao,
```

(d) Em `#lerFormulario`, entre `e.token = valor('token') ?? e.token;` e `e.cr = valor('cr') ?? e.cr;`:

```js
    e.texto5e = valor('texto5e') ?? e.texto5e;
```

(e) Troque o começo de `#importar` (do comentário até a abertura do `catch`):

```js
  // Lê o JSON de um ator de 5e e preenche o formulário; o que não é importado fica como está.
  async #importar(arquivo) {
    let resultado;
    try {
      const tabelas = await obterApi().obterTabelas();
      const json = JSON.parse(await arquivo.text());
      resultado = lerAtor5e(json, { pvSoloNoND: (nd) => linhaDoND(tabelas.solo, nd).PV });
    } catch (erro) {
```

por:

```js
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
```

(o resto do método, a partir de `console.error(...)`, não muda.) Mais abaixo no mesmo método, troque

```js
    const relatorio = [...resultado.relatorio];
```

por

```js
    const relatorio = [...avisos.map((texto) => ({ tipo: 'revisar', texto })), ...resultado.relatorio];
```

(f) Logo depois do método estático `#importar5e` (`static #importar5e() { ... }`), acrescente:

```js
  static async #lerTexto() {
    await this.#importarTexto();
  }
```

- [ ] **Passo 7: Rodar e ver passar**

Run: `node --check scripts/dialogo-conversor.js && npm test`
Expected: sem erro de sintaxe e todos passam (o `lang.test.js` agora acha as quatro chaves novas; o `dialogo.test.js` ainda importa o diálogo com o Foundry simulado).

- [ ] **Passo 8: Conferir no Foundry (manual; o diálogo não roda em Node)**

Copie a pasta para `Data/modules/t20-conversor-5e` (ou use o link que você já usa) e, num mundo com Tormenta20 e Ajustar ND 0.10.0:
1. Abra "5e para T20". Em "Ou colar o bloco de estatísticas como texto", cole o bloco `EN2014` de `tests/origem-texto.test.js` e clique em "Ler texto". Esperado: nome "Marsh Wyrmling", CR 3, atributos +2/+1/+3/-1/0/0, 2 ataques (Bite com dano extra, Spit), poderes com "Poison Breath" tendo dano 6d6, Fortitude e área "cone 4,5m"; relatório com "Revisar:" e "Não importado:" e a linha "imagem e token: o arquivo não traz".
2. Cole o `PT2014` e repita: "Filhote do Pântano", Mordida ×2 e Cuspe ×1, sem aviso de Multiataque.
3. Limpe o campo e clique em "Ler texto": a notificação "O texto não parece um bloco de estatísticas..." aparece e o formulário não muda.
4. Clique em "Importar JSON de 5e" com um arquivo da v2: continua funcionando (relatório sem linhas extras de aviso).
5. Edite um campo qualquer depois de colar: o texto colado continua no campo.
6. Clique em "Criar ameaça": o ator é criado na pasta "Convertidos de 5e".

- [ ] **Passo 9: Commit**

```bash
git add scripts/dialogo-conversor.js templates/dialogo-conversor.hbs lang/pt-BR.json styles/conversor.css tests/lang.test.js
git commit -m "Versão 0.5.0: campo de texto colado no diálogo, compartilhando o fluxo da importação de JSON"
```

---

### Tarefa 4: Gabarito local, documentação e versão

**Arquivos:**
- Criar: `tests/origem-texto-gabarito.test.js`
- Modificar: `README.md`, `module.json`, `package.json`
- Modificar: `docs/aprendizados-dano-e-conversao.md`

**Interfaces:**
- Consome: `textoParaAtor5e` (Tarefa 2) e `lerAtor5e` (v2).
- Produz: o teste de gabarito (pula sozinho sem as fixtures); a documentação e a versão 0.5.0.

- [ ] **Passo 1: Teste de gabarito (pula sem as fixtures)**

Crie `tests/origem-texto-gabarito.test.js`:

```js
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
```

- [ ] **Passo 2: Rodar**

Run: `npm test`
Expected: todos passam; três testes `gabarito ...` aparecem como pulados (`sem tests/fixtures/<nome>-5e.txt e .json`). Para valer de verdade, o mantenedor coloca o bloco de texto copiado do livro em `tests/fixtures/otyugh-5e.txt` (e `dragao-azul-5e.txt`, `arquimago-5e.txt`) ao lado dos JSON que já existem ali; qualquer diferença entre o formulário do texto e o do JSON aparece como diff do `assert.deepEqual` e aponta a regra do parser a ajustar. Os `.txt` não entram no Git.

- [ ] **Passo 3: Versão**

Em `module.json`, troque `"version": "0.4.2",` por `"version": "0.5.0",`. Em `package.json`, o mesmo.

- [ ] **Passo 4: README**

Em `README.md`:

(a) Na linha de status (linha 5), troque `**Status: v0.4.2 (em teste).**` por `**Status: v0.5.0 (em teste).**`.

(b) Na mesma linha, troque `A v1, "Criar ameaça a partir de CR", e a v2, "Importar JSON de 5e", estão implementadas. A v3 (texto colado) ainda não existe.` por `A v1, "Criar ameaça a partir de CR", a v2, "Importar JSON de 5e", e a v3, "Colar bloco de estatísticas", estão implementadas.`

(c) Na mesma linha, antes de ` Exige o Ajustar ND 0.10.0.`, acrescente ` A 0.5.0 traz a **v3**: o bloco de estatísticas de uma criatura colado como **texto**, em inglês ou português.`

(d) Em "O que vai fazer", depois do item "Converte só os **números**...", acrescente:

```markdown
- **Texto colado (v3)**: cola o bloco de estatísticas de uma criatura (livro, site ou PDF; inglês ou português; layouts de 2014 e de 2024) e o módulo preenche o formulário como na importação de JSON. Lê nome, tamanho, tipo, CR, deslocamentos, atributos, sentidos, idiomas, resistências, imunidades, ataques com dano e dano extra, quantidades do Multiataque, poderes com dano, teste de resistência, área, usos e recarga, ações lendárias e de covil, e o atributo de conjuração. Não lê imagem nem token, nem a CA; o PV só ajuda a sugerir o papel. O relatório diz o que foi lido e o que pede revisão.
```

(e) Troque o título `## Como usar (v1)` por `## Como usar` e, no fim dessa seção (depois de "O nível do grupo e o ritmo padrão ficam nas configurações do módulo."), acrescente:

```markdown
### Colar o texto de uma criatura (v3)

1. No diálogo, abra "Ou colar o bloco de estatísticas como texto" e cole o bloco inteiro de **uma** criatura.
2. Clique em **Ler texto**. O formulário é preenchido e o relatório mostra o que foi lido, o que pede revisão e o que ficou de fora.
3. Confira o CR, o papel e os ataques (principalmente a quantidade de cada ataque e o fim do nome de cada habilidade: o texto colado perde o itálico, então o módulo deduz onde o nome acaba) e crie a ameaça como de costume.
```

(f) Troque `### Versões planejadas` por `### Versões` e a lista por:

```markdown
1. **v1**: criar ameaça a partir de CR.
2. **v2**: importar o JSON de um ator de 5e exportado de outro mundo.
3. **v3**: converter um bloco de estatísticas colado como texto.
```

- [ ] **Passo 5: Aprendizados**

Em `docs/aprendizados-dano-e-conversao.md`, na tabela da seção 12, depois da linha de `origem-json.js`, acrescente:

```markdown
| `origem-texto.js` | Bloco de estatísticas colado como texto (inglês e português, layouts 2014 e 2024) para um ator dnd5e de mentira, que o `origem-json.js` converte |
```

E ao final do arquivo, acrescente uma seção:

```markdown

## 13. Texto colado (v3)

O parser (`origem-texto.js`) não converte nada: monta um ator dnd5e de mentira e o `lerAtor5e` faz o resto. O que ele precisa produzir é o que o `lerAtor5e` lê: `activities` do item (`attack` com `attack.type.value`, `save` com `save.ability` como lista e `damage.onSave`, `utility` com `target.template`), `damage.parts` no formato do dnd5e 4+ (`number`, `denomination`, `bonus` em texto, `types`), `uses`/`recovery`, `system.activation.type`, `identifier` (`multiattack`, `spellcasting`), `resources.legact/legres/lair`, `traits.dr/di/dv/ci` (com `bypasses: ['mgc']`), `languages.communication.telepathy` e `senses.ranges`.

Diferenças entre texto e JSON, por escolha:

- As descrições ficam em texto puro. Para o `lerDanoPoder` continuar achando "efeito" (condição ou área) sem mexer na v2, as palavras de condição são marcadas como `&Reference[condition=...]` na descrição, que o `limparTexto5e` já desfaz.
- Perícias e testes de resistência proficientes só viram uma marca, para o relatório dizer "não importado".
- Sentidos em metros viram pés (÷ 0,3), porque o `lerAtor5e` escreve "pés" nos sentidos sem equivalente.
- O PV do bloco alimenta só a sugestão de papel (Lacaio), como no JSON.
- O texto do poder em português continua "teste de resistência de Destreza": só o inglês é trocado por "Reflexos". O campo de resistência do poder sai certo nos dois idiomas.

Heurísticas frágeis, avisadas no relatório quando duvidam: o fim do nome de uma habilidade (o texto colado perde o itálico; vale o primeiro ponto nos primeiros 60 caracteres, até 6 palavras, sem ":" nem dado), linha que começa em minúscula como continuação da anterior e linha sem nome como continuação da entrada da mesma seção.

Não verificado: blocos reais de PDF com colunas misturadas; os blocos de teste versionados são inventados, e o gabarito contra os livros roda só localmente (`tests/origem-texto-gabarito.test.js`, com `tests/fixtures/*.txt`).
```

- [ ] **Passo 6: Grafo**

Run: `graphify update .`
Expected: o grafo é atualizado (AST, sem custo de API). `graphify-out/` está no `.gitignore`.

- [ ] **Passo 7: Verificação final**

Run: `npm test`
Expected: todos passam, três pulados.

- [ ] **Passo 8: Commit**

```bash
git add tests/origem-texto-gabarito.test.js README.md module.json package.json docs/aprendizados-dano-e-conversao.md
git commit -m "Versão 0.5.0: gabarito local, documentação e versão"
```

---

## Autoavaliação do plano

- **Cobertura da spec:** entrada no diálogo e fluxo (Tarefa 3); normalização, cabeçalho, campos por rótulo, unidade, seções, entradas, ataque, dano, salvaguarda, usos, recarga, área, Multiataque, conjuração e tipos de dano em português (Tarefa 2); avisos e erro fatal (Tarefa 2, testes de avisos e de erro); reuso na v2 (Tarefa 1); testes versionados, gabarito local, `.gitignore` (feito no commit da spec), versão, README e aprendizados (Tarefas 2 e 4).
- **Desvios da spec, já refletidos nela:** o PV do bloco é lido para o papel sugerido; o gabarito não compara descrições; a heurística do nome virou "continuação" em vez de aviso para nomes com mais de 6 palavras.
- **Consistência de tipos:** `textoParaAtor5e` devolve `{ ok, ator, avisos }` ou `{ ok: false, erro }`; o diálogo testa `lido.ok === false` e lê `lido.avisos`; a importação de JSON devolve `{ ator, avisos: [] }`, sem `ok`, e por isso cai no caminho normal.
