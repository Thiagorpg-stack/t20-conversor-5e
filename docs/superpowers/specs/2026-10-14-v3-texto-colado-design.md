# v3: converter um bloco de estatísticas colado como texto

Versão alvo: 0.5.0. Data: 2026-10-14.

## Objetivo

O mestre de Tormenta20 cola o texto de uma criatura de D&D 5e (livro, site ou PDF) e o formulário do conversor
é preenchido como na importação de JSON (v2): mesmos campos, mesmo relatório (ok, revisar, ignorado). O mestre
confere, ajusta CR, papel e ND, e cria a ameaça pelo caminho de sempre.

## Decisões já tomadas

- **Idiomas:** inglês e português (livros em PT-BR), com detecção por rótulos, sem escolha manual.
- **Layouts:** 2014 ("Armor Class 17 (natural armor)", "Challenge 5 (1.800 XP)") e 2024 ("AC 17  Initiative +0",
  "CR 5 (XP 1,800; PB +3)", tabela de atributos com Mod e Save).
- **Escopo:** paridade com a v2 (CR, tamanho, tipo, deslocamentos, atributos, ataques com dano e dano extra,
  Multiataque, poderes com dano e teste de resistência, usos e recarga, área, sentidos, idiomas, resistências,
  imunidades, conjuração). Sem imagem nem token (o texto não traz).
- **Abordagem:** o parser de texto monta um ator dnd5e de mentira e o entrega ao `lerAtor5e` da v2, que não muda.
  Toda regra de conversão continua num lugar só; a paridade vem do mesmo código.

## Fora do escopo

Mais de uma criatura por colagem, imagem e token, OCR, PV e CA do bloco (seguem vindo da tabela do ND),
refatorar o `origem-json.js` num núcleo comum.

## Design

### 1. Entrada no diálogo

- Em `templates/dialogo-conversor.hbs`, ao lado de "Importar JSON": um `<details>` com um `<textarea>`
  (`name="texto5e"`) e o botão "Ler texto" (`data-action="importarTexto"`). Textos em `lang/pt-BR.json`.
- `scripts/dialogo-conversor.js`: o trecho de `#importar` depois do `lerAtor5e` (relatório, imagens, `estado`,
  `render`) vira `#aplicarResultado(resultado)`, usado pelas duas origens. O texto devolve `imagens` vazio, e o
  fluxo atual já registra no relatório que imagem e token não vieram.
- Fluxo do texto: `obterTabelas()` → `textoParaAtor5e(texto)` → `lerAtor5e(ator, { pvSoloNoND })` →
  avisos do parser antepostos ao relatório → `#aplicarResultado`. Erro vira `ui.notifications.error` e o
  formulário não é tocado.

### 2. Parser: `scripts/conversor/origem-texto.js`

Função pura, sem Foundry. Exporta `textoParaAtor5e(texto) → { ok, ator, avisos }` (ou `{ ok: false, erro }`).

- **Normalização:** `\r\n`, hifenização de fim de linha de PDF, linhas quebradas no meio de uma frase, aspas e
  travessões tipográficos, "−" (U+2212) como menos.
- **Cabeçalho:** primeira linha não vazia = nome. A linha "Large Aberration, Neutral" / "Grande Aberração,
  neutro" dá `traits.size` e `details.type.value`; o tipo é lido na tabela de tipos já usada em `mapeamentos.js`
  (com os nomes em português acrescentados lá, se faltarem).
- **Campos por rótulo** (tabela EN/PT no próprio módulo): CA, PV, deslocamento, atributos, testes, perícias,
  resistências, vulnerabilidades, imunidades a dano e a condições, sentidos, idiomas, CR/ND. Os rótulos são
  reconhecidos em qualquer posição de linha, o que cobre 2014 e 2024. Atributos: o primeiro inteiro depois de
  cada sigla (FOR DES CON INT SAB CAR em PT), serve para "17 (+3)" e para "Str 21 +5 +5".
- **Unidade:** "ft." mantém pés; "m", "metros" ou "m." marcam `movement.units = 'm'`. As distâncias em `senses`
  e `languages` seguem a unidade do bloco.
- **Seções:** Traits/Características (antes de Actions), Actions/Ações, Bonus Actions/Ações Bônus,
  Reactions/Reações, Legendary Actions/Ações Lendárias, Lair Actions/Ações de Covil. A seção define
  `activation.type` do item (`action`, `bonus`, `reaction`, `legendary`, `lair`; traço = sem ativação).
