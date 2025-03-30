import * as THREE from 'three';
import { World } from './world/World';
import { FirstPersonControls } from './controls/FirstPersonControls';
import { BlockType } from './world/BlockType';

class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private world: World;
  private controls: FirstPersonControls;
  private clock: THREE.Clock;

  constructor() {
    // Initialize clock for consistent timing
    this.clock = new THREE.Clock();
    
    // Create help overlay with controls
    this.createHelpOverlay();
    
    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
    
    // Add fog to fade out distant chunks
    this.scene.fog = new THREE.Fog(0x87CEEB, 50, 150);

    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    
    // Don't set camera position here, it will be managed by FirstPersonControls

    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    // Set shadow properties
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container')?.appendChild(this.renderer.domElement);

    // Initialize world
    this.world = new World(this.scene);
    
    // Initialize controls - this will position the camera appropriately
    this.controls = new FirstPersonControls(this.camera, this.renderer.domElement, this.world);

    // Position player at a suitable starting point above the terrain
    this.positionPlayerAboveTerrain();

    // Add ambient and directional light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 200, 100);
    directionalLight.castShadow = true;
    
    // Set up shadow properties
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.bias = -0.0005;
    
    this.scene.add(directionalLight);

    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // Start game loop
    this.animate();
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    
    // Get delta time for smooth animation
    const delta = this.clock.getDelta();
    
    // Update controls
    this.controls.update();
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }

  private positionPlayerAboveTerrain(): void {
    // Use a central position in the first chunk
    const x = 8;
    const z = 8;
    
    // Find the highest non-air block at this position
    let y = 0;
    let foundSurface = false;
    
    // Search from top to bottom (max height to 0)
    for (let checkY = 100; checkY >= 0; checkY--) {
      const blockType = this.world.getBlock(x, checkY, z);
      if (blockType !== BlockType.AIR && 
          blockType !== BlockType.WATER &&
          blockType !== BlockType.LEAVES) {
        // Found a solid block - position player above it
        y = checkY + 2; // +2 to be safely above the block
        foundSurface = true;
        break;
      }
    }
    
    // If we couldn't find a valid position, use a default height
    if (!foundSurface) {
      y = 20;
    }
    
    // Set the player's position
    const playerObject = this.controls.getObject();
    playerObject.position.set(x, y, z);
  }

  private createHelpOverlay(): void {
    const helpDiv = document.createElement('div');
    helpDiv.style.position = 'absolute';
    helpDiv.style.bottom = '10px';
    helpDiv.style.right = '10px';
    helpDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    helpDiv.style.color = 'white';
    helpDiv.style.padding = '10px';
    helpDiv.style.fontFamily = 'monospace';
    helpDiv.style.fontSize = '12px';
    helpDiv.style.borderRadius = '4px';
    helpDiv.style.maxWidth = '300px';
    helpDiv.style.pointerEvents = 'none';
    
    helpDiv.innerHTML = `
      <div style="margin-bottom: 5px; font-weight: bold;">Controls:</div>
      <div>WASD: Move</div>
      <div>Mouse: Look around</div>
      <div>Space: Jump</div>
      <div>F: Toggle flight mode</div>
      <div>In flight mode: Space/Shift: Up/Down</div>
      <div>Left click: Destroy block</div>
      <div>Right click: Place block</div>
      <div>1-9: Select block type</div>
    `;
    
    document.body.appendChild(helpDiv);
  }
}

// Start the game when the window loads
window.addEventListener('load', () => {
  // Show loading message
  const loadingElement = document.createElement('div');
  loadingElement.textContent = 'Loading world...';
  loadingElement.style.position = 'absolute';
  loadingElement.style.top = '50%';
  loadingElement.style.left = '50%';
  loadingElement.style.transform = 'translate(-50%, -50%)';
  loadingElement.style.fontSize = '24px';
  loadingElement.style.color = 'white';
  document.body.appendChild(loadingElement);
  
  // Start the game after a short delay to allow the loading message to display
  setTimeout(() => {
    document.body.removeChild(loadingElement);
    new Game();
  }, 100);
}); 