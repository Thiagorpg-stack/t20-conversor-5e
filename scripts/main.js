// 5e para T20 — ponto de entrada. Depende do módulo Ajustar ND (0.9.0 ou mais recente).
import { ID_CONVERSOR } from './conversor/criar-ator.js';
import { abrirConversor } from './dialogo-conversor.js';
import { completarPericiasParciais } from './conversor/pericias.js';

Hooks.once('init', () => {
  game.settings.register(ID_CONVERSOR, 'nivelGrupo', {
    name: 'T20C5E.ConfigNivelNome',
    hint: 'T20C5E.ConfigNivelDica',
    scope: 'world', config: true, type: Number, default: 0,
    range: { min: 0, max: 20, step: 1 },
  });
  game.settings.register(ID_CONVERSOR, 'ritmo', {
    name: 'T20C5E.ConfigRitmoNome',
    hint: 'T20C5E.ConfigRitmoDica',
    scope: 'world', config: true, type: String, default: 't20',
    choices: {
      t20: 'T20C5E.RitmoT20',
      intermediario: 'T20C5E.RitmoIntermediario',
      estilo5e: 'T20C5E.RitmoEstilo5e',
    },
  });
});

// Botão no cabeçalho do diretório de atores (só para o Mestre).
Hooks.on('renderActorDirectory', (_app, html) => {
  if (!game.user.isGM) return;
  const raiz = html instanceof HTMLElement ? html : html[0];
  if (!raiz || raiz.querySelector('.t20c5e-botao')) return;
  const alvo = raiz.querySelector('.header-actions') ?? raiz.querySelector('.directory-header');
  if (!alvo) return;
  const botao = document.createElement('button');
  botao.type = 'button';
  // Herda as classes dos botões vizinhos para ficar com o mesmo visual do diretório.
  botao.className = `${alvo.querySelector('button')?.className ?? ''} t20c5e-botao`.trim();
  botao.innerHTML = `<i class="fas fa-dragon"></i> ${game.i18n.localize('T20C5E.Botao')}`;
  botao.addEventListener('click', () => abrirConversor());
  alvo.append(botao);
});

Hooks.once('ready', () => {
  // Só nos atores criados por este módulo: completa as atualizações parciais de perícia (ver conversor/pericias.js).
  const Ator = CONFIG.Actor.documentClass;
  const atualizar = Ator.prototype.update;
  Ator.prototype.update = function (dados, contexto) {
    const completos = this.getFlag(ID_CONVERSOR, 'origem') ? completarPericiasParciais(this._source.system?.pericias, dados) : dados;
    return atualizar.call(this, completos, contexto);
  };
  game.modules.get(ID_CONVERSOR).api = { versaoApi: 1, abrirConversor };
  // Sem checar o Ajustar ND aqui: ele publica a API no próprio `ready`, que pode rodar depois deste.
  // abrirConversor() confere na hora de abrir.
});
