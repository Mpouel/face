// CONFIG (tweak these)
const MIN_AGE = 30;                 // age threshold
const CHECK_TIME_MS = 3000;         // rolling window length to average (ms)
const SAMPLE_INTERVAL_MS = 250;     // how often to sample (ms)
const CONF_THRESHOLD = 0.6;         // face detection confidence threshold (0..1)
const MIN_COVERAGE_RATIO = 0.6;     // require at least this ratio of valid samples in window

// MODEL PATHS
const LOCAL_MODELS_PATH = './models'; // your models folder on server
const CDN_WEIGHTS = 'https://unpkg.com/face-api.js/weights';

// internals
const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
let samples = []; // {t:timestamp, age:number}
let sampleTimer = null;

// Wait until faceapi global exists
function waitForFaceApi(timeout = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function check() {
      if (window.faceapi && typeof window.faceapi.nets !== 'undefined') return resolve();
      if (Date.now() - start > timeout) return reject(new Error('faceapi not available'));
      setTimeout(check, 50);
    })();
  });
}

// try load models local, fallback to CDN
async function loadModels() {
  try {
    console.log('Loading models from', LOCAL_MODELS_PATH);
    await faceapi.nets.tinyFaceDetector.loadFromUri(LOCAL_MODELS_PATH);
    await faceapi.nets.ageGenderNet.loadFromUri(LOCAL_MODELS_PATH);
    console.log('Models loaded (local).');
  } catch (err) {
    console.warn('Local models failed, falling back to CDN weights:', err);
    await faceapi.nets.tinyFaceDetector.loadFromUri(CDN_WEIGHTS);
    await faceapi.nets.ageGenderNet.loadFromUri(CDN_WEIGHTS);
    console.log('Models loaded (CDN).');
  }
}

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    video.srcObject = stream;
    await video.play();
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    console.log('Camera started');
  } catch (err) {
    console.error('Camera error:', err);
    throw err;
  }
}

function pruneOldSamples() {
  const cutoff = Date.now() - CHECK_TIME_MS;
  samples = samples.filter(s => s.t >= cutoff);
}

function evaluateSamples() {
  pruneOldSamples();
  const expectedSamples = Math.max(1, Math.ceil(CHECK_TIME_MS / SAMPLE_INTERVAL_MS));
  const requiredCount = Math.ceil(expectedSamples * MIN_COVERAGE_RATIO);
  if (samples.length < requiredCount) {
    return {enough: false};
  }
  const avg = samples.reduce((a,b)=>a+b.age,0) / samples.length;
  return {enough:true, avg, count: samples.length};
}

function drawOverlay(detection, age, score) {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if (!detection) return;
  const box = detection.box || detection.detection?.box;
  if (!box) return;
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'lime';
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.strokeRect(box.x, box.y, box.width, box.height);
  const text = `age: ${age.toFixed(1)}  score: ${score.toFixed(2)}`;
  ctx.font = '16px Arial';
  const tw = ctx.measureText(text).width;
  ctx.fillRect(box.x, box.y - 22, tw + 10, 22);
  ctx.fillStyle = '#fff';
  ctx.fillText(text, box.x + 5, box.y - 6);
}

async function sampleLoop() {
  try {
    // Detect single face with age and gender; use tiny detector options tuned for speed
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
    const result = await faceapi.detectSingleFace(video, options).withAgeAndGender();
    if (result && result.detection && result.detection.score >= CONF_THRESHOLD) {
      const age = result.age;
      samples.push({ t: Date.now(), age });
      drawOverlay(result, age, result.detection.score);
    } else {
      // no valid detection -> still prune overlay and samples
      drawOverlay(null);
      pruneOldSamples();
    }

    // Decide
    const evalRes = evaluateSamples();
    if (evalRes.enough && evalRes.avg >= MIN_AGE) {
      document.body.style.backgroundColor = 'red';
    } else {
      document.body.style.backgroundColor = 'white';
    }
  } catch (err) {
    console.error('sampleLoop error:', err);
  }
}

async function init() {
  try {
    await waitForFaceApi(10000);
    console.log('faceapi ready');
  } catch (err) {
    console.error('faceapi did not load in time:', err);
    return;
  }

  await loadModels();
  await startCamera();

  // start sampling at SAMPLE_INTERVAL_MS
  if (sampleTimer) clearInterval(sampleTimer);
  samples = [];
  sampleTimer = setInterval(sampleLoop, SAMPLE_INTERVAL_MS);
}

// auto-run
document.addEventListener('DOMContentLoaded', () => {
  init().catch(e => console.error('init failed:', e));
});
