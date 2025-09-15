const startBtn = document.getElementById("startBtn");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let pipWindow = null;
let samples = [];

// CONFIG
const MIN_SAMPLES = 5;          // require at least 5 samples
const MAX_SAMPLES = 20;         // keep a rolling window of 20
const UPDATE_INTERVAL = 300;    // ms between updates

// Age → color mapping
function getColorForAge(age) {
  if (age >= 40) return "red";
  if (age >= 30) return "yellow";
  return "white";
}

async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri("./models");
  await faceapi.nets.ageGenderNet.loadFromUri("./models");
}

async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  await video.play();

  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
}

function addSample(age) {
  samples.push(age);
  if (samples.length > MAX_SAMPLES) samples.shift();
}

function getAverageAge() {
  if (samples.length < MIN_SAMPLES) return null;
  const sum = samples.reduce((a, b) => a + b, 0);
  return sum / samples.length;
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
      pipWindow.onleavepictureinpicture = () => {
        pipWindow = null;
      };
    }
  } catch (err) {
    console.error("PiP error:", err);
  }
}

startBtn.addEventListener("click", async () => {
  await loadModels();
  await startCamera();
  analyzeLoop();
  await startPiP();
});
