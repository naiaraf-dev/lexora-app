require('dotenv').config();

const app = require('./app');
const { conectarBD } = require('./config/db');
const resumenesJob = require('./jobs/resumenes.job');

const PORT = process.env.PORT || 5000;

async function iniciarServidor() {
    try {
        await conectarBD();

        app.listen(PORT, () => {
            console.log(`Servidor corriendo en puerto ${PORT}`);
        });

        // resumen de documentos con IA en segundo plano (HU42)
        resumenesJob.iniciar();
    } catch (error) {
        console.error(
            'No se pudo iniciar el servidor:',
            error.message
        );
    }
}

iniciarServidor();