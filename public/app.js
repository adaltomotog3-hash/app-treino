// ---------------- Estado global ----------------
let usuarioAtual = localStorage.getItem("ferro_usuario") || null;
let tokenAtual = localStorage.getItem("ferro_token") || null;
let perfilAtual = null; // { usuario, nome, genero, dias_semana, foto, role }
let comunicadoUltimoIdVisto = parseInt(localStorage.getItem("ferro_comunicado_visto") || "0", 10);
let exerciciosData = null;
let ultimasCargas = {};
let abaAtiva = "A";
let cronometro = { segundos: 0, total: 0, intervalId: null, pausado: false, exercicioNome: "" };
let chatIntervalId = null;
let chatUltimoId = 0;
let chatContatoAtual = null; // usuário do contato com quem a conversa está aberta (null = tela de lista de conversas)
let seriesConcluidas = {}; // exercicio.id -> nº de séries já concluídas nesta sessão de treino
let comunicados_cache = [];
const EMOJIS_CHAT = ["😀", "😂", "😍", "💪", "🔥", "👏", "🎯", "❤️", "😅", "🥳", "👍", "🙌"];

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}

const DIAS_SEMANA = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

// Mapeamento de qual treino (letra) cai em cada dia da semana, de acordo com o
// número de dias de treino escolhido no perfil (0=Domingo ... 6=Sábado)
const MAPA_SUGESTAO = {
  3: { 1: "A", 3: "B", 5: "C" },
  4: { 1: "A", 2: "B", 4: "C", 5: "D" },
  5: { 1: "A", 2: "B", 3: "C", 4: "D", 5: "E" }
};
// Nome do dia sugerido para cada treino, coerente com o mapa acima (usado no cabeçalho)
const DIAS_POR_PLANO = {
  3: { A: "Segunda-feira", B: "Quarta-feira", C: "Sexta-feira" },
  4: { A: "Segunda-feira", B: "Terça-feira", C: "Quinta-feira", D: "Sexta-feira" },
  5: { A: "Segunda-feira", B: "Terça-feira", C: "Quarta-feira", D: "Quinta-feira", E: "Sexta-feira" }
};

// ---------------- Inicialização ----------------
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("form-login").addEventListener("submit", aoSubmeterLogin);
  document.getElementById("btn-mostrar-senha").addEventListener("click", alternarMostrarSenha);

  document.getElementById("btn-abrir-criar-usuario-2").addEventListener("click", () => {
    fecharModal("modal-perfil");
    abrirModal("modal-criar-usuario");
  });
  document.getElementById("form-criar-usuario").addEventListener("submit", aoSubmeterCriarUsuario);

  document.querySelectorAll(".modal-fechar").forEach(btn => {
    btn.addEventListener("click", () => fecharModal(btn.dataset.fechar));
  });
  document.querySelectorAll(".overlay").forEach(ov => {
    ov.addEventListener("click", (e) => {
      if (e.target === ov && ov.id !== "overlay-cronometro") fecharModal(ov.id);
    });
  });

  document.getElementById("btn-abrir-perfil").addEventListener("click", abrirPerfil);
  document.getElementById("form-perfil-nome").addEventListener("submit", aoSalvarPerfil);
  document.getElementById("form-perfil-senha").addEventListener("submit", aoTrocarSenha);
  document.getElementById("perfil-foto-input").addEventListener("change", aoEscolherFoto);
  document.getElementById("btn-trocar-usuario").addEventListener("click", () => {
    localStorage.removeItem("ferro_usuario");
    localStorage.removeItem("ferro_token");
    location.reload();
  });

  document.getElementById("btn-cronometro-pausar").addEventListener("click", alternarPausaCronometro);
  document.getElementById("btn-cronometro-mais10").addEventListener("click", () => {
    cronometro.segundos += 10;
    cronometro.total += 10;
    atualizarVisualCronometro();
  });
  document.getElementById("btn-cronometro-concluir").addEventListener("click", fecharCronometro);

  if (usuarioAtual) {
    retomarSessao();
  }
});

// ---------------- Login / sessão ----------------
async function aoSubmeterLogin(e) {
  e.preventDefault();
  const usuario = document.getElementById("login-usuario").value.trim();
  const senha = document.getElementById("login-senha").value;
  const erroEl = document.getElementById("login-erro");
  erroEl.classList.add("oculto");
  try {
    const resp = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, senha })
    });
    const dados = await resp.json();
    if (!resp.ok) {
      erroEl.textContent = dados.erro || "Não foi possível entrar";
      erroEl.classList.remove("oculto");
      return;
    }
    usuarioAtual = dados.usuario;
    tokenAtual = dados.token;
    perfilAtual = dados;
    localStorage.setItem("ferro_usuario", usuarioAtual);
    localStorage.setItem("ferro_token", tokenAtual);
    document.getElementById("form-login").reset();
    iniciarApp();
  } catch (err) {
    erroEl.textContent = "Erro de conexão. Tente novamente.";
    erroEl.classList.remove("oculto");
  }
}

// Cabeçalhos padrão para chamadas autenticadas (edição de perfil, ações de administrador)
function authHeaders() {
  const h = { "Content-Type": "application/json" };
  if (tokenAtual) h.Authorization = `Bearer ${tokenAtual}`;
  return h;
}

function alternarMostrarSenha() {
  const input = document.getElementById("login-senha");
  const mostrando = input.type === "text";
  input.type = mostrando ? "password" : "text";
  document.getElementById("btn-mostrar-senha").setAttribute("aria-label", mostrando ? "Mostrar senha" : "Ocultar senha");
}

async function retomarSessao() {
  // Sem token salvo não dá pra reautenticar as ações protegidas (editar perfil,
  // ações de administrador) — mais seguro pedir login de novo do que manter
  // uma sessão "pela metade".
  if (!tokenAtual) {
    localStorage.removeItem("ferro_usuario");
    usuarioAtual = null;
    return;
  }
  try {
    const resp = await fetch(`/api/usuarios/${encodeURIComponent(usuarioAtual)}`, { headers: authHeaders() });
    if (!resp.ok) {
      localStorage.removeItem("ferro_usuario");
      localStorage.removeItem("ferro_token");
      usuarioAtual = null;
      return;
    }
    perfilAtual = await resp.json();
    iniciarApp();
  } catch (err) {
    // sem conexão: mantém tela de login
  }
}

