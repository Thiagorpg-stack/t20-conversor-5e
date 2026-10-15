# Aprendizados: dano e conversão de D&D 5e para Tormenta20

Reúne o que descobrimos ao construir o **5e para T20** e ao estudar o **Ajustar ND**, para reaproveitar a lógica no
Crias de Megalokk. Tudo aqui é medido ou lido do código; o que é suposição está marcado como tal (seção 11).
Plano de implementação do dano de poderes: [plano-dano-poderes.md](plano-dano-poderes.md).

## 1. Como os dados foram apurados

- **Compêndio "Ameaças" oficial** do sistema Tormenta20 1.6.6 instalado: **83 ameaças e 463 itens**, lidos de uma
  cópia (ver seção 10). Dessas, 82 têm armas e 52 itens (poder ou magia) causam dano.
- **Fichas de teste do Ajustar ND** (`tests/fixtures`): Dragão Venerável, Golem de Ferro, Troll, Vampiro etc.
- **Exemplos de ND alto** passados pelo mestre: Dragão-Rei (ND 20), Lefeu Ezzayn (ND 17), Kraken (ND 19), Kaiju (ND 20).
- **Uma ficha de 5e real**: Otyugh (Monster Manual 2025, dnd5e 5.3.3), usada em todos os testes de ponta a ponta.

## 2. A tabela de parâmetros por ND (Ajustar ND, `data/tables.json`)

Cada linha, por papel (Solo, Lacaio, Especial): **PV, CD, Defesa, Ataque, ResForte, ResMedia, ResFraca, Dano**
(e faixa de habilidades). O **"Dano" é o dano por rodada contra um alvo**, somando todos os golpes.

Dano do papel Solo (valores vistos):

| ND | 1 | 2 | 3 | 5 | 6 | 7 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 17 | 19 | 20 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Dano | 15 | 18 | 21 | 40 | 56 | 62 | 74 | 80 | 130 | 144 | 158 | 172 | 186 | 270 | 306 | 324 |

- Lacaio no ND 5 tem Dano 56 (mais dano, menos PV); Especial no ND 5 tem 40.
- **ND 5 Solo** (referência dos testes): PV 200, CD 20, Defesa 24, Ataque 17, resistências 17 / 11 / 5, Dano 40.
- Patamares: **Iniciante** até ND 4, **Veterano** até 10, **Campeão** até 16, **Lenda** acima (`CONFIG.T20.patamares = [4, 10, 16, 20]`).
- **Limite de ataques por rodada** (`maxAtaques`): ND ≤ 4 → 1; ≤ 10 → 2; ≤ 16 → 3; acima → 4.
- **RD do Chefe Final** por patamar: Veterano +5, Campeão +10, Lenda +20 (Iniciante 0).

## 3. Dano das armas

### O que os números oficiais mostram

- Soma do dano das armas por rodada ÷ tabela, nas 82 criaturas: **mediana 0,77** (quartis 0,50 e 0,98). A tabela é
  um alvo/teto; as fichas oficiais ficam em geral abaixo.
- Exemplos de ND alto (soma por rodada contra a tabela):

| Criatura | Golpes | Média por golpe | Soma | Tabela | Razão |
|---|---|---|---|---|---|
| Dragão-Rei, ND 20 | 1 mordida + 2 garras: 6d20+50 | 113 | 339 | 324 | 1,05 |
| Kraken, ND 19 | 8 tentáculos 2d10+30, mordida 2d12+23 | 41 e 36 | 364 | 306 | 1,19 |
| Kaiju, ND 20 | 4 golpes: 2d20+50 | 71 | 284 | 324 | 0,88 |

- **O bônus fixo é grande**: 44% a 73% da média de cada golpe (+50, +30, +29, +23), com poucos dados.
  A fórmula do Ajustar ND (`Nd6+B`: 1d6 a cada 10 pontos) dá cerca de 65% de bônus, dentro da faixa oficial.
- Mais golpes por rodada dividem o total em golpes menores e com menos dados.

