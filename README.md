# 5e para T20

Módulo para Foundry VTT que converte criaturas de **D&D 5e** em ameaças de **Tormenta20**, usando as tabelas por ND e papel (Solo, Lacaio ou Especial) e o motor do módulo **Ajustar ND**.

> **Status: em desenvolvimento.** Este repositório contém só o esqueleto. Ainda não há funcionalidade.

*English: Foundry VTT module that converts D&D 5e creatures into Tormenta20 threats, using the per-ND and per-role parameter tables.*

## O que vai fazer

- Converte só os **números** (ND, papel, PV, Defesa, CD, ataque, resistências e dano), pela tabela.
- Entrega as habilidades, magias e ações lendárias como **texto para revisão**; não traduz regras.
- Calcula o ND com uma **calibração de ritmo**: um grupo de T20 aguenta 1 a 2 combates do seu ND por descanso, e em 5e o dia de aventura espera 6 a 8. O mestre informa o nível do grupo e o ritmo desejado.

### Versões planejadas

1. **v1**: criar ameaça a partir de CR.
2. **v2**: importar o JSON de um ator de 5e exportado de outro mundo.
3. **v3**: converter um bloco de estatísticas colado como texto.

## Dependências

- Foundry VTT v13
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
