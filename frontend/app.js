const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzIvJlLKXv3RaJx5mL83hqYBlrqa-HXuhmGKTR6BJWNX9nqbfk-cznKrkkfL14EOQpH/exec';
const NODE_API_URL = 'PASTE_YOUR_RENDER_API_URL_HERE';

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

function fillForm(row) {
  currentRow = row;
  $('#rowId').value = row.rowId || '';
  fields.forEach((field) => {
    const input = document.getElementById(field);
    if (input) input.value = row[field] || '';
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

  if (currentStickers.length > 0) {
    try {
      await pushStickers(currentStickers);
    } catch (error) {
      return setStatus(error.message || 'สร้างสติกเกอร์แล้ว แต่บันทึกเข้า Sticker sheet ไม่สำเร็จ', false);
    }
  }

  setStatus('ลงทะเบียนและสร้างสติกเกอร์เรียบร้อย');
}

async function pushStickers(stickers) {
  if (!NODE_API_URL || NODE_API_URL.includes('PASTE_')) {
    setStatus('ยังไม่ได้ตั้งค่า NODE_API_URL จึงยังไม่ push เข้า Sticker sheet', false);
    return;
  }

  const response = await fetch(`${NODE_API_URL.replace(/\/$/, '')}/stickers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stickers })
  });

  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.message || 'บันทึก Sticker ไม่สำเร็จ');
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
    <article class="sticker-card">
      <div class="sticker-top">
        <span>ลำดับ ${escapeHtml(item['ลำดับลงทะเบียน'])}</span>
        <span>${escapeHtml(item['วันที่ลงทะเบียน'])}</span>
      </div>
      <div class="barcode-text">${escapeHtml(item.barcode)}</div>
      <div class="sticker-name">${escapeHtml(item.displayName)}</div>
      <div class="sticker-meta">
        <span>HN: ${escapeHtml(item.HN)}</span>
        <span>${escapeHtml(item.Customer)}</span>
        <span>Specimen: ${escapeHtml(item.specimen)}</span>
        <span>Program: ${escapeHtml(item.program)}</span>
      </div>
    </article>
  `).join('');
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
