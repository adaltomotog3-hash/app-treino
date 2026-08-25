# FERRO — Diário de Treino

App web para acompanhar peso corporal e evolução de carga nos treinos, com contas de usuário próprias, chat privado e treinos personalizados de 3, 4 ou 5 dias por semana.

## Rodando localmente

```
npm install
npm start
```

Depois acesse http://localhost:3000

## Usuários

- **Adalto** — senha `9696`
- **Paloma** — senha `123`

Somente o administrador pode criar novos usuários pelo menu de perfil, escolhendo login, nome, senha, se o treino é baseado no masculino ou feminino, e quantos dias por semana (3, 4 ou 5).

## Como funciona

- **Login com senha**: cada pessoa entra com usuário e senha próprios.
- **Perfil** (botão "perfil" no topo): trocar nome de exibição, foto de perfil e senha, além do número de dias de treino por semana.
- Abas **Treino A / B / C / D / E** (a quantidade de abas depende dos dias/semana escolhidos no perfil): cada exercício mostra 2 fotos da execução (toque na imagem para alternar entre a posição inicial e final do movimento), séries, repetições, tempo de descanso, botão de cronômetro e campo para registrar a carga usada naquele dia.
  - 3 dias/semana: Treino A, B, C
  - 4 dias/semana: A, B, C, D
  - 5 dias/semana: A, B, C, D, E
  - Os planos masculino e feminino têm sequências próprias para 3, 4 e 5 dias. Todo exercício possui um botão **Vídeo de execução**, que abre o player incorporado dentro do próprio app, sem redirecionamento.
- Cronômetro de descanso: abre em tela cheia, conta regressivamente, apita e vibra (celular) quando termina, e tem botão "Concluí o descanso" para fechar quando quiser.
- Aba **Peso Corporal**: registra peso por data, mostra gráfico de evolução e histórico com opção de excluir.
- Aba **Chat**: chat privado entre as contas do app (atualiza sozinho a cada poucos segundos).
- O sistema sugere automaticamente o treino do dia, de acordo com os dias/semana escolhidos.

## Estrutura

```
server.js             -> backend Express + SQLite (usuários, senhas, pesos, cargas, chat)
data/exercicios.js    -> lista fixa dos exercícios de cada treino, A a E (edite aqui para trocar exercícios/reps/descanso)
data/treino.db        -> banco SQLite (criado automaticamente, guarda usuários, pesos, cargas e mensagens)
public/               -> frontend (HTML/CSS/JS puro, sem build)
```

## Deploy no Render

1. Suba esta pasta para um repositório novo no GitHub.
2. No Render, crie um **Web Service** apontando para o repositório.
3. Build command: `npm install`
4. Start command: `npm start`
5. **Importante:** o disco do Render free é temporário — a cada novo deploy o banco (`data/treino.db`) é apagado, incluindo os usuários criados manualmente. Se quiser manter tudo entre deploys, adicione um **Persistent Disk** no Render montado em `/data` e defina a variável de ambiente `DATA_DIR=/data`.

## Editando os treinos

Para trocar um exercício, mudar séries/reps/descanso ou adicionar mais exercícios, edite `data/exercicios.js`. As imagens de demonstração vêm de um banco de dados público de exercícios (free-exercise-db, domínio público) — se quiser trocar a foto de algum exercício, basta trocar o link de imagem nesse arquivo.

## Segurança

As senhas são guardadas com hash (scrypt + salt), nunca em texto puro. A foto de perfil é enviada e guardada como imagem (já redimensionada no navegador antes do envio para não pesar).
