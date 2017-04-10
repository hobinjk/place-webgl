var req = new XMLHttpRequest();
req.open('GET', 'diffs.bin');
req.responseType = 'arraybuffer';

var placeData;

req.onload = function() {
  if (req.response) {
    // Assume platform is little-endian
    placeData = new Uint32Array(req.response);
    placeIndex = 0;
    update();
  }
};

function update() {
  for (var i = 0; i < 1000; i++) {
    playbackOne();
  }
  window.requestAnimationFrame(update);
}

var colorCodes = [
  0xFF, 0xFF, 0xFF,
  0xE4, 0xE4, 0xE4,
  0x88, 0x88, 0x88,
  0x22, 0x22, 0x22,
  0xFF, 0xA7, 0xD1,
  0xE5, 0x00, 0x00,
  0xE5, 0x95, 0x00,
  0xA0, 0x6A, 0x42,
  0xE5, 0xD9, 0x00,
  0x94, 0xE0, 0x44,
  0x02, 0xBE, 0x01,
  0x00, 0xD3, 0xDD,
  0x00, 0x83, 0xC7,
  0x00, 0x00, 0xEA,
  0xCF, 0x6E, 0xE4,
  0x82, 0x00, 0x80
];

var canvas = document.getElementById('place');
canvas.width = 1000;
canvas.height = 1000;
var gfx = canvas.getContext('2d');

var pixelImageData = gfx.createImageData(1, 1);
var lastTime = -1;

function playbackOne() {
  var time = placeData[4 * placeIndex + 0];
  if (time < lastTime) {
    console.log('linearity violation', time, lastTime);
  }
  lastTime = time;
  var x =  placeData[4 * placeIndex + 1];
  var y = placeData[4 * placeIndex + 2];
  var colorCode = placeData[4 * placeIndex + 3];
  var color = colorCodes[colorCode];
  pixelImageData.data[0] = colorCodes[colorCode * 3 + 0];
  pixelImageData.data[1] = colorCodes[colorCode * 3 + 1];
  pixelImageData.data[2] = colorCodes[colorCode * 3 + 2];
  pixelImageData.data[3] = 255;
  gfx.putImageData(pixelImageData, x, y);

  placeIndex += 1;
}


req.send();
