require('dotenv').config();
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { appendToSheet, isPhoneRegistered } = require('./googleSheets');

const app = express();
const PORT = process.env.PORT || 3000;

// Servidor Express básico para mantener vivo el servicio
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
    dataPath: './session-data'
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

// 2. CONEXIÓN EXITOSA — Cargar chats existentes y marcarlos como COMPLETED
client.on('ready', async () => {
  console.log('\n✅ ¡Cliente de WhatsApp Web conectado exitosamente!');

  // ---------------------------------------------------------------
  //  CLAVE: Marcar TODOS los chats que ya existen como COMPLETED
  //  para que el bot NO les hable a clientes con conversaciones previas.
  // ---------------------------------------------------------------
  try {
    const chats = await client.getChats();
    let count = 0;
    for (const chat of chats) {
      if (!chat.isGroup) {
        userSessions[chat.id._serialized] = { state: 'COMPLETED' };
        count++;
      }
    }
    console.log(`📋 Se marcaron ${count} conversaciones existentes como ignoradas por el bot.`);
  } catch (e) {
    console.error('⚠️ No se pudieron cargar chats existentes:', e.message);
  }

  console.log('🆕 El bot SOLO responderá a contactos completamente nuevos.');
  console.log('Esperando mensajes entrantes...\n');
});

// 3. PROCESAR MENSAJES ENTRANTES
client.on('message_create', async (msg) => {
  try {
    const from = msg.from;
    const messageText = msg.body?.trim();

    console.log(`🔍 DEBUG: Evento de mensaje detectado desde ${from}. fromMe: ${msg.fromMe}`);

    // Solo procesar chats individuales directos y contactos desde Instagram (@lid)
    if (!from.endsWith('@c.us') && !from.endsWith('@lid')) return;

    // Ignorar mensajes propios
    if (msg.fromMe) return;

    console.log(`📥 Procesando mensaje de ${from}: "${messageText || '[No es texto]'}"`);

    // Inicializar sesión si es un contacto completamente nuevo
    if (!userSessions[from]) {
      userSessions[from] = { state: 'NEW' };
      console.log(`🆕 Contacto nuevo detectado: ${from}`);
    }

    const session = userSessions[from];

    // Si ya está COMPLETED, el bot no interviene (atención humana)
    if (session.state === 'COMPLETED') {
      console.log(`💬 Cliente ${from} ya tiene conversación previa. Bot inactivo.`);
      return;
    }

    // Si el mensaje no contiene texto válido y estamos esperando algún dato
    if ((session.state === 'AWAITING_NAME' || session.state === 'AWAITING_PHONE') && !messageText) {
      await client.sendMessage(from, 'Por favor, escríbenos tu respuesta en forma de texto para poder registrarla.');
      return;
    }

    // ==================== MÁQUINA DE ESTADO ====================

    if (session.state === 'NEW') {
      await client.sendMessage(
        from,
        '¡Hola! 👋 Gracias por escribirnos. Para brindarte una mejor atención, ¿me podrías decir tu nombre completo?'
      );
      session.state = 'AWAITING_NAME';
    }
    else if (session.state === 'AWAITING_NAME') {
      session.name = messageText;
      await client.sendMessage(
        from,
        `¡Perfecto, ${session.name}! 😊 Ahora, por favor compártenos tu número de celular o WhatsApp para que un asesor pueda contactarte.`
      );
      session.state = 'AWAITING_PHONE';
    }
    else if (session.state === 'AWAITING_PHONE') {
      const customerPhone = messageText;

      // Validar que parezca un número de teléfono (al menos 7 dígitos)
      const digitsOnly = customerPhone.replace(/\D/g, '');
      if (digitsOnly.length < 7) {
        await client.sendMessage(
          from,
          'Ese no parece ser un número de teléfono válido. Por favor, escríbenos tu número de celular (solo dígitos, por ejemplo: 3101234567).'
        );
        return; // NO avanza de estado, vuelve a pedir
      }

      // Verificar si ya está registrado en la hoja
      const alreadyExists = await isPhoneRegistered(SPREADSHEET_ID, SHEET_NAME, digitsOnly);
      if (alreadyExists) {
        await client.sendMessage(
          from,
          `¡Hola de nuevo, ${session.name}! Ya tenemos tus datos registrados. Un asesor se comunicará contigo pronto.`
        );
        session.state = 'COMPLETED';
        return;
      }

      // Guardar en Google Sheets
      const fecha = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
      try {
        await appendToSheet(SPREADSHEET_ID, SHEET_NAME, [fecha, digitsOnly, session.name]);
        console.log(`✅ Nuevo contacto guardado: ${session.name} - ${digitsOnly}`);
      } catch (sheetsError) {
        console.error('❌ Error al guardar en Google Sheets:', sheetsError.message);
      }

      await client.sendMessage(
        from,
        `¡Gracias, ${session.name}! Hemos registrado tus datos exitosamente. En breve uno de nuestros asesores se comunicará contigo. 🙌`
      );

      session.state = 'COMPLETED';
    }

  } catch (error) {
    console.error('❌ Error al procesar mensaje:', error);
  }
});

// Iniciar cliente de WhatsApp
console.log('🔄 Iniciando cliente de WhatsApp Web, por favor espera...');
client.initialize();

