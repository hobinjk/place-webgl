var loadingContainer = document.getElementById('loading-container');
var loadingText = document.getElementById('loading');

function loadPlaceData() {
  return new Promise(function(resolve, reject) {
    var req = new XMLHttpRequest();
    req.open('GET', 'data/diffs.bin');
    req.responseType = 'arraybuffer';

    req.addEventListener('load', function() {
      if (req.response) {
        loadingContainer.style.display = 'none';
        // Assume platform is little-endian
        resolve(new Uint32Array(req.response));
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
  while (renderer.time <= startTime) {
    renderer.playbackOne();
  }
  renderer.update();
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
const startTime = 1490986860;

function Renderer(placeData) {
  this.placeData = placeData;
  this.placeIndex = 0;
  this.time = this.placeData[0];
  this.update = this.update.bind(this);
  this.initThree();
  window.requestAnimationFrame(this.update);
}

Renderer.prototype.initThree = function() {
	this.scene = new THREE.Scene();

	this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
	this.camera.position.z = 500;
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
  this.scene.add(this.plane);

	this.renderer = new THREE.WebGLRenderer();
	this.renderer.setSize(window.innerWidth, window.innerHeight);

  var controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
  controls.enableZoom = true;

	document.body.appendChild(this.renderer.domElement);
};

Renderer.prototype.update = function() {
  for (var i = 0; i < 1000; i++) {
    this.playbackOne();
  }
  this.smoothPositions();
  this.renderer.render(this.scene, this.camera);
  window.requestAnimationFrame(this.update);
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
  var baseIndex = 4 * this.placeIndex;
  var time = this.placeData[baseIndex + 0];
  if (time < this.time) {
    console.log('linearity violation', time, this.time);
  }
  this.time = time;
  var x =  this.placeData[baseIndex + 1];
  var y = this.placeData[baseIndex + 2];
  var colorCode = 3 * this.placeData[baseIndex + 3];
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

