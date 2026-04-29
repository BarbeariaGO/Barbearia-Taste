const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'barbearia_secret_2024';

function gerarToken(usuario) {
  return jwt.sign({ id: usuario.id, email: usuario.email, role: usuario.role }, SECRET, { expiresIn: '24h' });
}

function verificarToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ erro: 'Token não fornecido' });
  const token = header.split(' ')[1];
  try {
    req.usuario = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido' });
  }
}

function apenasAdmin(req, res, next) {
  if (req.usuario?.role !== 'admin') return res.status(403).json({ erro: 'Acesso negado' });
  next();
}

module.exports = { gerarToken, verificarToken, apenasAdmin };
