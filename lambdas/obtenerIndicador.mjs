// ============================================================
//  Lambda: obtenerIndicador
//  Ruta:   GET /indicadores/{id}
// ============================================================

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

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

export const handler = async (event) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) {
      return respuesta(400, { error: "Falta el id en la ruta" });
    }

    const { Item } = await ddb.send(
      new GetCommand({ TableName: TABLE, Key: { id } })
    );

    if (!Item) {
      return respuesta(404, { error: `No existe el indicador ${id}` });
    }

    return respuesta(200, Item);
  } catch (err) {
    console.error("Error en obtenerIndicador:", err);
    return respuesta(500, { error: "Error interno al obtener el indicador" });
  }
};