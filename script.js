const video = document.getElementById("video");
const canvas = document.getElementById("overlay");
const statusDiv = document.getElementById("status");
const ctx = canvas.getContext("2d");

async function init() {
  try {
    statusDiv.innerText = "Loading models...";
    await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
    await faceapi.nets.ageGenderNet.loadFromUri("/models");
    statusDiv.innerText = "Starting camera...";

    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    video.srcObject = stream;

    video.onloadedmetadata = () => {
      video.play();
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      statusDiv.innerText = "Analyzing...";
      analyzeLoop();
    };
  } catch (err) {
    console.error("Init error:", err);
    statusDiv.innerText = "Error initializing.";
  }
}

function getColorForAge(age) {
  if (age < 30) return "lime";
  if (age < 40) return "yellow";
  return "red";
}

async function analyzeLoop() {
  try {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withAgeAndGender();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detections.length > 0) {
      detections.forEach(det => {
        const box = det.detection.box;
        const age = Math.round(det.age);
        const color = getColorForAge(age);

        // draw box
        ctx.lineWidth = 3;
        ctx.strokeStyle = color;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // draw label
        const text = `Age: ${age}`;
        ctx.font = "16px Arial";
        const textWidth = ctx.measureText(text).width;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(box.x, box.y - 22, textWidth + 10, 22);
        ctx.fillStyle = "white";
        ctx.fillText(text, box.x + 5, box.y - 6);
      });

      statusDiv.innerText = `Faces detected: ${detections.length}`;
    } else {
      statusDiv.innerText = "No face detected...";
    }
  } catch (err) {
    console.error("Loop error:", err);
  }

  requestAnimationFrame(analyzeLoop);
}

init();
