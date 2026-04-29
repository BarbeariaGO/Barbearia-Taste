const express = require('express');
const router = express.Router();
const db = require('../database');
const { verificarToken, apenasAdmin } = require('../auth');

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM servicos WHERE ativo = 1 ORDER BY preco').all());
});

router.post('/', verificarToken, apenasAdmin, (req, res) => {
  const { nome, descricao, duracao_minutos, preco } = req.body;
  if (!nome || !preco || !duracao_minutos) return res.status(400).json({ erro: 'nome, preco e duracao_minutos são obrigatórios' });
  const result = db.prepare('INSERT INTO servicos (nome, descricao, duracao_minutos, preco) VALUES (?, ?, ?, ?)').run(nome, descricao || null, duracao_minutos, preco);
  res.status(201).json({ id: result.lastInsertRowid, nome, descricao, duracao_minutos, preco });
});

router.put('/:id', verificarToken, apenasAdmin, (req, res) => {
  const { nome, descricao, duracao_minutos, preco, ativo } = req.body;
  db.prepare('UPDATE servicos SET nome = ?, descricao = ?, duracao_minutos = ?, preco = ?, ativo = ? WHERE id = ?')
    .run(nome, descricao, duracao_minutos, preco, ativo !== undefined ? ativo : 1, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', verificarToken, apenasAdmin, (req, res) => {
  db.prepare('UPDATE servicos SET ativo = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
