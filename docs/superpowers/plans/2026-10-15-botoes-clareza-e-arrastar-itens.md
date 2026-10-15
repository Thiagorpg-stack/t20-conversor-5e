# Botões, clareza do diálogo e arrastar itens — plano (versão 0.6.0)

> **Para agentes:** use superpowers:executing-plans (ou subagent-driven-development) para executar tarefa por tarefa, com teste vermelho primeiro.

**Origem:** pedido do mantenedor em 2026-10-15, depois de testar a 0.5.3 no Foundry.

**Escopo deste plano:** três tarefas implementáveis (1 a 3) e uma decisão de arquitetura (4), que **não** é implementada aqui e precisa de spec própria se for aprovada.

## Restrições globais

- Sem dependências novas; testes com `npm test` (`node --test`), sem Foundry.
- Textos da tela em `lang/pt-BR.json` (chaves `T20C5E.*`, nenhuma chave prefixo de outra seguida de ponto).
- O que só roda no Foundry (diálogo, arrastar e soltar) fica registrado como **não verificado** até o mantenedor testar.
- Versão 0.6.0 em `module.json` e `package.json`; mensagens de commit `Versão 0.6.0: ...`.

## O que cada parte do diálogo faz (base das tarefas 1 e 2)

**"Criatura"** são os dados do monstro de origem, e é o formulário que os dois botões de importação preenchem:
- `Nome`, `CR de 5e` e `Papel` definem qual linha da tabela do Ajustar ND vale: o CR vira o ND de referência (CR 10 → ND 10) e o papel (Solo, Lacaio ou Especial) escolhe a tabela.
- `Conceito` só vira o texto da biografia da ficha. Não entra em nenhum cálculo.
- `Retrato` e `Token` são imagens. `Tamanho`, `Tipo` e `Deslocamento` vão direto para a ficha.
- `Atributos` são os modificadores gravados na ficha. **Não** mudam o ND: Defesa, PV, CD, ataque, resistências e dano finais vêm da tabela.
- Hoje o grupo mistura identidade (nome, CR, papel, conceito) com dados da ficha (tamanho, tipo, deslocamento, atributos) sem dizer nada disso na tela. É a causa da confusão.

**"Nível e ritmo"** escolhe o ND final (`calcularND`, em `scripts/conversor/ritmo.js`). Por padrão **não precisa mexer**: ritmo "Estilo T20" e nível vazio dão ND igual ao CR (CR 10 → ND 10).
- `Nível do grupo` (opcional): se preenchido, o módulo escolhe o ND em que a criatura custa ao grupo o mesmo que custava em 5e. Q alvo = Q(nível) × (1,5 ÷ k) × ρ, com ρ = XP(CR) ÷ XP(nível). Serve para o mestre que quer "o monstro que seria ameaça para um grupo de nível 5 em 5e".
- `Ritmo do dia`: quantos combates o grupo faz por descanso (T20: 1 a 2; 5e: 6 a 8). Afeta o ND **mesmo com o nível vazio**: com "Estilo 5e" e sem nível o ND cai, porque o monstro de 5e divide o dia com outros combates.
- `ND final`: o mestre pode trocar à mão; passa a valer como escolha manual.
- `Template Chefe Final`, `Conjurador` e a ordem Forte/Média/Fraca das resistências completam a ficha.

## Tarefa 1: Texto dos botões

**Arquivos:** `lang/pt-BR.json`, `README.md`.

- [ ] Em `lang/pt-BR.json`: `"T20C5E.Importar": "Importar JSON"` e `"T20C5E.ColarTexto": "Colar Texto"`.
- [ ] No `README.md`, trocar "Importar JSON de 5e" por "Importar JSON" e "Colar texto de 5e" por "Colar Texto" onde descrevem o botão (as menções à v2 "Importar JSON de 5e" como nome da versão podem ficar).
- [ ] `npm test` (o `lang.test.js` confere as chaves). Sem teste novo: é só rótulo.
- [ ] Commit `Versão 0.6.0: rótulos dos botões "Importar JSON" e "Colar Texto"`.

## Tarefa 2: Clareza de "Criatura" e "Nível e ritmo"

**Arquivos:** `templates/dialogo-conversor.hbs`, `lang/pt-BR.json`, `styles/conversor.css` (só se precisar de espaçamento).

