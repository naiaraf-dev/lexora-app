// ============================================================
//  Lambda: crearIndicador
//  Ruta:   POST /indicadores
//  Crea (o sobrescribe) un ítem en la tabla DynamoDB "Indicadores".
//  Sirve para cargar los datos mock que alimentan el tablero.
// ============================================================

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

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
    if (!event.body) {
      return respuesta(400, { error: "El cuerpo de la petición está vacío" });
    }
    const body = JSON.parse(event.body);

    const { tipo } = body;
    if (!tipo) {
      return respuesta(400, { error: "Falta el campo 'tipo'" });
    }

    const item = {
      id: body.id || randomUUID(),
      ...body,
    };

    await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));

    return respuesta(201, item);
  } catch (err) {
    console.error("Error en crearIndicador:", err);
    if (err instanceof SyntaxError) {
      return respuesta(400, { error: "El cuerpo no es un JSON válido" });
    }
    return respuesta(500, { error: "Error interno al crear el indicador" });
  }
};