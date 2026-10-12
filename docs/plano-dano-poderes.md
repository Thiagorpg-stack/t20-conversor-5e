# Plano de implementação: dano de poderes (Ajustar ND 0.10.0 + 5e para T20)

Status: **implementado nos dois módulos (Ajustar ND 0.10.0, 5e para T20 0.2.0), com os testes em Node passando; ainda não copiado para o Foundry nem testado nele.** Ver "Desvios do plano" no fim.
Base de dados e justificativas: [aprendizados-dano-e-conversao.md](aprendizados-dano-e-conversao.md).

## 1. Objetivo

Hoje o Ajustar ND e o conversor ajustam o dano só das **armas**. Poderes com dano (sopro, rugido, constrição...)
ficam com o número da 5e, fora da tabela. O objetivo é que o dano dos poderes também siga a tabela de dano do ND.

## 2. Regras decididas

| Tipo de ação do poder | Como entra no dano |
|---|---|
| Padrão ou completa, **com efeito** | `0,6 × Dano da tabela` |
| Padrão ou completa, **sem efeito** | `0,7 × Dano da tabela` (provisório, escolha do mestre) |
| Passivo, reação, movimento, especial, livre | Entram na conta do dano por rodada **junto com as armas**, 1 uso por rodada cada |

- **Ação completa conta como ação padrão** para o cálculo.
- **"Com efeito"** = o poder impõe condição, tem teste de resistência ou é de área. Só isso decide o fator.
  Ser de área ou não só decide a **forma da fórmula** (abaixo).
- **Fórmula do poder de ação padrão/completa**: mantém o dado da 5e (d8 fica d8; sem dado, usa d12),
  **só dados, sem bônus fixo**, no máximo **ND+1 dados**. Se o limite cortar, o dano fica abaixo do alvo
  (como o Dragão-Rei, 130 contra 194). Não se joga o resto no bônus.
- **Duas partes de dano**: o total é repartido na proporção original das médias; cada parte mantém o seu dado.
  O limite de dados vale para o total.
- **Poderes que dividem a rodada com as armas** usam a fórmula atual do motor (`Nd6+B`).
- **Armas** continuam como estão (`Nd6+B`).

### Teste de resistência (o alvo rola uma perícia contra a CD)

| Atributo na 5e | Perícia no T20 |
|---|---|
| Força | Atletismo |
| Destreza | Reflexos |
| Constituição | Fortitude |
| Sabedoria | Vontade |
| Carisma | Vontade (padrão assumido) |
| Inteligência | Vontade (padrão assumido) |

"Metade no sucesso" da 5e vai junto (campo de texto da resistência). O nome do teste no texto da descrição
também deve ser trocado ("Constitution Saving Throw" vira "Fortitude").

## 3. Decisões assumidas (a mestre pode mudar)

1. Fator "sem efeito" = **0,7**.
2. O fator depende só de ter efeito ou não.
3. Carisma e Inteligência viram Vontade.
4. **Poderes de fichas que não vieram do conversor ficam desligados por padrão** no Ajustar ND, com uma caixa por
   poder no diálogo. Motivo: ligar tudo mudaria o dano das armas das fichas oficiais sem aviso.
5. Armas mantêm a fórmula de hoje.

## 4. Arquitetura

O cálculo mora no **motor do Ajustar ND** (armas e poderes calculados juntos, no mesmo lugar). O conversor só
fornece poderes bem formados. Assim reajustar um ator depois não desfaz a divisão, e não há duas implementações.

Reaproveitamento do que já existe no motor (`scripts/dano.js`, `balancearDano`):
- **Alternativas** ("uma OU outra", cada uma balanceada contra o dano total) = poder de ação padrão/completa,
  com 1 uso, mas com fator (0,6 ou 0,7) e estilo de fórmula "só dados".
- **Grupo compartilhado** (armas que dividem o dano entre si) = recebe também os poderes não padrão, 1 uso cada.

