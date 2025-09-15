// Config variables
const MIN_AGE = 35;        // âge minimum
const AGE_HOLD_TIME = 1500; // temps en ms avant de confirmer

let ageSamples = [];
let startTime = null;

async function startAgeCheck() {
  const video = document.getElementById("video");

  // load models
  await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
  await faceapi.nets.ageGenderNet.loadFromUri("/models");

  navigator.mediaDevices.getUserMedia({ video: {} })
    .then(stream => { video.srcObject = stream });

  video.addEventListener("play", () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);

    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
      const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withAge()
        .withGender();

      if (detections) {
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resizedDetections);

        const age = detections.age;
        ageSamples.push(age);

        if (!startTime) startTime = Date.now();

        const elapsed = Date.now() - startTime;

        if (elapsed >= CHECK_TIME) {
          const avgAge = ageSamples.reduce((a, b) => a + b, 0) / ageSamples.length;

          if (avgAge >= MIN_AGE) {
            alert("Access granted ✅ (Age ~ " + avgAge.toFixed(1) + ")");
          } else {
            alert("Access denied ❌ (Age ~ " + avgAge.toFixed(1) + ")");
          }

          // reset for next check
          ageSamples = [];
          startTime = null;
        }
      }
    }, 500);
  });
}