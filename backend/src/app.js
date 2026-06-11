const express = require('express');
const cors = require('cors');

const { sql, conectarBD } = require('./config/db');
const documentosRoutes = require('./routes/documentos.routes');
const tareasRoutes = require('./routes/tareas.routes');

const app = express();

const expedientesRouter = require('./routes/expedientes.routes');
const novedadesRouter   = require('./routes/novedades.routes');

app.use(cors());
app.use(express.json());
app.use('/api', documentosRoutes);
app.use('/api', tareasRoutes);


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
    Expedientes y novedades
*/

app.use('/api/expedientes', expedientesRouter);
app.use('/api/novedades',   novedadesRouter);

/*
    TIPO CLIENTE
*/

app.get('/api/enums/tipocliente', async (req, res) => {
    try {
        const pool = await conectarBD();

        const resultado = await pool.request().query(`
            SELECT id, nombre
            FROM tipocliente
            ORDER BY nombre
        `);

        res.json(resultado.recordset);
    } catch (error) {
        res.status(500).json({
            mensaje: 'Error al obtener tipos de cliente',
            error: error.message
        });
    }
});

app.post('/api/enums/tipocliente', async (req, res) => {
    try {
        const { nombre } = req.body;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({
                mensaje: 'El nombre es obligatorio'
            });
        }

        const pool = await conectarBD();

        const resultado = await pool.request()
            .input('nombre', sql.NVarChar(50), nombre.trim())
            .query(`
                INSERT INTO tipocliente (nombre)
                OUTPUT INSERTED.id, INSERTED.nombre
                VALUES (@nombre)
            `);

        res.status(201).json(resultado.recordset[0]);
    } catch (error) {
        res.status(500).json({
            mensaje: 'Error al crear tipo de cliente',
            error: error.message
        });
    }
});


/*
    ROL CLIENTE
*/

app.get('/api/enums/rolcliente', async (req, res) => {
    try {
        const pool = await conectarBD();

        const resultado = await pool.request().query(`
            SELECT id, nombre
            FROM rolcliente
            ORDER BY nombre
        `);

        res.json(resultado.recordset);
    } catch (error) {
        res.status(500).json({
            mensaje: 'Error al obtener roles de cliente',
            error: error.message
        });
    }
});

app.post('/api/enums/rolcliente', async (req, res) => {
    try {
        const { nombre } = req.body;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({
                mensaje: 'El nombre es obligatorio'
            });
        }

        const pool = await conectarBD();

        const resultado = await pool.request()
            .input('nombre', sql.NVarChar(50), nombre.trim())
            .query(`
                INSERT INTO rolcliente (nombre)
                OUTPUT INSERTED.id, INSERTED.nombre
                VALUES (@nombre)
            `);

        res.status(201).json(resultado.recordset[0]);
    } catch (error) {
        res.status(500).json({
            mensaje: 'Error al crear rol de cliente',
            error: error.message
        });
    }
});


/*
    ROL USUARIO
*/

app.get('/api/enums/rolusuario', async (req, res) => {
    try {
        const pool = await conectarBD();

        const resultado = await pool.request().query(`
            SELECT id, nombre
            FROM rolusuario
            ORDER BY nombre
        `);

        res.json(resultado.recordset);
    } catch (error) {
        res.status(500).json({
            mensaje: 'Error al obtener roles de usuario',
            error: error.message
        });
    }
});

app.post('/api/enums/rolusuario', async (req, res) => {
    try {
        const { nombre } = req.body;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({
                mensaje: 'El nombre es obligatorio'
            });
        }

        const pool = await conectarBD();

        const resultado = await pool.request()
            .input('nombre', sql.NVarChar(50), nombre.trim())
            .query(`
                INSERT INTO rolusuario (nombre)
                OUTPUT INSERTED.id, INSERTED.nombre
                VALUES (@nombre)
            `);

        res.status(201).json(resultado.recordset[0]);
    } catch (error) {
        res.status(500).json({
            mensaje: 'Error al crear rol de usuario',
            error: error.message
        });
    }
});


/*
    TIPO EXPEDIENTE
*/

app.get('/api/enums/tipoexpediente', async (req, res) => {
    try {
        const pool = await conectarBD();

        const resultado = await pool.request().query(`
            SELECT id, nombre
            FROM tipoexpediente
            ORDER BY nombre
        `);

        res.json(resultado.recordset);
    } catch (error) {
        res.status(500).json({
            mensaje: 'Error al obtener tipos de expediente',
            error: error.message
        });
    }
});

app.post('/api/enums/tipoexpediente', async (req, res) => {
    try {
        const { nombre } = req.body;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({
                mensaje: 'El nombre es obligatorio'
            });
        }

        const pool = await conectarBD();

        const resultado = await pool.request()
            .input('nombre', sql.NVarChar(50), nombre.trim())
            .query(`
                INSERT INTO tipoexpediente (nombre)
                OUTPUT INSERTED.id, INSERTED.nombre
                VALUES (@nombre)
            `);

        res.status(201).json(resultado.recordset[0]);
    } catch (error) {
        res.status(500).json({
            mensaje: 'Error al crear tipo de expediente',
            error: error.message
        });
    }
});


/*
    TIPO DOCUMENTO
*/