Proposta, só texto e agrupamento, sem mudar cálculo:
- [ ] **"Criatura"** passa a **"Dados da criatura"**, com uma nota logo abaixo do título: "Os dados do monstro de origem. Importar JSON e Colar Texto preenchem tudo. O ND, a Defesa, o PV, o ataque e o dano finais vêm da tabela; os atributos daqui só vão para a ficha."
- [ ] Uma dica curta em `Conceito`: "Vira o texto da biografia da ficha."
- [ ] **"Nível e ritmo"** passa a **"ND e dificuldade"**, com a nota: "Por padrão o ND é igual ao CR. Preencha o nível do grupo para calibrar o ND pelo custo do monstro para esse grupo."
- [ ] `Nível do grupo` e `Ritmo do dia` ficam dentro de um `<details>` **"Calibrar pelo nível do grupo (opcional)"**, fechado por padrão, com a explicação do ritmo ("combates por descanso: T20 1 a 2, 5e 6 a 8; mexe no ND mesmo sem nível"). `ND final` e a linha "ND de referência · ND calibrado" ficam sempre visíveis. Como o diálogo se redesenha a cada mudança, o estado aberto do `<details>` vai em `estado.calibrarAberto` (mesmo padrão do `textoAberto`).
- [ ] Teste vermelho primeiro: `DialogoConversor.DEFAULT_OPTIONS.actions` ganha `alternarCalibragem` e o teste confere que alterna `estado.calibrarAberto` sem perder o que foi digitado (modelo: o teste do botão "Colar Texto" em `tests/dialogo.test.js`).
- [ ] `npm test`; commit `Versão 0.6.0: seções do diálogo explicadas e calibragem opcional recolhida`.

**Não verificado até o teste no Foundry:** a aparência (largura da nota, quebra de linha do `<details>`).

## Tarefa 3: Arrastar poderes e magias para a ficha em criação

**Viabilidade:** alta. Não há código de arrastar no módulo hoje, mas a base serve: o Ajustar ND já conta itens `poder` e `magia` para a faixa de habilidades do patamar (`calculo.js`, filtro `['poder', 'magia'].includes(i.type)`) e só mexe no dano de poderes com a flag `danoPoder`, então um poder arrastado **entra na ficha e conta no patamar sem ter o dano reescrito**.

**Decisões de design:**
- Aceita `poder` e `magia` do Tormenta20. Arma, equipamento e itens de outro sistema (`feat` do dnd5e) são recusados com aviso. **Arma fica fora** porque o diálogo balanceia os ataques pela lista de ataques (`ataquesPorArmaDe` lê a flag `indiceAtaque`); soltar uma arma exigiria entrar nessa lista.
- Os itens arrastados ficam em `estado.itensExtras` (objetos simples, `item.toObject()` sem `_id`, `folder`, `sort`, `ownership` e `_stats`), listados num bloco "Itens arrastados" com botão de remover. Na criação ganham `_id` novo.
- Fontes: compêndio, outra ficha, diretório de itens. O dado do arrasto é `{ type: 'Item', uuid }`, resolvido com `fromUuid`.
- Sem checkbox "ajustar o dano pela tabela" para itens arrastados nesta versão (ficam como vêm); fica como melhoria futura se o mestre pedir.

**Arquivos:**
- Criar: `scripts/conversor/itens-extras.js`, `tests/itens-extras.test.js`
- Modificar: `scripts/conversor/criar-ator.js` (`montarDadosAtor`), `scripts/conversor/origem-cr.js` (`criaturaDeFormulario`), `scripts/dialogo-conversor.js`, `templates/dialogo-conversor.hbs`, `lang/pt-BR.json`, `tests/criar-ator.test.js`, `tests/dialogo.test.js`

- [ ] **Passo 1: teste vermelho do módulo puro** (`tests/itens-extras.test.js`):

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { itemExtraDe, TIPOS_ITEM_EXTRA } from '../scripts/conversor/itens-extras.js';

const poder = { _id: 'abc', name: 'Sopro', type: 'poder', img: 'icons/svg/aura.svg', folder: 'f', sort: 5, ownership: { default: 0 },
  _stats: { systemVersion: '1.6.6' }, flags: { outro: { x: 1 } }, effects: [{ name: 'Efeito' }], system: { rolls: [{ name: 'Dano' }] } };

test('itemExtraDe: aceita poder e magia, tira os campos do documento e marca a origem', () => {
  assert.deepEqual(TIPOS_ITEM_EXTRA, ['poder', 'magia']);
  const extra = itemExtraDe(poder);
  assert.equal(extra.name, 'Sopro');
  for (const campo of ['_id', 'folder', 'sort', 'ownership', '_stats']) assert.equal(campo in extra, false);
  assert.deepEqual(extra.effects, [{ name: 'Efeito' }]);
  assert.deepEqual(extra.flags, { outro: { x: 1 }, 't20-conversor-5e': { extra: true } });
  assert.equal(poder._id, 'abc'); // não altera o original
  assert.equal(itemExtraDe({ ...poder, type: 'magia' }).type, 'magia');
});

