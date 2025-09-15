async function startVideo() {
  const video = document.getElementById("video");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    video.srcObject = stream;
  } catch (err) {
    console.error("Camera error:", err);
  }
}

async function run() {
  console.log("Loading local models...");
  await faceapi.nets.tinyFaceDetector.loadFromUri("./models");
  await faceapi.nets.ageGenderNet.loadFromUri("./models");

  console.log("Models loaded. Starting detection...");

  const video = document.getElementById("video");
  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withAgeAndGender();

    if (detections.length > 0) {
      const age = detections[0].age;
      console.log("Detected age:", age);

      if (age > 30) {
        document.body.style.backgroundColor = "red";
      } else {
        document.body.style.backgroundColor = "white";
      }
    }
  }, 1000);
}

document.addEventListener("DOMContentLoaded", () => {
  startVideo();
  const video = document.getElementById("video");
  video.addEventListener("play", run);
});