### Fórmula do Ajustar ND

`gerarFormulaDano(média)`: `n = max(1, floor(média / 10))` dados d6; `bônus = round(média − n × 3,5)`.
Ex.: 40 → `4d6+26`. Armas "alternativas" (uma OU outra) são balanceadas cada uma contra o dano total; as demais
dividem o total, mantendo a proporção da ficha original; o dano secundário (por exemplo "1d6 de ácido") fica fixo.

### Multiataque: 5e contra T20

Na 5e quase toda criatura de CR 2 ou mais tem multiataque; em T20 o limite cai com o ND (item anterior) e o motor
reparte o dano pelos golpes. Por isso a quantidade de ataques é escolha do mestre, em quatro modos:

| Modo | Efeito |
|---|---|
| Como no multiataque da 5e | Usa a quantidade lida do texto do Multiattack (`one Bite and two Tentacle` → 1 e 2) |
| Um por ataque (estilo T20) | 1 por ataque |
| Como na 5e, até o limite do ND | Tira golpes do ataque que mais se repete até caber no limite |
| Manual | Não mexe; entra sozinho quando o mestre edita uma quantidade |

O Multiattack da 5e vira um **poder** só com texto (conta nos poderes do patamar no Ajustar ND).

## 4. Dano dos poderes (o achado principal)

### 4.1 Poderes de ação padrão de área: o sopro dos dragões

Só dados (d12), sem bônus, número de dados acompanhando o ND:

| Criatura | ND | Fórmula | Média | Tabela | Razão |
|---|---|---|---|---|---|
| Dragão Filhote | 3 | 2d12 | 13 | 21 | 0,62 |
| Dragão Jovem | 7 | 6d12 | 39 | 62 | 0,63 |
| Dragão Adulto | 11 | 12d12 | 78 | 130 | 0,60 |
| Dragão Venerável | 15 | 16d12 | 104 | 186 | 0,56 |
| Dragão-Rei | 20 | 20d12 | 130 | 324 | 0,40 |

O cone cresce de 3 em 3 m (6, 9, 12, 15, 18). **`0,6 × tabela` limitado a `ND+1` dados reproduz os cinco**
(quatro exatos; o Dragão-Rei sai com 21d12). Sem o limite, o ND 20 daria 30d12. Como é só dado, não há problema de
bônus fixo alto nos poderes (ele existe nos ataques).

Outros poderes de área de ND alto (Kaiju, ND 20): Arremessar Montanha 10d12 (0,20, mais 2d12 por turno),
Rugido Aterrador 16d12 (0,32), Sopro Corrosivo 12d20 (0,39). O 16d12 aparece no ND 15 e no ND 20: o dano de poderes
de área **não escala de forma linear** com a tabela.

### 4.2 Por tipo de ação (52 itens com dano; razão = dano do poder ÷ tabela)

| Tipo de ação | n | Mediana | Quartis |
|---|---|---|---|
| Padrão | 20 | 0,38 | 0,28 a 0,60 |
| Completa | 2 | 0,23 | 0,21 a 0,24 |
| Movimento | 5 | 0,21 | 0,09 a 0,27 |
| Livre | 3 | 0,35 | 0,22 a 0,56 |
| Sem tipo (passivo) | 22 | 0,33 | 0,16 a 0,39 |

Padrão ou completa, por classe: com área (n 14) 0,40; sem área (8) 0,23; com efeito (13) 0,40; sem efeito (9) 0,34;
área e efeito (10) 0,48; área sem efeito (4) 0,38; sem área e com efeito (3) 0,15; sem área e sem efeito (5) 0,24.

### 4.3 Poderes de dano adicional ou automático

- Constrição do Kraken (ação livre, por criatura agarrada): `4d10+30` = 52 (0,17); mantém bônus fixo, sem ataque.
- Drenar Sangue do Vampiro (ND 12): 0,15. Dilacerar do Troll (ND 5): 0,33.
- O Enxame do Lefeu (14d8, 0,23) pertence ao modelo **Bando**, que multiplica números; tratar à parte.
- Soma de uma arma média (0,77) mais um poder passivo médio (0,33) dá cerca de 1,1: apoia a ideia de poderes não
  padrão dividirem a rodada com as armas.

