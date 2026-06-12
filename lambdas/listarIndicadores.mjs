// ============================================================
//  Lambda: listarIndicadores
//  Ruta:   GET /indicadores
//  Devuelve todos los ítems de la tabla "Indicadores", agrupados
//  por su campo "tipo" para que el frontend los consuma directo.
// ============================================================

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME || "Indicadores";

const respuesta = (statusCode, data) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify(data),
});

export const handler = async () => {
  try {
    const items = [];
    let lastKey;

    do {
      const { Items, LastEvaluatedKey } = await ddb.send(
        new ScanCommand({ TableName: TABLE, ExclusiveStartKey: lastKey })
      );
      items.push(...(Items || []));
      lastKey = LastEvaluatedKey;
    } while (lastKey);

    const agrupado = {
      stats: [],
      estados: [],
      areas: [],
      tiposExpediente: [],
      evolucion: [],
      abogados: [],
      vencimientos: [],
    };

    for (const item of items) {
      switch (item.tipo) {
        case "stat":           agrupado.stats.push(item); break;
        case "estado":         agrupado.estados.push(item); break;
        case "area":           agrupado.areas.push(item); break;
        case "tipoExpediente": agrupado.tiposExpediente.push(item); break;
        case "evolucion":      agrupado.evolucion.push(item); break;
        case "abogado":        agrupado.abogados.push(item); break;
        case "vencimiento":    agrupado.vencimientos.push(item); break;
      }
    }

    // Ordenar la evolución mensual por el campo "orden".
    agrupado.evolucion.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

    return respuesta(200, agrupado);
  } catch (err) {
    console.error("Error en listarIndicadores:", err);
    return respuesta(500, { error: "Error interno al listar los indicadores" });
  }
};