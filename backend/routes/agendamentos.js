const express = require('express');
const router = express.Router();
const db = require('../database');
const { verificarToken, apenasAdmin } = require('../auth');

// Listar horários disponíveis para um barbeiro em uma data
router.get('/horarios-livres', (req, res) => {
  const { barbeiro_id, data, servico_id } = req.query;
  if (!barbeiro_id || !data || !servico_id) {
    return res.status(400).json({ erro: 'barbeiro_id, data e servico_id são obrigatórios' });
  }

  const date = new Date(data + 'T00:00:00');
  const diaSemana = date.getDay();

  const servico = db.prepare('SELECT duracao_minutos FROM servicos WHERE id = ?').get(servico_id);
  if (!servico) return res.status(404).json({ erro: 'Serviço não encontrado' });

  const horarios = db.prepare(
    'SELECT hora_inicio, hora_fim FROM horarios_disponiveis WHERE barbeiro_id = ? AND dia_semana = ?'
  ).all(barbeiro_id, diaSemana);

  if (!horarios.length) return res.json({ horarios: [] });

  const agendados = db.prepare(
    `SELECT a.hora, s.duracao_minutos FROM agendamentos a
     JOIN servicos s ON a.servico_id = s.id
     WHERE a.barbeiro_id = ? AND a.data = ? AND a.status != 'cancelado'`
  ).all(barbeiro_id, data);

  const ocupados = new Set();
  agendados.forEach(({ hora, duracao_minutos }) => {
    const [h, m] = hora.split(':').map(Number);
    const inicio = h * 60 + m;
    for (let i = 0; i < duracao_minutos; i += 30) ocupados.add(inicio + i);
  });

  const livres = [];
  const duracao = servico.duracao_minutos;

  horarios.forEach(({ hora_inicio, hora_fim }) => {
    let [hi, mi] = hora_inicio.split(':').map(Number);
    const [hf, mf] = hora_fim.split(':').map(Number);
    const fim = hf * 60 + mf;
    let atual = hi * 60 + mi;

    while (atual + duracao <= fim) {
      const slots = [];
      let livre = true;
      for (let i = 0; i < duracao; i += 30) {
        if (ocupados.has(atual + i)) { livre = false; break; }
        slots.push(atual + i);
      }
      if (livre) {
        const h = String(Math.floor(atual / 60)).padStart(2, '0');
        const m = String(atual % 60).padStart(2, '0');
        livres.push(`${h}:${m}`);
      }
      atual += 30;
    }
  });

  res.json({ horarios: livres });
});