### 4.4 Cuidados de leitura dos dados

- **Magias com custo de PM** aparecem como `poder` nas fichas (Bola de Fogo, Relâmpago, Toque Vampírico, Crânio
  Voador). O dano delas segue a regra de magias, não esta. Excluir da calibração.
- "Área" e "efeito" foram detectados por **palavras no texto**; conferido à mão na lista de padrão/completa.
- Quase todos os poderes naturais de área têm condição junto, então **não dá para calibrar "sem efeito"** a partir
  dos oficiais.
- Poderes de alvo único de ação padrão: poucos exemplos (0,15 a 0,77), sem fator confiável.
- O campo `resistencia.pericia` dos poderes **está vazio em todos os 203 poderes** do compêndio de ameaças (inclusive
  nos 45 que causam dano e nos sopros); não serve para detectar "efeito". O teste de resistência aparece só no texto.

## 5. De CR para ND: a calibração por ritmo

Um grupo de T20 aguenta 1 a 2 combates do seu ND por descanso; em 5e o dia de aventura espera 6 a 8.

```
Q = Dano × PV   (da linha da tabela do papel)
Q alvo = Q(L) × (1,5 ÷ k) × ρ        L = nível do grupo · ρ = XP(CR) ÷ XP(L)
ND = linha da tabela com Q mais próximo de Q alvo (escala logarítmica)
```

`k` por ritmo: T20 = 1,5; intermediário = 3; estilo 5e = 7. Sem nível do grupo: usa o **ND de referência** do CR
como nível, com ρ = 1. Acima de CR 20 só vale a tabela de referência. XP por CR do DMG 2014 (conferido pelo mestre).

ND de referência (potência pura): CR 0, 1/8 e 1/4 → 1/4; CR 1/2 → 1/2; CR 1 a 20 → igual; 21 a 25 → S; 26 ou mais → S+.

Exemplo: Otyugh CR 5, sem nível, ritmo estilo 5e → **ND 3** (PV 105, quase os 104 da 5e). No ritmo T20 → ND 5.

**Papel sugerido** (primeira regra que se aplica): ações lendárias, resistência lendária ou covil → Solo (e sugere
Chefe Final); conjurador → Especial; PV menor que a metade do PV de um Solo no ND de referência → Lacaio; senão Solo.

## 6. Mapeamentos 5e para T20

| Item | Regra |
|---|---|
| Atributo | T20 guarda o **modificador**: `floor((valor − 10) ÷ 2)` |
| Deslocamento | pés × 0,3, arredondado ao múltiplo de 1,5 m (30 pés = 9 m) |
| Texto de CD | `DC 15` vira `CD 15` (o Ajustar ND só reconhece "CD") |
| Tamanho | tiny → min, small → peq, medium → med, large → gra, huge → eno, gargantuan → col |
| Tipo | beast → ani, construct → con, undead → mor, humanoid → hum; celestial, elemental, fey, fiend → esp (revisar); aberration, dragon, giant, monstrosity, ooze, plant → mon |
| Dano | slashing → corte, piercing → perfuração, bludgeoning → impacto, fire, cold, acid, lightning → eletricidade, necrotic → trevas, radiant → luz, psychic → psíquico; **aproximações**: force → essência, thunder → impacto, poison → dano |
| Sentidos | darkvision → `escuro`, blindsight → `cegas`; tremorsense e truesight vão como texto. T20 tem `penumbra`, `escuro`, `cegas`, `faro` |
| Idiomas | common → comum, dwarvish → anão, elvish → élfico, goblin, halfling → hynne, sylvan → silvestre, abyssal, aquan, auran, celestial, draconic, giant, gnoll, ignan, infernal, orc, terran; o resto e a telepatia vão para o texto livre |
| Imunidade a condição | blinded → cego, charmed → enfeitiçado, deafened → surdo, diseased → doente, exhaustion → exausto, frightened → apavorado, grappled → agarrado, paralyzed, petrified, poisoned → envenenado, prone → caído, restrained → enredado, stunned → atordoado, unconscious → inconsciente; o resto como texto |
| Resistências a dano | imunidade e vulnerabilidade viram as caixas por tipo; resistência vira **RD por tipo** pelo patamar do ND: **5** (até 4), **10** (até 10), **15** (até 16), **20** (acima). Calibrado nas fichas (Golem ND 10: RD 10; Dragão ND 15: RD 15). Só tipos com equivalente exato; veneno, trovejante e energia ficam só no texto |
| Ativação do poder | action → `action`, bonus → `move`, reaction → `reaction`, legendary, lair, special → `special`, minute, hour, day; sem ativação → `''` (passivo, como nas fichas oficiais) |
| Teste de resistência | CON → Fortitude, DES → Reflexos, SAB → Vontade; FOR → Atletismo; CAR e INT → Vontade (padrão assumido) |
| Token | `displayName` 20 (nome ao passar o mouse, dono) e `displayBars` 40 (barra, dono), como no original |

