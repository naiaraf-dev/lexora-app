const repo = require('../repositories/clientes.repository');

// campos editables del cliente, con el nombre legible que se usa en el log
const CAMPOS_EDITABLES = {
    nombre: 'nombre',
    apellido: 'apellido',
    email: 'email',
    telefono: 'teléfono',
    dni: 'DNI',
    cuit: 'CUIT',
    activo: 'estado',
    direccion: 'dirección',
    observaciones: 'observaciones',
    fecha_nacimiento: 'fecha de nacimiento',
    tipo_cliente: 'tipo de cliente',
    rol_cliente: 'rol de cliente',
};

// trae todos los clientes desde el repo
async function getAll() {
    return repo.getAll();
}

// busca un cliente por id y valida que exista
async function getById(id) {
    const cliente = await repo.getById(id);
    if (!cliente) throw new Error('Cliente no encontrado');
    return cliente;
}

// valida los datos obligatorios y crea el cliente
async function create(datos) {
    const esJuridica = Number(datos.tipo_cliente) === 2;

    if (!datos.nombre?.trim()) {
        throw new Error(esJuridica ? 'La razón social es obligatoria' : 'El nombre es obligatorio');
    }
    if (!esJuridica && !datos.apellido?.trim()) {
        throw new Error('El apellido es obligatorio');
    }
    return repo.create(datos);
}

// valida los datos, actualiza el cliente y controla que exista
// devuelve el cliente actualizado y la lista de campos que cambiaron (para el log)
async function update(id, datos) {
    const esJuridica = Number(datos.tipo_cliente) === 2;

    if (!datos.nombre?.trim()) {
        throw new Error(esJuridica ? 'La razón social es obligatoria' : 'El nombre es obligatorio');
    }
    if (!esJuridica && !datos.apellido?.trim()) {
        throw new Error('El apellido es obligatorio');
    }

    const anterior = await getById(id);
    const actualizado = await repo.update(id, datos);
    if (!actualizado) throw new Error('Cliente no encontrado');
    return { cliente: actualizado, camposModificados: camposModificados(anterior, actualizado) };
}

// da de baja logica al cliente; devuelve el cliente como quedo
async function darDeBaja(id) {
    const cliente = await getById(id);
    if (!cliente.activo) throw new Error('El cliente ya está dado de baja');
    const actualizado = await repo.darDeBaja(id);
    if (!actualizado) throw new Error('Cliente no encontrado');
    return actualizado;
}

// compara el cliente antes y despues de editar y devuelve los nombres de los campos que cambiaron
// no devuelve los valores para no dejar datos personales en el log
function camposModificados(anterior, actualizado) {
    return Object.entries(CAMPOS_EDITABLES)
        .filter(([campo]) => normalizar(anterior[campo]) !== normalizar(actualizado[campo]))
        .map(([, etiqueta]) => etiqueta);
}

// deja los valores en un formato comparable (null, fechas, bits)
function normalizar(valor) {
    if (valor === null || valor === undefined || valor === '') return null;
    if (valor instanceof Date) return valor.getTime();
    return String(valor);
}

module.exports = { getAll, getById, create, update, darDeBaja };
