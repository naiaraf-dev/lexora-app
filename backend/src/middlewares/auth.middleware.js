const jwt = require('jsonwebtoken');

// clave que se usa para firmar y validar los tokens
// saca la del archivo .env
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET no está definido en las variables de entorno');

// middleware que valida que el usuario tenga un token valido antes de entrar a una ruta protegida
function authMiddleware(req, res, next) {
  // busca el header authorization, donde deberia venir el token
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ mensaje: 'Token no proporcionado' });

  // separa el token del formato "Bearer token"
  const token = authHeader.split(' ')[1]; // Bearer <token>
  if (!token) return res.status(401).json({ mensaje: 'Token inválido' });

  try {
    // verifica que el token sea valido y que no haya sido modificado
    const decoded = jwt.verify(token, JWT_SECRET);

    // guarda los datos del usuario en req para poder usarlos despues en los controllers
    req.usuario = decoded;

    // si esta todo bien, deja seguir a la ruta
    next();
  } catch (err) {
    // si el token vencio o no coincide con la clave, corta la request
    return res.status(401).json({ mensaje: 'Token expirado o inválido' });
  }
}

module.exports = authMiddleware;