## 7. Formato do dnd5e 5.x (JSON de ator exportado)

- Atributos em `system.abilities.{str,dex,con,int,wis,cha}.value`; CR em `system.details.cr`; tipo em
  `system.details.type.value`; tamanho em `system.traits.size`; movimento em `system.attributes.movement`
  (`walk` pode ser texto, `units` pode ser `ft` ou `m`).
- **Ataques**: itens `weapon` (ou `feat`) com atividade `attack`; dano em `activities.*.damage.parts[]`
  (`number`, `denomination`, `bonus`, `types[]`); melee ou ranged em `attack.type.value`.
- **Multiattack**: item `feat` com `identifier: "multiattack"`; a quantidade por ataque sai do texto
  ("one Bite attack and two Tentacle attacks").
- **Teste de resistência**: atividade `save` (`save.ability[]`, `save.dc.formula`, `damage.onSave`).
- **Ativação**: `activities.*.activation.type`. No dnd5e 3.x é `system.activation.type`, e senses ficam direto em `senses`.
- Imagem do retrato vem como URL; o token como caminho do mundo de origem (às vezes inexistente em outro mundo).
- Resistências em `system.traits.{di,dr,dv,ci}` (`value[]`, `bypasses[]`, `custom`).

### Limpeza do texto das descrições

As descrições trazem enriquecedores e HTML. Regras usadas: tirar HTML (parágrafos viram quebras de linha);
`[[/r 1d20+6]]{+6}` → `+6`; `[[/damage 2d8 + 3 type=piercing]]` → `2d8 + 3 Piercing`; `&Reference[condition=Poisoned]` →
`Poisoned`; `@variantrule[Long Rest|XPHB]` → `Long Rest` (com três partes usa a terceira); decodificar entidades.

- **Usos e recarga ficam fora do texto.** Recarga: `system.uses.recovery[]` com `period: 'recharge'` e `formula: '5'`
  (dnd5e 3.x: `system.recharge.value`). Usos: `uses.max` e `uses.recovery[0].period` (`day`, `lr`, `sr`...). A resistência
  lendária não tem `uses`: a atividade consome `resources.legres.value`, e o máximo está em `system.resources.legres.max`.
- **Magias do monstro** são itens `spell` do próprio ator, e o texto do conjurar as cita por link relativo
  `@UUID[.<_id do item>]`, sem rótulo: o `_id` resolve o nome.
- **Dano adicional do golpe**: partes de dano depois da primeira (`activities.*.damage.parts[1..]`). O bônus `"@mod"` é o
  modificador do atributo do ataque (`attack.ability`; vazio = FOR no corpo a corpo, DES à distância). Sem resolvê-lo a
  proporção sai errada (2d8 vale 9; com +7 vale 16).
