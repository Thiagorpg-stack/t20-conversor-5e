// Teste de integração do diálogo com o Foundry simulado: confere a "cola" entre o estado do formulário,
// o cálculo do ND, a montagem do ator e a chamada à API do Ajustar ND. Não substitui o teste no Foundry.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const tabelas = JSON.parse(readFileSync(new URL('./dados/tables.json', import.meta.url), 'utf8'));
const chamadas = [];

class FakeApp { constructor(opcoes = {}) { this.options = opcoes; } }
globalThis.foundry = {
  applications: { api: { ApplicationV2: FakeApp, HandlebarsApplicationMixin: (Base) => Base } },
  utils: { randomID: (() => { let n = 0; return () => `id-${++n}`; })() },
};
const ajusteNd = {
  active: true,
  api: {
    versaoApi: 2,
    obterTabelas: async () => tabelas,
    simular: async (actor, opcoes) => {
      chamadas.push({ actor, opcoes });
      return {
        update: { 'system.attributes.pv.max': 400, 'system.attributes.cd': 30 },
        depois: { defesa: 36, pericias: { luta: 29, fort: 22, refl: 16, vont: 10 } },
        avisos: ['aviso de teste'], patamar: [], plano: { linha: { Dano: 80 }, dano: { porArma: {} }, revisar: [] },
      };
    },
    maxAtaques: () => 2,
    aplicarAjuste: async () => {},
  },
};
globalThis.game = {
  i18n: { localize: (k) => k, format: (k) => k },
  settings: { get: (_m, chave) => ({ nivelGrupo: 10, ritmo: 'estilo5e' }[chave]) },
  modules: { get: () => ajusteNd },
};
globalThis.CONFIG = {
  Actor: { documentClass: class { constructor(dados) { this.dados = dados; } toObject() { return structuredClone(this.dados); } } },
};

const { DialogoConversor } = await import('../scripts/dialogo-conversor.js');

test('o diálogo começa com os padrões da campanha (nível e ritmo)', () => {
  const d = new DialogoConversor();
  assert.equal(d.estado.nivelGrupo, 10);
  assert.equal(d.estado.ritmo, 'estilo5e');
  assert.equal(d.estado.papel, 'solo');
});

test('contexto: calcula o ND pelo ritmo, simula o ator e monta a prévia', async () => {
  chamadas.length = 0;
  const d = new DialogoConversor();
  d.estado.nome = 'Lobo Gigante';
  d.estado.cr = '10';
  const ctx = await d._prepareContext();

  assert.deepEqual(ctx.erros, []);
  assert.equal(ctx.referencia, '10');
  assert.equal(ctx.calibrado, '5');            // nível 10 em ritmo de 5e
  assert.equal(d.estado.nd, '5');
  assert.equal(ctx.nds.find((n) => n.selecionado).valor, '5');
  assert.ok(ctx.previa);
  assert.deepEqual(ctx.previa.linhas.map((l) => l.rotulo).slice(0, 3), ['PV', 'CD', 'Defesa (total na ficha)']);
  assert.equal(ctx.previa.linhas[0].valor, 400);
  assert.deepEqual(ctx.previa.avisos, ['aviso de teste']);

  assert.equal(chamadas.length, 1);
  const { actor, opcoes } = chamadas[0];
  assert.equal(opcoes.nd, '5');
  assert.equal(opcoes.papel, 'solo');
  assert.deepEqual(opcoes.ordemResistencias, ['fort', 'refl', 'vont']);
  assert.deepEqual(opcoes.templates, { chefeFinal: false });
  assert.equal(actor.dados.system.attributes.nd, '5');
  const idArma = actor.dados.items[0]._id;
  assert.deepEqual(opcoes.ataquesPorArma, { [idArma]: 1 });
  assert.ok(d.pronto);
});

test('papel Lacaio vai para a API com o código do sistema (lackey)', async () => {
  chamadas.length = 0;
  const d = new DialogoConversor();
  d.estado.nome = 'Capanga';
  d.estado.papel = 'lacaio';
  await d._prepareContext();
  assert.equal(chamadas[0].opcoes.papel, 'lackey');
  assert.equal(chamadas[0].actor.dados.system.detalhes.role, 'lackey');
});