- **Entradas:** "Nome. texto". Como o texto colado perde o itálico, o fim do nome é heurístico: o primeiro ". "
  nos primeiros 60 caracteres da entrada, ignorando o ponto de "(Recharge 5–6)" e de abreviações ("ft."). Sem esse
  ponto, a linha inteira vira texto de um poder sem nome e o parser avisa. Se o nome tiver mais de 6 palavras, ele
  também avisa.
- **Cada entrada vira um item `feat`** com `description.value` em texto puro e:
  - **ataque:** "Melee/Ranged Weapon Attack" (2014), "Melee/Ranged Attack Roll" (2024) ou "Ataque Corpo a
    Corpo/à Distância com Arma" (PT) → atividade `attack` (`attack.type.value` `melee` ou `ranged`);
  - **dano:** "Hit: 16 (2d8 + 7) slashing damage" / "Acerto: 16 (2d8 + 7) de dano cortante" → `damage.parts`
    com `number`, `denomination`, `bonus` e `types`; "plus 5 (1d10) lightning damage" é a segunda parte;
  - **teste de resistência:** "DC 15 Constitution Saving Throw", "Dexterity Saving Throw: DC 15", "teste de
    resistência de Destreza CD 15" → atividade `save` (`save.ability`, `onSave` `half` se "half as much damage" /
    "metade do dano");
  - **usos e recarga:** "(3/Day)", "(2/Dia)", "(Recharge 5–6)", "(Recarga 5–6)" → `uses`, `recovery`;
  - **área:** "30-foot cone", "line 60 feet long and 5 feet wide", "cone de 9 m" → `target.template`;
  - **Multiataque:** identificado pelo nome (`multiattack` / `Multiataque`), com o `identifier` correspondente;
  - **Spellcasting/Conjuração:** `attributes.spellcasting` a partir de "spellcasting ability is Intelligence" /
    "atributo de conjuração é Inteligência".
- Tipos de dano em português (cortante, perfurante, contundente, ácido, ígneo/de fogo...) são traduzidos para as
  chaves do dnd5e antes de montar as partes; os do inglês passam direto para `mapearTipoDano`.

### 3. Avisos e erros

- O parser devolve `avisos` (linhas "revisar" do relatório): fim de nome duvidoso, rótulo reconhecido sem
  valor legível, dano que não bate com o padrão, idioma não detectado (assume inglês). Entram antes do
  relatório do `lerAtor5e`.
- Erro fatal único: nenhum atributo e nenhum CR reconhecidos (`T20C5E.ErroTexto`: "isto não parece um bloco de
  estatísticas"). Bloco incompleto é aceito; o `lerAtor5e` já pede o que falta (ex.: sem CR).

### 4. Testes e entrega

- **Versionados** (`tests/origem-texto.test.js`), com criaturas inventadas e sem texto de livro: uma por
  combinação EN/PT × 2014/2024, mais casos de dano extra, recarga, usos, área, teste de resistência, PDF com
  linhas quebradas, tipos de dano em PT e erro fatal. Rodam em Node com `npm test`.
- **Gabarito local:** `tests/fixtures/<nome>-5e.txt` (Otyugh, Dragão Azul, Arquimago), com o bloco copiado do
  livro. O teste compara o `estado` e os tipos do relatório do texto com os do JSON de mesmo nome, e pula
  sozinho se o `.txt` não existir. `.gitignore` ganha `tests/fixtures/*.txt` (direitos autorais, como os JSON).
- **Entrega:** `module.json` e `package.json` em 0.5.0; README com a seção "Como usar" da v3 e o status
  atualizado (a lista "Versões planejadas" marca a v3 como feita); `docs/aprendizados-dano-e-conversao.md`
  ganha o que o parser de texto ensinar sobre diferenças entre texto e JSON.

## Riscos

- **Nome da habilidade sem itálico:** a heurística pode cortar errado; mitigado por aviso e porque o mestre
  edita nome e texto no diálogo.
- **PDF:** colunas misturadas e quebras ruins ficam fora do que dá para garantir; o relatório diz o que não foi
  lido.
- **Acoplamento ao formato dnd5e:** o ator de mentira precisa seguir o que `lerAtor5e` lê. Os testes de gabarito
  protegem esse contrato.
