// Base de exercícios organizada em Treino A / B / C, separada por gênero
// Imagens: banco de dados público (domínio público) free-exercise-db
const BASE_IMG = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

function img(id) {
  return [`${BASE_IMG}${id}/0.jpg`, `${BASE_IMG}${id}/1.jpg`];
}

// videoId = ID de um vídeo curto do YouTube mostrando a execução do movimento,
// tocado direto dentro do app, embutido, sem nunca sair para o YouTube.
// Todo exercício tem um videoId — não existe mais link externo.
const exercicios = {
  // ---------------- TREINO MASCULINO ----------------
  masculino: {
    A: {
      nome: "Treino A",
      foco: "Peito, Ombro e Tríceps",
      dia: "Segunda-feira",
      exercicios: [
        { id: "m-supino-reto", nome: "Supino Reto", grupo: "Peito", series: 4, reps: "8-10", descanso: 60, imagens: img("Barbell_Bench_Press_-_Medium_Grip"), videoId: "AjTLUlx4nEs" },
        { id: "m-supino-inclinado-halteres", nome: "Supino Inclinado com Halteres", grupo: "Peito", series: 3, reps: "10-12", descanso: 60, imagens: img("Incline_Dumbbell_Press"), videoId: "eBT3llJhxU8" },
        { id: "m-desenvolvimento-halteres", nome: "Desenvolvimento com Halteres", grupo: "Ombro", series: 3, reps: "10-12", descanso: 60, imagens: img("Dumbbell_Shoulder_Press"), videoId: "fUqCp4WNKeM" },
        { id: "m-elevacao-lateral", nome: "Elevação Lateral", grupo: "Ombro", series: 3, reps: "12-15", descanso: 60, imagens: img("Side_Lateral_Raise"), videoId: "XgfVRu3O-qY" },
        { id: "m-triceps-corda", nome: "Tríceps Corda (Pulley)", grupo: "Tríceps", series: 3, reps: "12-15", descanso: 60, imagens: img("Triceps_Pushdown"), videoId: "OgZUYKhKFzA" },
        { id: "m-triceps-testa", nome: "Tríceps Testa", grupo: "Tríceps", series: 3, reps: "10-12", descanso: 60, imagens: img("Lying_Triceps_Press"), videoId: "NNx0w_PDumY" }
      ]
    },
    B: {
      nome: "Treino B",
      foco: "Costas e Bíceps",
      dia: "Quarta-feira",
      exercicios: [
        { id: "m-puxada-frente", nome: "Puxada Frente (Pulley)", grupo: "Costas", series: 4, reps: "8-10", descanso: 60, imagens: img("Wide-Grip_Lat_Pulldown"), videoId: "7Fdu_Kbentc" },
        { id: "m-remada-curvada", nome: "Remada Curvada", grupo: "Costas", series: 3, reps: "10-12", descanso: 60, imagens: img("Bent_Over_Barbell_Row"), videoId: "r2BIpnqmoJA" },
        { id: "m-remada-unilateral", nome: "Remada Unilateral com Halter", grupo: "Costas", series: 3, reps: "10-12", descanso: 60, imagens: img("One-Arm_Dumbbell_Row"), videoId: "rxLXbR5wvCs" },
        { id: "m-rosca-direta", nome: "Rosca Direta com Barra", grupo: "Bíceps", series: 3, reps: "10-12", descanso: 60, imagens: img("Barbell_Curl"), videoId: "0T7V5o9ypUw" },
        { id: "m-rosca-alternada", nome: "Rosca Alternada com Halteres", grupo: "Bíceps", series: 3, reps: "10-12", descanso: 60, imagens: img("Alternate_Incline_Dumbbell_Curl"), videoId: "1LpnsHK6uMw" },
        { id: "m-rosca-martelo", nome: "Rosca Martelo", grupo: "Bíceps", series: 3, reps: "12-15", descanso: 60, imagens: img("Hammer_Curls"), videoId: "L1JXNs-MgXg" }
      ]
    },
    C: {
      nome: "Treino C",
      foco: "Pernas, Glúteos e Abdômen",
      dia: "Sexta-feira",
      exercicios: [
        { id: "m-agachamento-livre", nome: "Agachamento Livre", grupo: "Pernas", series: 4, reps: "8-10", descanso: 60, imagens: img("Barbell_Squat"), videoId: "-m8lrJsuHBk" },
        { id: "m-leg-press", nome: "Leg Press", grupo: "Pernas", series: 4, reps: "10-12", descanso: 60, imagens: img("Leg_Press"), videoId: "ydEAJPDckm4" },
        { id: "m-cadeira-extensora", nome: "Cadeira Extensora", grupo: "Pernas", series: 3, reps: "12-15", descanso: 60, imagens: img("Leg_Extensions"), videoId: "Tnmg_ffb6XQ" },
        { id: "m-mesa-flexora", nome: "Mesa Flexora", grupo: "Posterior de Coxa", series: 3, reps: "12-15", descanso: 60, imagens: img("Lying_Leg_Curls"), videoId: "zTTgqH_fc7Y" },
        { id: "m-panturrilha-em-pe", nome: "Panturrilha em Pé", grupo: "Panturrilha", series: 4, reps: "15-20", descanso: 60, imagens: img("Standing_Calf_Raises"), videoId: "Y9J458IvHUQ" },
        { id: "m-abdominal-supra", nome: "Abdominal Supra", grupo: "Abdômen", series: 3, reps: "15-20", descanso: 60, imagens: img("Crunches"), videoId: "w08qG9nQZ_Q" }
      ]
    },
    D: {
      nome: "Treino D",
      foco: "Ombro, Braços e Abdômen",
      dia: "Sexta-feira",
      exercicios: [
        { id: "m-desenvolvimento-militar", nome: "Desenvolvimento Militar com Barra", grupo: "Ombro", series: 4, reps: "8-10", descanso: 60, imagens: img("Barbell_Shoulder_Press"), videoId: "Xy0HBD2K4Jk" },
        { id: "m-elevacao-lateral-cabo", nome: "Elevação Lateral no Cabo", grupo: "Ombro", series: 3, reps: "12-15", descanso: 60, imagens: img("Side_Lateral_Raise"), videoId: "c-5lwEB-g8M" },
        { id: "m-crucifixo-inverso", nome: "Crucifixo Inverso", grupo: "Ombro", series: 3, reps: "12-15", descanso: 60, imagens: img("Reverse_Machine_Flyes"), videoId: "UdxxJiF02F0" },
        { id: "m-rosca-scott", nome: "Rosca Scott", grupo: "Bíceps", series: 3, reps: "10-12", descanso: 60, imagens: img("Preacher_Curl"), videoId: "vOqV6AJ_aro" },
        { id: "m-triceps-frances", nome: "Tríceps Francês com Halter", grupo: "Tríceps", series: 3, reps: "10-12", descanso: 60, imagens: img("Standing_Dumbbell_Triceps_Extension"), videoId: "IXjf5FClW8o" },
        { id: "m-abdominal-infra", nome: "Abdominal Infra (elevação de pernas)", grupo: "Abdômen", series: 3, reps: "15-20", descanso: 60, imagens: img("Hanging_Leg_Raise"), videoId: "snJski9NZLU" }
      ]
    },
    E: {
      nome: "Treino E",
      foco: "Pernas — Posterior, Glúteos e Panturrilha",
      dia: "Sábado",
      exercicios: [
        { id: "m-stiff", nome: "Levantamento Terra Romeno (Stiff)", grupo: "Posterior de Coxa", series: 4, reps: "8-10", descanso: 60, imagens: img("Romanian_Deadlift"), videoId: "-VSENqu7AB8" },
        { id: "m-afundo", nome: "Afundo (Passada) com Halteres", grupo: "Pernas", series: 3, reps: "10-12 cada perna", descanso: 60, imagens: img("Dumbbell_Lunges"), videoId: "mPtTzNYAHi0" },
        { id: "m-mesa-flexora-2", nome: "Mesa Flexora", grupo: "Posterior de Coxa", series: 3, reps: "12-15", descanso: 60, imagens: img("Lying_Leg_Curls"), videoId: "zTTgqH_fc7Y" },
        { id: "m-elevacao-pelvica", nome: "Elevação Pélvica (Hip Thrust)", grupo: "Glúteos", series: 3, reps: "12-15", descanso: 60, imagens: img("Barbell_Hip_Thrust"), videoId: "78wEGbnpfNA" },
        { id: "m-panturrilha-sentado", nome: "Panturrilha Sentado", grupo: "Panturrilha", series: 4, reps: "15-20", descanso: 60, imagens: img("Seated_Calf_Raise"), videoId: "3afDSh_V0sg" },
        { id: "m-abdominal-oblíquo", nome: "Abdominal Oblíquo", grupo: "Abdômen", series: 3, reps: "15-20", descanso: 60, imagens: img("Russian_Twist"), videoId: "irYArl8rzOg" }
      ]
    }
  },

  // ---------------- TREINO FEMININO ----------------
  feminino: {
    A: {
      nome: "Treino A",
      foco: "Glúteos e Pernas (ênfase posterior)",
      dia: "Segunda-feira",
      exercicios: [
        { id: "f-agachamento-livre", nome: "Agachamento Livre", grupo: "Pernas", series: 4, reps: "10-12", descanso: 60, imagens: img("Barbell_Squat"), videoId: "-m8lrJsuHBk" },
        { id: "f-elevacao-pelvica", nome: "Elevação Pélvica (Hip Thrust)", grupo: "Glúteos", series: 4, reps: "12-15", descanso: 60, imagens: img("Barbell_Hip_Thrust"), videoId: "78wEGbnpfNA" },
        { id: "f-avanco-halteres", nome: "Avanço (Passada) com Halteres", grupo: "Pernas", series: 3, reps: "10-12 cada perna", descanso: 60, imagens: img("Dumbbell_Lunges"), videoId: "mPtTzNYAHi0" },
        { id: "f-cadeira-abdutora", nome: "Cadeira Abdutora", grupo: "Glúteos", series: 3, reps: "15-20", descanso: 60, imagens: img("Cable_Hip_Adduction"), videoId: "E5r5OmVfxpU" },
        { id: "f-mesa-flexora", nome: "Mesa Flexora", grupo: "Posterior de Coxa", series: 3, reps: "12-15", descanso: 60, imagens: img("Lying_Leg_Curls"), videoId: "zTTgqH_fc7Y" },
        { id: "f-panturrilha-em-pe", nome: "Panturrilha em Pé", grupo: "Panturrilha", series: 3, reps: "15-20", descanso: 60, imagens: img("Standing_Calf_Raises"), videoId: "Y9J458IvHUQ" }
      ]
    },
    B: {
      nome: "Treino B",
      foco: "Costas, Ombro e Braços",
      dia: "Quarta-feira",
      exercicios: [
        { id: "f-puxada-frente", nome: "Puxada Frente (Pulley)", grupo: "Costas", series: 3, reps: "10-12", descanso: 60, imagens: img("Wide-Grip_Lat_Pulldown"), videoId: "7Fdu_Kbentc" },
        { id: "f-remada-baixa", nome: "Remada Baixa (Pulley)", grupo: "Costas", series: 3, reps: "12-15", descanso: 60, imagens: img("Seated_Cable_Rows"), videoId: "TvfQzNlNdAk" },
        { id: "f-elevacao-lateral", nome: "Elevação Lateral", grupo: "Ombro", series: 3, reps: "12-15", descanso: 60, imagens: img("Side_Lateral_Raise"), videoId: "XgfVRu3O-qY" },
        { id: "f-rosca-direta", nome: "Rosca Direta com Halteres", grupo: "Bíceps", series: 3, reps: "12-15", descanso: 60, imagens: img("Dumbbell_Alternate_Bicep_Curl"), videoId: "j9FlxY9J9Hs" },
        { id: "f-triceps-corda", nome: "Tríceps Corda (Pulley)", grupo: "Tríceps", series: 3, reps: "12-15", descanso: 60, imagens: img("Triceps_Pushdown"), videoId: "OgZUYKhKFzA" },
        { id: "f-abdominal-supra", nome: "Abdominal Supra", grupo: "Abdômen", series: 3, reps: "15-20", descanso: 60, imagens: img("Crunches"), videoId: "w08qG9nQZ_Q" }
      ]
    },
    C: {
      nome: "Treino C",
      foco: "Glúteos e Pernas (ênfase quadríceps)",
      dia: "Sexta-feira",
      exercicios: [
        { id: "f-leg-press", nome: "Leg Press", grupo: "Pernas", series: 4, reps: "12-15", descanso: 60, imagens: img("Leg_Press"), videoId: "ydEAJPDckm4" },
        { id: "f-agachamento-sumo", nome: "Agachamento Sumô com Halter", grupo: "Glúteos", series: 4, reps: "12-15", descanso: 60, imagens: img("Dumbbell_Squat"), videoId: "Ep4J4mQGugI" },
        { id: "f-cadeira-extensora", nome: "Cadeira Extensora", grupo: "Pernas", series: 3, reps: "15-20", descanso: 60, imagens: img("Leg_Extensions"), videoId: "Tnmg_ffb6XQ" },
        { id: "f-elevacao-pelvica-maquina", nome: "Elevação Pélvica na Máquina", grupo: "Glúteos", series: 3, reps: "15-20", descanso: 60, imagens: img("Barbell_Hip_Thrust"), videoId: "vTwjyOvy4g4" },
        { id: "f-cadeira-adutora", nome: "Cadeira Adutora", grupo: "Adutores", series: 3, reps: "15-20", descanso: 60, imagens: img("Cable_Hip_Adduction"), videoId: "ZZp5_OS_sTA" },
        { id: "f-abdominal-infra", nome: "Abdominal Infra (elevação de pernas)", grupo: "Abdômen", series: 3, reps: "15-20", descanso: 60, imagens: img("Hanging_Leg_Raise"), videoId: "snJski9NZLU" }
      ]
    },
    D: {
      nome: "Treino D",
      foco: "Peito, Ombro e Abdômen",
      dia: "Quinta-feira",
      exercicios: [
        { id: "f-supino-reto-halteres", nome: "Supino Reto com Halteres", grupo: "Peito", series: 3, reps: "10-12", descanso: 60, imagens: img("Dumbbell_Bench_Press"), videoId: "dxOCauB5fBs" },
        { id: "f-crucifixo-halteres", nome: "Crucifixo com Halteres", grupo: "Peito", series: 3, reps: "12-15", descanso: 60, imagens: img("Dumbbell_Flyes"), videoId: "35VzplpPLG4" },
        { id: "f-desenvolvimento-halteres", nome: "Desenvolvimento com Halteres", grupo: "Ombro", series: 3, reps: "10-12", descanso: 60, imagens: img("Dumbbell_Shoulder_Press"), videoId: "fUqCp4WNKeM" },
        { id: "f-elevacao-frontal", nome: "Elevação Frontal com Halteres", grupo: "Ombro", series: 3, reps: "12-15", descanso: 60, imagens: img("Front_Dumbbell_Raise"), videoId: "upvQnASGckQ" },
        { id: "f-abdominal-supra-2", nome: "Abdominal Supra", grupo: "Abdômen", series: 3, reps: "15-20", descanso: 60, imagens: img("Crunches"), videoId: "w08qG9nQZ_Q" },
        { id: "f-prancha", nome: "Prancha Abdominal", grupo: "Abdômen", series: 3, reps: "30-45s", descanso: 60, imagens: img("Plank"), videoId: "XqPlCDe37lA" }
      ]
    },
    E: {
      nome: "Treino E",
      foco: "Glúteos — Foco Máximo",
      dia: "Sexta-feira",
      exercicios: [
        { id: "f-elevacao-pelvica-barra-2", nome: "Elevação Pélvica (Hip Thrust) com Barra", grupo: "Glúteos", series: 4, reps: "10-12", descanso: 60, imagens: img("Barbell_Hip_Thrust"), videoId: "78wEGbnpfNA" },
        { id: "f-coice-cabo", nome: "Coice no Cabo (Glúteo)", grupo: "Glúteos", series: 3, reps: "15-20 cada perna", descanso: 60, imagens: img("Cable_Kickback"), videoId: "BzJshXsKF90" },
        { id: "f-passada-bulgara", nome: "Passada Búlgara com Halteres", grupo: "Pernas", series: 3, reps: "10-12 cada perna", descanso: 60, imagens: img("Bulgarian_Split_Squat"), videoId: "p_qNZJ50iO8" },
        { id: "f-cadeira-abdutora-2", nome: "Cadeira Abdutora", grupo: "Glúteos", series: 3, reps: "15-20", descanso: 60, imagens: img("Cable_Hip_Adduction"), videoId: "E5r5OmVfxpU" },
        { id: "f-stiff-halteres", nome: "Stiff com Halteres", grupo: "Posterior de Coxa", series: 3, reps: "12-15", descanso: 60, imagens: img("Romanian_Deadlift"), videoId: "-VSENqu7AB8" },
        { id: "f-panturrilha-sentado-2", nome: "Panturrilha Sentado", grupo: "Panturrilha", series: 3, reps: "15-20", descanso: 60, imagens: img("Seated_Calf_Raise"), videoId: "3afDSh_V0sg" }
      ]
    }
  }
};

module.exports = exercicios;
