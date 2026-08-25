const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");
const exercicios = require("./data/exercicios");

const app = express();
const PORT = process.env.PORT || 3000;

// Pasta de dados (em produção, aponte para um disco persistente no Render)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, "treino.db"));

function validarExercicios() {
  for (const [genero, planos] of Object.entries(exercicios)) {
    for (const [letra, treino] of Object.entries(planos)) {
      for (const exercicio of treino.exercicios) {
        if (!exercicio.videoId) {
          throw new Error(`Exercício sem vídeo: ${genero}/${letra}/${exercicio.id}`);
        }
      }
    }
  }
}

validarExercicios();

db.exec(`
  CREATE TABLE IF NOT EXISTS pesos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT NOT NULL,
    data TEXT NOT NULL,
    peso REAL NOT NULL,
    criado_em TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS cargas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT NOT NULL,
    treino TEXT NOT NULL,
    exercicio_id TEXT NOT NULL,
    data TEXT NOT NULL,
    carga REAL NOT NULL,
    reps TEXT,
    criado_em TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS usuarios (
    usuario TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    senha_hash TEXT NOT NULL,
    senha_salt TEXT NOT NULL,
    genero TEXT NOT NULL,
    dias_semana INTEGER NOT NULL DEFAULT 3,
    foto TEXT,
    role TEXT NOT NULL DEFAULT 'aluno',
    status TEXT NOT NULL DEFAULT 'Disponível',
    status_visibilidade TEXT NOT NULL DEFAULT 'amigos',
    criado_em TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS mensagens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    remetente TEXT NOT NULL,
    destinatario TEXT NOT NULL,
    texto TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'texto',
    lida INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS amizades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    solicitante TEXT NOT NULL,
    destinatario TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente',
    criado_em TEXT DEFAULT (datetime('now')),
    UNIQUE(solicitante, destinatario)
  );
  CREATE TABLE IF NOT EXISTS sessoes (
    token TEXT PRIMARY KEY,
    usuario TEXT NOT NULL,
    criado_em TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS comunicados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    autor TEXT NOT NULL,
    texto TEXT NOT NULL,
    fixado INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_cargas_usuario_ex ON cargas(usuario, exercicio_id);
  CREATE INDEX IF NOT EXISTS idx_pesos_usuario ON pesos(usuario);
  CREATE INDEX IF NOT EXISTS idx_mensagens_par ON mensagens(remetente, destinatario);
  CREATE INDEX IF NOT EXISTS idx_amizades_usuarios ON amizades(solicitante, destinatario, status);
  CREATE INDEX IF NOT EXISTS idx_sessoes_usuario ON sessoes(usuario);
`);

// Migração leve: bancos criados antes da coluna "destinatario" existir.
// Sem isso, quem já tinha o app instalado quebraria ao tentar enviar mensagem.
const colunasMensagens = db.prepare("PRAGMA table_info(mensagens)").all().map(c => c.name);
if (!colunasMensagens.includes("destinatario")) {
  db.exec(`ALTER TABLE mensagens ADD COLUMN destinatario TEXT NOT NULL DEFAULT ''`);
}
if (!colunasMensagens.includes("lida")) {
  db.exec(`ALTER TABLE mensagens ADD COLUMN lida INTEGER NOT NULL DEFAULT 0`);
}
if (!colunasMensagens.includes("tipo")) {
  db.exec(`ALTER TABLE mensagens ADD COLUMN tipo TEXT NOT NULL DEFAULT 'texto'`);
}

// Migração leve: bancos criados antes da coluna "role" existir (era um app só
// para 2 pessoas, sem administrador — agora precisa de alguém "full" pra
// poder cadastrar novos usuários).
const colunasUsuarios = db.prepare("PRAGMA table_info(usuarios)").all().map(c => c.name);
if (!colunasUsuarios.includes("role")) {
  db.exec(`ALTER TABLE usuarios ADD COLUMN role TEXT NOT NULL DEFAULT 'aluno'`);
}
if (!colunasUsuarios.includes("status")) {
  db.exec(`ALTER TABLE usuarios ADD COLUMN status TEXT NOT NULL DEFAULT 'Disponível'`);
}
if (!colunasUsuarios.includes("status_visibilidade")) {
  db.exec(`ALTER TABLE usuarios ADD COLUMN status_visibilidade TEXT NOT NULL DEFAULT 'amigos'`);
}

