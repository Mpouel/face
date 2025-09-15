// CONFIG
const MIN_AGE = 30;                
const MID_AGE = 40;                
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

// Hide video and canvas from user
video.style.display = 'none';
canvas.style.display = 'none';

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
  if (age < MIN_AGE) return 'lime';    
  if (age < MID_AGE) return 'yellow';  
  return 'red';                         
}

function updateBackground(detections) {
  let bg = 'white';
  if (detections && detections.length > 0) {
    const hasRed = detections.some(r => r.age >= MID_AGE);
    const hasYellow = detections.some(r => r.age >= MIN_AGE && r.age < MID_AGE);
    if (hasRed) bg = 'red';
    else if (hasYellow) bg = 'yellow';
  }
  document.body.style.backgroundColor = bg;
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
    } else {
      pruneOldSamples();
    }

    updateBackground(results);
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