- `@variantrule[Line [Area of Effect]|XPHB|Line]` tem colchetes aninhados; `[[/save ability=dex dc=15]]` é teste de resistência.

- **Texto dos poderes em termos do T20** (decisões do mestre): áreas em metros (pés × 0,3, múltiplo de 1,5 m) e distâncias
  como alcance curto (até 30 pés, 9 m), médio (até 90 pés) ou longo (acima); até 10 pés ficam em metros. Distância de queda
  ("× 10 feet") não é alcance e fica como está. Toda CD segue a CD do ND da criatura, então o `[[/save ... dc=15]]` de efeitos
  de região também vira a CD da tabela.
- **Conjurador**: PM = 5 × ND (valor sugerido pelo mestre; o Chefe Final soma `2 × ND` por cima). O atributo de conjuração vem de
  `system.attributes.spellcasting` (`cha` → `car`, `wis` → `sab`).
- **Contador de uso**: `system.resources.primary|secondary|tertiary` = `{ value, max, label }`. O **poder** não tem `system.consume`
  (o esquema do tipo `poder` o remove em `schemaActivation`); só a arma tem. Então o contador é manual.

- **Poderes oficiais** (`Compendium.tormenta20.habilidades-de-criaturas`): "Magias" (`tipo: 'racial'`, passivo, texto vazio),
  "Resistência a Magia" (`tipo: 'ability'`, passivo, efeito desativado `roll +N` em `Fortitude;Reflexos;Vontade`), "Sopro"
  (`area: 'cubo 3m de lado'`, `resistencia.txt: 'Reflexos Metade'`, dano `perda`, texto "Recarga (movimento)", efeito de condição anexado),
  "Aura Aterradora" (`alcance: 'long'`, `resistencia.txt: 'Vontade evita'`, efeitos Abalado/Apavorado) e "Aura de Calor"
  (execução `free`, `alcance: 'short'`). Ícones em `systems/tormenta20/icons/poderes/ameacas/<nome>.webp`.
- **Vantagem contra magia** vira Resistência a Magia +2 (Iniciante, ND até 4) ou +5 (decisão do mestre).

## 8. Formato do Tormenta20 (sistema 1.6.6)

- **Ator NPC**: `system.atributos.X.base` (modificador), `system.attributes.{nd (texto), cd, defesa.base, pv, movement.walk.base (m)}`,
  `system.detalhes.{role: solo|lackey|special, tipo, ataquescac, ataquesad, resistencias (texto), biography}`,
  `system.tracos.{tamanho, idiomas{value,custom}, ic{value,custom}, resistencias.<tipo>{base, imunidade, vulnerabilidade, danoPorDado}}`,
  `system.attributes.sentidos{value,custom}`. O Ajustar ND ajusta as perícias pelo campo `outros` e a defesa por `defesa.base`.
- **Arma**: `system.ataques`, `proposito` (`corpo-a-corpo` ou `disparo`), `rolls`: ataque
  `[['1d20','',''],[perícia,'',''],['0','','']]` e dano `[[fórmula, tipo, ''], ['','','']]`.
- **Poder**: `system.tipo: "ability"`, `ativacao.execucao`, `rolls[]`, `resistencia{pericia, atributo, bonus, txt}`.
  Tipos de ação válidos: `passive`, `action`, `move`, `full`, `reaction`, `free`, `minute`, `hour`, `day`, `special`.
- **Convenções das fichas oficiais** (verificadas em 18 armas): **a perícia de ataque é `luta` mesmo em arma à
  distância**. Poder passivo tem `execucao` vazio.
- **Linha de ataques** (`ataquescac`/`ataquesad`): `"Mordida +44 (4d12+40, 17) e duas garras +44 (3d12+40, 17)."`
  O Ajustar ND reescreve o trecho `Nome +N (fórmula…)` de cada arma citada. Gerar a linha com valores provisórios
  (`Bite +0 (1d6) e 2 Tentacle +0 (1d6)`) basta: ele troca o bônus e a fórmula (confirmado rodando a função real).
