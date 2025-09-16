const startBtn = document.getElementById("startBtn");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let pipWindow = null;
let samples = [];

// CONFIG
const MIN_SAMPLES = 5;
const MAX_SAMPLES = 20;
const UPDATE_INTERVAL = 300;

function getColorForAge(age) {
  if (age >= 40) return "red";
  if (age >= 30) return "yellow";
  return "white";
}

async function loadModels() {
  console.log("Loading models...");
  // load from CDN (works out of the box)
  await faceapi.nets.tinyFaceDetector.loadFromUri("https://cdn.jsdelivr.net/npm/face-api.js/weights");
  await faceapi.nets.ageGenderNet.loadFromUri("https://cdn.jsdelivr.net/npm/face-api.js/weights");
  console.log("✅ Models loaded.");
}

async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  await video.play();

  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  console.log("✅ Camera started");
}

function addSample(age) {
  samples.push(age);
  if (samples.length > MAX_SAMPLES) samples.shift();
}

function getAverageAge() {
  if (samples.length < MIN_SAMPLES) return null;
  return samples.reduce((a, b) => a + b, 0) / samples.length;
}

function drawColor(color) {
  document.body.style.background = color;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

async function analyzeLoop() {
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224 });
  const result = await faceapi.detectSingleFace(video, options).withAgeAndGender();

  if (result && result.age) {
    addSample(result.age);
    console.log("Detected age:", result.age.toFixed(1));
  }

  const avg = getAverageAge();
  if (avg !== null) {
    const color = getColorForAge(avg);
    drawColor(color);
    console.log("Avg age:", avg.toFixed(1), "→", color);
  }

  setTimeout(analyzeLoop, UPDATE_INTERVAL);
}

async function startPiP() {
  try {
    if (!pipWindow) {
      pipWindow = await canvas.requestPictureInPicture();
      pipWindow.onleavepictureinpicture = () => (pipWindow = null);
      console.log("✅ PiP started");
    }
  } catch (err) {
    console.error("PiP error:", err);
  }
}

startBtn.addEventListener("click", async () => {
  try {
    console.log("▶ Button clicked");
    await loadModels();
    await startCamera();
    analyzeLoop();
    await startPiP();
  } catch (err) {
    console.error("Init error:", err);
  }
});
