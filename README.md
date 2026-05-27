# Bot de WhatsApp Personalizado (Vía Escaneo de Código QR)

Este proyecto es una solución basada 100% en código utilizando Node.js. Permite conectar tu cuenta de WhatsApp (personal o comercial) directamente con tu **Google Sheets**, **saltándonos por completo a Meta Developers y SendPulse**. 

Para conectar el bot, solo tendrás que escanear un **código QR** desde tu celular, igual que cuando abres WhatsApp Web.

---

## 🛠️ Requisitos Previos

Solo necesitas configurar una cosa para que el bot pueda escribir en tu hoja de cálculo:

1. **Google Cloud Console:** Para permitir que tu código escriba de forma segura en tu Google Sheets.

---

## 📋 Guía de Configuración Paso a Paso

### Paso 1: Configurar Google Sheets (API de Google)
El código utiliza una "Cuenta de Servicio" de Google para escribir de forma segura en tu Excel sin pedir contraseñas.

1. Ve a [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un proyecto nuevo (ej. `bot-whatsapp-sheets`).
3. Ve a **API y Servicios** > **Biblioteca** y busca **Google Sheets API**. Haz clic en **Habilitar**.
4. Ve a la pestaña **Credenciales** (a la izquierda) > haz clic en **+ Crear Credenciales** > selecciona **Cuenta de servicio**.
5. Ponle un nombre (ej. `bot-writer`) y dale a **Crear y continuar**. No necesitas darle roles, haz clic en **Listo**.
6. En la lista de cuentas de servicio, haz clic en la que acabas de crear.
7. Ve a la pestaña **Claves** (arriba) > haz clic en **Agregar clave** > **Crear clave nueva** > Selecciona **JSON** y descárgala.
8. **Importante:**
   - Cambia el nombre del archivo descargado a `google-credentials.json`.
   - Mueve ese archivo a la carpeta raíz de este proyecto.
   - Abre el archivo JSON y copia el campo `client_email` (ej: `bot-writer@mi-proyecto.iam.gserviceaccount.com`).
   - Abre tu Google Sheets real, haz clic en **Compartir** y agrega ese correo como **Editor**. (Si no compartes el Sheets con la cuenta de servicio, el código dará error de permisos).

---

### Paso 2: Configurar las Variables de Entorno (`.env`)
1. Crea un archivo llamado `.env` en la raíz de este proyecto (puedes duplicar el `.env.example`).
2. Rellena los campos con la información de tu Google Sheets:
   ```env
   PORT=3000
   SPREADSHEET_ID=el_id_de_tu_google_sheets
   SHEET_NAME=Hoja 1
   ```

*Nota: Los campos de Meta (`META_ACCESS_TOKEN`, etc.) ya no son necesarios en este método, los puedes borrar.*

---

### Paso 3: Ejecutar el Bot Localmente e Iniciar Sesión

1. Abre tu terminal o consola en la carpeta de este proyecto:
   `C:\Users\pract\.gemini\antigravity\scratch\custom-whatsapp-bot`
2. Instala las librerías necesarias ejecutando:
   ```bash
   npm install
   ```
3. Inicia el bot ejecutando:
   ```bash
   npm run start
   ```
4. Espera unos segundos. Verás aparecer un **Código QR hecho de texto** en tu terminal.
5. Abre WhatsApp en tu teléfono celular, ve a **Dispositivos Vinculados** > **Vincular un dispositivo** y escanea el código QR de la pantalla.
6. Una vez escaneado, la consola dirá: `✅ ¡Cliente de WhatsApp Web conectado exitosamente!`.

---

## 🚀 Despliegue en Internet (Opcional)

Si quieres que el bot funcione 24/7 sin tener tu computadora encendida:

1. Puedes subir este código a tu cuenta de **GitHub** (repositorio privado).
2. Crear un servicio web en **Render.com** conectado a ese repositorio de GitHub.
3. **Comando de inicio (Start):** `npm start`
4. Cargar las variables de tu archivo `.env` en la sección de variables de entorno de Render.
5. Dado que la librería usa un navegador virtual (Puppeteer) para iniciar sesión, en la configuración de Render deberás agregar la dependencia de Chromium (en Render esto se configura automáticamente en sus entornos de Node.js).
