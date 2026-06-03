const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,

    options: {
        instanceName: process.env.DB_INSTANCE,
        encrypt: false,
        trustServerCertificate: true
    },

    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let pool;

async function conectarBD() {
    try {
        if (!pool) {
            pool = await sql.connect(config);
            console.log(`Conectado correctamente a la base ${process.env.DB_NAME}`);
        }

        return pool;
    } catch (error) {
        console.error('Error conectando a SQL Server:', error.message);
        throw error;
    }
}

module.exports = {
    sql,
    conectarBD
};