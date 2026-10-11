# Alfaro · Consola WhatsApp

CRM independiente de prueba para consultas inmobiliarias. Esta versión utiliza **datos simulados** y guarda los cambios en el navegador. No está conectada a WhatsApp, no envía mensajes reales y no comparte datos con la intranet.

## Probar

Requiere Node.js 20 o superior. No requiere instalar dependencias.

```sh
npm run dev
```

Abrir http://localhost:3100. `npm test` valida la lógica y `npm run check` comprueba la sintaxis. Para otro puerto: `PORT=3200 npm run dev`.

## Funciones

- Bandeja, búsqueda por nombre/teléfono/propiedad y filtros de pendientes.
- Conversaciones con respuestas simuladas y mensajes entrantes de prueba.
- Estados del interesado, responsable, notas internas y próxima visita.
- Alta de contactos, vista de seguimiento y bienvenida automática de prueba.
- Exportación JSON y reinicio de los datos de demostración.
- Panel de conexión que distingue las tareas pendientes de una conexión real.
- Catálogo público de https://www.inmobiliariaalbertoalfaro.com.pe/ y vinculación de la propiedad de interés.
- Origen de consulta: Web, Facebook o WhatsApp directo. Facebook indicado: https://www.facebook.com/share/19gTtbJboX/.

El servidor local y la función de Vercel consultan la fuente pública mediante `/api/catalog`. Si no responde, la interfaz utiliza `dist/catalog.json`, una copia fechada de los campos públicos del catálogo. La publicación estática original de Sites utiliza esa copia. En Vercel, la función consulta el catálogo actual y permite una caché de cinco minutos, con hasta diez minutos adicionales mientras se revalida. La web no devuelve cabeceras CORS para acceder directamente desde otro dominio, por eso se consulta desde el backend.

Etiquetar un contacto con «Facebook» no conecta Messenger ni determina automáticamente el origen de un WhatsApp. La atribución requiere información del anuncio, un enlace o un mensaje identificable.

## Desplegar en Vercel

Importar el repositorio privado `cpumaricramoori01-projx/alfaro-crm-whatsapp` en un proyecto nuevo. Usar la raíz del repositorio, sin subcarpetas. `vercel.json` configura automáticamente Framework «Other», salida `dist` y comprobaciones de código antes de publicar. No se requieren variables de entorno para esta demostración ni para el catálogo público. No vincular este directorio al proyecto de la intranet.

El despliegue publica la interfaz y `/api/catalog`; los chats continúan siendo simulados y almacenados en el navegador. Al cambiar de dominio, los datos locales de la prueba anterior no se trasladan automáticamente.

Los datos permanecen en este navegador; no hay usuarios, servidor de datos ni sincronización entre dispositivos. No usar esta demostración para almacenar conversaciones reales.

## Conexión real: siguiente etapa

Para probar el número personal que ya usa WhatsApp Business, confirmar primero la elegibilidad del flujo oficial de coexistencia de Meta. El acceso a Facebook por sí solo no garantiza la habilitación. No registrar el número con un flujo de migración sin verificar qué sucede con la app móvil.

Documentación: https://developers.facebook.com/docs/whatsapp/embedded-signup/custom-flows/onboarding-business-app-users/

La integración requiere backend autenticado, almacenamiento duradero, recepción de webhooks con verificación de firma, deduplicación por identificador de mensaje, cola de envíos y control de las reglas de mensajería de Meta. Los tokens y el secreto de la aplicación deben permanecer en el servidor. La API y el webhook no están implementados en esta versión.

El CRM y la intranet pueden alojarse en cuentas GitHub diferentes. Una futura API autorizada puede permitir consultar las propiedades de la intranet; no se deben compartir sus credenciales de base de datos.
