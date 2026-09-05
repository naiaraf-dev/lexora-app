const express = require('express');
const cors = require('cors');

const { sql, conectarBD } = require('./config/db');

const app = express();

const logsRoutes = require('./routes/logs.routes');
const documentosRoutes = require('./routes/documentos.routes');
const tareasRoutes = require('./routes/tareas.routes');
const authRoutes = require('./routes/auth.routes');
const clientesRoutes = require('./routes/clientes.routes');
const authMiddleware = require('./middlewares/auth.middleware');
const usuariosRoutes = require('./routes/usuarios.routes');
const expedientesRouter = require('./routes/expedientes.routes');
const causasRouter = require('./routes/causa.routes');
const novedadesRouter = require('./routes/novedades.routes');
const enumsRoutes = require('./routes/enums.routes');

app.use(cors());
app.use(express.json());

/*
    PRUEBA DE CONEXIÓN
*/
app.get('/api/health', async (req, res) => {
    try {
        const pool = await conectarBD();

        const resultado = await pool.request().query(`
            SELECT 
                DB_NAME() AS baseDatos,
                SYSTEM_USER AS systemUser,
                USER_NAME() AS databaseUser,
                SUSER_SNAME() AS loginName,
                SYSDATETIME() AS fechaHora
        `);

        res.json({
            mensaje: 'Conexión correcta',
            data: resultado.recordset[0]
        });
    } catch (error) {
        res.status(500).json({
            mensaje: 'Error al conectar con la base de datos',
            error: error.message
        });
    }
});

/*
    USUARIOS
*/
app.use('/api/usuarios', authMiddleware, usuariosRoutes);

/*
    EXPEDIENTES, CAUSAS Y NOVEDADES
*/

app.use('/api/expedientes', expedientesRouter);
app.use('/api/causas', causasRouter);
app.use('/api/novedades', novedadesRouter);

/*
    DOCUMENTOS Y TAREAS
*/
app.use('/api', documentosRoutes);
app.use('/api', tareasRoutes);

/*
    AUTH Y CLIENTES
*/
// Las rutas ya incluyen el path completo (/api/auth/..., /api/clientes/...)
app.use(authRoutes);
app.use(clientesRoutes);

/*
    LOG DE SEGURIDAD
*/
app.use('/api/logs', logsRoutes);

/*
    ENUMS
*/
app.use('/api', enumsRoutes);


module.exports = app;