async function iniciarApp() {
  document.getElementById("tela-login").classList.add("oculto");
  document.getElementById("app").classList.remove("oculto");
  atualizarChipUsuario();

  const hoje = new Date();
  document.getElementById("data-hoje").textContent =
    `${DIAS_SEMANA[hoje.getDay()]}, ${hoje.toLocaleDateString("pt-BR")}`;

  const mapaHoje = MAPA_SUGESTAO[perfilAtual.dias_semana] || MAPA_SUGESTAO[3];
  const treinoSugerido = mapaHoje[hoje.getDay()];
  document.getElementById("sugestao-hoje").textContent = treinoSugerido
    ? `Hoje é dia de Treino ${treinoSugerido} 🔥`
    : "Hoje não é dia de treino previsto — descanso ou treino livre";

  const resp = await fetch(`/api/exercicios/${encodeURIComponent(usuarioAtual)}`, { headers: authHeaders() });
  exerciciosData = await resp.json();

  montarAbas();
  abaAtiva = treinoSugerido || "A";
  atualizarAbasAtivas();
  await carregarUltimasCargas();
  renderizarView();

  iniciarChat();
  iniciarComunicados();
}

function atualizarChipUsuario() {
  document.getElementById("nome-atual").textContent = perfilAtual.nome;
  const avatarEl = document.getElementById("avatar-atual");
  aplicarAvatar(avatarEl, perfilAtual);
}

function ehAdmin() {
  return !!(perfilAtual && perfilAtual.role === "admin");
}

function aplicarAvatar(el, perfil) {
  if (perfil.foto) {
    el.style.backgroundImage = `url(${perfil.foto})`;
    el.style.backgroundSize = "cover";
    el.style.backgroundPosition = "center";
    el.textContent = "";
  } else {
    el.style.backgroundImage = "";
    el.textContent = (perfil.nome || perfil.usuario || "?")[0].toUpperCase();
  }
}

function montarAbas() {
  const letras = Object.keys(exerciciosData); // A, B, C, [D, E]
  const nav = document.getElementById("abas-principais");
  let html = letras.map(l => `<button class="aba" data-view="${l}">TREINO ${l}</button>`).join("");
  html += `<button class="aba" data-view="peso">PESO CORPORAL</button>`;
  html += `<button class="aba" data-view="comunicados">COMUNICADOS<span class="aba-badge oculto" id="badge-comunicados"></span></button>`;
  html += `<button class="aba" data-view="chat">CHAT</button>`;
  nav.innerHTML = html;
  nav.querySelectorAll(".aba").forEach(btn => {
    btn.addEventListener("click", () => {
      // Tocar em CHAT sempre volta para a lista de conversas (mesmo se já havia uma aberta)
      if (btn.dataset.view === "chat") chatContatoAtual = null;
      abaAtiva = btn.dataset.view;
      atualizarAbasAtivas();
      renderizarView();
    });
  });
}

function atualizarAbasAtivas() {
  document.querySelectorAll(".aba").forEach(btn => {
    btn.classList.toggle("ativa", btn.dataset.view === abaAtiva);
  });
}

async function carregarUltimasCargas() {
  const resp = await fetch(`/api/cargas/${encodeURIComponent(usuarioAtual)}/ultimas`, { headers: authHeaders() });
  ultimasCargas = await resp.json();
}

// ---------------- Renderização ----------------
function renderizarView() {
  const container = document.getElementById("conteudo");
  if (abaAtiva === "peso") {
    renderizarPeso(container);
  } else if (abaAtiva === "chat") {
    renderizarChat(container);
  } else if (abaAtiva === "comunicados") {
    renderizarComunicados(container);
  } else {
    renderizarTreino(container, abaAtiva);
  }
}

