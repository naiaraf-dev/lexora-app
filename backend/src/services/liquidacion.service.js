const fail = (mensaje) => { throw Object.assign(new Error(mensaje), { status: 400, mensaje }); };

// Pesos con 2 decimales → centavos enteros, para sumar y comparar sin errores de punto flotante.
function centavos(valor, campo) {
 const n = Number(valor ?? 0);
 if (typeof valor === 'boolean' || !Number.isFinite(n) || n < 0) fail(`${campo} inválido`);
 const c = Math.round(n * 100);
 if (Math.abs(n * 100 - c) > 0.000001) fail(`${campo} debe tener como máximo 2 decimales`);
 if (!Number.isSafeInteger(c)) fail(`${campo} es demasiado grande`);
 return c;
}

function fechaISO(v, campo) {
 if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v))) fail(`${campo}: usar YYYY-MM-DD`);
 const d = new Date(`${v}T00:00:00Z`);
 if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) fail(`${campo} inválida`);
 return v;
}

// Los intereses los ingresa el abogado (por ejemplo, desde la calculadora del CPACF):
// el sistema no aplica ninguna fórmula. Solo verifica el desglose y que
// capital + intereses + otros = total. La tasa vigente queda como referencia (tasa_valor).
function validarDesglose(d) {
 const capital = centavos(d.capital, 'capital');
 const intereses = centavos(d.intereses, 'intereses');
 const otros = centavos(d.otros ?? 0, 'otros');
 const suma = capital + intereses + otros;
 if (d.total !== undefined && d.total !== null && centavos(d.total, 'total') !== suma) {
  fail('El total no coincide con capital + intereses + otros');
 }
 if (!Number.isInteger(Number(d.tasa)) || Number(d.tasa) <= 0) fail('tasa inválida');
 const tasaValor = d.tasa_valor === undefined || d.tasa_valor === null || d.tasa_valor === ''
  ? null : Number(d.tasa_valor);
 if (tasaValor !== null && !Number.isFinite(tasaValor)) fail('tasa_valor inválido');
 const desde = fechaISO(d.fecha_desde, 'fecha_desde');
 const hasta = fechaISO(d.fecha_hasta, 'fecha_hasta');
 if (desde > hasta) fail('Rango de fechas inválido');
 return {
  capital: capital / 100, intereses: intereses / 100, otros: otros / 100, total: suma / 100,
  tasa: Number(d.tasa), tasa_valor: tasaValor, fecha_desde: desde, fecha_hasta: hasta
 };
}

// POST /api/previsiones/calcular: previsualización sin guardar del mismo desglose.
function previsualizar(d) {
 const r = validarDesglose(d ?? {});
 return { ...r, trazabilidad: { origen: 'manual', formula: 'capital + intereses + otros' } };
}

module.exports = { validarDesglose, previsualizar };
