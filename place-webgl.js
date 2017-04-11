var loadingContainer = document.getElementById('loading-container');
var loadingText = document.getElementById('loading');

function loadPlaceData() {
  return new Promise(function(resolve, reject) {
    var req = new XMLHttpRequest();
    req.open('GET', 'data/min-diffs.bin');
    req.responseType = 'arraybuffer';

    req.addEventListener('load', function() {
      if (req.response) {
        loadingContainer.style.display = 'none';
        resolve(new Uint8Array(req.response));
      }
    });

    req.addEventListener('progress', function(e) {
      if (e.lengthComputable) {
        loadingText.innerHTML = 'Loading... ' + Math.floor(100 * e.loaded / e.total) + '% complete';
      }
    });

    req.addEventListener('error', function(e) {
      reject(e);
    });

    req.send();
  });
}

var renderer;

loadPlaceData().then(function(placeData) {
  renderer = new Renderer(placeData);
  while (renderer.placeIndex < startIndex) {
    renderer.playbackOne();
  }
  console.log(renderer.placeIndex);
});

const colorCodes = [
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
const placeSize = 1000;
const startIndex = 104476;

function Renderer(placeData) {
  this.placeData = placeData;
  this.placeIndex = 0;
  this.update = this.update.bind(this);
  this.initThree();
}

Renderer.prototype.initThree = function() {
	this.scene = new THREE.Scene();

	this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
  var size = 1000;
  this.geometry = new THREE.PlaneBufferGeometry(size, size, placeSize - 1, placeSize - 1);
  this.colors = new Uint8Array(placeSize * placeSize * 3);

  for (var i = 0; i < this.colors.length; i++) {
    this.colors[i] = 255;
  }

  this.colorTexture = new THREE.DataTexture(this.colors, placeSize, placeSize, THREE.RGBFormat, THREE.UnsignedByteType);
  this.colorTexture.needsUpdate = true;

  // this.geometry.addAttribute('color', new THREE.BufferAttribute(this.colors, 3, true));
  var material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide, map: this.colorTexture});
  this.plane = new THREE.Mesh(this.geometry, material);
  this.plane.position.z = -500;
  this.scene.add(this.plane);

	this.renderer = new THREE.WebGLRenderer({antialias: false});
  this.renderer.setPixelRatio(Math.floor(window.devicePixelRatio));

  this.controls = new THREE.VRControls(this.camera);
  this.effect = new THREE.VREffect(this.renderer);
  this.effect.setSize(window.innerWidth, window.innerHeight);

  navigator.getVRDisplays().then(function(displays) {
    if (displays.length > 0) {
      this.vrDisplay = displays[0];
      this.vrDisplay.requestAnimationFrame(this.update);
    }
  }.bind(this));

  this.onResize = this.onResize.bind(this);
  this.onVRDisplayPresentChange = this.onVRDisplayPresentChange.bind(this);

  window.addEventListener('resize', this.onResize);
  window.addEventListener('vrdisplaypresentchange', this.onVRDisplayPresentChange);

	document.body.appendChild(this.renderer.domElement);
};

Renderer.prototype.update = function() {
  for (var i = 0; i < 1000; i++) {
    this.playbackOne();
  }
  this.smoothPositions();
  this.controls.update();
  this.effect.render(this.scene, this.camera);
  this.vrDisplay.requestAnimationFrame(this.update);
};

Renderer.prototype.onResize = function() {
  this.effect.setSize(window.innerWidth, window.innerHeight);
  this.camera.aspect = window.innerWidth / window.innerHeight;
  this.camera.updateProjectionMatrix();
};

Renderer.prototype.onVRDisplayPresentChange = function() {
  this.onResize();
};


var decayFactor = 0.99;
var upFactor = 1;

Renderer.prototype.smoothPositions = function() {
  var positionArray = this.geometry.attributes.position.array;
  for (var i = 0; i < positionArray.length / 3; i++) {
    positionArray[i * 3 + 2] *= decayFactor;
  }
};

Renderer.prototype.playbackOne = function() {
  var baseIndex = 3 * this.placeIndex;
  var byte0 = this.placeData[baseIndex + 0];
  var byte1 = this.placeData[baseIndex + 1];
  var byte2 = this.placeData[baseIndex + 2];

  // data layout (note that the 10 bit uints are little-endian):
  // | byte 0 | byte 1 | byte 2 |
  // |01234567|01234567|01234567|
  // |xxxxxxxx|xxyyyyyy|yyyycccc|

  var x = byte0 | ((byte1 & 0x3) << 8);
  var y = (byte1 >> 2) | ((byte2 & 0xf) << 6);
  var color = (byte2 & 0xf0) >> 4;

  var colorCode = 3 * color;
  var colorIndex = 3 * ((placeSize - y - 1) * placeSize + x);
  this.colors[colorIndex + 0] = colorCodes[colorCode + 0];
  this.colors[colorIndex + 1] = colorCodes[colorCode + 1];
  this.colors[colorIndex + 2] = colorCodes[colorCode + 2];
  this.colorTexture.needsUpdate = true;

  var attributeIndex = 3 * (y * placeSize + x)
  var positionArray = this.geometry.attributes.position.array;
  positionArray[attributeIndex + 2] += upFactor;
  this.geometry.attributes.position.needsUpdate = true;

  this.placeIndex += 1;
};

// Utility to compress original diffs.bin
function compress(data) {
  var output = new Uint8Array((data.length / 4) * 3);

  for (var i = 0; i < data.length / 4; i++) {
    var time = data[4 * i + 0];
    var x = data[4 * i + 1];
    var y = data[4 * i + 2];
    var color = data[4 * i + 3];
    // eight low bits of x
    // two high bits of x, six low bits of y
    // four high bits of y, four bits of color
    output[3 * i + 0] = x & 0xff;
    output[3 * i + 1] = ((x & 0x300) >> 8) | ((y & 0x3f) << 2);
    output[3 * i + 2] = ((y & 0x3c0) >> 6) | ((color & 0xf) << 4);
  }

  window.location = URL.createObjectURL(new Blob([output], {type: 'application/octet-binary'}));
}

document.querySelector('button#vr').addEventListener('click', function() {
  renderer.vrDisplay.requestPresent([{source: renderer.renderer.domElement}]);
});
