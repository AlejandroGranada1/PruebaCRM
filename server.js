require('dotenv').config();
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { appendToSheet } = require('./googleSheets');

const app = express();
const PORT = process.env.PORT || 3000;

// Servidor Express básico para mantener vivo el servicio en hostings como Render.com
app.get('/', (req, res) => {
  res.send('🚀 Servidor de WhatsApp Web Bot Activo.');
});

app.listen(PORT, () => {
  console.log(`💻 Monitor del servidor corriendo en puerto ${PORT}`);
});

// Variables de entorno de Google Sheets
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || 'Hoja 1';

// Inicializar el cliente de WhatsApp Web con guardado de sesión automático
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './session-data' // Guarda la sesión en esta carpeta local para no tener que escanear el QR cada vez
  }),
  puppeteer: {
    executablePath: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// Memoria local para gestionar los estados de conversación
const userSessions = {};

// 1. GENERAR CÓDIGO QR EN CONSOLA
client.on('qr', (qr) => {
  console.log('\n------------------------------------------------------------------');
  console.log('▼ ESCANEA ESTE CÓDIGO QR CON TU WHATSAPP (Dispositivos vinculados) ▼');
  console.log('------------------------------------------------------------------\n');
  qrcode.generate(qr, { small: true });
});

// 2. CONEXIÓN EXITOSA
client.on('ready', () => {
  console.log('\n✅ ¡Cliente de WhatsApp Web conectado exitosamente!');
  console.log('Esperando mensajes entrantes...\n');
});

// 3. PROCESAR MENSAJES ENTRANTES
client.on('message_create', async (msg) => {
  try {
    const from = msg.from; // ID de WhatsApp del cliente (ej: '521123456789@c.us')
    const messageText = msg.body?.trim();

    console.log(`🔍 DEBUG: Evento de mensaje detectado desde ${from}. fromMe: ${msg.fromMe}`);

    // Solo procesar chats individuales directos y contactos desde Instagram (@lid)
    if (!from.endsWith('@c.us') && !from.endsWith('@lid')) return;

    // Ignorar si el mensaje es enviado por nosotros mismos desde el teléfono
    if (msg.fromMe) return;

    console.log(`📥 Procesando mensaje de ${from}: "${messageText || '[No es texto]'}"`);

    // Inicializar sesión si es un número nuevo
    if (!userSessions[from]) {
      userSessions[from] = { state: 'NEW' };
    }

    const session = userSessions[from];

    // Si el mensaje no contiene texto válido y ya estamos esperando algún dato
    if ((session.state === 'AWAITING_NAME' || session.state === 'AWAITING_PHONE') && !messageText) {
      await client.sendMessage(from, 'Por favor, escríbenos tu respuesta en forma de texto para poder registrarla.');
      return;
    }

    // MÁQUINA DE ESTADO DEL CHATBOT
    if (session.state === 'NEW') {
      // Primer mensaje
      await client.sendMessage(
        from,
        '¡Hola! 👋 Gracias por escribirnos. Para brindarte una mejor atención, ¿me podrías decir tu nombre completo?'
      );
      session.state = 'AWAITING_NAME';
    } 
    else if (session.state === 'AWAITING_NAME') {
      // Recibimos su nombre
      session.name = messageText;

      await client.sendMessage(
        from,
        `¡Perfecto, ${session.name}! 😊 Ahora, por favor compártenos tu número de celular o WhatsApp para que un asesor pueda contactarte.`
      );
      session.state = 'AWAITING_PHONE';
    }
    else if (session.state === 'AWAITING_PHONE') {
      // Recibimos su celular
      const customerPhone = messageText;

      await client.sendMessage(
        from,
        `¡Gracias! Hemos registrado tus datos exitosamente. En breve uno de nuestros asesores se comunicará contigo.`
      );

      // Guardar en Google Sheets
      const fecha = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
      try {
        await appendToSheet(SPREADSHEET_ID, SHEET_NAME, [fecha, customerPhone, session.name]);
      } catch (sheetsError) {
        console.error('❌ Error al guardar en Google Sheets:', sheetsError.message);
      }

      // Marcar como completado
      session.state = 'COMPLETED';

      // Borrar sesión en 1 hora
      setTimeout(() => {
        delete userSessions[from];
      }, 60 * 60 * 1000);
    } 
    else if (session.state === 'COMPLETED') {
      // El cliente ya está registrado. El bot no interviene y permite la atención humana.
      console.log(`💬 Cliente ${from} en atención humana. Bot inactivo.`);
    }

  } catch (error) {
    console.error('❌ Error al procesar mensaje:', error);
  }
});

// Iniciar cliente de WhatsApp
console.log('🔄 Iniciando cliente de WhatsApp Web, por favor espera...');
client.initialize();
