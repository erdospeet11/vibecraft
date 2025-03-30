import * as THREE from 'three';
import { World } from './world/World';
import { FirstPersonControls } from './controls/FirstPersonControls';
import { BlockType } from './world/BlockType';
import { Sky } from './world/Sky';

class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private world: World;
  private controls: FirstPersonControls;
  private clock: THREE.Clock;
  private sky: Sky;

  constructor() {
    // Initialize clock for consistent timing
    this.clock = new THREE.Clock();
    
    // Create help overlay with controls
    this.createHelpOverlay();
    
    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
    
    // Add fog to fade out distant chunks
    this.scene.fog = new THREE.Fog(0x87CEEB, 100, 300); // Pushed fog start further, adjusted end distance

    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      2000
    );
    
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
    
    // Initialize Sky
    this.sky = new Sky(this.scene);
    
    // Initialize controls - this will position the camera appropriately
    this.controls = new FirstPersonControls(this.camera, this.renderer.domElement, this.world);

    // Position player at a suitable starting point above the terrain
    this.positionPlayerAboveTerrain();

    // Add ambient and directional light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // Reduced intensity for toon shading
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6); // Reduced intensity slightly
    directionalLight.position.set(50, 200, 100);
    directionalLight.castShadow = true;
    
    // Set up shadow properties
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 2000;
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
    
    // Update world (dynamic chunk loading) based on player position
    this.world.update(this.controls.getPosition());
    
    // Update sky (move clouds)
    this.sky.update(delta);
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }

  private positionPlayerAboveTerrain(): void {
    const MAX_SPAWN_ATTEMPTS = 50;
    const SPAWN_AREA_RADIUS_CHUNKS = this.world.RENDER_DISTANCE; // Spawn within initial render distance
    const spawnAreaSize = SPAWN_AREA_RADIUS_CHUNKS * this.world.CHUNK_SIZE;

    let foundSpawn = false;

    for (let attempt = 0; attempt < MAX_SPAWN_ATTEMPTS; attempt++) {
      // Pick a random X, Z within the spawn area around origin (0,0)
      const x = Math.floor((Math.random() - 0.5) * spawnAreaSize * 2);
      const z = Math.floor((Math.random() - 0.5) * spawnAreaSize * 2);

      let surfaceY = -1;
      // Find the highest solid, non-transparent block from the top down
      for (let checkY = this.world.WORLD_HEIGHT - 1; checkY >= 0; checkY--) {
        const blockType = this.world.getBlock(x, checkY, z);
        if (blockType !== BlockType.AIR &&
            blockType !== BlockType.WATER &&
            blockType !== BlockType.LEAVES &&
            blockType !== BlockType.GLASS) { // Added GLASS check
          surfaceY = checkY;
          break;
        }
      }

      // If we found a surface
      if (surfaceY !== -1) {
        // Check if the two blocks above the surface are air (for 2-block tall player)
        const headBlock1 = this.world.getBlock(x, surfaceY + 1, z);
        const headBlock2 = this.world.getBlock(x, surfaceY + 2, z);

        if (headBlock1 === BlockType.AIR && headBlock2 === BlockType.AIR) {
          // Found a valid spawn point!
          const playerObject = this.controls.getObject();
          // Position the player's center (yawObject) so feet are just above surfaceY
          // player center y = surfaceY + 1 (feet level) + playerHeight / 2
          const playerY = surfaceY + 1 + (this.controls.getPlayerHeight() / 2); 
          playerObject.position.set(x + 0.5, playerY, z + 0.5); // Center in block
          console.log(`Spawned player at: ${x}, ${playerY.toFixed(2)}, ${z} (surface: ${surfaceY})`);
          foundSpawn = true;
          break; // Exit the attempt loop
        }
      }
    }

    // Fallback if no suitable random spawn found after attempts
    if (!foundSpawn) {
      console.warn(`Could not find suitable random spawn after ${MAX_SPAWN_ATTEMPTS} attempts. Spawning at default.`);
      const playerObject = this.controls.getObject();
      playerObject.position.set(8, 30, 8); // Default safe position
    }
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
  const mainMenu = document.getElementById('main-menu');
  const gameContainer = document.getElementById('game-container');
  const startButton = document.getElementById('start-game-button');
  const helpOverlay = document.getElementById('help-overlay'); // Assuming you added an ID
  const flightIndicator = document.getElementById('flight-mode-indicator'); // Assuming you added an ID

  if (mainMenu && gameContainer && startButton) {
    // Show the menu initially
    mainMenu.style.display = 'flex';
    gameContainer.style.display = 'none';

    startButton.addEventListener('click', () => {
      // Hide menu, show game container
      mainMenu.style.display = 'none';
      gameContainer.style.display = 'block';

      // Initialize the game
      new Game();
    });
  } else {
    console.error('Menu or game container elements not found!');
    // Fallback: Start game immediately if menu elements are missing
    new Game(); 
  }
}); 