// Aumenta o limite do body para caber foto de perfil em base64
app.use(express.json({ limit: "6mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ---------------- Senhas (hash com scrypt, sem dependências externas) ----------------
function gerarHashSenha(senha, saltHex) {
  const salt = saltHex || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(senha), salt, 64).toString("hex");
  return { hash, salt };
}
function senhaConfere(senha, hashSalvo, salt) {
  const { hash } = gerarHashSenha(senha, salt);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(hashSalvo, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ---------------- Seed dos usuários iniciais (Adalto e Paloma) ----------------
function criarUsuarioSeSemExistir(usuario, senha, nome, genero, diasSemana, role) {
  const existe = db.prepare("SELECT usuario FROM usuarios WHERE usuario = ?").get(usuario);
  if (existe) return;
  const { hash, salt } = gerarHashSenha(senha);
  db.prepare(
    "INSERT INTO usuarios (usuario, nome, senha_hash, senha_salt, genero, dias_semana, role) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(usuario, nome, hash, salt, genero, diasSemana, role || "aluno");
}
criarUsuarioSeSemExistir("Adalto", "9696", "Adalto", "masculino", 3, "admin");
criarUsuarioSeSemExistir("Paloma", "123", "Paloma", "feminino", 3, "aluno");

// Garante que sempre exista pelo menos 1 administrador ("usuário full") — cobre
// também quem já tinha o banco de dados criado antes de existir a coluna "role".
(function garantirAdministrador() {
  const existeAdmin = db.prepare("SELECT usuario FROM usuarios WHERE role = 'admin' LIMIT 1").get();
  if (existeAdmin) return;
  const candidato =
    db.prepare("SELECT usuario FROM usuarios WHERE usuario = 'Adalto'").get() ||
    db.prepare("SELECT usuario FROM usuarios ORDER BY criado_em ASC LIMIT 1").get();
  if (candidato) db.prepare("UPDATE usuarios SET role = 'admin' WHERE usuario = ?").run(candidato.usuario);
})();

// ---------------- Helpers ----------------
function buscarUsuario(usuario) {
  return db.prepare("SELECT * FROM usuarios WHERE usuario = ?").get(usuario);
}
function perfilPublico(row, visualizador) {
  const podeVerStatus = row.usuario === visualizador || row.status_visibilidade === "todos" || (visualizador && saoAmigos(row.usuario, visualizador));
  return {
    usuario: row.usuario,
    nome: row.nome,
    genero: row.genero,
    dias_semana: row.dias_semana,
    foto: row.foto || null,
    role: row.role || "aluno",
    status: podeVerStatus ? (row.status || "Disponível") : null,
    status_visibilidade: row.usuario === visualizador ? (row.status_visibilidade || "amigos") : null
  };
}

// ---------------- Sessões (token simples emitido no login) ----------------
// Não é um sistema de autenticação completo (sem expiração/refresh), mas já
// evita que qualquer pessoa monte uma requisição chamando a si mesma de
// administrador — só quem realmente fez login como admin recebe um token válido.
function criarSessao(usuario) {
  const token = crypto.randomBytes(24).toString("hex");
  db.prepare("INSERT INTO sessoes (token, usuario) VALUES (?, ?)").run(token, usuario);
  return token;
}
function usuarioDaSessao(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const sessao = db.prepare("SELECT usuario FROM sessoes WHERE token = ?").get(token);
  if (!sessao) return null;
  return buscarUsuario(sessao.usuario) || null;
}
// Confere se quem está chamando a rota é um administrador logado.
// Em caso negativo já responde 403 e devolve null (o caller só precisa dar "return").
function exigirAdmin(req, res) {
  const usuarioLogado = usuarioDaSessao(req);
  if (!usuarioLogado || usuarioLogado.role !== "admin") {
    res.status(403).json({ erro: "Apenas o administrador da academia pode fazer isso" });
    return null;
  }
  return usuarioLogado;
}

function exigirAcessoAoUsuario(req, res, usuario) {
  const usuarioLogado = usuarioDaSessao(req);
  if (!usuarioLogado) {
    res.status(401).json({ erro: "Faça login para continuar" });
    return null;
  }
  if (usuarioLogado.usuario !== usuario && usuarioLogado.role !== "admin") {
    res.status(403).json({ erro: "Você não pode acessar os dados de outro usuário" });
    return null;
  }
  return usuarioLogado;
}

function saoAmigos(usuarioA, usuarioB) {
  return !!db.prepare(`
    SELECT id FROM amizades
    WHERE status = 'aceita'
      AND ((solicitante = ? AND destinatario = ?) OR (solicitante = ? AND destinatario = ?))
  `).get(usuarioA, usuarioB, usuarioB, usuarioA);
}

function exigirAmizade(req, res, usuario, contato) {
  if (!exigirAcessoAoUsuario(req, res, usuario)) return false;
  if (!saoAmigos(usuario, contato)) {
    res.status(403).json({ erro: "Vocês precisam ser amigos para conversar" });
    return false;
  }
  return true;
}

// ---------------- Autenticação ----------------
app.post("/api/login", (req, res) => {
  const { usuario, senha } = req.body || {};
  if (!usuario || !senha) return res.status(400).json({ erro: "Informe usuário e senha" });
  const row = buscarUsuario(usuario);
  if (!row || !senhaConfere(senha, row.senha_hash, row.senha_salt)) {
    return res.status(401).json({ erro: "Usuário ou senha incorretos" });
  }
  const token = criarSessao(row.usuario);
  res.json({ ...perfilPublico(row, row.usuario), token });
});

// Cria um novo usuário — só o administrador da academia pode fazer isso agora
app.post("/api/usuarios", (req, res) => {
  if (!exigirAdmin(req, res)) return;
  const { usuario, senha, nome, genero, dias_semana } = req.body || {};
  if (!usuario || !senha || !nome || !genero) {
    return res.status(400).json({ erro: "Preencha usuário, nome, senha e gênero do treino" });
  }
  if (!["masculino", "feminino"].includes(genero)) {
    return res.status(400).json({ erro: "Gênero de treino inválido" });
  }
  if (senha.length < 3) return res.status(400).json({ erro: "A senha precisa ter ao menos 3 caracteres" });
  const existe = buscarUsuario(usuario);
  if (existe) return res.status(409).json({ erro: "Já existe um usuário com esse nome de login" });
  const dias = [3, 4, 5].includes(Number(dias_semana)) ? Number(dias_semana) : 3;
  const { hash, salt } = gerarHashSenha(senha);
  db.prepare(
    "INSERT INTO usuarios (usuario, nome, senha_hash, senha_salt, genero, dias_semana, role) VALUES (?, ?, ?, ?, ?, ?, 'aluno')"
  ).run(usuario, nome, hash, salt, genero, dias);
  res.json(perfilPublico(buscarUsuario(usuario)));
});

// Lista simples de usuários (login/nome/foto/role), sem dados sensíveis — usada no chat e no painel de administração
app.get("/api/usuarios", (req, res) => {
  const logado = usuarioDaSessao(req);
  if (!logado) return res.status(401).json({ erro: "Faça login para continuar" });
  const rows = db.prepare("SELECT usuario, nome, foto, role, status, status_visibilidade FROM usuarios ORDER BY usuario ASC").all();
  res.json(rows.map(row => ({ ...row, status: perfilPublico(row, logado.usuario).status, status_visibilidade: undefined })));
});

app.get("/api/usuarios/:usuario", (req, res) => {
  if (!exigirAcessoAoUsuario(req, res, req.params.usuario)) return;
  const row = buscarUsuario(req.params.usuario);
  if (!row) return res.status(404).json({ erro: "Usuário não encontrado" });
  res.json(perfilPublico(row, usuarioDaSessao(req).usuario));
});

// Atualiza perfil: nome, foto e/ou senha (para trocar a senha é preciso informar a senha atual)
app.put("/api/usuarios/:usuario", (req, res) => {
  const row = buscarUsuario(req.params.usuario);
  if (!row) return res.status(404).json({ erro: "Usuário não encontrado" });
  const logado = usuarioDaSessao(req);
  if (!logado || (logado.usuario !== row.usuario && logado.role !== "admin")) {
    return res.status(403).json({ erro: "Você só pode editar o seu próprio perfil" });
  }
  const { nome, foto, senhaAtual, novaSenha, dias_semana, status, status_visibilidade } = req.body || {};

  const novoNome = nome && nome.trim() ? nome.trim() : row.nome;
  const novaFoto = foto !== undefined ? foto : row.foto;
  const novosDias = [3, 4, 5].includes(Number(dias_semana)) ? Number(dias_semana) : row.dias_semana;
  const novoStatus = ["Disponível", "Ocupado", "Ausente"].includes(status) ? status : (row.status || "Disponível");
  const novaVisibilidade = ["todos", "amigos"].includes(status_visibilidade) ? status_visibilidade : (row.status_visibilidade || "amigos");

  let hash = row.senha_hash;
  let salt = row.senha_salt;
  if (novaSenha) {
    if (!senhaAtual || !senhaConfere(senhaAtual, row.senha_hash, row.senha_salt)) {
      return res.status(401).json({ erro: "Senha atual incorreta" });
    }
    if (String(novaSenha).length < 3) {
      return res.status(400).json({ erro: "A nova senha precisa ter ao menos 3 caracteres" });
    }
    const gerado = gerarHashSenha(novaSenha);
    hash = gerado.hash;
    salt = gerado.salt;
  }

  db.prepare(
    "UPDATE usuarios SET nome = ?, foto = ?, dias_semana = ?, status = ?, status_visibilidade = ?, senha_hash = ?, senha_salt = ? WHERE usuario = ?"
  ).run(novoNome, novaFoto, novosDias, novoStatus, novaVisibilidade, hash, salt, row.usuario);

  res.json(perfilPublico(buscarUsuario(row.usuario), row.usuario));
});

// ---------------- Exercícios (dados fixos, separados por gênero e nº de dias) ----------------
// Mantido por compatibilidade: sem usuário, devolve o treino masculino completo
app.get("/api/exercicios", (req, res) => {
  if (!usuarioDaSessao(req)) return res.status(401).json({ erro: "Faça login para continuar" });
  res.json(exercicios.masculino);
});

// Treino correto para cada usuário, já filtrado pelos dias/semana escolhidos no perfil
app.get("/api/exercicios/:usuario", (req, res) => {
  if (!exigirAcessoAoUsuario(req, res, req.params.usuario)) return;
  const row = buscarUsuario(req.params.usuario);
  if (!row) return res.status(400).json({ erro: "Usuário inválido" });
  const todos = exercicios[row.genero];
  const letras = { 3: ["A", "B", "C"], 4: ["A", "B", "C", "D"], 5: ["A", "B", "C", "D", "E"] }[row.dias_semana] || ["A", "B", "C"];
  const filtrado = {};
  letras.forEach(l => { filtrado[l] = todos[l]; });
  res.json(filtrado);
});

// ---------------- Amizades e solicitações ----------------
app.get("/api/amizades/:usuario", (req, res) => {
  const { usuario } = req.params;
  if (!exigirAcessoAoUsuario(req, res, usuario)) return;
  const recebidas = db.prepare(`
    SELECT a.id, a.solicitante AS usuario, u.nome, u.foto, a.criado_em
    FROM amizades a JOIN usuarios u ON u.usuario = a.solicitante
    WHERE a.destinatario = ? AND a.status = 'pendente' ORDER BY a.id DESC
  `).all(usuario);
  const enviadas = db.prepare(`
    SELECT a.id, a.destinatario AS usuario, u.nome, u.foto, a.criado_em
    FROM amizades a JOIN usuarios u ON u.usuario = a.destinatario
    WHERE a.solicitante = ? AND a.status = 'pendente' ORDER BY a.id DESC
  `).all(usuario);
  const amigos = db.prepare(`
    SELECT a.id, CASE WHEN a.solicitante = ? THEN a.destinatario ELSE a.solicitante END AS usuario,
      u.nome, u.foto
    FROM amizades a
    JOIN usuarios u ON u.usuario = CASE WHEN a.solicitante = ? THEN a.destinatario ELSE a.solicitante END
    WHERE (a.solicitante = ? OR a.destinatario = ?) AND a.status = 'aceita'
    ORDER BY u.nome ASC
  `).all(usuario, usuario, usuario, usuario);
  res.json({ recebidas, enviadas, amigos });
});

app.post("/api/amizades", (req, res) => {
  const { usuario, destinatario } = req.body || {};
  if (!exigirAcessoAoUsuario(req, res, usuario)) return;
  if (!destinatario || !buscarUsuario(destinatario) || destinatario === usuario) {
    return res.status(400).json({ erro: "Escolha um usuário válido" });
  }
  const existente = db.prepare(`
    SELECT * FROM amizades
    WHERE (solicitante = ? AND destinatario = ?) OR (solicitante = ? AND destinatario = ?)
  `).get(usuario, destinatario, destinatario, usuario);
  if (existente) return res.status(409).json({ erro: existente.status === "aceita" ? "Vocês já são amigos" : "Já existe uma solicitação para esse usuário" });
  const info = db.prepare("INSERT INTO amizades (solicitante, destinatario) VALUES (?, ?)").run(usuario, destinatario);
  res.json({ id: info.lastInsertRowid, status: "pendente" });
});

app.put("/api/amizades/:id", (req, res) => {
  const { usuario, acao } = req.body || {};
  if (!exigirAcessoAoUsuario(req, res, usuario)) return;
  if (!["aceitar", "recusar"].includes(acao)) return res.status(400).json({ erro: "Ação inválida" });
  const amizade = db.prepare("SELECT * FROM amizades WHERE id = ? AND destinatario = ? AND status = 'pendente'").get(req.params.id, usuario);
  if (!amizade) return res.status(404).json({ erro: "Solicitação não encontrada" });
  db.prepare("UPDATE amizades SET status = ? WHERE id = ?").run(acao === "aceitar" ? "aceita" : "recusada", amizade.id);
  res.json({ ok: true });
});

// ---------------- Peso corporal ----------------
app.get("/api/pesos/:usuario", (req, res) => {
  const { usuario } = req.params;
  if (!exigirAcessoAoUsuario(req, res, usuario)) return;
  if (!buscarUsuario(usuario)) return res.status(400).json({ erro: "Usuário inválido" });
  const rows = db.prepare("SELECT * FROM pesos WHERE usuario = ? ORDER BY data ASC").all(usuario);
  res.json(rows);
});

app.post("/api/pesos", (req, res) => {
  const { usuario, data, peso } = req.body;
  if (!exigirAcessoAoUsuario(req, res, usuario)) return;
  if (!buscarUsuario(usuario)) return res.status(400).json({ erro: "Usuário inválido" });
  if (!data || !peso) return res.status(400).json({ erro: "Data e peso são obrigatórios" });
  const info = db.prepare("INSERT INTO pesos (usuario, data, peso) VALUES (?, ?, ?)").run(usuario, data, peso);
  res.json({ id: info.lastInsertRowid });
});

app.delete("/api/pesos/:id", (req, res) => {
  const peso = db.prepare("SELECT usuario FROM pesos WHERE id = ?").get(req.params.id);
  if (!peso) return res.status(404).json({ erro: "Registro não encontrado" });
  if (!exigirAcessoAoUsuario(req, res, peso.usuario)) return;
  db.prepare("DELETE FROM pesos WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ---------------- Cargas por exercício ----------------
app.get("/api/cargas/:usuario", (req, res) => {
  const { usuario } = req.params;
  const { exercicio_id } = req.query;
  if (!exigirAcessoAoUsuario(req, res, usuario)) return;
  if (!buscarUsuario(usuario)) return res.status(400).json({ erro: "Usuário inválido" });
  let rows;
  if (exercicio_id) {
    rows = db.prepare("SELECT * FROM cargas WHERE usuario = ? AND exercicio_id = ? ORDER BY data ASC")
      .all(usuario, exercicio_id);
  } else {
    rows = db.prepare("SELECT * FROM cargas WHERE usuario = ? ORDER BY data DESC").all(usuario);
  }
  res.json(rows);
});

// Última carga registrada de cada exercício, para pré-preencher a tela
app.get("/api/cargas/:usuario/ultimas", (req, res) => {
  const { usuario } = req.params;
  if (!exigirAcessoAoUsuario(req, res, usuario)) return;
  if (!buscarUsuario(usuario)) return res.status(400).json({ erro: "Usuário inválido" });
  const rows = db.prepare(`
    SELECT c.exercicio_id, c.carga, c.reps, c.data
    FROM cargas c
    INNER JOIN (
      SELECT exercicio_id, MAX(data) AS max_data
      FROM cargas WHERE usuario = ?
      GROUP BY exercicio_id
    ) ult ON c.exercicio_id = ult.exercicio_id AND c.data = ult.max_data
    WHERE c.usuario = ?
  `).all(usuario, usuario);
  const mapa = {};
  rows.forEach(r => { mapa[r.exercicio_id] = r; });
  res.json(mapa);
});

app.post("/api/cargas", (req, res) => {
  const { usuario, treino, exercicio_id, data, carga, reps } = req.body;
  if (!exigirAcessoAoUsuario(req, res, usuario)) return;
  if (!buscarUsuario(usuario)) return res.status(400).json({ erro: "Usuário inválido" });
  if (!treino || !exercicio_id || !data || carga === undefined) {
    return res.status(400).json({ erro: "Dados incompletos" });
  }
  const info = db.prepare(
    "INSERT INTO cargas (usuario, treino, exercicio_id, data, carga, reps) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(usuario, treino, exercicio_id, data, carga, reps || null);
  res.json({ id: info.lastInsertRowid });
});

// ---------------- Chat privado (conversa 1-a-1 entre dois usuários do app) ----------------
// Lista de conversas do usuário: 1 linha por contato, com a última mensagem e
// quantas ainda não foram lidas. Usada para montar a tela "com quem falar".
app.get("/api/chat/:usuario/conversas", (req, res) => {
  const { usuario } = req.params;
  if (!exigirAcessoAoUsuario(req, res, usuario)) return;
  if (!buscarUsuario(usuario)) return res.status(400).json({ erro: "Usuário inválido" });
  const contatos = db.prepare(`
    SELECT u.usuario, u.nome, u.foto FROM usuarios u
    WHERE u.usuario != ? AND EXISTS (
      SELECT 1 FROM amizades a WHERE a.status = 'aceita'
        AND ((a.solicitante = ? AND a.destinatario = u.usuario) OR (a.destinatario = ? AND a.solicitante = u.usuario))
    ) ORDER BY u.nome ASC
  `).all(usuario, usuario, usuario);
  const resultado = contatos.map(c => {
    const ultima = db.prepare(`
      SELECT * FROM mensagens
      WHERE (remetente = ? AND destinatario = ?) OR (remetente = ? AND destinatario = ?)
      ORDER BY id DESC LIMIT 1
    `).get(usuario, c.usuario, c.usuario, usuario);
    const naoLidas = db.prepare(
      "SELECT COUNT(*) AS n FROM mensagens WHERE remetente = ? AND destinatario = ? AND lida = 0"
    ).get(c.usuario, usuario).n;
    return { ...c, status: perfilPublico(buscarUsuario(c.usuario), usuario).status, ultimaMensagem: ultima || null, naoLidas };
  });
  res.json(resultado);
});

// Mensagens de uma conversa específica entre :usuario e :contato.
// ?desde=<id da última mensagem já recebida> traz só as novas (usado no polling).
app.get("/api/chat/:usuario/:contato", (req, res) => {
  const { usuario, contato } = req.params;
  if (!exigirAmizade(req, res, usuario, contato)) return;
  if (!buscarUsuario(usuario) || !buscarUsuario(contato)) {
    return res.status(400).json({ erro: "Usuário inválido" });
  }
  const desde = parseInt(req.query.desde, 10) || 0;
  const rows = db.prepare(`
    SELECT * FROM mensagens
    WHERE id > ?
      AND ((remetente = ? AND destinatario = ?) OR (remetente = ? AND destinatario = ?))
    ORDER BY id ASC
  `).all(desde, usuario, contato, contato, usuario);
  // Marca como lidas as mensagens que o contato enviou para o usuário que está abrindo a conversa
  db.prepare("UPDATE mensagens SET lida = 1 WHERE remetente = ? AND destinatario = ? AND lida = 0").run(contato, usuario);
  res.json(rows);
});

app.post("/api/chat", (req, res) => {
  const { usuario, destinatario, texto, tipo } = req.body || {};
  if (!exigirAmizade(req, res, usuario, destinatario)) return;
  if (!buscarUsuario(usuario)) return res.status(400).json({ erro: "Usuário inválido" });
  if (!destinatario || !buscarUsuario(destinatario)) return res.status(400).json({ erro: "Escolha para quem enviar a mensagem" });
  if (destinatario === usuario) return res.status(400).json({ erro: "Não é possível enviar mensagem para si mesmo" });
  let tipoFinal = "texto";
  let limpo = String(texto || "").trim().slice(0, 2000);
  if (tipo === "imagem") {
    if (!/^data:image\/(jpeg|png|webp|gif);base64,/.test(limpo) || limpo.length > 5500000) {
      return res.status(400).json({ erro: "A imagem precisa ser JPG, PNG, WEBP ou GIF e ter até 4 MB" });
    }
    tipoFinal = "imagem";
  } else if (tipo === "gif") {
    if (!/^https?:\/\/[^\s]+$/i.test(limpo) || limpo.length > 2000) {
      return res.status(400).json({ erro: "Informe um endereço válido para o GIF" });
    }
    tipoFinal = "gif";
  }
  if (!limpo) return res.status(400).json({ erro: "Mensagem vazia" });
  const info = db.prepare("INSERT INTO mensagens (remetente, destinatario, texto, tipo) VALUES (?, ?, ?, ?)").run(usuario, destinatario, limpo, tipoFinal);
  const row = db.prepare("SELECT * FROM mensagens WHERE id = ?").get(info.lastInsertRowid);
  res.json(row);
});

// ---------------- Comunicados (avisos da academia: fechamento, feriado, etc.) ----------------
// Qualquer usuário logado pode ler; só o administrador pode publicar/remover.
app.get("/api/comunicados", (req, res) => {
  const rows = db.prepare("SELECT * FROM comunicados ORDER BY fixado DESC, id DESC").all();
  res.json(rows);
});

app.post("/api/comunicados", (req, res) => {
  const admin = exigirAdmin(req, res);
  if (!admin) return;
  const { texto, fixado } = req.body || {};
  const limpo = String(texto || "").trim().slice(0, 2000);
  if (!limpo) return res.status(400).json({ erro: "Escreva o texto do comunicado" });
  const info = db.prepare("INSERT INTO comunicados (autor, texto, fixado) VALUES (?, ?, ?)")
    .run(admin.usuario, limpo, fixado ? 1 : 0);
  const row = db.prepare("SELECT * FROM comunicados WHERE id = ?").get(info.lastInsertRowid);
  res.json(row);
});

app.delete("/api/comunicados/:id", (req, res) => {
  const admin = exigirAdmin(req, res);
  if (!admin) return;
  db.prepare("DELETE FROM comunicados WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`App de treino rodando na porta ${PORT}`);
});
