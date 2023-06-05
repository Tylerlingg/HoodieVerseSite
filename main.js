import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

(function () {
  // Initialize web3 and contract
  let web3;
  const contractAddress = '0xe939A451020D693aDde493A32ad088349CE4D685';
  const abi = []; // Replace with your contract's actual ABI
  let contract;

  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    try {
      window.ethereum.enable().then(function () {
        contract = new web3.eth.Contract(abi, contractAddress);
        console.log("Ethereum enabled successfully");
      }).catch(e => {
        console.error("User denied account access", e);
      });
    } catch (e) {
      console.error("User denied account access", e);
    }
  } else if (window.web3) {
    web3 = new Web3(window.web3.currentProvider);
    contract = new web3.eth.Contract(abi, contractAddress);
  } else {
    alert('You have to install MetaMask!');
  }

  async function mintNFT(tokenURI) {
    try {
      const accounts = await window.ethereum.enable();
      const account = accounts[0];
      const gas = await contract.methods.mintNFT(account, tokenURI).estimateGas();
      const result = await contract.methods.mintNFT(account, tokenURI).send({ from: account, gas });
    } catch (error) {
      console.error("Error minting NFT: ", error);
    }
  }

  function captureImage(renderer, scene, camera) {
    renderer.render(scene, camera);
    const dataURL = renderer.domElement.toDataURL('image/jpeg');
    mintNFT(dataURL);
  }

  function previewImage(renderer, scene, camera) {
    renderer.render(scene, camera);
    const dataURL = renderer.domElement.toDataURL('image/jpeg');

    const previewDiv = document.getElementById('preview');
    const img = document.createElement('img'); // Create new img element
    img.src = dataURL; // Set img source to the captured image
    img.style.position = 'relative'; // Set img position
    img.style.left = '-20px'; // Set img left offset
    img.style.width = '250px'; // Set the width of the image
    img.style.height = '250px'; // Set the height of the image

    // Clear the preview div and append the new image
    while (previewDiv.firstChild) {
      previewDiv.removeChild(previewDiv.firstChild);
    }
    previewDiv.appendChild(img);

    // Add reset button
    const resetButton = document.createElement('button');
    resetButton.id = 'reset-preview';
    resetButton.textContent = 'Reset';
    resetButton.onclick = function () {
      while (previewDiv.firstChild) {
        previewDiv.removeChild(previewDiv.firstChild);
      }
    };
    previewDiv.appendChild(resetButton);
  }

  // Create a Three.js scene, camera, and renderer
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 1);
  camera.rotation.set(0, 0, 0);
  camera.aspect = 1; // 1 for a square aspect ratio, adjust as necessary

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.physicallyCorrect = true; // This line enables physically correct lighting
  document.body.appendChild(renderer.domElement);

  const light = new THREE.DirectionalLight(0xffffff);
  light.position.set(0, 1, 0);
  scene.add(light);

  const loader = new GLTFLoader();

  let mixer = null;
  const clock = new THREE.Clock();

  new Promise((resolve, reject) => {
    loader.load('/frogskinleather.glb', function (gltf) {
      gltf.scene.position.x -= 0.175; // Adjust this value as needed
      gltf.scene.position.y += -0.05; // Move up
      scene.add(gltf.scene);
      const animations = gltf.animations;
      if (animations && animations.length > 0) {
        mixer = new THREE.AnimationMixer(gltf.scene);
        const action = mixer.clipAction(animations[0]);
        action.play();
      }
      resolve();
    }, undefined, reject);
  }).then(() => {
    console.log("Model loaded successfully");
    document.getElementById('loadingScreen').classList.add('hide');
  }).catch(error => {
    console.error("Error loading GLTF model: ", error);
  });

  document.getElementById('preview-button').addEventListener('click', function () {
    previewImage(renderer, scene, camera);
  });

  document.getElementById('mint-button').addEventListener('click', function () {
    captureImage(renderer, scene, camera);
  });

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85));
  composer.addPass(new BokehPass(scene, camera, {
    focus: 1.0,
    aperture: 0.001,
    maxblur: 0.001,
    width: window.innerWidth,
    height: window.innerHeight
  }));

  function animate() {
    requestAnimationFrame(animate);

    if (mixer) {
      const delta = clock.getDelta();
      mixer.update(delta);
    }

    composer.render();
  }

  animate();

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
  }, false);

  // Wait for the window to load before performing DOM operations.
  window.onload = function () {
    const materials = {
      basic: new THREE.MeshBasicMaterial({ color: 0xff0000 }),
      phong: new THREE.MeshPhongMaterial({ color: 0x00ff00 }),
      lambert: new THREE.MeshLambertMaterial({ color: 0x0000ff }),
      physical: new THREE.MeshPhysicalMaterial({ color: 0xffff00 }),
    };

    ['hood', 'torso', 'arms', 'middlePocket'].forEach(part => {
      const parentDiv = document.getElementById(part);

      const materialSelect = parentDiv.querySelector(`#${part}-material-select`);
      const fileInput = parentDiv.querySelector(`#${part}-texture-input`);
      const resetButton = parentDiv.querySelector(`#${part}-reset-button`);
      const colorPicker = parentDiv.querySelector(`#${part}-color-picker`);

      for (let material in materials) {
        let option = document.createElement('option');
        option.value = material;
        option.text = material;
        materialSelect.appendChild(option);
      }

     function changeMaterial(part) {
  		const materialSelect = document.getElementById(`${part}-material-select`);
  		const fileInput = document.getElementById(`${part}-texture-input`);
  		const colorPicker = document.getElementById(`${part}-color-picker`);

  		let material;
  		if (materialSelect.value !== 'none') {
    		material = materials[materialSelect.value].clone();
  		} 	else {
    		material = new THREE.MeshStandardMaterial({ color: 0xffffff });
  		}

  		// Apply color from the color picker only if no texture is uploaded
  		if (colorPicker.value && !fileInput.files[0]) {
    		const color = new THREE.Color(colorPicker.value);
    		material.color.set(color);
  		}

  		if (fileInput.files[0]) {
    		const texture = new THREE.TextureLoader().load(URL.createObjectURL(fileInput.files[0]));
    		texture.flipY = false; // Flip the texture vertically
    		material.map = texture;
    		material.color.set(0xffffff); // Set the material color to white
  		}

  		scene.traverse(function (child) {
    		if (child instanceof THREE.Mesh && child.name.includes(part)) {
      			child.material = material;
    	}
  	});
}


      colorPicker.addEventListener('input', function () {
        changeMaterial(part);
      });

      resetButton.addEventListener('click', function () {
        changeMaterial(part);
        materialSelect.selectedIndex = 0;
        fileInput.value = '';
      });
    });
  };
})();
