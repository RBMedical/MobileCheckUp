const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw5mVEpZu41XkUVgCbPnVm2HPsymyW_A7BVYOzt6IesbJ6xRJUtSnvPXKkRwSoHE3GH/exec';


const fields = [
  'HN',
  'ชื่อ นามสกุล',
  'รหัสประจำตัว',
  'เลขบัตรประชาชน',
  'แผนก',
  'ตำแหน่ง',
  'ชั้นปี',
  'สาขา',
  'ห้อง',
  'โปรแกรม',
  'Customer',
  'ลำดับลงทะเบียน',
  'วันที่ลงทะเบียน',
  'เวลาลงทะเบียน'
];

let currentRow = null;
let currentStickers = [];

const $ = (selector) => document.querySelector(selector);

document.addEventListener('DOMContentLoaded', () => {
  loadQueue();
  setInterval(loadQueue,30000);
  lucide.createIcons();
  bindEvents();
});

function bindEvents() {
  $('#searchBtn').addEventListener('click', searchEmployee);
  $('#searchInput').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') searchEmployee();
  });
  $('#editBtn').addEventListener('click', updateEmployee);
  $('#deleteBtn').addEventListener('click', deleteEmployee);
  $('#registerBtn').addEventListener('click', registerEmployee);
  $('#printBtn').addEventListener('click', () => window.print());

  document.querySelectorAll('.menu-item').forEach((button) => {
    button.addEventListener('click', () => switchPage(button.dataset.page));
  });
}

function switchPage(page) {
  document.querySelectorAll('.menu-item').forEach((item) => item.classList.toggle('active', item.dataset.page === page));
  document.querySelectorAll('.page').forEach((item) => item.classList.remove('active'));
  $(`#${page}Page`).classList.add('active');
}

async function searchEmployee() {
  const query = $('#searchInput').value.trim();
  if (!query) return setStatus('กรุณาระบุคำค้นหา', false);

  let result;
  try {
    setStatus('กำลังค้นหา...');
    result = await appScriptRequest({ action: 'search', q: query });
  } catch (error) {
    return setStatus(error.message || 'เชื่อมต่อไม่สำเร็จ', false);
  }

  if (!result.ok) return setStatus(result.message || 'ค้นหาไม่สำเร็จ', false);

  const rows = result.rows || [];

  if (rows.length === 0) {
    clearForm();
    renderResults([]);
    return setStatus('ไม่พบข้อมูลที่ค้นหา', false);
  }

  fillForm(rows[0]);
  renderResults(rows);

  if (rows.length === 1) {
    $('#resultList').classList.remove('visible');
    return setStatus('พบข้อมูลและแสดงบนฟอร์มแล้ว');
  }

  setStatus(`พบข้อมูล ${rows.length} รายการ แสดงรายการแรกบนฟอร์มแล้ว`);
}