test('poderes importados aparecem na seção de poderes e entram no ator como itens "poder"', async () => {
  chamadas.length = 0;
  const d = new DialogoConversor();
  d.estado.nome = 'Otyugh';
  d.estado.habilidades = [{ nome: 'Multiattack', texto: 'Uma mordida e dois tentáculos.' }, { nome: 'Pancada', texto: 'CD 14' }];
  const ctx = await d._prepareContext();
  assert.deepEqual(ctx.poderes.map((p) => [p.indice, p.nome]), [[0, 'Multiattack'], [1, 'Pancada']]);
  const poderes = chamadas[0].actor.dados.items.filter((i) => i.type === 'poder');
  assert.deepEqual(poderes.map((p) => p.name), ['Multiattack', 'Pancada']);
  assert.equal(poderes[0].system.description.value, '<p>Uma mordida e dois tentáculos.</p>');
});

test('modo de ataques usa o limite do ND da API; editar a quantidade passa a manual', async () => {
  chamadas.length = 0;
  const d = new DialogoConversor();
  d.estado.nome = 'Otyugh';
  d.estado.ataques = [
    { nome: 'Bite', tipo: 'cac', dano: 'perfuracao', qtd: 1, qtd5e: 1, descricao: '' },
    { nome: 'Tentacle', tipo: 'cac', dano: 'perfuracao', qtd: 2, qtd5e: 2, descricao: '' },
  ];
  d.estado.modoAtaques = 'limite'; // o mock da API devolve limite 2
  const ctx = await d._prepareContext();
  assert.deepEqual(d.estado.ataques.map((a) => a.qtd), [1, 1]);
  assert.equal(ctx.limiteAtaques, 2);
  assert.equal(ctx.totalAtaques, 2);
  d.estado.modoAtaques = '5e';
  await d._prepareContext();
  assert.deepEqual(d.estado.ataques.map((a) => a.qtd), [1, 2]);
});

test('ND escolhido à mão vale até mudar CR, papel, nível ou ritmo', async () => {
  chamadas.length = 0;
  const d = new DialogoConversor();
  d.estado.nome = 'Chefe';
  d.estado.cr = '10';
  d.estado.nd = '8';
  d.estado.ndManual = true;
  const ctx = await d._prepareContext();
  assert.equal(chamadas[0].opcoes.nd, '8');
  assert.equal(ctx.ndManual, true);
  assert.equal(ctx.calibrado, '5');
});

test('formulário inválido mostra os erros e não chama a API', async () => {
  chamadas.length = 0;
  const d = new DialogoConversor();   // sem nome
  d.estado.cr = '99';
  let ctx = await d._prepareContext();
  assert.deepEqual(ctx.erros, []);      // recém-aberto: sem erro à vista
  d.tocado = true;                      // depois da primeira edição
  ctx = await d._prepareContext();
  assert.equal(ctx.previa, null);
  assert.equal(chamadas.length, 0);
  assert.deepEqual(ctx.erros, ['T20C5E.Erro.nome', 'T20C5E.Erro.cr']);
  assert.equal(d.pronto, null);
});

test('Ajustar ND ausente ou antigo gera mensagem clara', async () => {
  const original = { ...ajusteNd };
  ajusteNd.active = false;
  let ctx = await new DialogoConversor()._prepareContext();
  assert.deepEqual(ctx.erros, ['T20C5E.ErroAjusteNdAusente']);
  ajusteNd.active = true;
  ajusteNd.api = { versaoApi: 0 };
  ctx = await new DialogoConversor()._prepareContext();
  assert.deepEqual(ctx.erros, ['T20C5E.ErroAjusteNdAntigo']);
  ajusteNd.api = { versaoApi: 1 }; // sem o dano dos poderes (Ajustar ND 0.9.x)
  ctx = await new DialogoConversor()._prepareContext();
  assert.deepEqual(ctx.erros, ['T20C5E.ErroAjusteNdAntigo']);
  Object.assign(ajusteNd, original);
});

const sopro = { nome: 'Sopro', texto: 'CD 14', execucao: 'action', dano: [{ formula: '3d8+3', tipo: 'impacto' }, { formula: '2d6', tipo: 'fogo' }],
  resistencia: { pericia: 'refl', metade: true }, efeito: true, ajustarDano: true };