function renderizarTreino(container, letra) {
  const treino = exerciciosData[letra];
  const diaPrevisto = (DIAS_POR_PLANO[perfilAtual.dias_semana] || {})[letra] || treino.dia;
  let html = `
    <div class="treino-cabecalho">
      <h1>${treino.nome}</h1>
      <p>${treino.foco} · previsto para ${diaPrevisto}</p>
    </div>
  `;

  treino.exercicios.forEach(ex => {
    const ultima = ultimasCargas[ex.id];
    html += `
      <div class="exercicio" data-ex-id="${ex.id}">
        <div class="exercicio-demo" data-img0="${ex.imagens[0]}" data-img1="${ex.imagens[1]}" title="Toque para ver a execução do movimento">
          <img src="${ex.imagens[0]}" class="img-0" alt="Execução de ${ex.nome} - posição 1" loading="lazy" onerror="this.parentElement.innerHTML='<div class=demo-legenda style=position:static;background:none;padding:40px 8px>Sem imagem<br>disponível</div>'">
          <img src="${ex.imagens[1]}" class="img-1 escondida" alt="Execução de ${ex.nome} - posição 2" loading="lazy">
          <div class="demo-legenda">toque p/ ver o movimento</div>
        </div>
        <div class="exercicio-corpo">
          <div class="exercicio-titulo-linha">
            <h3 class="exercicio-nome">${ex.nome}</h3>
            <span class="exercicio-grupo">${ex.grupo}</span>
          </div>
          <div class="exercicio-meta">
            <div class="meta-item"><span class="num">${ex.series}</span><span class="rot">Séries</span></div>
            <div class="meta-item"><span class="num">${ex.reps}</span><span class="rot">Repetições</span></div>
            <div class="meta-item"><span class="num">${formatarTempo(ex.descanso)}</span><span class="rot">Descanso</span></div>
          </div>
          <div class="series-bloco" id="series-${ex.id}">${renderizarBlocoSeries(ex)}</div>
          <div class="exercicio-controles">
            <div class="campo">
              <label for="carga-${ex.id}">Carga (kg)</label>
              <input type="number" step="0.5" min="0" id="carga-${ex.id}" placeholder="${ultima ? ultima.carga : '--'}">
            </div>
            <button class="btn-primario" data-acao="salvar-carga" data-ex-id="${ex.id}">Salvar carga</button>
            <button class="btn-video" data-acao="toggle-video" data-ex-id="${ex.id}" data-video-id="${ex.videoId}">▶ Vídeo de execução</button>
            <span class="salvo-flash" id="flash-${ex.id}">salvo ✓</span>
          </div>
          <div class="video-wrap oculto" id="video-${ex.id}"></div>
          <div class="ultima-carga">
            ${ultima ? `Última carga registrada: <b>${ultima.carga} kg</b> em ${formatarData(ultima.data)}` : "Ainda sem registro de carga para este exercício"}
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll(".exercicio-demo").forEach(el => {
    el.addEventListener("click", () => {
      el.querySelector(".img-0").classList.toggle("escondida");
      el.querySelector(".img-1").classList.toggle("escondida");
    });
  });

  container.querySelectorAll('[data-acao="salvar-carga"]').forEach(btn => {
    btn.addEventListener("click", () => salvarCarga(btn.dataset.exId, letra));
  });

  container.querySelectorAll('[data-acao="concluir-serie"]').forEach(btn => {
    btn.addEventListener("click", () => concluirSerie(btn.dataset.exId, letra));
  });

  container.querySelectorAll('[data-acao="toggle-video"]').forEach(btn => {
    btn.addEventListener("click", () => alternarVideoExecucao(btn.dataset.exId, btn.dataset.videoId, btn));
  });
}

// ---------------- Séries: concluir uma série avança direto pro descanso ----------------
// Gera o HTML dos "pontos" de progresso (● feita / ● atual / ● pendente) + o botão de ação.
// Quando todas as séries do exercício já foram concluídas, mostra "Exercício finalizado".
function renderizarBlocoSeries(ex) {
  const feitas = seriesConcluidas[ex.id] || 0;
  const total = ex.series;
  if (feitas >= total) {
    return `<div class="series-completo">✓ Exercício finalizado</div>`;
  }
  let pontos = "";
  for (let i = 1; i <= total; i++) {
    const estado = i <= feitas ? "feita" : (i === feitas + 1 ? "atual" : "pendente");
    pontos += `<span class="serie-ponto ${estado}">${i <= feitas ? "✓" : i}</span>`;
  }
  return `
    <div class="series-pontos">${pontos}</div>
    <button class="btn-serie" data-acao="concluir-serie" data-ex-id="${ex.id}">✓ Concluir Série ${feitas + 1} de ${total}</button>
  `;
}

// Marca a próxima série do exercício como concluída e já abre o cronômetro de
// descanso automaticamente — quando o descanso acabar, a próxima série já
// está liberada para ser concluída. Quando a última série é concluída, o
// bloco vira "Exercício finalizado" (o descanso ainda roda, valendo como o
// intervalo até o próximo exercício).
function concluirSerie(exId, letra) {
  const treino = exerciciosData[letra];
  const ex = treino.exercicios.find(e => e.id === exId);
  if (!ex) return;
  const feitas = seriesConcluidas[exId] || 0;
  if (feitas >= ex.series) return; // já estava tudo concluído
  const numeroSerie = feitas + 1;
  seriesConcluidas[exId] = numeroSerie;

  const bloco = document.getElementById(`series-${exId}`);
  if (bloco) {
    bloco.innerHTML = renderizarBlocoSeries(ex);
    const novoBtn = bloco.querySelector('[data-acao="concluir-serie"]');
    if (novoBtn) novoBtn.addEventListener("click", () => concluirSerie(exId, letra));
  }

  const ultimaSerie = numeroSerie >= ex.series;
  const rotulo = ultimaSerie
    ? `${ex.nome} — última série concluída`
    : `${ex.nome} — Série ${numeroSerie} concluída`;
  abrirCronometro(ex.descanso, rotulo);
}

function alternarVideoExecucao(exId, videoId, botao) {
  const wrap = document.getElementById(`video-${exId}`);
  const aberto = !wrap.classList.contains("oculto");
  // Fecha qualquer outro player aberto antes de abrir um novo (só um vídeo tocando por vez)
  document.querySelectorAll(".video-wrap").forEach(el => {
    if (el !== wrap) {
      el.classList.add("oculto");
      el.innerHTML = "";
    }
  });
  if (aberto) {
    wrap.classList.add("oculto");
    wrap.innerHTML = "";
    botao.textContent = "▶ Vídeo de execução";
  } else {
    wrap.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&playsinline=1&rel=0" title="Vídeo dentro do app: execução do exercício" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    wrap.classList.remove("oculto");
    botao.textContent = "✕ Fechar vídeo";
  }
}

async function salvarCarga(exId, treinoLetra) {
  const input = document.getElementById(`carga-${exId}`);
  const valor = parseFloat(input.value);
  if (!valor || valor <= 0) {
    input.focus();
    return;
  }
  const hoje = new Date().toISOString().slice(0, 10);
  await fetch("/api/cargas", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      usuario: usuarioAtual,
      treino: treinoLetra,
      exercicio_id: exId,
      data: hoje,
      carga: valor
    })
  });
  ultimasCargas[exId] = { carga: valor, data: hoje };
  const flash = document.getElementById(`flash-${exId}`);
  flash.classList.add("mostrar");
  setTimeout(() => flash.classList.remove("mostrar"), 1600);
  const linhaUltima = input.closest(".exercicio-corpo").querySelector(".ultima-carga");
  linhaUltima.innerHTML = `Última carga registrada: <b>${valor} kg</b> em ${formatarData(hoje)}`;
  input.value = "";
}

// ---------------- Cronômetro de descanso ----------------
function abrirCronometro(segundos, nomeExercicio) {
  clearInterval(cronometro.intervalId);
  cronometro.segundos = segundos;
  cronometro.total = segundos;
  cronometro.pausado = false;
  cronometro.exercicioNome = nomeExercicio;

  document.getElementById("cronometro-exercicio").textContent = `Descanso — ${nomeExercicio}`;
  document.getElementById("btn-cronometro-pausar").textContent = "Pausar";
  document.getElementById("cronometro-numero").classList.remove("fim");
  document.getElementById("overlay-cronometro").classList.remove("oculto");
  atualizarVisualCronometro();

  cronometro.intervalId = setInterval(() => {
    if (cronometro.pausado) return;
    cronometro.segundos--;
    if (cronometro.segundos <= 0) {
      cronometro.segundos = 0;
      atualizarVisualCronometro();
      clearInterval(cronometro.intervalId);
      document.getElementById("cronometro-numero").classList.add("fim");
      document.getElementById("cronometro-exercicio").textContent = "Descanso concluído!";
      const som = document.getElementById("som-fim");
      som.currentTime = 0;
      som.play().catch(() => {});
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      return;
    }
    atualizarVisualCronometro();
  }, 1000);
}

function atualizarVisualCronometro() {
  document.getElementById("cronometro-numero").textContent = formatarTempo(cronometro.segundos);
  const pct = cronometro.total > 0 ? (cronometro.segundos / cronometro.total) * 100 : 0;
  const barra = document.getElementById("cronometro-barra-fill");
  barra.style.width = `${pct}%`;
  barra.style.background = cronometro.segundos <= 0 ? "var(--sucesso)" : "var(--sinal)";
}

function alternarPausaCronometro() {
  cronometro.pausado = !cronometro.pausado;
  document.getElementById("btn-cronometro-pausar").textContent = cronometro.pausado ? "Continuar" : "Pausar";
}

function fecharCronometro() {
  clearInterval(cronometro.intervalId);
  document.getElementById("overlay-cronometro").classList.add("oculto");
}

// ---------------- Peso corporal ----------------
async function renderizarPeso(container) {
  container.innerHTML = `
    <div class="treino-cabecalho">
      <h1>Peso Corporal</h1>
      <p>Registre seu peso ao longo do tempo</p>
    </div>
    <div class="peso-topo">
      <div class="campo">
        <label for="peso-data">Data</label>
        <input type="date" id="peso-data">
      </div>
      <div class="campo">
        <label for="peso-valor">Peso (kg)</label>
        <input type="number" step="0.1" min="0" id="peso-valor" placeholder="0.0">
      </div>
      <button class="btn-primario" id="btn-salvar-peso">Salvar peso</button>
    </div>
    <div id="peso-stats-wrap"></div>
    <div class="peso-grafico-wrap">
      <h3>Evolução</h3>
      <canvas id="grafico-peso"></canvas>
    </div>
    <div class="peso-lista">
      <h3>Histórico</h3>
      <div id="peso-lista-itens"><div class="vazio">Carregando...</div></div>
    </div>
  `;

  document.getElementById("peso-data").valueAsDate = new Date();
  document.getElementById("btn-salvar-peso").addEventListener("click", salvarPeso);

  await carregarEDesenharPeso();
}

async function carregarEDesenharPeso() {
  const resp = await fetch(`/api/pesos/${encodeURIComponent(usuarioAtual)}`, { headers: authHeaders() });
  const registros = await resp.json();

  const statsWrap = document.getElementById("peso-stats-wrap");
  if (registros.length > 0) {
    const primeiro = registros[0].peso;
    const ultimo = registros[registros.length - 1].peso;
    const diff = (ultimo - primeiro).toFixed(1);
    const sinalDiff = diff > 0 ? "+" : "";
    statsWrap.innerHTML = `
      <div class="peso-stats">
        <div class="peso-stat"><span class="num">${ultimo} kg</span><span class="rot">Peso atual</span></div>
        <div class="peso-stat"><span class="num">${primeiro} kg</span><span class="rot">Peso inicial</span></div>
        <div class="peso-stat"><span class="num">${sinalDiff}${diff} kg</span><span class="rot">Variação total</span></div>
      </div>
    `;
  } else {
    statsWrap.innerHTML = "";
  }

  desenharGraficoPeso(registros);

  const listaEl = document.getElementById("peso-lista-itens");
  if (registros.length === 0) {
    listaEl.innerHTML = `<div class="vazio">Nenhum registro ainda. Adicione seu peso acima.</div>`;
  } else {
    listaEl.innerHTML = registros.slice().reverse().map(r => `
      <div class="peso-linha">
        <span>${formatarData(r.data)}</span>
        <span><b>${r.peso} kg</b></span>
        <button class="excluir" data-id="${r.id}">excluir</button>
      </div>
    `).join("");
    listaEl.querySelectorAll(".excluir").forEach(btn => {
      btn.addEventListener("click", async () => {
        await fetch(`/api/pesos/${btn.dataset.id}`, { method: "DELETE", headers: authHeaders() });
        carregarEDesenharPeso();
      });
    });
  }
}

async function salvarPeso() {
  const data = document.getElementById("peso-data").value;
  const valor = parseFloat(document.getElementById("peso-valor").value);
  if (!data || !valor || valor <= 0) return;
  await fetch("/api/pesos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario: usuarioAtual, data, peso: valor })
  });
  document.getElementById("peso-valor").value = "";
  carregarEDesenharPeso();
}

function desenharGraficoPeso(registros) {
  const canvas = document.getElementById("grafico-peso");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const larguraCSS = canvas.clientWidth || 600;
  const alturaCSS = 220;
  canvas.width = larguraCSS * dpr;
  canvas.height = alturaCSS * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, larguraCSS, alturaCSS);

  if (registros.length < 2) {
    ctx.fillStyle = "#A9AAAE";
    ctx.font = "13px Inter";
    ctx.fillText("Adicione ao menos 2 registros para ver o gráfico", 8, alturaCSS / 2);
    return;
  }

  const pad = { top: 16, right: 16, bottom: 24, left: 44 };
  const pesos = registros.map(r => r.peso);
  const min = Math.min(...pesos);
  const max = Math.max(...pesos);
  const margem = (max - min) * 0.15 || 1;
  const yMin = min - margem;
  const yMax = max + margem;

  const x = i => pad.left + (i / (registros.length - 1)) * (larguraCSS - pad.left - pad.right);
  const y = v => pad.top + (1 - (v - yMin) / (yMax - yMin)) * (alturaCSS - pad.top - pad.bottom);

  // linhas de grade
  ctx.strokeStyle = "#34363B";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const yy = pad.top + (i / 3) * (alturaCSS - pad.top - pad.bottom);
    ctx.beginPath();
    ctx.moveTo(pad.left, yy);
    ctx.lineTo(larguraCSS - pad.right, yy);
    ctx.stroke();
    const valor = yMax - (i / 3) * (yMax - yMin);
    ctx.fillStyle = "#A9AAAE";
    ctx.font = "10px 'JetBrains Mono'";
    ctx.fillText(valor.toFixed(1), 4, yy + 3);
  }

  // área sob a linha
  ctx.beginPath();
  ctx.moveTo(x(0), alturaCSS - pad.bottom);
  registros.forEach((r, i) => ctx.lineTo(x(i), y(r.peso)));
  ctx.lineTo(x(registros.length - 1), alturaCSS - pad.bottom);
  ctx.closePath();
  ctx.fillStyle = "#FF4B2618";
  ctx.fill();

  // linha
  ctx.beginPath();
  registros.forEach((r, i) => {
    const px = x(i), py = y(r.peso);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
  ctx.strokeStyle = "#FF4B26";
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.stroke();

  // pontos
  registros.forEach((r, i) => {
    ctx.beginPath();
    ctx.arc(x(i), y(r.peso), 3.5, 0, Math.PI * 2);
    ctx.fillStyle = "#17181A";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#FF4B26";
    ctx.stroke();
  });
}

// ---------------- Chat privado (1-a-1: você escolhe com quem fala) ----------------
function renderizarChat(container) {
  if (chatContatoAtual) {
    renderizarConversa(container, chatContatoAtual);
  } else {
    renderizarListaConversas(container);
  }
}

async function renderizarListaConversas(container) {
  container.innerHTML = `
    <div class="treino-cabecalho">
      <h1>Chat</h1>
      <p>Converse somente com seus amigos</p>
    </div>
    <div id="chat-amizades"><div class="vazio">Carregando amigos...</div></div>
  `;
  await carregarListaConversas();
}

async function carregarListaConversas() {
  const wrap = document.getElementById("chat-amizades");
  if (!wrap) return;
  try {
    const [respAmizades, respUsuarios, respConversas] = await Promise.all([
      fetch(`/api/amizades/${encodeURIComponent(usuarioAtual)}`, { headers: authHeaders() }),
      fetch("/api/usuarios", { headers: authHeaders() }),
      fetch(`/api/chat/${encodeURIComponent(usuarioAtual)}/conversas`, { headers: authHeaders() })
    ]);
    if (!respAmizades.ok || !respUsuarios.ok || !respConversas.ok) {
      throw new Error("Não foi possível carregar o chat");
    }
    const amizades = await respAmizades.json();
    const usuarios = await respUsuarios.json();
    const contatos = await respConversas.json();
    const amigosIds = new Set(amizades.amigos.map(a => a.usuario));
    const enviadosIds = new Set(amizades.enviadas.map(a => a.usuario));
    const disponiveis = usuarios.filter(u => u.usuario !== usuarioAtual && !amigosIds.has(u.usuario) && !enviadosIds.has(u.usuario));
    const recebidasHtml = amizades.recebidas.length ? `
      <section class="amizade-secao">
        <div class="amizade-titulo">Solicitações recebidas <span>${amizades.recebidas.length}</span></div>
        <div class="amizade-lista">${amizades.recebidas.map(p => `
          <div class="amizade-linha">
            <span class="chat-contato-avatar">${escaparHtml((p.nome || p.usuario)[0].toUpperCase())}</span>
            <span class="chat-contato-info"><span class="chat-contato-nome">${escaparHtml(p.nome)}</span><span class="chat-contato-preview">quer ser seu amigo</span></span>
            <button class="btn-amizade-acao aceitar" data-id="${p.id}" data-acao="aceitar">Aceitar</button>
            <button class="btn-amizade-acao recusar" data-id="${p.id}" data-acao="recusar" title="Recusar">✕</button>
          </div>`).join("")}</div>
      </section>` : "";
    const amigosHtml = contatos.length ? `
      <section class="amizade-secao">
        <div class="amizade-titulo">Conversas <span>${contatos.length}</span></div>
        <div class="chat-lista-contatos">${contatos.map(c => {
      const preview = c.ultimaMensagem
        ? escaparHtml((c.ultimaMensagem.remetente === usuarioAtual ? "Você: " : "") + c.ultimaMensagem.texto)
        : "Nenhuma mensagem ainda - diga oi!";
      return `
        <button class="chat-contato" data-usuario="${escaparHtml(c.usuario)}">
          <span class="chat-contato-avatar" ${c.foto ? `style="background-image:url(${c.foto});background-size:cover;background-position:center"` : ""}>${c.foto ? "" : escaparHtml((c.nome || c.usuario)[0].toUpperCase())}</span>
          <span class="chat-contato-info">
            <span class="chat-contato-nome">${escaparHtml(c.nome)}${c.status ? ` <small class="status-${c.status.toLowerCase()}">● ${escaparHtml(c.status)}</small>` : ""}</span>
            <span class="chat-contato-preview">${preview}</span>
          </span>
          ${c.naoLidas > 0 ? `<span class="chat-contato-badge">${c.naoLidas}</span>` : ""}
        </button>
      `;
    }).join("")}</div></section>` : `<div class="vazio">Você ainda não tem amigos para conversar.</div>`;
    const descobrirHtml = disponiveis.length ? `
      <section class="amizade-secao">
        <div class="amizade-titulo">Adicionar amigos</div>
        <div class="amizade-lista">${disponiveis.map(p => `
          <div class="amizade-linha">
            <span class="chat-contato-avatar">${escaparHtml((p.nome || p.usuario)[0].toUpperCase())}</span>
            <span class="chat-contato-info"><span class="chat-contato-nome">${escaparHtml(p.nome)}</span><span class="chat-contato-preview">@${escaparHtml(p.usuario)}</span></span>
            <button class="btn-amizade-acao" data-destinatario="${escaparHtml(p.usuario)}">+ Adicionar</button>
          </div>`).join("")}</div>
      </section>` : "";
    const pendentesHtml = amizades.enviadas.length ? `<div class="amizade-pendentes">Solicitações enviadas: ${amizades.enviadas.map(p => escaparHtml(p.nome)).join(", ")}</div>` : "";
    wrap.innerHTML = recebidasHtml + amigosHtml + descobrirHtml + pendentesHtml;
    wrap.querySelectorAll(".chat-contato").forEach(btn => {
      btn.addEventListener("click", () => abrirConversa(btn.dataset.usuario));
    });
    wrap.querySelectorAll("[data-destinatario]").forEach(btn => btn.addEventListener("click", () => solicitarAmizade(btn.dataset.destinatario)));
    wrap.querySelectorAll("[data-acao]").forEach(btn => btn.addEventListener("click", () => responderAmizade(btn.dataset.id, btn.dataset.acao)));
  } catch (err) {
    wrap.innerHTML = `
      <div class="chat-erro">
        <strong>O chat não carregou</strong>
        <span>Verifique sua conexão e tente novamente.</span>
        <button type="button" class="btn-secundario" id="btn-tentar-amizades">Tentar novamente</button>
      </div>
    `;
    document.getElementById("btn-tentar-amizades").addEventListener("click", carregarListaConversas);
  }
}

async function solicitarAmizade(destinatario) {
  await fetch("/api/amizades", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ usuario: usuarioAtual, destinatario })
  });
  carregarListaConversas();
}

async function responderAmizade(id, acao) {
  await fetch(`/api/amizades/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ usuario: usuarioAtual, acao })
  });
  carregarListaConversas();
}

