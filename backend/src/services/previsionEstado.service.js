// Ids fijos de estadoprevision (sección 4): el script de carga respeta este orden.
const ESTADO = Object.freeze({
    REGISTRADO: 1,
    EN_ANALISIS: 2,
    CON_PREVISION: 3,
    LISTO: 4,
    IMPULSADO: 5,
    PAGADO: 6,
    ACREDITADO: 7,
    CERRADO: 8
});

// Nombres de los catálogos con ids fijos, para los textos del historial.
const NOMBRE_ESTADO = Object.freeze({
    1: 'Registrado', 2: 'En análisis', 3: 'Con previsión', 4: 'Listo para impulsar',
    5: 'Impulsado', 6: 'Pagado', 7: 'Acreditado', 8: 'Cerrado'
});

const LIQUIDACION_APROBADA = 4;

function conflicto(mensaje) {
    return Object.assign(new Error(mensaje), { status: 409, mensaje });
}

// Toda acción sobre una previsión cerrada responde 409 (P-29).
function exigirEditable(prevision) {
    if (prevision.estado_prevision === ESTADO.CERRADO) {
        throw conflicto('La previsión está cerrada');
    }
}

// Acciones explícitas: solo se permiten desde ciertos estados (sección 5, columna "Valida").
function exigirEstado(prevision, permitidos, mensaje) {
    exigirEditable(prevision);
    if (!permitidos.includes(prevision.estado_prevision)) throw conflicto(mensaje);
}

// Usar enteros en centavos para no comparar importes decimales con punto flotante.
// Los valores precisos provienen de CAST(DECIMAL AS VARCHAR) en SQL Server.
function aCentavos(valor) {
    const cadena = String(valor).trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(cadena)) {
        throw new Error('Importe monetario inválido recibido de la base de datos');
    }
    const [entero, decimales = ''] = cadena.split('.');
    return BigInt(entero) * 100n + BigInt(decimales.padEnd(2, '0'));
}

// cumpleCondicionesImpulso (sección 6): todas tienen que cumplirse.
async function cumpleCondicionesImpulso(previsionId, previsionRepo, movimientosRepo, tx) {
    const liq = await movimientosRepo.vigente(previsionId, tx);
    if (!liq || liq.estado_liquidacion !== LIQUIDACION_APROBADA) return false;

    // Con un ítem de Honorarios hace falta la factura del profesional.
    const items = await previsionRepo.items(previsionId, tx);
    if (items.some(i => i.conceptoNombre === 'Honorarios') && !(await previsionRepo.getFactura(previsionId, tx))) {
        return false;
    }

    // Con prorrateo aprobado, tiene que estar verificado.
    const prorrateo = await previsionRepo.getProrrateo(previsionId, tx);
    if (prorrateo?.aprobado && !prorrateo.verificado) return false;

    return true;
}

const FORMATO_MONTO = new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2
});
const iso = f => (f ? new Date(f).toISOString().slice(0, 10) : null);
const fechaAR = f => (f ? f.split('-').reverse().join('/') : '—');
// Fecha de hoy (local) en YYYY-MM-DD, para comparar con las columnas DATE.
const hoy = () => new Date().toLocaleDateString('en-CA');

/**
 * Datos que usan marcas y alertas, ya leídos por el service:
 * { items, liquidacionVigente, pagos, acreditaciones, intimaciones, prorrateo, factura, documentacionCompleta }
 * Son funciones puras: no consultan la base, así se pueden probar solas.
 */
function contexto(p, d) {
    const saldo = p.saldo === null ? null : Number(p.saldo);
    const ultimaIntimacion = d.intimaciones[0] ?? null;
    const vencimiento = iso(ultimaIntimacion?.fecha_vencimiento);
    return {
        saldo,
        haySaldo: saldo !== null && saldo > 0,
        tieneHonorarios: d.items.some(i => i.conceptoNombre === 'Honorarios'),
        notificacion: d.acreditaciones.find(a => a.ordena_notificar && a.tareaEstado !== 2) ?? null,
        vencimiento,
        intimacionVencida: !!vencimiento && vencimiento < hoy(),
    };
}

// calcularMarcas (sección 6): los nombres son los que ya usa prevision-detail (MARCA_CLASES).
function calcularMarcas(p, d) {
    const c = contexto(p, d);
    const liq = d.liquidacionVigente;
    const marcas = [];
    if (d.documentacionCompleta) marcas.push('Documentación completa');
    if (d.prorrateo?.aprobado) marcas.push('Con prorrateo art. 730 aplicado');
    if (d.pagos.some(x => x.pagador !== 'CLIENTE')) marcas.push('Pago de tercero informado');
    if (d.pagos.length && c.haySaldo) marcas.push('Pago parcial');
    if (d.factura) marcas.push('Factura cargada');
    if (liq && liq.estado_liquidacion !== LIQUIDACION_APROBADA) marcas.push('Liquidación no firme');
    if (c.notificacion) marcas.push('Notificación pendiente');
    if (p.modo === 'seguimiento' && d.pagos.length && c.haySaldo) marcas.push('Saldo a cargo del cliente');
    // Cuenta la última intimación, y solo mientras quede saldo.
    if (c.vencimiento && c.haySaldo) marcas.push(c.intimacionVencida ? 'Intimación vencida' : 'Intimación vigente');
    return marcas;
}

