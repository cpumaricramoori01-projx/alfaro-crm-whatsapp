# Activar recepción de WhatsApp

Esta versión recibe y conserva eventos firmados y permite leer mensajes en `/real.html` con una clave privada compartida. No envía respuestas, no descarga multimedia y no implementa usuarios individuales, notas o seguimiento compartido. La bandeja de demostración conserva sus datos ficticios por separado.

## Variables de producción en Vercel

Configurar exclusivamente en `pumas1/alfaro-crm-whatsapp`:

| Variable | De dónde sale |
| --- | --- |
| `WHATSAPP_VERIFY_TOKEN` | Mismo token utilizado al verificar el webhook en Meta. |
| `WHATSAPP_APP_SECRET` | Meta for Developers → app CRM prueba puma → Configuración de la app → Básica → Secreto de la app. |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp → Configuración de API / pruebas → Identificador del número de teléfono; no es el teléfono ni el WABA ID. |
| `UPSTASH_REDIS_REST_URL` | Base Upstash Redis independiente, conectada al CRM desde Vercel Storage/Marketplace. |
| `UPSTASH_REDIS_REST_TOKEN` | Token REST de escritura de esa base. |
| `CRM_INBOX_TOKEN` | Clave aleatoria de al menos 32 caracteres para entrar a la bandeja; diferente del token de Meta. |

Mantener secretos en variables de servidor. No colocarlos en GitHub, el frontend, capturas ni el chat. La base no debe reutilizar credenciales ni datos de la intranet. No utilizar una base temporal que expire ni habilitar expulsión automática de claves: esta base guarda conversaciones. Configurar persistencia y copias de seguridad según el proveedor.

Si conectas Upstash con el prefijo `KV`, la integración crea `KV_REST_API_URL` y `KV_REST_API_TOKEN`. El CRM acepta esa pareja directamente: no hace falta duplicar variables. No utilizar `KV_REST_API_READ_ONLY_TOKEN`, porque el webhook necesita escribir. Si existen ambas parejas completas, se utiliza `UPSTASH_REDIS_REST_*`.

Después de guardar las variables, publicar esta versión de código en Vercel. Un Redeploy del código viejo solo cambia variables; no instala esta implementación.

## Meta y prueba completa

1. URL: `https://alfaro-crm-whatsapp.vercel.app/api/whatsapp-webhook`.
2. Verificar y guardar con el valor de `WHATSAPP_VERIFY_TOKEN`.
3. Cuando la implementación y las variables estén publicadas, suscribir `messages`.
4. Enviar un evento de prueba desde Meta. Debe obtener HTTP 200. Si devuelve 503, la configuración o almacenamiento está pendiente; no se considera entrega completa.
5. Abrir `/real.html` e introducir `CRM_INBOX_TOKEN`; verificar que aparece el mensaje. Actualizar o cargar mensajes anteriores según necesidad. La clave solo permanece en memoria y se borra al cerrar el acceso o recargar.
6. Comprobar un mensaje real con el número de prueba y un destinatario permitido; el Phone Number ID debe coincidir con el configurado. Las pruebas del panel pueden utilizar un ID de ejemplo diferente: el evento se guarda, pero no se mezcla en la bandeja del número seleccionado.
7. Repetir el mismo evento: no debe duplicar mensajes. Conservar actualizaciones de estado en el almacenamiento; todavía no se muestran en esta interfaz.
8. La publicación de la app y el registro del número de empresa son pasos posteriores. Seguir las condiciones que muestra Meta para datos de producción y confirmar coexistencia antes de registrar un número existente.

## Cómo funciona

Valida HMAC SHA-256 de los bytes originales con el secreto de la app; rechaza firmas incorrectas. El almacenamiento Redis usa una transacción para registrar el evento y sus mensajes. Cada ID de mensaje se guarda una sola vez. Si falla el almacenamiento responde 503 para permitir el reintento. Eventos ajenos al Phone Number ID configurado se conservan pero no se muestran.

La API de lectura exige una clave privada y no publica cuerpos originales del webhook. Pagina en lotes de 100 y limita intentos de acceso fallidos. Esta primera etapa usa una clave compartida; una operación con varios agentes necesitará usuarios y permisos individuales. No hay actualización automática: usar Actualizar.

## Validación

`npm run check`, `npm test` y `git diff --check`. Las pruebas cubren firma incorrecta, manipulación, cuerpo original con el getter de Vercel, límite de tamaño, error de almacenamiento, reintentos, filtro por número, acceso privado y paginación. Falta validar contra una base de producción y el despliegue real antes de activar mensajes de clientes.

Fuentes: https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/webhooks/start/ ; https://upstash.com/docs/redis/features/restapi ; https://vercel.com/docs/marketplace-storage