function abrirConversa(contato) {
  chatContatoAtual = contato;
  chatUltimoId = 0;
  renderizarView();
}

function voltarParaListaConversas() {
  chatContatoAtual = null;
  chatUltimoId = 0;
  renderizarView();
}

function renderizarConversa(container, contato) {
  container.innerHTML = `
    <div class="treino-cabecalho chat-cabecalho-conversa">
      <button class="chat-voltar" id="btn-chat-voltar" title="Voltar para as conversas">← Conversas</button>
      <h1>${escaparHtml(contato)}</h1>
    </div>
    <div class="chat-wrap">
      <div class="chat-mensagens" id="chat-mensagens"><div class="vazio">Carregando conversa...</div></div>
      <form id="form-chat" class="chat-form">
        <div class="chat-compose">
          <button type="button" class="chat-ferramenta" id="btn-chat-emoji" title="Adicionar emoji">😊</button>
          <button type="button" class="chat-ferramenta" id="btn-chat-foto" title="Enviar foto">📷</button>
          <button type="button" class="chat-ferramenta" id="btn-chat-gif" title="Enviar GIF">GIF</button>
          <input type="file" id="chat-foto-input" accept="image/*" class="oculto">
          <input type="text" id="chat-texto" placeholder="Escreva uma mensagem..." autocomplete="off" maxlength="2000">
          <button type="submit" class="btn-primario">Enviar</button>
        </div>
        <div class="chat-emojis oculto" id="chat-emojis"></div>
        <div class="chat-gif-form oculto" id="chat-gif-form">
          <input type="url" id="chat-gif-url" placeholder="Cole o endereço de um GIF..." maxlength="2000">
          <button type="button" class="btn-secundario" id="btn-enviar-gif">Adicionar GIF</button>
        </div>
        <div class="chat-status" id="chat-status" aria-live="polite"></div>
      </form>
    </div>
  `;
  document.getElementById("btn-chat-voltar").addEventListener("click", voltarParaListaConversas);
  document.getElementById("form-chat").addEventListener("submit", aoEnviarMensagem);
  document.getElementById("btn-chat-emoji").addEventListener("click", alternarEmojisChat);
  document.getElementById("btn-chat-foto").addEventListener("click", () => document.getElementById("chat-foto-input").click());
  document.getElementById("chat-foto-input").addEventListener("change", aoEscolherFotoChat);
  document.getElementById("btn-chat-gif").addEventListener("click", alternarGifChat);
  document.getElementById("btn-enviar-gif").addEventListener("click", enviarGifChat);
  document.getElementById("chat-emojis").innerHTML = EMOJIS_CHAT.map(emoji => `<button type="button" data-emoji="${emoji}">${emoji}</button>`).join("");
  document.querySelectorAll("#chat-emojis [data-emoji]").forEach(btn => btn.addEventListener("click", () => inserirEmojiChat(btn.dataset.emoji)));
  carregarChat(true);
}