test('poder com dano: a tela mostra o dano da 5e, o teste e as caixas; o ator leva a flag do Ajustar ND', async () => {
  chamadas.length = 0;
  const d = new DialogoConversor();
  d.estado.nome = 'Otyugh';
  d.estado.habilidades = [{ nome: 'Fuga', texto: 'x', execucao: '' }, structuredClone(sopro)];
  const ctx = await d._prepareContext();
  assert.equal(ctx.poderes[0].temDano, false);
  const p = ctx.poderes[1];
  assert.deepEqual([p.temDano, p.ajustarDano, p.efeito, p.padrao], [true, true, true, true]);
  assert.equal(p.danoTexto, '3d8+3 (Impacto) + 2d6 (Fogo)');
  assert.equal(p.teste, 'Reflexos (metade)');
  const item = chamadas[0].actor.dados.items.find((i) => i.name === 'Sopro');
  assert.deepEqual(item.flags['tormenta20-ajuste-nd'], { danoPoder: { ajustar: true, efeito: true } });
});

test('poder que não é de ação padrão ou completa não usa a caixa "com efeito"', async () => {
  const d = new DialogoConversor();
  d.estado.nome = 'X';
  d.estado.habilidades = [{ ...structuredClone(sopro), execucao: 'reaction' }, { ...structuredClone(sopro), nome: 'Cheio', execucao: 'full' }];
  const ctx = await d._prepareContext();
  assert.deepEqual(ctx.poderes.map((p) => p.padrao), [false, true]);
});

test('prévia: a fórmula calculada pelo Ajustar ND aparece no poder e na lista de danos dos poderes', async () => {
  const original = ajusteNd.api.simular;
  ajusteNd.api.simular = async (actor, opcoes) => {
    const id = actor.dados.items.find((i) => i.name === 'Sopro')._id;
    return {
      ...(await original(actor, opcoes)),
      poderesPrevia: [{ id, nome: 'Sopro', padrao: true, ajustar: true, efeito: true, antes: '3d8+3 + 2d6', depois: '4d8 + 2d6' }],
    };
  };
  try {
    const d = new DialogoConversor();
    d.estado.nome = 'Otyugh';
    d.estado.habilidades = [{ nome: 'Fuga', texto: 'x', execucao: '' }, structuredClone(sopro)];
    const ctx = await d._prepareContext();
    assert.equal(ctx.poderes[0].depois, null);
    assert.equal(ctx.poderes[1].depois, '4d8 + 2d6');
    assert.deepEqual(ctx.previa.poderes, [{ nome: 'Sopro', antes: '3d8+3 + 2d6', depois: '4d8 + 2d6' }]);
  } finally {
    ajusteNd.api.simular = original;
  }
});

test('prévia sem poderesPrevia (Ajustar ND antigo) não quebra', async () => {
  const d = new DialogoConversor();
  d.estado.nome = 'X';
  d.estado.habilidades = [structuredClone(sopro)];
  const ctx = await d._prepareContext();
  assert.deepEqual(ctx.previa.poderes, []);
  assert.equal(ctx.poderes[0].depois, null);
});

test('texto colado: o change do campo guarda o texto sem redesenhar o diálogo', async () => {
  const d = new DialogoConversor();
  let desenhos = 0;
  d.render = async () => { desenhos += 1; };
  const campo = { name: 'texto5e', value: 'bloco colado', dataset: {}, addEventListener(_, f) { this.aoMudar = f; } };
  d.element = { querySelectorAll: (seletor) => (seletor.startsWith('input') ? [campo] : []), querySelector: () => null };
  d._onRender();
  await campo.aoMudar({ target: campo });
  assert.equal(d.estado.texto5e, 'bloco colado');
  assert.equal(desenhos, 0); // redesenhar no blur engole o primeiro clique em "Ler texto"
});

test('botão "Colar texto": alterna o campo de texto sem perder o que já foi digitado', async () => {
  const d = new DialogoConversor();
  let desenhos = 0;
  d.render = async () => { desenhos += 1; };
  d.element = { querySelectorAll: () => [], querySelector: (s) => (s === '[name=texto5e]' ? { value: 'bloco colado' } : null) };
  const alternar = DialogoConversor.DEFAULT_OPTIONS.actions.alternarTexto;
  assert.equal(d.estado.textoAberto, false);
  await alternar.call(d);
  assert.deepEqual([d.estado.textoAberto, d.estado.texto5e, desenhos], [true, 'bloco colado', 1]);
  await alternar.call(d);
  assert.deepEqual([d.estado.textoAberto, d.estado.texto5e, desenhos], [false, 'bloco colado', 2]); // fechar não apaga o texto
});