// calcularAlertas (sección 6) + "Saldo a favor" cuando lo pagado supera el total.
function calcularAlertas(p, d) {
    const c = contexto(p, d);
    const liq = d.liquidacionVigente;
    const alertas = [];
    const alerta = (tipo, titulo, descripcion) => alertas.push({ tipo, titulo, descripcion });

    if (p.estado_prevision === ESTADO.REGISTRADO) {
        alerta('info', 'Obligación sin previsión registrada',
            'Todavía no se registró que el cliente reservó los fondos. Usá "Registrar previsión".');
    }
    if (liq && liq.estado_liquidacion !== LIQUIDACION_APROBADA) {
        alerta('warning', 'Liquidación no firme',
            `La liquidación vigente está "${liq.estadoNombre}". Hasta que quede Aprobada / firme no se puede impulsar el pago.`);
    }
    if (c.tieneHonorarios && !d.factura) {
        alerta('warning', 'Factura de honorarios pendiente',
            'Hay honorarios en la previsión y todavía no se cargó la factura del profesional: sin ella no se puede impulsar.');
    }
    if (d.prorrateo?.aprobado && !d.prorrateo.verificado) {
        alerta('warning', 'Prorrateo sin verificar',
            'El prorrateo del art. 730 está aprobado pero falta verificarlo: guardalo desde la sección Prorrateo.');
    }
    if (d.pagos.length && c.haySaldo) {
        alerta('info', 'Pago parcial con saldo',
            `Se pagaron ${FORMATO_MONTO.format(Number(p.totalPagado))} y queda un saldo de ${FORMATO_MONTO.format(c.saldo)}.`);
    }
    if (c.notificacion) {
        alerta('info', 'Notificación pendiente',
            `El proveído ordenó notificar: cumplí la tarea #${c.notificacion.tarea} en la Agenda para poder cerrar la previsión.`);
    }
    if (c.intimacionVencida && c.haySaldo) {
        alerta('warning', 'Intimación vencida sin pago',
            `La intimación venció el ${fechaAR(c.vencimiento)} y queda saldo: evaluá pedir la ejecución.`);
    }
    const estimada = iso(p.fecha_estimada_pago);
    if (estimada && estimada < hoy() && c.haySaldo) {
        alerta('warning', 'Fecha estimada de pago vencida',
            `La fecha estimada de pago era el ${fechaAR(estimada)} y todavía queda saldo.`);
    }
    if (c.saldo !== null && c.saldo < 0) {
        alerta('info', 'Saldo a favor',
            `Lo pagado supera el total en ${FORMATO_MONTO.format(-c.saldo)}.`);
    }
    return alertas;
}

// Regla 2: en Activo, si cumple las condiciones pasa a Listo para impulsar; si no, Con previsión.
// En Seguimiento queda siempre en Con previsión (el estudio no le pide la plata a nadie).
async function estadoSegunCondiciones(p, previsionRepo, movimientosRepo, tx) {
    if (p.modo !== 'activo') return ESTADO.CON_PREVISION;
    return await cumpleCondicionesImpulso(p.id, previsionRepo, movimientosRepo, tx)
        ? ESTADO.LISTO
        : ESTADO.CON_PREVISION;
}

/**
 * recalcularEstado (sección 6). Se llama después de cualquier escritura.
 * - Registrado, En análisis, Impulsado, Acreditado y Cerrado no cambian solos: los mueve una acción.
 * - Con previsión ↔ Listo para impulsar según la regla 2.
 * - trasPago: saldo ≤ 0 → Pagado; si queda saldo, vuelve a la regla 2 (se impulsa la diferencia).
 * - Pagado con saldo > 0 (por ejemplo, una liquidación nueva mayor) vuelve a la regla 2.
 * Devuelve { anterior, nuevo } para que la acción pueda registrar el cambio.
 */
async function recalcular(previsionId, previsionRepo, movimientosRepo, tx, { trasPago = false } = {}) {
    const p = await previsionRepo.getById(previsionId, tx);
    if (!p) return null;
    const anterior = p.estado_prevision;
    const haySaldo = p.saldo === null || Number(p.saldo) > 0;
    let nuevo = anterior;

    if (trasPago) {
        nuevo = haySaldo
            ? await estadoSegunCondiciones(p, previsionRepo, movimientosRepo, tx)
            : ESTADO.PAGADO;
    } else if (anterior === ESTADO.CON_PREVISION || anterior === ESTADO.LISTO) {
        nuevo = await estadoSegunCondiciones(p, previsionRepo, movimientosRepo, tx);
    } else if (anterior === ESTADO.PAGADO && haySaldo) {
        nuevo = await estadoSegunCondiciones(p, previsionRepo, movimientosRepo, tx);
    }

    if (nuevo !== anterior) {
        await previsionRepo.setEstado(previsionId, nuevo, tx);
    }
    return { anterior, nuevo };
}

module.exports = {
    ESTADO,
    NOMBRE_ESTADO,
    LIQUIDACION_APROBADA,
    formatoMonto: v => FORMATO_MONTO.format(Number(v)),
    exigirEditable,
    exigirEstado,
    recalcular,
    calcularMarcas,
    calcularAlertas,
    aCentavos
};
