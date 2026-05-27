const { google } = require('googleapis');
const path = require('path');

// Cargar credenciales de la cuenta de servicio de Google
// El archivo 'google-credentials.json' se debe descargar desde Google Cloud Console
const KEY_PATH = path.join(__dirname, 'google-credentials.json');

const auth = new google.auth.GoogleAuth({
  keyFile: KEY_PATH,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

/**
 * Agrega una nueva fila al Google Sheets
 * @param {string} spreadsheetId ID de la hoja de cálculo
 * @param {string} sheetName Nombre de la pestaña (ej: 'Hoja 1' o 'Sheet1')
 * @param {Array} rowValues Array con los valores a agregar (ej: [fecha, celular, nombre])
 */
async function appendToSheet(spreadsheetId, sheetName, rowValues) {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:C`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [rowValues],
      },
    });

    console.log('✅ Fila agregada exitosamente a Google Sheets:', response.data.updates.updatedRange);
    return response.data;
  } catch (error) {
    console.error('❌ Error al escribir en Google Sheets:', error);
    throw error;
  }
}

module.exports = { appendToSheet };
