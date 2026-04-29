const express = require('express');
const router = express.Router();
const db = require('../database');
const { verificarToken, apenasAdmin } = require('../auth');

router.get('/', (req, res) => {
  const barbeiros = db.prepare('SELECT * FROM barbeiros WHERE ativo = 1 ORDER BY nome').all();
  res.json(barbeiros);
});

router.post('/', verificarToken, apenasAdmin, (req, res) => {
  const { nome, especialidade } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome obrigatório' });
  const result = db.prepare('INSERT INTO barbeiros (nome, especialidade) VALUES (?, ?)').run(nome, especialidade || null);
  res.status(201).json({ id: result.lastInsertRowid, nome, especialidade });
});

router.put('/:id', verificarToken, apenasAdmin, (req, res) => {
  const { nome, especialidade, ativo } = req.body;
  db.prepare('UPDATE barbeiros SET nome = ?, especialidade = ?, ativo = ? WHERE id = ?')
    .run(nome, especialidade, ativo !== undefined ? ativo : 1, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', verificarToken, apenasAdmin, (req, res) => {
  db.prepare('UPDATE barbeiros SET ativo = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