function iniciarChat() {
  clearInterval(chatIntervalId);
  chatIntervalId = setInterval(() => {
    if (abaAtiva !== "chat") return;
    if (chatContatoAtual) {
      carregarChat(false);
    } else {
      carregarListaConversas();
    }
  }, 4000);
}

async function carregarChat(substituirTudo) {
  if (!chatContatoAtual) return;
  try {
    const resp = await fetch(`/api/chat/${encodeURIComponent(usuarioAtual)}/${encodeURIComponent(chatContatoAtual)}?desde=${substituirTudo ? 0 : chatUltimoId}`, { headers: authHeaders() });
    const mensagens = await resp.json();
    if (mensagens.length === 0) {
      if (substituirTudo) {
        const wrap = document.getElementById("chat-mensagens");
        if (wrap) wrap.innerHTML = `<div class="vazio">Nenhuma mensagem ainda. Diga oi 👋</div>`;
      }
      return;
    }
    const wrap = document.getElementById("chat-mensagens");
    if (!wrap) return;
    if (substituirTudo) wrap.innerHTML = "";
    mensagens.forEach(m => {
      wrap.appendChild(criarBolhaMensagem(m));
      chatUltimoId = Math.max(chatUltimoId, m.id);
    });
    wrap.scrollTop = wrap.scrollHeight;
  } catch (err) {
    // silencioso: tenta de novo no próximo polling
  }
}