function renderResults(rows) {
  const list = $('#resultList');
  list.innerHTML = '';
  list.classList.toggle('visible', rows.length > 0);

  rows.forEach((row) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'result-item';
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(row['ชื่อ นามสกุล'] || '-')}</strong>
        <span>HN ${escapeHtml(row.HN || '-')} | รหัส ${escapeHtml(row['รหัสประจำตัว'] || '-')} | โปรแกรม ${escapeHtml(row['โปรแกรม'] || '-')}</span>
      </div>
      <i data-lucide="chevron-right"></i>
    `;
    item.addEventListener('click', () => {
      fillForm(row);
      list.classList.remove('visible');
      lucide.createIcons();
    });
    list.appendChild(item);
  });

  lucide.createIcons();
}

function formatDateAndTime(value) {

  if (!value) {
    return {
      date: '',
      time: ''
    };
  }

  const text = String(value).trim();

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    return {
      date: text,
      time: ''
    };
  }

  if (/^\d{2}:\d{2}$/.test(text)) {
    return {
      date: '',
      time: text
    };
  }

  try {

    const date = new Date(text);

    if (isNaN(date.getTime())) {
      return {
        date: text,
        time: text
      };
    }

    return {
      date:
        String(date.getDate()).padStart(2, '0') +
        '/' +
        String(date.getMonth() + 1).padStart(2, '0') +
        '/' +
        date.getFullYear(),

      time:
        String(date.getHours()).padStart(2, '0') +
        ':' +
        String(date.getMinutes()).padStart(2, '0')
    };

  } catch {

    return {
      date: text,
      time: text
    };
  }
}

function fillForm(row) {
  currentRow = row;
  $('#rowId').value = row.rowId || '';

  fields.forEach((field) => {
    const input = document.getElementById(field);
    if (!input) return;

    if (field === 'วันที่ลงทะเบียน') {
  input.value = row[field] || '';
  return;
}

if (field === 'เวลาลงทะเบียน') {
  input.value = row[field] || '';
  return;
}
    input.value = row[field] || '';
  });

  setStatus('เลือกข้อมูลแล้ว');
}

function getFormPayload(action) {
  const payload = { action, rowId: $('#rowId').value };
  fields.forEach((field) => {
    payload[field] = document.getElementById(field).value.trim();
  });
  return payload;
}

async function updateEmployee() {
  if (!$('#rowId').value) return setStatus('กรุณาเลือกข้อมูลก่อนแก้ไข', false);

  let result;
  try {
    setStatus('กำลังบันทึกข้อมูล...');
    result = await appScriptRequest(getFormPayload('update'));
  } catch (error) {
    return setStatus(error.message || 'เชื่อมต่อไม่สำเร็จ', false);
  }

  if (!result.ok) return setStatus(result.message || 'แก้ไขไม่สำเร็จ', false);

  fillForm(result.row);
  setStatus('แก้ไขข้อมูลเรียบร้อย');
}

async function deleteEmployee() {
  if (!$('#rowId').value) return setStatus('กรุณาเลือกข้อมูลก่อนลบ', false);
  if (!confirm('ยืนยันการลบข้อมูลรายการนี้?')) return;

  let result;
  try {
    setStatus('กำลังลบข้อมูล...');
    result = await appScriptRequest({ action: 'delete', rowId: $('#rowId').value });
  } catch (error) {
    return setStatus(error.message || 'เชื่อมต่อไม่สำเร็จ', false);
  }

  if (!result.ok) return setStatus(result.message || 'ลบไม่สำเร็จ', false);

  clearForm();
  setStatus('ลบข้อมูลเรียบร้อย');
}

async function registerEmployee() {
  if (!$('#rowId').value) return setStatus('กรุณาเลือกข้อมูลก่อนลงทะเบียน', false);

  let result;
  try {
    setStatus('กำลังลงทะเบียน...');
    result = await appScriptRequest({ action: 'register', rowId: $('#rowId').value });
  } catch (error) {
    return setStatus(error.message || 'เชื่อมต่อไม่สำเร็จ', false);
  }

  if (!result.ok) return setStatus(result.message || 'ลงทะเบียนไม่สำเร็จ', false);

  fillForm(result.row);
  currentStickers = result.stickers || [];
  renderStickers(currentStickers);

  setStatus('ลงทะเบียนและสร้างสติกเกอร์เรียบร้อย');
}
 

function renderStickers(stickers) {
  const preview = $('#stickerPreview');

  if (!stickers.length) {
    preview.innerHTML = `
      <div class="empty-state">
        <i data-lucide="barcode"></i>
        <p>ไม่พบรายการสิ่งตรวจของโปรแกรมนี้</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  preview.innerHTML = stickers.map((item) => `
    <div class="sticker-scale">
      <article class="sticker-card">
      <div class="sticker-sequence">${escapeHtml(formatSequence(item['ลำดับลงทะเบียน']))}</div>
      <div class="sticker-barcode">
        <svg class="barcode-svg" data-barcode="${escapeHtml(item.barcode)}"></svg>
      </div>
      <div class="sticker-left">
        <div class="sticker-hn">${escapeHtml(formatHn(item.HN))}</div>
        <div class="sticker-subcode">${escapeHtml(formatSpecimenLine(item))}</div>
        <div class="sticker-specimen">${escapeHtml(item.specimen || '-')}</div>
      </div>
      <div class="sticker-name">${escapeHtml(item.fullName || item.displayName || '-')}</div>
      <div class="sticker-customer">${escapeHtml(item.Customer || '-')}</div>
      <div class="sticker-date">${escapeHtml(formatStickerDate(item['วันที่ลงทะเบียน']))}</div>
      </article>
    </div>
  `).join('');

  drawBarcodes();
}

