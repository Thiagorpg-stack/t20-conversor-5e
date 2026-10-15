# 5e para T20

Módulo para Foundry VTT que converte criaturas de **D&D 5e** em ameaças de **Tormenta20**, usando as tabelas por ND e papel (Solo, Lacaio ou Especial) e o motor do módulo **Ajustar ND**.

[![Video Title](https://img.youtube.com/vi/oGsEAPHrdFo/0.jpg)](https://www.youtube.com/watch?v=oGsEAPHrdFo)
[![Video Title](https://img.youtube.com/vi/30FP5qsoHQs/0.jpg)](https://www.youtube.com/watch?v=30FP5qsoHQs)

> **Status: v0.5.0 (em teste).** A v1, "Criar ameaça a partir de CR", a v2, "Importar JSON de 5e", e a v3, "Colar bloco de estatísticas", estão implementadas.

Exige o Ajustar ND 0.10.2.

*English: Foundry VTT module that converts D&D 5e creatures into Tormenta20 threats, using the per-ND and per-role parameter tables.*

## O que já faz

- Converte os **números** (ND, papel, PV, Defesa, CD, ataque, resistências e dano), pela tabela.
- **Texto colado (v3)**: cola o bloco de estatísticas de uma criatura (livro, site ou PDF; inglês ou português; layouts de 2014 e de 2024) e o módulo preenche o formulário como na importação de JSON. Lê nome, tamanho, tipo, CR, deslocamentos, atributos, sentidos, idiomas, resistências, imunidades, ataques com dano e dano extra, quantidades do Multiataque, poderes com dano, teste de resistência, área, usos e recarga, ações lendárias e de covil, e o atributo de conjuração. Não lê imagem nem token, nem a CA; o PV só ajuda a sugerir o papel. O relatório diz o que foi lido e o que pede revisão.
- Entrega as habilidades, magias e ações lendárias; não traduz regras.
- **Poderes com dano** (sopro, constrição, rugido...): lê o dano (dado, bônus, tipo) e o teste de resistência da 5e, troca "Constitution Saving Throw" por "Fortitude" (e os demais atributos pela perícia do T20), cria a rolagem de dano no poder e marca o poder para o Ajustar ND recalcular o dano pela tabela. Por poder, o diálogo permite desligar o ajuste ("Ajustar o dano pela tabela do ND") e escolher se tem efeito (condição, teste de resistência ou área). Carisma e Inteligência viram Vontade (padrão assumido).
- **Dano adicional do golpe**: vira uma segunda parte do dano da arma, com o tipo editável no diálogo. Uma caixa por ataque define se esse dano entra no balanceamento: marcada, ele mantém a proporção que tinha na 5e (calculada com o modificador do atributo do ataque) sobre o dano total por golpe do ND; desmarcada, ele fica fixo e só o dano principal é recalculado.
- **Deslocamentos** de voo, escavação, natação e escalada são convertidos para metros.
- **Usos e recarga** dos poderes entram no início do texto ("(3/dia)", "(Recarga (movimento))" como nos poderes oficiais).
- **Links de magia** (`@UUID[.id]`) viram o nome da magia.
- **Termos do T20 no texto dos poderes**: áreas viram metros ("linha de 27 m de comprimento e 1,5 m de largura", cone, esfera, cubo, cilindro, emanação) e distâncias viram **alcance curto** (até 30 pés), **médio** (até 90) ou **longo** (acima); até 10 pés viram metros.
- **Conjurador**: marcado na importação quando há magias; recebe **PM = 5 × ND** (sugestão, editável na ficha) e o atributo de conjuração da 5e. As magias ficam como nomes no texto.
- **Poderes com usos limitados** (resistência lendária, "3/dia") ganham um contador de recurso na ficha (Recurso 1, 2 ou 3, até três), com o nome do poder. O contador é manual: o poder do T20 não tem campo de consumo.
- **Poderes oficiais**: o Spellcasting vira o poder passivo "Magias" (nome, ícone e tipo do compêndio de habilidades de criaturas, com o texto da 5e); **"vantagem nos testes contra magia"** vira "Resistência a Magia" com +2 (ND até 4) ou +5 em Fortitude, Reflexos e Vontade, como o efeito oficial. Condições em imunidades (charmed, poisoned...) viram os nomes do T20. O campo de área do poder sai preenchido ("cubo 3m de lado") e a recarga como "(Recarga (movimento))".
- **Texto das armas**: depois do ajuste de ND, a descrição da arma troca o bônus de ataque e o dano da 5e ("Attack Roll: +12 ... Hit: 16 (2d8 + 7 Slashing) damage") pelos valores finais da ficha. Só na criação: um ajuste de ND posterior não reescreve a descrição.
- **Perícias protegidas**: no Tormenta20 1.6.6 (Foundry 14), atualizar um campo de uma perícia a redefine para o padrão (atributo FOR, outros 0); o formulário da ficha faz isso ao fechá-la. Nos atores criados por este módulo as atualizações são completadas com os valores atuais.
- **Ao criar o ator**, os atributos das perícias voltam aos da regra e o ajuste de ND roda duas vezes, para o que a ficha mostra bater com a tabela.
- Calcula o ND com uma **calibração de ritmo**: um grupo de T20 aguenta 1 a 2 combates do seu ND por descanso, e em 5e o dia de aventura espera 6 a 8. O mestre informa o nível do grupo e o ritmo desejado.

## Como usar

1. Como Mestre, abra o diretório de atores e clique em **5e para T20**.
2. Importar o JSON de um ator de 5e exportado de outro mundo.
3. Informe o **nível do grupo** e o **ritmo do dia** (ou deixe o nível vazio para usar o ND de referência do CR). O módulo mostra o ND de referência e o ND calibrado, e você pode escolher outro.
4. Confira a prévia (PV, CD, Defesa, ataque, resistências e dano por golpe, com avisos) e clique em **Criar ameaça**. O ator é criado na pasta "Convertidos de 5e".

O nível do grupo e o ritmo padrão ficam nas configurações do módulo.

### Colar o texto de uma criatura (v3)

1. No diálogo, abra "Ou colar o bloco de estatísticas como texto" e cole o bloco inteiro de **uma** criatura.
2. Clique em **Ler texto**. O formulário é preenchido e o relatório mostra o que foi lido, o que pede revisão e o que ficou de fora.
3. Confira o CR, o papel e os ataques (principalmente a quantidade de cada ataque e o fim do nome de cada habilidade: o texto colado perde o itálico, então o módulo deduz onde o nome acaba) e crie a ameaça como de costume.

### Versões

1. **v1**: criar ameaça a partir de CR. **FEITO**
2. **v2**: Importar JSON de um ator da 5e. **FEITO**
3. **v3**: converter um bloco de estatísticas colado como texto. **FEITO**

## Dependências

- Foundry VTT v13 ou mais recente (verificado na 14.369)
- Sistema [Tormenta20](https://gitlab.com/vizael/Tormenta20) (não oficial)
- Módulo **Ajustar ND** (`tormenta20-ajuste-nd`), que fornece as tabelas e a API de ajuste

## Instalação manual

Copie esta pasta para `Data/modules/t20-conversor-5e` e ative o módulo no mundo.

## Desenvolvimento

```
npm test    # testes em Node, sem o Foundry
```

As funções de mapeamento, papel e ritmo ficam em `scripts/conversor/`, sem dependência do Foundry, e têm testes em `tests/`. O arquivo `tests/dados/tables.json` é uma cópia das tabelas do Ajustar ND usada só nos testes: o módulo não copia tabelas em tempo de execução, e pede tudo ao Ajustar ND. Fichas exportadas para teste vão em `tests/fixtures/` e não fazem parte do repositório.

## Aviso

Projeto não oficial e sem vínculo com a Jambô Editora, com a Wizards of the Coast ou com a Foundry Gaming LLC. Tormenta20 e D&D são marcas de seus respectivos titulares. O módulo não inclui texto dos livros.

## Licença

[MIT](LICENSE)