async function aoEnviarMensagem(e) {
  e.preventDefault();
  if (!chatContatoAtual) return;
  const input = document.getElementById("chat-texto");
  const texto = input.value.trim();
  if (!texto) return;
  input.value = "";
  await enviarMensagemChat(texto, "texto");
}

function criarBolhaMensagem(m) {
  const minha = m.remetente === usuarioAtual;
  const bolha = document.createElement("div");
  bolha.className = `chat-linha ${minha ? "minha" : "outra"}`;
  const conteudo = document.createElement("div");
  conteudo.className = "chat-bolha";
  if (m.tipo === "imagem" || m.tipo === "gif") {
    const imagem = document.createElement("img");
    imagem.src = m.texto;
    imagem.alt = m.tipo === "gif" ? "GIF enviado" : "Foto enviada";
    imagem.loading = "lazy";
    imagem.className = "chat-imagem";
    conteudo.appendChild(imagem);
  } else {
    const texto = document.createElement("span");
    texto.className = "chat-texto";
    texto.textContent = m.texto;
    conteudo.appendChild(texto);
  }
  const hora = document.createElement("span");
  hora.className = "chat-hora";
  hora.textContent = formatarHoraChat(m.criado_em);
  conteudo.appendChild(hora);
  bolha.appendChild(conteudo);
  return bolha;
}