- **Rolagem de dano da arma**: `parts[0]` é o dano principal (fórmula e tipo), `parts[1]` é o campo do atributo somado ao dano
  (fica vazio) e o **dano adicional começa em `parts[2]`** (confirmado em `item-rolls.hbs`). Gravar o adicional em `parts[1]`
  esconde-o na ficha. O Ajustar ND recalcula só `parts[0]` e mantém as demais partes fixas (a soma delas é o "secundário").
- **Atualizar uma perícia a redefine** (1.6.6 no Foundry 14): um campo atualizado sozinho faz os outros voltarem ao padrão
  (atributo `for`, `outros` 0). O envio do formulário da ficha ao fechá-la (`submitOnClose: true`) faz isso; um hook `preUpdateActor`
  não resolve, porque recebe os dados já limpos. O módulo envolve `Actor.update` nos atores com a flag `t20-conversor-5e`
  e completa a atualização com os valores atuais (`conversor/pericias.js`). No Foundry 13 com o sistema 1.5.015 o problema não ocorre.
- **Perícias do NPC**: o sistema pode criá-las todas com atributo `for`, o que faz Fortitude, Reflexos e Vontade ficarem
  acima do alvo (+1, +7, +5 no dragão: 7 menos o modificador certo). O conversor devolve cada perícia ao atributo da regra e roda o
  ajuste duas vezes. Fortitude ainda aparece como FOR na ficha, só no rótulo; os valores batem com a tabela.
- **Ajustar ND troca todas as CDs** do texto pela da tabela. Efeito colateral: a CD de escape de agarrar da 5e
  (CD 13) vira CD 20; é preciso revisão manual.

## 9. Convenções do projeto

- O texto que entra na ficha continua em inglês (tradução fica para depois). A descrição da arma começa com o nome
  ("Tentacle. Melee Attack Roll: ...").
- As quantidades de ataque, o papel e o ND são sugestões; o mestre sempre confirma na prévia.
- Poderes criados só têm texto (sem rolagem) até a implementação do plano de dano.

## 10. Lições técnicas do Foundry (v13/14)

- **Textos (`lang`)**: o Foundry expande chaves com ponto em objetos. Uma chave **não pode ser prefixo de outra**
  (`T20C5E.ModoAtaques` e `T20C5E.ModoAtaques.5e`): o idioma inteiro falha e a tela mostra chaves cruas.
  Há teste automático para isso. Declarar o idioma `en` no manifesto quando o usuário roda em inglês.
  O manifesto só é relido ao reiniciar o servidor.
- **Ordem dos hooks**: o Ajustar ND publica a API no próprio `ready`. Checar a API no `ready` de outro módulo
  pode falhar por ordem; confira na hora de usar.
- **`FilePicker.upload`** devolve `{}` sem explicação quando falha por dentro, e `false` quando já mostrou o erro.
  A pasta de destino precisa ser criada passo a passo (`createDirectory` rejeita se já existe).
- **Download de imagem por URL** (`fetch`): o site precisa liberar CORS. `5e.tools` **não** libera;
  `cdn.5e.tools/2024/img/...` libera. O mesmo arquivo no CDN tem o ano no caminho. Uma imagem já carregada como
  `<img>` fica no cache **sem** o cabeçalho de CORS e quebra o `fetch` seguinte: usar `fetch(url, { cache: 'reload' })`.
  Plano B: carregar com `crossOrigin='anonymous'`, desenhar num canvas e gerar o blob.
- **Retrato e token com o mesmo nome de arquivo** (o 5e.tools usa o mesmo nome): prefixar (`retrato-`, `token-`).
- **Edição e cópia**: o Foundry carrega a cópia em `Data/modules`, não a pasta de trabalho. Rodar os testes **antes**
  de copiar (uma cópia com teste falhando deixou o módulo quebrado).
