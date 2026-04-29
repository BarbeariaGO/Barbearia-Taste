const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'barbearia.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cliente',
    telefone TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS barbeiros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    especialidade TEXT,
    foto TEXT,
    ativo INTEGER DEFAULT 1,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS servicos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descricao TEXT,
    duracao_minutos INTEGER NOT NULL DEFAULT 30,
    preco REAL NOT NULL,
    ativo INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS horarios_disponiveis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barbeiro_id INTEGER NOT NULL,
    dia_semana INTEGER NOT NULL,
    hora_inicio TEXT NOT NULL,
    hora_fim TEXT NOT NULL,
    FOREIGN KEY (barbeiro_id) REFERENCES barbeiros(id)
  );

  CREATE TABLE IF NOT EXISTS agendamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_nome TEXT NOT NULL,
    cliente_telefone TEXT NOT NULL,
    barbeiro_id INTEGER NOT NULL,
    servico_id INTEGER NOT NULL,
    data DATE NOT NULL,
    hora TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente',
    observacoes TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (barbeiro_id) REFERENCES barbeiros(id),
    FOREIGN KEY (servico_id) REFERENCES servicos(id)
  );
`);

// Seed initial data if empty
const adminExists = db.prepare('SELECT id FROM usuarios WHERE role = ?').get('admin');
if (!adminExists) {
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(`INSERT INTO usuarios (nome, email, senha, role) VALUES (?, ?, ?, ?)`).run('Administrador', 'admin@barbearia.com', hash, 'admin');
}

const barbeirosCount = db.prepare('SELECT COUNT(*) as c FROM barbeiros').get();
if (barbeirosCount.c === 0) {
  const insertBarbeiro = db.prepare('INSERT INTO barbeiros (nome, especialidade) VALUES (?, ?)');
  insertBarbeiro.run('Carlos Silva', 'Corte Clássico e Barba');
  insertBarbeiro.run('João Mendes', 'Corte Moderno e Degradê');
  insertBarbeiro.run('Rafael Costa', 'Corte Infantil e Coloração');

  const insertHorario = db.prepare('INSERT INTO horarios_disponiveis (barbeiro_id, dia_semana, hora_inicio, hora_fim) VALUES (?, ?, ?, ?)');
  [1, 2, 3].forEach(bid => {
    [1,2,3,4,5].forEach(dia => {
      insertHorario.run(bid, dia, '09:00', '18:00');
    });
    insertHorario.run(bid, 6, '09:00', '15:00');
  });
}

const servicosCount = db.prepare('SELECT COUNT(*) as c FROM servicos').get();
if (servicosCount.c === 0) {
  const insertServico = db.prepare('INSERT INTO servicos (nome, descricao, duracao_minutos, preco) VALUES (?, ?, ?, ?)');
  insertServico.run('Corte de Cabelo', 'Corte masculino com tesoura ou máquina', 30, 35.00);
  insertServico.run('Barba', 'Aparar e modelar barba com navalha', 30, 25.00);
  insertServico.run('Corte + Barba', 'Combo completo cabelo e barba', 60, 55.00);
  insertServico.run('Degradê', 'Corte degradê com acabamento', 45, 45.00);
  insertServico.run('Hidratação', 'Hidratação capilar profissional', 45, 40.00);
  insertServico.run('Sobrancelha', 'Design de sobrancelha masculina', 15, 15.00);
}

module.exports = db;