app.get('/api/enums/tipodocumento', async (req, res) => {
    try {
        const pool = await conectarBD();

        const resultado = await pool.request().query(`
            SELECT id, nombre
            FROM tipodocumento
            ORDER BY nombre
        `);

        res.json(resultado.recordset);
    } catch (error) {
        res.status(500).json({
            mensaje: 'Error al obtener tipos de documento',
            error: error.message
        });
    }
});

app.post('/api/enums/tipodocumento', async (req, res) => {
    try {
        const { nombre } = req.body;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({
                mensaje: 'El nombre es obligatorio'
            });
        }

        const pool = await conectarBD();

        const resultado = await pool.request()
            .input('nombre', sql.NVarChar(50), nombre.trim())
            .query(`
                INSERT INTO tipodocumento (nombre)
                OUTPUT INSERTED.id, INSERTED.nombre
                VALUES (@nombre)
            `);

        res.status(201).json(resultado.recordset[0]);
    } catch (error) {
        res.status(500).json({
            mensaje: 'Error al crear tipo de documento',
            error: error.message
        });
    }
});


/*
    TIPO NOVEDAD
*/

app.get('/api/enums/tiponovedad', async (req, res) => {
    try {
        const pool = await conectarBD();

        const resultado = await pool.request().query(`
            SELECT id, nombre
            FROM tiponovedad
            ORDER BY nombre
        `);

        res.json(resultado.recordset);
    } catch (error) {
        res.status(500).json({
            mensaje: 'Error al obtener tipos de novedad',
            error: error.message
        });
    }
});

app.post('/api/enums/tiponovedad', async (req, res) => {
    try {
        const { nombre } = req.body;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({
                mensaje: 'El nombre es obligatorio'
            });
        }

        const pool = await conectarBD();

        const resultado = await pool.request()
            .input('nombre', sql.NVarChar(50), nombre.trim())
            .query(`
                INSERT INTO tiponovedad (nombre)
                OUTPUT INSERTED.id, INSERTED.nombre
                VALUES (@nombre)
            `);

        res.status(201).json(resultado.recordset[0]);
    } catch (error) {
        res.status(500).json({
            mensaje: 'Error al crear tipo de novedad',
            error: error.message
        });
    }
});


/*
    ESTADO TAREA
*/

app.get('/api/enums/estadotarea', async (req, res) => {
    try {
        const pool = await conectarBD();

        const resultado = await pool.request().query(`
            SELECT id, nombre
            FROM estadotarea
            ORDER BY nombre
        `);

        res.json(resultado.recordset);
    } catch (error) {
        res.status(500).json({
            mensaje: 'Error al obtener estados de tarea',
            error: error.message
        });
    }
});

app.post('/api/enums/estadotarea', async (req, res) => {
    try {
        const { nombre } = req.body;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({
                mensaje: 'El nombre es obligatorio'
            });
        }

        const pool = await conectarBD();

        const resultado = await pool.request()
            .input('nombre', sql.NVarChar(50), nombre.trim())
            .query(`
                INSERT INTO estadotarea (nombre)
                OUTPUT INSERTED.id, INSERTED.nombre
                VALUES (@nombre)
            `);

        res.status(201).json(resultado.recordset[0]);
    } catch (error) {
        res.status(500).json({
            mensaje: 'Error al crear estado de tarea',
            error: error.message
        });
    }
});


/*
    ESTADO EXPEDIENTE
*/

app.get('/api/enums/estadoexpediente', async (req, res) => {
    try {
        const pool = await conectarBD();

        const resultado = await pool.request().query(`
            SELECT id, nombre
            FROM estadoexpediente
            ORDER BY nombre
        `);

        res.json(resultado.recordset);
    } catch (error) {
        res.status(500).json({
            mensaje: 'Error al obtener estados de expediente',
            error: error.message
        });
    }
});

app.post('/api/enums/estadoexpediente', async (req, res) => {
    try {
        const { nombre } = req.body;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({
                mensaje: 'El nombre es obligatorio'
            });
        }

        const pool = await conectarBD();

        const resultado = await pool.request()
            .input('nombre', sql.NVarChar(50), nombre.trim())
            .query(`
                INSERT INTO estadoexpediente (nombre)
                OUTPUT INSERTED.id, INSERTED.nombre
                VALUES (@nombre)
            `);

        res.status(201).json(resultado.recordset[0]);
    } catch (error) {
        res.status(500).json({
            mensaje: 'Error al crear estado de expediente',
            error: error.message
        });
    }
});


/*
    PRIORIDAD
*/

app.get('/api/enums/prioridad', async (req, res) => {
    try {
        const pool = await conectarBD();

        const resultado = await pool.request().query(`
            SELECT id, nombre
            FROM prioridad
            ORDER BY nombre
        `);

        res.json(resultado.recordset);
    } catch (error) {
        res.status(500).json({
            mensaje: 'Error al obtener prioridades',
            error: error.message
        });
    }
});

app.post('/api/enums/prioridad', async (req, res) => {
    try {
        const { nombre } = req.body;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({
                mensaje: 'El nombre es obligatorio'
            });
        }

        const pool = await conectarBD();

        const resultado = await pool.request()
            .input('nombre', sql.NVarChar(50), nombre.trim())
            .query(`
                INSERT INTO prioridad (nombre)
                OUTPUT INSERTED.id, INSERTED.nombre
                VALUES (@nombre)
            `);

        res.status(201).json(resultado.recordset[0]);
    } catch (error) {
        res.status(500).json({
            mensaje: 'Error al crear prioridad',
            error: error.message
        });
    }
});

module.exports = app;