### Configuração por poder

Guardada numa flag do item, `flags['tormenta20-ajuste-nd'].danoPoder`:

```json
{ "ajustar": true, "efeito": true }
```

- Sem a flag, o poder não é tocado.
- O conversor grava a flag ao criar o poder. O diálogo do Ajustar ND permite editar.
- Os poderes das fichas oficiais **não** têm `resistencia.pericia` preenchido (0 de 203 poderes do compêndio de
  ameaças, inclusive os 45 que causam dano), então "efeito" não pode depender só desse campo. O padrão é detectado por palavras no texto
  (condições, "reduz à metade", "todas as criaturas", cone, esfera...) e fica editável.

## 5. Mudanças por arquivo

### Ajustar ND (`Ameaças/tormenta20-ajuste-nd`, versão 0.9.0 para 0.10.0)

| Arquivo | Mudança |
|---|---|
| `scripts/dano.js` | Nova função de fórmula só com dados (dado, alvo, limite ND+1). `balancearDano` aceita entradas com `fator` e `estilo`. Divisão proporcional de partes de dano para poderes |
| `scripts/calculo.js` | `lerPoderes(items)` lê poderes com dano e flag. `planejarAjuste` inclui poderes nos grupos. `revisarItens` deixa de listar o que foi ajustado |
| `scripts/ajuste.js` | `itemUpdates` para poderes (reescreve `system.rolls`); troca da fórmula e da média na descrição |
| `scripts/textos.js` | Nova troca de fórmula no texto ("16 (3d8 + 3 Bludgeoning)" vira "N (novaFórmula Bludgeoning)"), normalizando espaços |
| `scripts/dialogo.js`, `templates/dialogo.hbs` | Seção "Poderes com dano": caixa "ajustar" e "com efeito" por poder; prévia antes/depois |
| `scripts/api.js` | Subir `VERSAO_API` (o conversor passa a exigir) |
| `module.json`, `README.md`, `lang/pt-BR.json` | Versão 0.10.0, documentação e textos |
| `tests/` | Casos de ouro abaixo |

### Conversor (`t20-conversor-5e`)

| Arquivo | Mudança |
|---|---|
| `scripts/conversor/origem-json.js` | Ler o dano do poder (atividades `damage.parts`: dado, número, bônus, tipo; dano personalizado) e o teste de resistência (`save.ability`, `damage.onSave`) |
| `scripts/conversor/origem-cr.js` | Campos novos do poder: partes de dano, resistência, `efeito` |
| `scripts/conversor/modelo-ator.js` | `criarItemPoder` com `rolls` de dano reais, `resistencia`, flag `danoPoder` |
| `scripts/conversor/criar-ator.js` | Montar os poderes com isso |
| `scripts/dialogo-conversor.js`, template | Por poder: "ajustar dano" e "com efeito" ao lado do tipo de ação; prévia mostra a fórmula calculada |
| `scripts/api-ajuste-nd.js`, `module.json` | `VERSAO_API_MINIMA` e `requires` para 0.10.0 |
| `tests/` | Leitura do dano e da resistência; montagem do poder |

## 6. Algoritmo (poder de ação padrão ou completa)

```
alvo   = fator × Dano(tabela, papel, ND)            fator = 0,6 com efeito | 0,7 sem efeito
partes = partes de dano do poder, com média e dado originais
para cada parte:  alvoParte = alvo × (médiaParte / somaMédias)
                  dados     = round(alvoParte / médiaDoDado)        (mínimo 1)
limite = floor(ND) + 1 dados no total (ND 1/4 e 1/2 contam como 0)  → reduz o que passar
fórmula = "{dados}d{faces}" por parte, sem bônus
```

Poder que divide a rodada com as armas: entra como arma de 1 ataque no grupo compartilhado, e o motor existente
reparte o dano (proporção original, `Nd6+B`).

## 7. Casos de ouro para os testes