// Criar agendamento (público)
router.post('/', (req, res) => {
  const { cliente_nome, cliente_telefone, barbeiro_id, servico_id, data, hora, observacoes } = req.body;
  if (!cliente_nome || !cliente_telefone || !barbeiro_id || !servico_id || !data || !hora) {
    return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios' });
  }

  const nomeOk = typeof cliente_nome === 'string' && cliente_nome.trim().length >= 2 && cliente_nome.length <= 100;
  const telDigitos = String(cliente_telefone).replace(/\D/g, '');
  const dataOk = /^\d{4}-\d{2}-\d{2}$/.test(data);
  const horaOk = /^\d{2}:\d{2}$/.test(hora);
  if (!nomeOk) return res.status(400).json({ erro: 'Nome inválido' });
  if (telDigitos.length < 10 || telDigitos.length > 11) return res.status(400).json({ erro: 'Telefone inválido' });
  if (!dataOk || !horaOk) return res.status(400).json({ erro: 'Data ou hora em formato inválido' });
  if (observacoes && observacoes.length > 500) return res.status(400).json({ erro: 'Observações muito longas' });

  const dataAg = new Date(data + 'T' + hora);
  if (isNaN(dataAg.getTime()) || dataAg < new Date(Date.now() - 60_000)) {
    return res.status(400).json({ erro: 'Não é possível agendar no passado' });
  }

  const barbeiro = db.prepare('SELECT id FROM barbeiros WHERE id = ? AND ativo = 1').get(barbeiro_id);
  if (!barbeiro) return res.status(400).json({ erro: 'Barbeiro inválido' });
  const servico = db.prepare('SELECT id FROM servicos WHERE id = ? AND ativo = 1').get(servico_id);
  if (!servico) return res.status(400).json({ erro: 'Serviço inválido' });

  const conflito = db.prepare(
    `SELECT id FROM agendamentos WHERE barbeiro_id = ? AND data = ? AND hora = ? AND status != 'cancelado'`
  ).get(barbeiro_id, data, hora);
  if (conflito) return res.status(409).json({ erro: 'Horário já ocupado, escolha outro' });

  const result = db.prepare(
    `INSERT INTO agendamentos (cliente_nome, cliente_telefone, barbeiro_id, servico_id, data, hora, observacoes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(cliente_nome.trim(), cliente_telefone.trim(), barbeiro_id, servico_id, data, hora, observacoes ? observacoes.trim() : null);

  const agendamento = db.prepare(
    `SELECT a.*, b.nome as barbeiro_nome, s.nome as servico_nome, s.preco
     FROM agendamentos a
     JOIN barbeiros b ON a.barbeiro_id = b.id
     JOIN servicos s ON a.servico_id = s.id
     WHERE a.id = ?`
  ).get(result.lastInsertRowid);

  res.status(201).json(agendamento);
});

// Buscar agendamento por telefone (público)
router.get('/meus', (req, res) => {
  const { telefone } = req.query;
  if (!telefone) return res.status(400).json({ erro: 'Telefone obrigatório' });

  const agendamentos = db.prepare(
    `SELECT a.*, b.nome as barbeiro_nome, s.nome as servico_nome, s.preco
     FROM agendamentos a
     JOIN barbeiros b ON a.barbeiro_id = b.id
     JOIN servicos s ON a.servico_id = s.id
     WHERE a.cliente_telefone = ?
     ORDER BY a.data DESC, a.hora DESC
     LIMIT 20`
  ).all(telefone);

  res.json(agendamentos);
});

// Admin: listar todos
router.get('/', verificarToken, apenasAdmin, (req, res) => {
  const { data, status, barbeiro_id } = req.query;
  let sql = `SELECT a.*, b.nome as barbeiro_nome, s.nome as servico_nome, s.preco
             FROM agendamentos a
             JOIN barbeiros b ON a.barbeiro_id = b.id
             JOIN servicos s ON a.servico_id = s.id WHERE 1=1`;
  const params = [];
  if (data) { sql += ' AND a.data = ?'; params.push(data); }
  if (status) { sql += ' AND a.status = ?'; params.push(status); }
  if (barbeiro_id) { sql += ' AND a.barbeiro_id = ?'; params.push(barbeiro_id); }
  sql += ' ORDER BY a.data ASC, a.hora ASC';

  res.json(db.prepare(sql).all(...params));
});

// Admin: atualizar status
router.patch('/:id/status', verificarToken, apenasAdmin, (req, res) => {
  const { status } = req.body;
  const validos = ['pendente', 'confirmado', 'concluido', 'cancelado'];
  if (!validos.includes(status)) return res.status(400).json({ erro: 'Status inválido' });

  db.prepare('UPDATE agendamentos SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

// Cancelar agendamento por telefone (público)
router.patch('/:id/cancelar', (req, res) => {
  const { telefone } = req.body;
  const ag = db.prepare('SELECT id, cliente_telefone FROM agendamentos WHERE id = ?').get(req.params.id);
  if (!ag) return res.status(404).json({ erro: 'Agendamento não encontrado' });
  if (ag.cliente_telefone !== telefone) return res.status(403).json({ erro: 'Telefone não confere' });

  db.prepare(`UPDATE agendamentos SET status = 'cancelado' WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