test('itemExtraDe: recusa arma, equipamento, feat do dnd5e e entrada vazia', () => {
  for (const type of ['arma', 'equipamento', 'consumivel', 'feat']) assert.equal(itemExtraDe({ ...poder, type }), null);
  assert.equal(itemExtraDe(null), null);
  assert.equal(itemExtraDe({}), null);
});
```

- [ ] **Passo 2:** rodar `node --test tests/itens-extras.test.js` e ver falhar (módulo inexistente).
- [ ] **Passo 3: implementar** `scripts/conversor/itens-extras.js`:

```js
// Itens arrastados para o diálogo (poder e magia do T20): vão para o ator como estão, só ganham id novo na criação.
import { ID_CONVERSOR } from './criar-ator.js';

export const TIPOS_ITEM_EXTRA = ['poder', 'magia'];

export function itemExtraDe(dados) {
  if (!dados || !TIPOS_ITEM_EXTRA.includes(dados.type)) return null;
  const { _id, folder, sort, ownership, _stats, ...resto } = structuredClone(dados);
  return { ...resto, flags: { ...resto.flags, [ID_CONVERSOR]: { extra: true } } };
}
```

- [ ] **Passo 4:** teste vermelho em `tests/criar-ator.test.js`: `montarDadosAtor` com `criatura.itensExtras = [extra]` devolve `dados.items` com o item extra no fim, com `_id` novo vindo de `gerarId` e sem tocar nas armas e poderes convertidos. Depois, em `montarDadosAtor`, trocar `dados.items = [...armas, ...poderes];` por:

```js
  const extras = (criatura.itensExtras ?? []).map((item) => ({ ...structuredClone(item), _id: gerarId() }));
  dados.items = [...armas, ...poderes, ...extras];
```

- [ ] **Passo 5:** em `criaturaDeFormulario` (`origem-cr.js`), passar `itensExtras: Array.isArray(f.itensExtras) ? f.itensExtras.filter((i) => TIPOS_ITEM_EXTRA.includes(i?.type)) : []` para a criatura (importar `TIPOS_ITEM_EXTRA`; conferir que não cria ciclo de import com `criar-ator.js`). Teste em `tests/poder-dano.test.js` ou `tests/mapeamentos.test.js`, no estilo dos vizinhos: item de tipo `arma` no formulário é descartado.
- [ ] **Passo 6: diálogo.** Estado inicial `itensExtras: []`. Em `_onRender`, na seção `.conversor`:

```js
    const zona = this.element.querySelector('.conversor');
    zona?.addEventListener('dragover', (ev) => ev.preventDefault());
    zona?.addEventListener('drop', (ev) => this.#aoSoltar(ev));
```

e o tratador:

```js
  // Soltar um poder ou magia (compêndio, outra ficha, diretório de itens) na janela: entra na ficha como está.
  async #aoSoltar(ev) {
    ev.preventDefault();
    const leitor = foundry.applications.ux?.TextEditor?.implementation ?? TextEditor; // v13 e v14 / versões anteriores
    const arrasto = leitor.getDragEventData(ev);
    if (arrasto?.type !== 'Item') return;
    const item = await fromUuid(arrasto.uuid);
    const extra = item && itemExtraDe(item.toObject());
    if (!extra) { ui.notifications.warn(game.i18n.format('T20C5E.AvisoItemNaoSuportado', { tipo: item?.type ?? '?' })); return; }
    this.#lerFormulario();
    this.estado.itensExtras.push(extra);
    await this.render();
  }