- **ApplicationV2**: `render()` refaz o corpo inteiro; ler o formulário antes de cada ação. Arquivos de upload em
  `input type=file` precisam de listener próprio.

### Como extrair as ameaças oficiais do compêndio (para calibrar)

Os compêndios do sistema são LevelDB (`Data/systems/tormenta20/packs/<nome>`). Copiar a pasta (o `LOCK` estará em uso se o
Foundry estiver aberto; ignorar) e ler a **cópia** com o `classic-level` que o próprio Foundry traz, rodando o executável
com `ELECTRON_RUN_AS_NODE=1 "Foundry Virtual Tabletop.exe" script.cjs`. Atores ficam em chaves `!actors!<id>` e os itens
em `!actors.items!<ator>.<item>`. Sem instalar nada e sem tocar nos arquivos originais.

## 11. O que NÃO foi verificado

- Por que o atributo das perícias do NPC vira `for` (sistema ou formulário da ficha); a causa não foi achada.
- A regra do livro para o dano de poderes de reação, movimento, livre e passivo; só os padrões dos dados.
- O fator "sem efeito" (0,7) e o fator para poderes de alvo único de ação padrão.
- Os limites de dados e de bônus fixo em ND alto (o mestre vai pesquisar nos livros); o limite ND+1 é o que
  reproduz os dragões oficiais.
- O significado exato dos campos `resistencia.atributo`, `bonus` e `txt` dos poderes.
- Carisma e Inteligência como Vontade e a ação de bônus como ação de movimento são **escolhas**, não medidas.
- A classificação de área e efeito por palavras-chave no texto.

## 12. O que é reaproveitável no Crias de Megalokk

Módulos sem dependência do Foundry (testáveis em Node), em `scripts/conversor/`:

| Arquivo | Conteúdo |
|---|---|
| `mapeamentos.js` | CR de referência, tamanho, tipo, dano, deslocamento, atributo, `DC` para `CD`, papel |
| `ritmo.js` | Calibração CR para ND (fórmula de Q, ritmos, XP por CR) |
| `papel.js` | Heurística do papel sugerido |
| `origem-json.js` | Leitura de ator do dnd5e (ataques, multiataque, sentidos, idiomas, resistências, condições, poderes, imagem) e limpeza de texto |
| `origem-texto.js` | Bloco de estatísticas colado como texto (inglês e português, layouts 2014 e 2024) para um ator dnd5e de mentira, que o `origem-json.js` converte |
| `origem-cr.js` | Validação do formulário e modos de quantidade de ataques |
| `criar-ator.js`, `modelo-ator.js` | Montagem do ator, arma e poder do T20 (o modelo foi portado do `foundryTemplate.js` do próprio Crias de Megalokk) |
| `imagem.js` | Nome seguro de arquivo, URL candidata do CDN do 5e.tools |

O que depende do Foundry e **não** serve: `dialogo-conversor.js`, `main.js`, `api-ajuste-nd.js`.
Os testes (`tests/`) documentam o comportamento esperado de cada regra acima.

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

### 13.1 Vocabulário em português conferido com o SRD do Pocket DM (0.5.1)

Varridas 240 fichas de pocketdm.com.br/monstros (SRD 5.1 e 5.2 traduzidos): todas leem sem erro e sem exceção. A ficha copiada do navegador vem **uma linha por campo** (`FOR` / `24` / `(+7)` em linhas separadas), com lixo da página no meio: `2024`, `(clique para alterar a edição)`, `Fonte ...`, o rodapé de licença e, nas criaturas da comunidade, "Criatura da comunidade ...".

