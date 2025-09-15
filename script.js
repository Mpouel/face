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

// DOM
const pipVideo = document.getElementById("pipVideo");
const startBtn = document.getElementById("startBtn");

// Hidden video + canvas
const video = document.createElement("video");
video.autoplay = true;
video.muted = true;
video.playsInline = true;

const canvas = document.createElement("canvas");
canvas.width = 640;
canvas.height = 360;
const ctx = canvas.getContext("2d");

// PiP source
const stream = canvas.captureStream(30);
pipVideo.srcObject = stream;

// Internals
let samples = [];
let sampleTimer = null;
let color = "white";

// ==== HELPERS ====
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
  return { enough: true, avg };
}

function updateColor(avgAge) {
  if (avgAge >= MID_AGE) {
    color = "red";
  } else if (avgAge >= MIN_AGE) {
    color = "yellow";
  } else {
    color = "white";
  }
}

// ==== PiP canvas drawing ====
function drawColor() {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  requestAnimationFrame(drawColor);
}
// Force initial paint immediately
ctx.fillStyle = "white";
ctx.fillRect(0, 0, canvas.width, canvas.height);
drawColor();

// ==== face-api loading ====
function waitForFaceApi(timeout = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function check() {
      if (window.faceapi && typeof window.faceapi.nets !== "undefined") return resolve();
      if (Date.now() - start > timeout) return reject(new Error("faceapi not available"));
      setTimeout(check, 50);
    })();
  });
}

async function loadModels() {
  try {
    console.log("Loading models from", LOCAL_MODELS_PATH);
    await faceapi.nets.tinyFaceDetector.loadFromUri(LOCAL_MODELS_PATH);
    await faceapi.nets.ageGenderNet.loadFromUri(LOCAL_MODELS_PATH);
    console.log("Models loaded (local).");
  } catch (err) {
    console.warn("Local models failed, using CDN:", err);
    await faceapi.nets.tinyFaceDetector.loadFromUri(CDN_WEIGHTS);
    await faceapi.nets.ageGenderNet.loadFromUri(CDN_WEIGHTS);
    console.log("Models loaded (CDN).");
  }
}

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    video.srcObject = stream;
    await video.play();
    console.log("Camera started");
  } catch (err) {
    console.error("Camera error:", err);
    throw err;
  }
}

// ==== detection loop ====
async function sampleLoop() {
  try {
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
    const result = await faceapi.detectSingleFace(video, options).withAgeAndGender();

    if (result && result.detection && result.detection.score >= CONF_THRESHOLD) {
      samples.push({ t: Date.now(), age: result.age });
    } else {
      pruneOldSamples();
    }

    const evalRes = evaluateSamples();
    if (evalRes.enough) updateColor(evalRes.avg);

  } catch (err) {
    console.error("sampleLoop error:", err);
  }
}

// ==== init ====
async function init() {
  try {
    await waitForFaceApi(10000);
    console.log("faceapi ready");
  } catch (err) {
    console.error("faceapi did not load:", err);
    return;
  }

  await loadModels();
  await startCamera();

  if (sampleTimer) clearInterval(sampleTimer);
  samples = [];
  sampleTimer = setInterval(sampleLoop, SAMPLE_INTERVAL_MS);
}

// ==== PiP button ====
startBtn.addEventListener("click", async () => {
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else {
      // Ensure first frame is painted before PiP
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await pipVideo.requestPictureInPicture();
    }
  } catch (err) {
    console.error("PiP error:", err);
  }
});

// Auto-run
document.addEventListener("DOMContentLoaded", () => {
  init().catch(e => console.error("init failed:", e));
});
