const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'lexora-dev-secret-changeme';

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ mensaje: 'Token no proporcionado' });

  const token = authHeader.split(' ')[1]; // Bearer <token>
  if (!token) return res.status(401).json({ mensaje: 'Token inválido' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ mensaje: 'Token expirado o inválido' });
  }
}

module.exports = authMiddleware;