Sopro dos dragões oficiais (solo, d12), regra `0,6 × tabela`, limite ND+1:

| Criatura | ND | Tabela | Esperado |
|---|---|---|---|
| Dragão Filhote | 3 | 21 | 2d12 |
| Dragão Jovem | 7 | 62 | 6d12 |
| Dragão Adulto | 11 | 130 | 12d12 |
| Dragão Venerável | 15 | 186 | 16d12 |
| Dragão-Rei | 20 | 324 | 21d12 (oficial 20d12, tolerância de 1 dado) |

Outros casos:
- **Otyugh, Pancada de Tentáculos** (ND 5, solo, com efeito): `0,6 × 40 = 24`; dado d8 → `5d8` (média 22,5); limite 6 dados.
- **Poder sem efeito, ND 5, d8**: `0,7 × 40 = 28` → `6d8`.
- **Duas partes** (3d8 impacto + 2d6 fogo): alvo repartido pela proporção 13,5 : 7.
- **Sem dado na origem**: usa d12.
- **Poder sem a flag**: não é tocado.
- **Reajustar um ator já ajustado**: mesmo resultado (idempotente).
- **Poder não padrão com dano**: as armas recebem menos dano; a soma da rodada continua igual à tabela.
- **Texto**: a fórmula e a média na descrição são trocadas; o resto fica igual.

## 8. Ordem de trabalho

1. Motor do Ajustar ND com testes (fórmula só dados, limite, partes, grupos).
2. Troca de fórmula no texto, com testes.
3. Diálogo do Ajustar ND (seção de poderes e prévia).
4. Conversor: leitura do dano e da resistência, criação do poder com flag.
5. Diálogo do conversor (campos por poder).
6. README, versões, e só então copiar para o Foundry.

Regra de processo: **conferir os testes antes de copiar para o Foundry** (uma cópia feita com um teste
falhando deixou o módulo quebrado por alguns minutos).

## 9. Riscos e itens abertos

- Mudar o dano das armas em fichas existentes quando poderes não padrão entram na conta (mitigado: desligado por padrão).
- O campo `resistencia` do poder no sistema (`pericia`, `atributo`, `bonus`, `txt`) **não foi verificado** além do nome dos campos.
- O fator "sem efeito" (0,7) **não tem dado oficial** que o sustente.
- Poderes de alvo único de ação padrão têm poucos exemplos oficiais; o fator vale por escolha, não por medição.
- Os limites de dados e de bônus altos dependem da **pesquisa nos livros** que o mestre vai fazer.
- Magias com custo de PM seguem outra regra (dano por PM) e ficam **fora** deste plano.
- Contar poderes passivos com dano na conta é decisão do mestre, não medida nos dados.

## 10. Desvios do plano (implementação)

- **Bando:** com o template Bando os poderes **não são ajustados** (ficam em "Para revisar"). O marcador do Bando só guarda e restaura as rolagens das armas; multiplicar o dano dos poderes quebraria o reajuste.
- **`resistencia`:** o sistema T20 não estava instalado para conferir. Seguindo as fichas oficiais, o conversor grava só `resistencia.txt` ("Reflexos Metade"; "Fortitude anula" quando a 5e não dá dano no sucesso) e deixa `pericia`, `atributo` e `bonus` vazios.
- **Padrão da flag:** poder criado pelo conversor nasce com `ajustar: true`; o de ficha existente fica desligado, com caixa no diálogo do Ajustar ND.
- **Poder sem dano** (como Aura Aterradora) não recebe `resistencia.txt`; o teste fica só no texto.
- **Duas partes e reajuste:** o arredondamento pode deslocar um dado se o poder de duas partes for reajustado em ND diferente; guardar as proporções originais na flag resolveria, se aparecer na prática.
- **Fator 0,7 (sem efeito):** continua provisório, sem dado oficial.
- **API:** `VERSAO_API` 2 no Ajustar ND; `VERSAO_API_MINIMA` 2 no conversor.
