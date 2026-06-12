// ============================================================
//  Lambda: borrarIndicador
//  Ruta:   DELETE /indicadores/{id}
// ============================================================

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

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

    await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { id } }));

    return { statusCode: 204, headers: respuesta(204, {}).headers, body: "" };
  } catch (err) {
    console.error("Error en borrarIndicador:", err);
    return respuesta(500, { error: "Error interno al borrar el indicador" });
  }
};