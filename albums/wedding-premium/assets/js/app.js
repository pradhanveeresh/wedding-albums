const PDF_PATH = './assets/pdf/album.pdf';

const leftCanvas = document.getElementById('leftCanvas');
const rightCanvas = document.getElementById('rightCanvas');
const leftPlaceholder = document.getElementById('leftPlaceholder');
const rightPlaceholder = document.getElementById('rightPlaceholder');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const pageIndicator = document.getElementById('pageIndicator');
const statusLine = document.getElementById('statusLine');

let pdfDoc = null;
let totalPages = 0;
let spreadStart = 1;
let zoom = 1;
let rendering = false;

function setStatus(msg){
  statusLine.textContent = msg;
}

function clampSpread(n){
  if (n < 1) return 1;
  if (n > totalPages) return Math.max(1, totalPages % 2 === 0 ? totalPages - 1 : totalPages);
  return n % 2 === 0 ? n - 1 : n;
}

function updateIndicator(){
  const left = spreadStart;
  const right = spreadStart + 1 <= totalPages ? spreadStart + 1 : null;
  pageIndicator.textContent = right ? `Pages ${left}–${right}` : `Page ${left}`;
}

async function renderPageToCanvas(pageNumber, canvas, placeholder){
  const ctx = canvas.getContext('2d');

  if (!pageNumber || pageNumber > totalPages) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 1;
    canvas.height = 1;
    placeholder.style.display = 'flex';
    placeholder.textContent = 'End of album';
    return;
  }

  const page = await pdfDoc.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1 });

  const safeBox = canvas.parentElement;
  const maxW = Math.max(100, safeBox.clientWidth);
  const maxH = Math.max(100, safeBox.clientHeight);

  const fitScale = Math.min(maxW / baseViewport.width, maxH / baseViewport.height);
  const finalScale = fitScale * zoom;

  const viewport = page.getViewport({ scale: finalScale });

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  placeholder.style.display = 'none';

  await page.render({
    canvasContext: ctx,
    viewport
  }).promise;
}

async function renderSpread(){
  if (!pdfDoc || rendering) return;
  rendering = true;
  setStatus('Rendering pages...');

  try {
    await renderPageToCanvas(spreadStart, leftCanvas, leftPlaceholder);
    await renderPageToCanvas(spreadStart + 1, rightCanvas, rightPlaceholder);
    updateIndicator();
    setStatus(`Showing ${spreadStart}${spreadStart + 1 <= totalPages ? '–' + (spreadStart + 1) : ''} of ${totalPages}`);
  } catch (err) {
    console.error(err);
    setStatus('Error rendering PDF');
    leftPlaceholder.style.display = 'flex';
    rightPlaceholder.style.display = 'flex';
    leftPlaceholder.textContent = 'Failed to load PDF';
    rightPlaceholder.textContent = 'Check album.pdf';
  } finally {
    rendering = false;
  }
}

async function loadPdf(){
  try {
    setStatus('Loading PDF...');
    const loadingTask = pdfjsLib.getDocument(PDF_PATH);
    pdfDoc = await loadingTask.promise;
    totalPages = pdfDoc.numPages;
    spreadStart = 1;
    updateIndicator();
    await renderSpread();
  } catch (err) {
    console.error(err);
    setStatus('PDF not found. Upload album.pdf');
    leftPlaceholder.style.display = 'flex';
    rightPlaceholder.style.display = 'flex';
    leftPlaceholder.textContent = 'Upload album.pdf';
    rightPlaceholder.textContent = 'Path: assets/pdf/album.pdf';
  }
}

prevBtn.addEventListener('click', async () => {
  if (!pdfDoc) return;
  spreadStart = clampSpread(spreadStart - 2);
  await renderSpread();
});

nextBtn.addEventListener('click', async () => {
  if (!pdfDoc) return;
  spreadStart = clampSpread(spreadStart + 2);
  await renderSpread();
});

zoomInBtn.addEventListener('click', async () => {
  if (!pdfDoc) return;
  zoom = Math.min(zoom + 0.12, 2);
  await renderSpread();
});

zoomOutBtn.addEventListener('click', async () => {
  if (!pdfDoc) return;
  zoom = Math.max(zoom - 0.12, 0.7);
  await renderSpread();
});

fullscreenBtn.addEventListener('click', async () => {
  const el = document.documentElement;
  if (!document.fullscreenElement) {
    await el.requestFullscreen?.();
  } else {
    await document.exitFullscreen?.();
  }
});

window.addEventListener('resize', () => {
  if (!pdfDoc) return;
  clearTimeout(window.__resizeTimer);
  window.__resizeTimer = setTimeout(() => {
    renderSpread();
  }, 150);
});

window.addEventListener('keydown', async (e) => {
  if (e.key === 'ArrowRight') {
    nextBtn.click();
  } else if (e.key === 'ArrowLeft') {
    prevBtn.click();
  } else if (e.key === '+' || e.key === '=') {
    zoomInBtn.click();
  } else if (e.key === '-') {
    zoomOutBtn.click();
  }
});

loadPdf();
