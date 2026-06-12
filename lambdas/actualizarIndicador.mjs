// ============================================================
//  Lambda: actualizarIndicador
//  Ruta:   PUT /indicadores/{id}
// ============================================================

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

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
    if (!event.body) {
      return respuesta(400, { error: "El cuerpo de la petición está vacío" });
    }

    const cambios = JSON.parse(event.body);

    const { Item: existente } = await ddb.send(
      new GetCommand({ TableName: TABLE, Key: { id } })
    );

    if (!existente) {
      return respuesta(404, { error: `No existe el indicador ${id}` });
    }

    const actualizado = { ...existente, ...cambios, id };

    await ddb.send(new PutCommand({ TableName: TABLE, Item: actualizado }));

    return respuesta(200, actualizado);
  } catch (err) {
    console.error("Error en actualizarIndicador:", err);
    if (err instanceof SyntaxError) {
      return respuesta(400, { error: "El cuerpo no es un JSON válido" });
    }
    return respuesta(500, { error: "Error interno al actualizar el indicador" });
  }
};