async function enviarMensagemChat(texto, tipo) {
  const status = document.getElementById("chat-status");
  const resp = await fetch("/api/chat", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ usuario: usuarioAtual, destinatario: chatContatoAtual, texto, tipo })
  });
  if (!resp.ok && status) {
    const dados = await resp.json();
    status.textContent = dados.erro || "Não foi possível enviar";
    return;
  }
  carregarChat(false);
}

function alternarEmojisChat() {
  document.getElementById("chat-emojis").classList.toggle("oculto");
  document.getElementById("chat-gif-form").classList.add("oculto");
}

function inserirEmojiChat(emoji) {
  const input = document.getElementById("chat-texto");
  input.value += emoji;
  input.focus();
}

function alternarGifChat() {
  document.getElementById("chat-gif-form").classList.toggle("oculto");
  document.getElementById("chat-emojis").classList.add("oculto");
}

async function enviarGifChat() {
  const input = document.getElementById("chat-gif-url");
  const url = input.value.trim();
  if (!url) return;
  await enviarMensagemChat(url, "gif");
  input.value = "";
}

async function aoEscolherFotoChat(e) {
  const arquivo = e.target.files[0];
  if (!arquivo) return;
  try {
    const foto = await redimensionarImagem(arquivo, 900);
    await enviarMensagemChat(foto, "imagem");
  } catch (err) {
    const status = document.getElementById("chat-status");
    if (status) status.textContent = "Não foi possível preparar essa foto";
  }
  e.target.value = "";
}

function escaparHtml(txt) {
  const div = document.createElement("div");
  div.textContent = txt;
  return div.innerHTML;
}

function formatarHoraChat(iso) {
  if (!iso) return "";
  const d = new Date(iso.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ---------------- Comunicados (avisos da academia) ----------------
async function renderizarComunicados(container) {
  container.innerHTML = `
    <div class="treino-cabecalho">
      <h1>Comunicados</h1>
      <p>Avisos da academia — feriados, fechamentos e recados do administrador</p>
    </div>
    ${ehAdmin() ? `
      <div class="comunicado-compor">
        <textarea id="comunicado-texto" maxlength="2000" placeholder="Escreva um comunicado para todos os alunos..."></textarea>
        <div class="comunicado-compor-acoes">
          <label class="comunicado-fixar">
            <input type="checkbox" id="comunicado-fixar"> Fixar no topo
          </label>
          <button class="btn-primario" id="btn-publicar-comunicado">Publicar</button>
        </div>
        <div class="login-erro oculto" id="comunicado-erro"></div>
      </div>
    ` : ""}
    <div id="comunicados-lista"><div class="vazio">Carregando comunicados...</div></div>
  `;
  if (ehAdmin()) {
    document.getElementById("btn-publicar-comunicado").addEventListener("click", aoPublicarComunicado);
  }
  await carregarComunicados();

  // Marca como visto (zera o badge) ao entrar na aba
  if (comunicados_cache.length) {
    comunicadoUltimoIdVisto = Math.max(...comunicados_cache.map(c => c.id));
    localStorage.setItem("ferro_comunicado_visto", String(comunicadoUltimoIdVisto));
  }
  atualizarBadgeComunicados();
}

async function carregarComunicados() {
  const wrap = document.getElementById("comunicados-lista");
  try {
    const resp = await fetch("/api/comunicados");
    const comunicados = await resp.json();
    comunicados_cache = comunicados;
    if (!wrap) return;
    if (comunicados.length === 0) {
      wrap.innerHTML = `<div class="vazio">Nenhum comunicado publicado ainda.</div>`;
      return;
    }
    wrap.innerHTML = comunicados.map(c => `
      <div class="comunicado-card ${c.fixado ? "fixado" : ""}">
        ${c.fixado ? `<span class="comunicado-selo-fixado">📌 Fixado</span>` : ""}
        <div class="comunicado-texto">${escaparHtml(c.texto)}</div>
        <div class="comunicado-rodape">
          <span>${escaparHtml(c.autor)} · ${formatarDataHoraComunicado(c.criado_em)}</span>
          ${ehAdmin() ? `<button class="comunicado-excluir" data-id="${c.id}">excluir</button>` : ""}
        </div>
      </div>
    `).join("");
    if (ehAdmin()) {
      wrap.querySelectorAll(".comunicado-excluir").forEach(btn => {
        btn.addEventListener("click", () => aoExcluirComunicado(btn.dataset.id));
      });
    }
  } catch (err) {
    // silencioso: tenta de novo no próximo polling
  }
}

async function aoPublicarComunicado() {
  const textoEl = document.getElementById("comunicado-texto");
  const texto = textoEl.value.trim();
  const fixado = document.getElementById("comunicado-fixar").checked;
  const erroEl = document.getElementById("comunicado-erro");
  erroEl.classList.add("oculto");
  if (!texto) return;
  const resp = await fetch("/api/comunicados", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ texto, fixado })
  });
  const dados = await resp.json();
  if (!resp.ok) {
    erroEl.textContent = dados.erro || "Não foi possível publicar";
    erroEl.classList.remove("oculto");
    return;
  }
  textoEl.value = "";
  document.getElementById("comunicado-fixar").checked = false;
  carregarComunicados();
}

async function aoExcluirComunicado(id) {
  await fetch(`/api/comunicados/${id}`, { method: "DELETE", headers: authHeaders() });
  carregarComunicados();
}

function iniciarComunicados() {
  atualizarBadgeComunicados();
  setInterval(async () => {
    try {
      const resp = await fetch("/api/comunicados");
      comunicados_cache = await resp.json();
      atualizarBadgeComunicados();
      if (abaAtiva === "comunicados") carregarComunicados();
    } catch (err) {
      // silencioso
    }
  }, 15000);
}

function atualizarBadgeComunicados() {
  const badge = document.getElementById("badge-comunicados");
  if (!badge) return;
  const maiorId = comunicados_cache.length ? Math.max(...comunicados_cache.map(c => c.id)) : 0;
  const naoVistos = comunicados_cache.filter(c => c.id > comunicadoUltimoIdVisto).length;
  if (naoVistos > 0 && abaAtiva !== "comunicados") {
    badge.textContent = String(naoVistos);
    badge.classList.remove("oculto");
  } else {
    badge.classList.add("oculto");
  }
}