function drawBarcodes() {
  const barcodeEls = document.querySelectorAll('.barcode-svg');
  barcodeEls.forEach((el) => {
    const value = el.dataset.barcode || '';
    if (!value) return;

    if (window.JsBarcode) {
      try {
       window.JsBarcode(el, value, {
  format: 'CODE128',
  displayValue: false,
  margin: 0,
  width: 1.25,
  height: 30
});
      } catch (error) {
        drawFallbackBarcode(el, value);
      }
      return;
    }

    drawFallbackBarcode(el, value);
  });
}

function drawFallbackBarcode(svg, value) {
  const namespace = 'http://www.w3.org/2000/svg';
  const width = 316;
  const height = 72;
  let cursor = 0;
  const bars = [];
  const encoded = `110100${String(value || '').split('').map((char) => char.charCodeAt(0).toString(2).padStart(8, '0')).join('')}10011`;
  const unit = width / encoded.length;

  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.innerHTML = '';

  for (const bit of encoded) {
    if (bit === '1') bars.push({ x: cursor, width: Math.max(unit * 0.85, 1) });
    cursor += unit;
  }

  bars.forEach((bar) => {
    const rect = document.createElementNS(namespace, 'rect');
    rect.setAttribute('x', String(bar.x));
    rect.setAttribute('y', '0');
    rect.setAttribute('width', String(bar.width));
    rect.setAttribute('height', String(height));
    rect.setAttribute('fill', '#000');
    svg.appendChild(rect);
  });
}

function formatSequence(value) {
  const text = String(value || '').trim();
  if (!text) return '0000';
  const number = Number(text);
  return Number.isFinite(number) ? String(number).padStart(4, '0') : text;
}

function formatHn(value) {
  const text = String(value || '').trim();
  if (!text) return '00000000';
  return /^\d+$/.test(text) ? text.padStart(8, '0') : text;
}

function formatSpecimenLine(item) {
  const sequence = formatSequence(item['ลำดับลงทะเบียน']);
  const specimenCode = item.specimenCode || getSpecimenCodeFromBarcode(item.barcode, item.HN);
  return `${sequence} / ${specimenCode || item.program || '-'}`;
}

function getSpecimenCodeFromBarcode(barcode, hn) {
  const barcodeText = String(barcode || '');
  const hnText = String(hn || '').trim().padStart(6, '0');
  if (!barcodeText || !hnText || !barcodeText.startsWith(hnText)) return '';
  return barcodeText.slice(hnText.length);
}

function formatStickerDate(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return text;
  return `${Number(match[1])}/${Number(match[2])}/${match[3]}`;
}

function clearForm() {
  currentRow = null;
  currentStickers = [];
  $('#rowId').value = '';
  fields.forEach((field) => {
    document.getElementById(field).value = '';
  });
  renderStickers([]);
}

function appScriptRequest(params) {
  if (!APP_SCRIPT_URL || APP_SCRIPT_URL.includes('PASTE_')) {
    return Promise.resolve({ ok: false, message: 'กรุณาตั้งค่า APP_SCRIPT_URL ใน app.js' });
  }

  return new Promise((resolve, reject) => {
    const callbackName = `appScriptCallback_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const url = new URL(APP_SCRIPT_URL);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value || ''));
    url.searchParams.set('callback', callbackName);

    const script = document.createElement('script');
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('Apps Script ไม่ตอบสนอง'));
    }, 20000);

    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('เชื่อมต่อ Apps Script ไม่สำเร็จ'));
    };

    function cleanup() {
      window.clearTimeout(timer);
      delete window[callbackName];
      script.remove();
    }

    script.src = url.toString();
    document.body.appendChild(script);
  });
}

function setStatus(message, ok = true) {
  const el = $('#connectionStatus');
  el.textContent = message;
  el.style.color = ok ? '#087d86' : '#c63742';
  el.style.borderColor = ok ? '#bee1e8' : '#ffc3c7';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function loadQueue() {

  try {

    const result = await appScriptRequest({
      action:'queue'
    });

    if(!result.ok) return;

    const tbody =
      document.getElementById('queueTableBody');

    tbody.innerHTML = result.rows.map(row => `
      <tr>
        <td>${row.sequence}</td>
        <td>${row.hn}</td>
        <td>${row.name}</td>
        <td>${row.date}</td>
        <td>${row.time}</td>
      </tr>
    `).join('');

  } catch(err) {
    console.error(err);
  }
}