Termos do site: rótulo `Movimento` (não "Deslocamento"), `nado`, `escavação`, `voo`, `escalada`; tipos `feérico`, `gosma`, `ínfero (diabo)`, `morto-vivo`; dano `concussão` (63 usos contra 11 de `contundente`), `ígneo`, `gélido`, `elétrico`, `trovejante`, `venenoso`, `força`; condições `Imobilizado (Grappled)`, `Contido (Restrained)`, `Caído (Prone)`, `Incapacitado`; sentidos `visão às cegas`, `visão no escuro`, `visão verdadeira`, `sismiconsciência`; `Usos de Ação Lendária: 3 (4 no Covil)`; áreas `Linha de 9 m (30 ft) de comprimento por 1,5 m (5 ft) de largura`. O dano do ataque vem **sem "Acerto:"** na 5.2 (`Ataque Corpo a Corpo: +9, alcance 3 m (10 ft). 12 (2d6 + 5) de dano de concussão.`) e a 2014 em português não tem alinhamento em "Médio humanoide (half-orc)".

O que só apareceu nas fichas reais: o "(10 ft)" depois dos metros faria o `termosT20` da v2 converter de novo; "Pequeno ou Médio" fica com o maior; "Ataque Múltiplo (Só na Forma de Vampiro)" tem de ser reconhecido como Multiataque e o nome do ataque é procurado sem a condição entre parênteses. A maioria dos "Multiataque não cita" que sobra é legítima: o texto chama o ataque por outro nome ("ataques de pancada" contra um ataque "Golpe").

Não adotado: o termo "corruptor" (Galápagos) e "percepção às cegas" ficam como sinônimos, mas o site usa `ínfero` e `visão às cegas`.

### 13.3 Diálogo: calibragem recolhida e itens arrastados (0.6.0)

- **Nível do grupo removido do diálogo** (0.6.0): com o ritmo T20 a fórmula devolve o ND do CR e o nível só movia o ND nos extremos (CR 5, Solo: nível 1 → ND 4, níveis 3 a 8 → ND 5, nível 12 → ND 7). Ficou o ritmo, sempre visível, que muda o ND de verdade (CR 5: T20 → 5, intermediário → 4, estilo 5e → 3). `calcularND` ainda aceita `nivelGrupo` (com testes), mas o diálogo não o envia; a configuração do módulo e a flag `nivelGrupo` dos atores criados saíram. Antes disso: o ND era igual ao CR por padrão e nível e ritmo ficavam em "Calibrar pelo nível do grupo (opcional)", recolhido; com nível preenchido o bloco abre sozinho. O ritmo muda o ND mesmo com o nível vazio (`calcularND`: Q alvo = Q(ref) × 1,5 ÷ k).
- **Itens arrastados**: soltar `{ type: 'Item', uuid }` na janela; só `poder` e `magia` (`itens-extras.js`). O Ajustar ND conta esses tipos na faixa de habilidades e só reescreve o dano de poderes com a flag `danoPoder`, então o item entra intacto. Arma fica de fora: o balanceamento lê a lista de ataques do diálogo. **Não verificado no Foundry**: o caminho de `getDragEventData` (v13 e v14) e o soltar a partir do compêndio.

### 13.2 Teste de resistência e cura (0.5.2)

- No Tormenta20 **"salvaguarda" é "teste de resistência"** e todo teste é Fortitude, Reflexos ou Vontade. A tabela atributo → categoria (`periciaDoAtributo5e`) passou a levar **Força para Fortitude** (antes ia para Atletismo, que não é teste de resistência). O texto dos poderes em português passa por `trocarSalvaguardaPt`: "Salvaguarda de Constituição: CD 14" → "Teste de Fortitude: CD 14"; "uma salvaguarda" → "um teste de resistência" (o artigo concorda com "teste"); "salvaguardas de Inteligência, Sabedoria e Carisma" → "testes de Vontade"; o "teste de resistência de Destreza" da tradução antiga → "teste de Reflexos". Vale também para o JSON em português (passa pelo mesmo `textoT20`).
- Num teste com 126 trocas em 150 fichas do Pocket DM não sobrou nenhum "salvaguarda".
- **Cura não é dano:** "recupera 5 (1d10) Pontos de Vida" / "regains 4 (1d8) hit points" (e a versão "temporários") não entra nas rolagens de dano do poder; antes virava uma rolagem "Dano" marcada para o Ajustar ND recalcular.
