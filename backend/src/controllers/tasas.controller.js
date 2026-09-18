const tasasService =
    require('../services/tasas.service');


// ============================================================
// GET /api/tasa?nombre=...
// ============================================================

async function obtenerTasa(
    req,
    res
) {

    try {

        const {
            nombre
        } =
            req.query;


        const resultado =
            await tasasService
                .obtenerTasaActual(
                    nombre
                );


        return res.status(200)
            .json(resultado);


    } catch (error) {

        console.error(
            'Error al obtener tasa:',
            error
        );


        const status =
            error.statusCode ??
            error.status ??
            500;


        return res
            .status(status)
            .json({
                error:
                    status === 500
                        ? 'Error al obtener la tasa actualizada'
                        : error.message
            });
    }
}


module.exports = {
    obtenerTasa
};