const express = require('express');
const bodyParser = require('body-parser');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// Reemplaza la ruta del archivo de credenciales con la tuya
const creds = require('C:/Users/Francisco/Desktop/Proyecto/intricate-reef-405412-3b426484db79.json');

// Reemplaza '1FfulbVJFlyimR8A2rIb5r3EFIdvKtQsXLLaOz1FjIHk' con la ID real de tu hoja de Google Sheets
const sheetId = '1FfulbVJFlyimR8A2rIb5r3EFIdvKtQsXLLaOz1FjIHk';

app.post('/webhook', async (req, res) => {
  const userMessage = req.body.message;

  console.log('Mensaje del usuario:', userMessage);

  // Lógica de tu chatbot va aquí
  const botResponse = await getBotResponse(userMessage);

  console.log('Respuesta del bot:', botResponse);

  // Log a Google Sheets
  logToGoogleSheet(userMessage, botResponse);

  res.json({ botResponse });
});

async function logToGoogleSheet(userMessage, botResponse) {
  try {
    const doc = new GoogleSpreadsheet(sheetId);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];

    console.log('Respuesta obtenida de Google Sheets:', botResponse);

    await sheet.addRow({ UserInput: userMessage, BotResponse: botResponse });
  } catch (error) {
    console.error('Error al registrar en Google Sheets:', error);
  }
}

function formatBotResponse(response) {
  // Aplicar formato de negrita y cursiva según las indicaciones
  const boldRegex = /\*(.*?)\*/g;
  response = response.replace(boldRegex, '<strong>$1</strong>');

  const italicRegex = /```(.*?)```/g;
  response = response.replace(italicRegex, '<i>$1</i>');

  // Reemplazar saltos de línea con la etiqueta <br>
  response = response.replace(/\n/g, '<br>');

  return response;
}

async function getBotResponse(userMessage) {
  try {
    const doc = new GoogleSpreadsheet(sheetId);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];

    // Aumenta el número de filas a recuperar
    const rows = await sheet.getRows({ limit: 1000 }); // Puedes ajustar el límite según tus necesidades

    let matchedRow;

    for (const row of rows) {
      const keywords = row.UserInput.toLowerCase().split(',').map(keyword => keyword.trim());
      const priority = row.Priority === '2';

      if (keywords.some(keyword => {
        const keywordArray = keyword.split(' ').map(kw => kw.trim());
        return keywordArray.every(kw => userMessage.toLowerCase().includes(kw));
      }) && !keywords.some(keyword => keyword.endsWith(', ') || keyword.endsWith(',') || keyword.endsWith(' '))) {
        if (priority) {
          matchedRow = row;
          break;
        } else {
          if (keywords.includes(userMessage.toLowerCase())) {
            matchedRow = row;
            break;
          }
        }
      }
    }

    if (matchedRow) {
      return formatBotResponse(matchedRow.BotResponse);
    } else {
      return 'Lo siento, no tengo una respuesta para eso.';
    }
  } catch (error) {
    console.error('Error al obtener respuesta desde Google Sheets:', error);
    return 'Ocurrió un error al procesar tu solicitud.';
  }
}

app.listen(port, () => {
  console.log(`El servidor está ejecutándose en http://localhost:${port}`);
});
