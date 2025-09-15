const startBtn = document.getElementById("startBtn");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let pipWindow = null;
let stream;

// Fake function: replace with real age detection
function detectAge() {
  return Math.floor(Math.random() * 60); // 0–59 years
}

function getColorForAge(age) {
  if (age >= 40) return "red";
  if (age >= 30) return "yellow";
  return "white";
}

async function startCamera() {
  stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;

  await video.play();

  // Match canvas to video size
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;

  // Start draw loop
  drawLoop();
}

function drawLoop() {
  const age = detectAge();
  const color = getColorForAge(age);

  // Update page background
  document.body.style.background = color;

  // Fill canvas with color (PiP source)
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  requestAnimationFrame(drawLoop);
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
  await startCamera();
  await startPiP();
});
