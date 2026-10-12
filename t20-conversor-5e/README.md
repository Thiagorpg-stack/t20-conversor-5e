# 5e para T20

Módulo para Foundry VTT que converte criaturas de **D&D 5e** em ameaças de **Tormenta20**, usando as tabelas por ND e papel (Solo, Lacaio ou Especial) e o motor do módulo **Ajustar ND**.

> **Status: v0.1.0 (em teste).** A v1, "Criar ameaça a partir de CR", e a v2, "Importar JSON de 5e", estão implementadas. A v3 (texto colado) ainda não existe.

*English: Foundry VTT module that converts D&D 5e creatures into Tormenta20 threats, using the per-ND and per-role parameter tables.*

## O que vai fazer

- Converte só os **números** (ND, papel, PV, Defesa, CD, ataque, resistências e dano), pela tabela.
- Entrega as habilidades, magias e ações lendárias como **texto para revisão**; não traduz regras.
- Calcula o ND com uma **calibração de ritmo**: um grupo de T20 aguenta 1 a 2 combates do seu ND por descanso, e em 5e o dia de aventura espera 6 a 8. O mestre informa o nível do grupo e o ritmo desejado.

## Como usar (v1)

1. Como Mestre, abra o diretório de atores e clique em **5e para T20**.
2. Informe nome, CR, papel, tamanho, tipo, atributos e os ataques da criatura.
3. Informe o **nível do grupo** e o **ritmo do dia** (ou deixe o nível vazio para usar o ND de referência do CR). O módulo mostra o ND de referência e o ND calibrado, e você pode escolher outro.
4. Confira a prévia (PV, CD, Defesa, ataque, resistências e dano por golpe, com avisos) e clique em **Criar ameaça**. O ator é criado na pasta "Convertidos de 5e".

O nível do grupo e o ritmo padrão ficam nas configurações do módulo.

### Versões planejadas

1. **v1**: criar ameaça a partir de CR.
2. **v2**: importar o JSON de um ator de 5e exportado de outro mundo.
3. **v3**: converter um bloco de estatísticas colado como texto.

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
