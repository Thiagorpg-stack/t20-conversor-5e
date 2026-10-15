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
  settings: { get: (_m, chave) => ({ ritmo: 'estilo5e' }[chave]) },
  modules: { get: () => ajusteNd },
};
globalThis.CONFIG = {
  Actor: { documentClass: class { constructor(dados) { this.dados = dados; } toObject() { return structuredClone(this.dados); } } },
};

const { DialogoConversor } = await import('../scripts/dialogo-conversor.js');

test('o diálogo começa com o ritmo padrão da campanha, e sem nível do grupo nem calibragem', () => {
  const d = new DialogoConversor();
  for (const campo of ['nivelGrupo', 'calibrarAberto']) assert.equal(campo in d.estado, false);
  assert.equal('alternarCalibragem' in DialogoConversor.DEFAULT_OPTIONS.actions, false);
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

test('sem o nome da criatura o ND já é calculado e mostrado (referência, calibrado e o campo ND)', async () => {
  const d = new DialogoConversor();
  Object.assign(d.estado, { nome: '', cr: '5', papel: 'solo', ritmo: 't20' });
  d.tocado = true;
  const ctx = await d._prepareContext();
  assert.equal(ctx.erros.length, 1); // só falta o nome
  assert.equal(ctx.referencia, '5');
  assert.ok(ctx.calibrado, 'ND calibrado calculado');
  assert.equal(ctx.nds.filter((n) => n.selecionado).length, 1);
  d.estado.cr = 'xx'; // CR inválido: não há ND para mostrar
  assert.equal((await d._prepareContext()).referencia, undefined);
});

test('o diálogo preserva a rolagem da janela ao se redesenhar', () => {
  // O elemento da parte já é a <section class="conversor"> que rola: seletor vazio = a própria parte (um seletor filho não a acharia).
  assert.deepEqual(DialogoConversor.PARTS.corpo.scrollable, ['']);
});

// Soltar poder ou magia na janela: o Foundry entrega { type: 'Item', uuid }, que o diálogo resolve com fromUuid.
function dialogoComZona(arrasto, itens) {
  const d = new DialogoConversor();
  d.desenhos = 0;
  d.render = async () => { d.desenhos += 1; };
  const zona = { ouvintes: {}, addEventListener(tipo, f) { this.ouvintes[tipo] = f; } };
  d.element = { querySelectorAll: () => [], querySelector: (s) => (s === '.conversor' ? zona : null) };
  d._onRender();
  foundry.applications.ux = { TextEditor: { implementation: { getDragEventData: () => arrasto } } };
  globalThis.fromUuid = async (uuid) => itens[uuid] ?? null;
  const avisos = [];
  globalThis.ui = { notifications: { warn: (m) => avisos.push(m) } };
  game.i18n.format = (chave, dados) => `${chave}:${JSON.stringify(dados)}`;
  return { d, zona, avisos, soltar: () => zona.ouvintes.drop({ preventDefault() {} }) };
}
const itemFalso = (type, name = 'Sopro') => ({ type, name, toObject: () => ({ _id: 'x', name, type, flags: {}, system: {} }) });

test('soltar um poder na janela: entra em itensExtras e o diálogo se redesenha; arrastar sobre a janela é permitido', async () => {
  const { d, zona, soltar } = dialogoComZona({ type: 'Item', uuid: 'U1' }, { U1: itemFalso('poder') });
  let impedido = false;
  zona.ouvintes.dragover({ preventDefault: () => { impedido = true; } });
  assert.equal(impedido, true);
  await soltar();
  assert.deepEqual(d.estado.itensExtras.map((i) => [i.name, i.type, '_id' in i]), [['Sopro', 'poder', false]]);
  assert.equal(d.desenhos, 1);
});

test('soltar arma, item que não abre ou algo que não é item: não entra; só os dois primeiros avisam', async () => {
  const arma = dialogoComZona({ type: 'Item', uuid: 'U2' }, { U2: itemFalso('arma', 'Espada') });
  await arma.soltar();
  assert.deepEqual([arma.d.estado.itensExtras.length, arma.d.desenhos], [0, 0]);
  assert.match(arma.avisos[0], /AvisoItemNaoSuportado.*arma/);
  const sumido = dialogoComZona({ type: 'Item', uuid: 'U3' }, {});
  await sumido.soltar();
  assert.match(sumido.avisos[0], /AvisoItemNaoSuportado.*\?/);
  const ator = dialogoComZona({ type: 'Actor', uuid: 'A1' }, {});
  await ator.soltar();
  assert.deepEqual([ator.avisos.length, ator.d.estado.itensExtras.length], [0, 0]);
});

test('"remover" tira o item arrastado pelo índice, sem mexer nos outros', async () => {
  const { d } = dialogoComZona(null, {});
  d.estado.itensExtras = [{ name: 'A', type: 'poder' }, { name: 'B', type: 'magia' }];
  await DialogoConversor.DEFAULT_OPTIONS.actions.removerItemExtra.call(d, null, { dataset: { indice: '0' } });
  assert.deepEqual(d.estado.itensExtras.map((i) => i.name), ['B']);
  assert.equal((await d._prepareContext()).itensExtras[0].nome, 'B');
});

test('o ritmo muda o ND (T20 = CR; mais combates por descanso, ND menor) e o ND manual é respeitado', async () => {
  const d = new DialogoConversor();
  Object.assign(d.estado, { nome: 'Lobo', cr: '5', papel: 'solo', ritmo: 't20' });
  const t20 = await d._prepareContext();
  assert.deepEqual([t20.referencia, t20.calibrado], ['5', '5']);
  d.estado.ritmo = 'estilo5e';
  const cinco = await d._prepareContext();
  assert.deepEqual([cinco.referencia, cinco.calibrado], ['5', '3']);
  assert.equal('calibradoIgual' in cinco || 'calibrarVisivel' in cinco, false);
});
