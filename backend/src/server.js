require('dotenv').config();

const app = require('./app');
const { conectarBD } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function iniciarServidor() {
    try {
        await conectarBD();

        app.listen(PORT, () => {
            console.log(`Servidor corriendo en puerto ${PORT}`);
        });
    } catch (error) {
        console.error(
            'No se pudo iniciar el servidor:',
            error.message
        );
    }
}

iniciarServidor();