function formatarDataHoraComunicado(iso) {
  if (!iso) return "";
  const d = new Date(iso.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ---------------- Perfil (nome, senha, foto, dias de treino) ----------------
function abrirPerfil() {
  document.getElementById("pf-nome").value = perfilAtual.nome;
  document.getElementById("pf-dias").value = String(perfilAtual.dias_semana);
  document.getElementById("pf-status").value = perfilAtual.status || "Disponível";
  document.getElementById("pf-status-visibilidade").value = perfilAtual.status_visibilidade || "amigos";
  aplicarAvatar(document.getElementById("perfil-foto-preview"), perfilAtual);
  document.getElementById("form-perfil-senha").reset();
  document.getElementById("pf-senha-erro").classList.add("oculto");
  document.getElementById("secao-admin").classList.toggle("oculto", !ehAdmin());
  if (ehAdmin()) carregarListaUsuariosAdmin();
  abrirModal("modal-perfil");
}

// Lista de usuários cadastrados, visível só para o administrador — dá pra ver
// rapidamente quem já tem conta antes de decidir se precisa criar mais alguma.
async function carregarListaUsuariosAdmin() {
  const wrap = document.getElementById("admin-lista-usuarios");
  wrap.innerHTML = `<div class="vazio">Carregando...</div>`;
  try {
    const resp = await fetch("/api/usuarios", { headers: authHeaders() });
    const usuarios = await resp.json();
    wrap.innerHTML = usuarios.map(u => `
      <div class="admin-usuario-linha">
        <span class="nome">${escaparHtml(u.nome)}</span>
        <span class="${u.role === "admin" ? "selo-admin" : "selo-aluno"}">${u.role === "admin" ? "Admin" : "Aluno"}</span>
      </div>
    `).join("");
  } catch (err) {
    wrap.innerHTML = `<div class="vazio">Não foi possível carregar a lista.</div>`;
  }
}

async function aoEscolherFoto(e) {
  const arquivo = e.target.files[0];
  if (!arquivo) return;
  const dataUrl = await redimensionarImagem(arquivo, 320);
  const preview = document.getElementById("perfil-foto-preview");
  preview.style.backgroundImage = `url(${dataUrl})`;
  preview.style.backgroundSize = "cover";
  preview.style.backgroundPosition = "center";
  preview.textContent = "";
  preview.dataset.novaFoto = dataUrl;
}

function redimensionarImagem(arquivo, tamanhoMax) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => {
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, tamanhoMax / Math.max(img.width, img.height));
        const w = Math.round(img.width * escala);
        const h = Math.round(img.height * escala);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = leitor.result;
    };
    leitor.onerror = reject;
    leitor.readAsDataURL(arquivo);
  });
}

async function aoSalvarPerfil(e) {
  e.preventDefault();
  const nome = document.getElementById("pf-nome").value.trim();
  const dias = parseInt(document.getElementById("pf-dias").value, 10);
  const novaFoto = document.getElementById("perfil-foto-preview").dataset.novaFoto;
  const corpo = {
    nome,
    dias_semana: dias,
    status: document.getElementById("pf-status").value,
    status_visibilidade: document.getElementById("pf-status-visibilidade").value
  };
  if (novaFoto) corpo.foto = novaFoto;

  const resp = await fetch(`/api/usuarios/${encodeURIComponent(usuarioAtual)}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(corpo)
  });
  if (!resp.ok) return;
  perfilAtual = await resp.json();
  atualizarChipUsuario();
  fecharModal("modal-perfil");
  // Recarrega treinos caso o número de dias tenha mudado
  const resp2 = await fetch(`/api/exercicios/${encodeURIComponent(usuarioAtual)}`, { headers: authHeaders() });
  exerciciosData = await resp2.json();
  montarAbas();
  if (!exerciciosData[abaAtiva]) abaAtiva = "A";
  atualizarAbasAtivas();
  renderizarView();
}

async function aoTrocarSenha(e) {
  e.preventDefault();
  const senhaAtual = document.getElementById("pf-senha-atual").value;
  const novaSenha = document.getElementById("pf-senha-nova").value;
  const erroEl = document.getElementById("pf-senha-erro");
  erroEl.classList.add("oculto");

  const resp = await fetch(`/api/usuarios/${encodeURIComponent(usuarioAtual)}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ senhaAtual, novaSenha })
  });
  const dados = await resp.json();
  if (!resp.ok) {
    erroEl.textContent = dados.erro || "Não foi possível trocar a senha";
    erroEl.classList.remove("oculto");
    return;
  }
  document.getElementById("form-perfil-senha").reset();
  erroEl.textContent = "Senha alterada com sucesso!";
  erroEl.classList.remove("oculto");
  erroEl.classList.add("chat-sucesso");
}

// ---------------- Criar novo usuário ----------------
async function aoSubmeterCriarUsuario(e) {
  e.preventDefault();
  const usuario = document.getElementById("cu-usuario").value.trim();
  const nome = document.getElementById("cu-nome").value.trim();
  const senha = document.getElementById("cu-senha").value;
  const genero = document.getElementById("cu-genero").value;
  const dias_semana = parseInt(document.getElementById("cu-dias").value, 10);
  const erroEl = document.getElementById("cu-erro");
  erroEl.classList.add("oculto");

  const resp = await fetch("/api/usuarios", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ usuario, nome, senha, genero, dias_semana })
  });
  const dados = await resp.json();
  if (!resp.ok) {
    erroEl.textContent = dados.erro || "Não foi possível criar o usuário";
    erroEl.classList.remove("oculto");
    return;
  }
  document.getElementById("form-criar-usuario").reset();
  fecharModal("modal-criar-usuario");
  if (ehAdmin()) carregarListaUsuariosAdmin();
}

// ---------------- Modais ----------------
function abrirModal(id) {
  document.getElementById(id).classList.remove("oculto");
}
function fecharModal(id) {
  document.getElementById(id).classList.add("oculto");
}

// ---------------- Utilitários ----------------
function formatarTempo(segundosTotais) {
  const m = Math.floor(segundosTotais / 60);
  const s = segundosTotais % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatarData(iso) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

window.addEventListener("resize", () => {
  if (abaAtiva === "peso" && document.getElementById("grafico-peso")) {
    carregarEDesenharPeso();
  }
});