```

mais a ação `removerItemExtra` (`splice` pelo `data-indice`, depois de `#lerFormulario`), no padrão de `#removerPoder`.
- [ ] **Passo 7: template e idioma.** Depois do `fieldset.conversor__poderes`, um `fieldset` "Itens arrastados" com a lista (`{{#each itensExtras}}` com nome, tipo e botão remover) e a dica "Arraste poderes ou magias do Tormenta20 (compêndio, outra ficha ou diretório de itens) para qualquer lugar desta janela." Chaves novas: `T20C5E.SecaoItensExtras`, `T20C5E.ItensExtrasDica`, `T20C5E.AvisoItemNaoSuportado` ("Só poderes e magias do Tormenta20 podem ser arrastados ({tipo} não serve)."). `_prepareContext` ganha `itensExtras: e.itensExtras.map((i, indice) => ({ indice, nome: i.name, tipo: i.type }))`.
- [ ] **Passo 8: teste do diálogo** (Foundry simulado, `tests/dialogo.test.js`): com `globalThis.fromUuid` devolvendo um item falso (`type: 'poder'`, `toObject()`), `foundry.applications.ux.TextEditor.implementation.getDragEventData` devolvendo `{ type: 'Item', uuid: 'x' }` e `d.render` contando chamadas, chamar o tratador por `d._onRender()` com `.conversor` falso e disparar o `drop`; conferir `estado.itensExtras.length === 1`. Segundo caso: item `arma` não entra e `ui.notifications.warn` é chamado.
- [ ] **Passo 9:** `npm test`, `graphify update .`, commit `Versão 0.6.0: arrastar poderes e magias para a ficha em criação`.
- [ ] **Passo 10 (manual, Foundry v13 e v14):** abrir o diálogo, arrastar um poder do compêndio de habilidades de criaturas para a janela, conferir que aparece em "Itens arrastados"; criar a ameaça e conferir o poder na ficha e o aviso do patamar do Ajustar ND contando-o; arrastar uma arma e ver o aviso; remover o item e conferir que sai.

**Riscos:** o caminho de `TextEditor.getDragEventData` mudou entre v12, v13 e v14 (a linha acima cobre os dois, mas só o teste no Foundry confirma). Itens de compêndio carregam pelo `fromUuid` de forma assíncrona; se o compêndio estiver bloqueado ou o item sumir, `fromUuid` devolve `null` e o aviso diz "?" no tipo.

## Tarefa 4 (decisão, sem implementação): separar o "criar ameaça"

**Primeiro, o que o formulário é.** O mesmo formulário tem dois usos: (a) **revisar** o que Importar JSON e Colar Texto leram da 5e, e (b) **criar do zero** digitando CR, atributos, ataques e poderes. Não dá para dizer que "Criatura" e "Nível do grupo" são só do segundo uso: no uso (a) o CR e o ritmo também definem o ND. O que seria "criar ameaça" de verdade é outro fluxo: **escolher o ND direto** (sem CR, sem ritmo, sem nível), escolher papel, tamanho, tipo, atributos, e montar a ficha com poderes arrastados (a Tarefa 3 é o que torna isso útil).

| Opção | Prós | Contras |
|---|---|---|
| **A. Deixar como está** (tarefas 1 a 3) | Custo zero de arquitetura; nada quebra; a clareza melhora com as notas | "Criar do zero" continua enterrado num módulo chamado "5e para T20" |
| **B. Segundo botão "Criar ameaça" neste módulo**, ao lado de "5e para T20" | Reaproveita todo o código (modelo do ator, criação, proteção das perícias, arrastar); uma instalação; é a menor mudança que dá o botão | O nome do módulo ("5e para T20", "converte criaturas de D&D 5e") não descreve a função nova; mistura dois propósitos no README e no manifesto |
| **C. Levar para o Ajustar ND** (mesmo autor) | Um só lugar para as ferramentas de ND (tabelas, ajuste e criação); o botão ao lado de "Ajustar ND" faz sentido; o conversor já depende dele | Obriga a mover ~500 linhas (`modelo-ator.js`, `criar-ator.js`, partes de `origem-cr.js`, o `Actor.update` embrulhado) para o Ajustar ND, e o conversor passaria a chamar a criação por uma API dele: as duas versões ficam acopladas (o conversor exige o Ajustar ND novo). O Ajustar ND deixa de ser só calculadora e passa a conhecer o modelo de dados do sistema (que muda a cada versão do Tormenta20) |
| **D. Terceiro add-on novo** | Separação limpa de propósito | Três módulos, três releases e três manifestos; e o código de criar ator teria de morar em outro lugar ou ser copiado (mesmo problema da C, mais um módulo) |

**Recomendação:** fazer as tarefas 1 a 3 agora (opção A). Depois, se quiser o botão "Criar ameaça", começar pela **B**: é a única que se entrega sem refatorar nada nos dois módulos e permite aprender se o fluxo é usado. Só se ele pegar, extrair o código de criação para o Ajustar ND (C) numa versão própria, com spec e plano. D tem o custo da C e mais um módulo para manter.

Se a B for escolhida, vira um **novo ciclo de spec**: o fluxo "ND direto" não existe hoje e precisa de decisões (quais campos, como escolher o ND, o que acontece com o CR) que este plano não toma.
