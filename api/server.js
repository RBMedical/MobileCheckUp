import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { google } from 'googleapis';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const stickerSheetName = process.env.STICKER_SHEET_NAME || 'Sticker';
const spreadsheetId = process.env.GOOGLE_SHEET_ID || '1QclDb5NqKukFDrxN35YP_s2Z_IkH97WvHvrVdUeE-gA';

app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'mobile-checkup-sticker-api' });
});

app.post('/stickers', async (req, res) => {
  try {
    const stickers = Array.isArray(req.body.stickers) ? req.body.stickers : [];
    if (!stickers.length) {
      return res.status(400).json({ ok: false, message: 'ไม่พบข้อมูล stickers' });
    }

    const values = stickers.map((item) => [
      item.barcode || '',
      item.displayName || item['ชื่อ นามสกุล'] || '',
      item['ลำดับลงทะเบียน'] || item.sequence || '',
      item.Customer || item.customer || '',
      item['วันที่ลงทะเบียน'] || item.date || '',
      item.specimen || '',
      item.program || ''
    ]);

    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: `${stickerSheetName}!A:G`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values }
    });

    res.json({ ok: true, inserted: values.length });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

async function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: requireEnv('GOOGLE_CLIENT_EMAIL'),
    key: requireEnv('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  await auth.authorize();
  return google.sheets({ version: 'v4', auth });
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

app.listen(port, () => {
  console.log(`Sticker API listening on port ${port}`);
});
