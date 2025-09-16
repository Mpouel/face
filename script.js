const statusDiv = document.getElementById("status");

// Créer la vidéo (cachée)
const video = document.createElement("video");
video.setAttribute("autoplay", true);
video.setAttribute("muted", true);
video.setAttribute("playsinline", true);
document.body.appendChild(video);
video.style.display = "none";

async function init() {
  try {
    statusDiv.innerText = "Loading models...";

    await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
    await faceapi.nets.ageGenderNet.loadFromUri("/models");

    statusDiv.innerText = "Requesting camera...";
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    video.srcObject = stream;

    video.onloadedmetadata = () => {
      video.play();
      statusDiv.innerText = "Analyzing...";
      analyzeLoop();
    };
  } catch (err) {
    console.error("Init error:", err);
    statusDiv.innerText = "Error initializing.";
  }
}

function getColorForAge(age) {
  if (age < 30) return "green";
  if (age < 40) return "yellow";
  return "red";
}

async function analyzeLoop() {
  try {
    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withAgeAndGender();

    if (detection && detection.age) {
      const age = Math.round(detection.age);
      const color = getColorForAge(age);

      document.body.style.backgroundColor = color;
      statusDiv.innerText = `Detected age: ${age} → ${color.toUpperCase()}`;
    } else {
      statusDiv.innerText = "No face detected...";
      document.body.style.backgroundColor = "black";
    }
  } catch (err) {
    console.error("Loop error:", err);
    statusDiv.innerText = "Error analyzing.";
  }

  requestAnimationFrame(analyzeLoop);
}

init();
