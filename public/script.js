// CONFIG (tweak these)
const MIN_AGE = 30;                
const MID_AGE = 40;                // middle threshold for yellow
const CHECK_TIME_MS = 3000;        
const SAMPLE_INTERVAL_MS = 250;    
const CONF_THRESHOLD = 0.6;        
const MIN_COVERAGE_RATIO = 0.6;    

// MODEL PATHS
const LOCAL_MODELS_PATH = './models';
const CDN_WEIGHTS = 'https://unpkg.com/face-api.js/weights';

const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
let samples = []; 
let sampleTimer = null;

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

async function loadModels() {
  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri(LOCAL_MODELS_PATH);
    await faceapi.nets.ageGenderNet.loadFromUri(LOCAL_MODELS_PATH);
  } catch (err) {
    await faceapi.nets.tinyFaceDetector.loadFromUri(CDN_WEIGHTS);
    await faceapi.nets.ageGenderNet.loadFromUri(CDN_WEIGHTS);
  }
}

async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
  video.srcObject = stream;
  await video.play();
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
}

function pruneOldSamples() {
  const cutoff = Date.now() - CHECK_TIME_MS;
  samples = samples.filter(s => s.t >= cutoff);
}

function evaluateSamples() {
  pruneOldSamples();
  const expectedSamples = Math.max(1, Math.ceil(CHECK_TIME_MS / SAMPLE_INTERVAL_MS));
  const requiredCount = Math.ceil(expectedSamples * MIN_COVERAGE_RATIO);
  if (samples.length < requiredCount) return { enough: false };
  const avg = samples.reduce((a, b) => a + b.age, 0) / samples.length;
  return { enough: true, avg, count: samples.length };
}

function getBoxColor(age) {
  if (age < MIN_AGE) return 'lime';    // under 30
  if (age < MID_AGE) return 'yellow';  // 30–40
  return 'red';                         // over 40
}

function drawOverlay(detections) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!detections || detections.length === 0) return;

  detections.forEach(result => {
    const box = result.detection.box;
    const age = result.age;
    const score = result.detection.score;
    const color = getBoxColor(age);

    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    const text = `age: ${age.toFixed(1)}  score: ${score.toFixed(2)}`;
    ctx.font = '16px Arial';
    const tw = ctx.measureText(text).width;
    ctx.fillRect(box.x, box.y - 22, tw + 10, 22);

    ctx.fillStyle = '#fff';
    ctx.fillText(text, box.x + 5, box.y - 6);
  });
}

async function sampleLoop() {
  try {
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
    const results = await faceapi.detectAllFaces(video, options).withAgeAndGender();

    if (results && results.length > 0) {
      results.forEach(r => {
        if (r.detection.score >= CONF_THRESHOLD) {
          samples.push({ t: Date.now(), age: r.age });
        }
      });
      drawOverlay(results);
    } else {
      drawOverlay(null);
      pruneOldSamples();
    }
  } catch (err) {
    console.error('sampleLoop error:', err);
  }
}

async function init() {
  await waitForFaceApi(10000);
  await loadModels();
  await startCamera();

  if (sampleTimer) clearInterval(sampleTimer);
  samples = [];
  sampleTimer = setInterval(sampleLoop, SAMPLE_INTERVAL_MS);
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch(e => console.error('init failed:', e));
});
