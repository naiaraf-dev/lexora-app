const tasasRepository =
    require('../repositories/tasas.repository');


// ============================================================
// OBTENER TASA ACTUAL
// ============================================================

async function obtenerTasaActual(
    nombre
) {

    if (
        !nombre ||
        typeof nombre !== 'string' ||
        !nombre.trim()
    ) {

        const error =
            new Error(
                'Debe indicar el nombre de la tasa'
            );

        error.statusCode =
            400;

        throw error;
    }


    const tasa =
        await tasasRepository
            .obtenerTasaActualPorNombre(
                nombre.trim()
            );


    /*
     * Algunas opciones del CPACF son calculadoras
     * y no tienen una serie "fecha / valor".
     *
     * Ejemplo: indemnizaciones.
     */
    if (
        tasa.valor === null ||
        tasa.fecha === null
    ) {

        const error =
            new Error(
                'La opción solicitada no posee un último valor de tasa disponible'
            );

        error.statusCode =
            422;

        throw error;
    }


    return tasa;
}


module.exports = {
    obtenerTasaActual
};