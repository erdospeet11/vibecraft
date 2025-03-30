import * as THREE from 'three';
import { World } from '../world/World';
import { BlockType } from '../world/BlockType';

export class FirstPersonControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private world: World;
  
  // Movement state
  private moveForward: boolean = false;
  private moveBackward: boolean = false;
  private moveLeft: boolean = false;
  private moveRight: boolean = false;
  private moveUp: boolean = false;
  private moveDown: boolean = false;
  private canJump: boolean = false;
  
  // Physics
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private direction: THREE.Vector3 = new THREE.Vector3();
  private gravity: number = 9.8;
  private playerHeight: number = 1.8;
  private jumpSpeed: number = 5;
  private flyMode: boolean = false; // Start with flight mode disabled
  private playerWidth: number = 0.6; // Player width for collision detection
  
  // Mouse look
  private mouseLook: boolean = false;
  private prevMouseX: number = 0;
  private prevMouseY: number = 0;
  private pitchObject: THREE.Object3D;
  private yawObject: THREE.Object3D;
  
  // Block interaction
  private selectedBlock: { 
    position: THREE.Vector3;
    normal: THREE.Vector3;
    blockType: BlockType 
  } | null = null;
  
  // Player inventory
  private selectedBlockType: BlockType = BlockType.DIRT;
  
  // Constants
  private readonly MOUSE_SENSITIVITY: number = 0.002;
  private readonly MOVEMENT_SPEED: number = 1.5;
  
  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, world: World) {
    this.camera = camera;
    this.domElement = domElement;
    this.world = world;
    
    // Set up the camera rig
    this.pitchObject = new THREE.Object3D();
    this.yawObject = new THREE.Object3D();
    
    this.pitchObject.add(camera);
    this.yawObject.add(this.pitchObject);
    this.yawObject.position.y = 20;
    
    // Add yawObject to the scene
    world.getScene().add(this.yawObject);
    
    // Set up event listeners
    this.initEventListeners();
    
    // Lock pointer on click
    this.domElement.addEventListener('click', () => {
      this.domElement.requestPointerLock();
    });
    
    // Pointer lock change
    document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
    
    // Initialize flight mode display
    this.updateFlightModeDisplay();
  }
  
  private initEventListeners(): void {
    // Keyboard events
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
    
    // Mouse events
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mousedown', this.onMouseDown.bind(this));
    
    // Prevent context menu
    this.domElement.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });
  }
  
  private onPointerLockChange(): void {
    if (document.pointerLockElement === this.domElement) {
      this.mouseLook = true;
    } else {
      this.mouseLook = false;
    }
  }
  
  private onKeyDown(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW':
        this.moveForward = true;
        break;
      case 'KeyS':
        this.moveBackward = true;
        break;
      case 'KeyA':
        this.moveLeft = true;
        break;
      case 'KeyD':
        this.moveRight = true;
        break;
      case 'Space':
        if (this.canJump && !this.flyMode) {
          this.velocity.y = this.jumpSpeed;
          this.canJump = false;
        }
        if (this.flyMode) {
          this.moveUp = true;
        }
        break;
      case 'ShiftLeft':
        if (this.flyMode) {
          this.moveDown = true;
        }
        break;
      case 'KeyF':
        // Toggle fly mode (removed Ctrl requirement to make it easier)
        this.flyMode = !this.flyMode;
        this.updateFlightModeDisplay();
        
        if (this.flyMode) {
          this.velocity.y = 0;
        }
        break;
      case 'Digit1':
      case 'Digit2':
      case 'Digit3':
      case 'Digit4':
      case 'Digit5':
      case 'Digit6':
      case 'Digit7':
      case 'Digit8':
      case 'Digit9':
        // Select block type
        const index = parseInt(event.code.replace('Digit', ''));
        const blockTypes = [
          BlockType.DIRT,
          BlockType.GRASS,
          BlockType.STONE,
          BlockType.WOOD,
          BlockType.LEAVES,
          BlockType.WATER,
          BlockType.SAND,
          BlockType.GLASS,
          BlockType.BRICK
        ];
        
        if (index <= blockTypes.length) {
          this.selectedBlockType = blockTypes[index - 1];
        }
        break;
    }
  }
  
  private onKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW':
        this.moveForward = false;
        break;
      case 'KeyS':
        this.moveBackward = false;
        break;
      case 'KeyA':
        this.moveLeft = false;
        break;
      case 'KeyD':
        this.moveRight = false;
        break;
      case 'Space':
        this.moveUp = false;
        break;
      case 'ShiftLeft':
        this.moveDown = false;
        break;
    }
  }
  
  private onMouseMove(event: MouseEvent): void {
    if (!this.mouseLook) return;
    
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;
    
    // Rotate yaw (left/right)
    this.yawObject.rotation.y -= movementX * this.MOUSE_SENSITIVITY;
    
    // Rotate pitch (up/down) with limits to prevent flipping
    this.pitchObject.rotation.x -= movementY * this.MOUSE_SENSITIVITY;
    this.pitchObject.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitchObject.rotation.x));
  }
  
  private onMouseDown(event: MouseEvent): void {
    if (!this.mouseLook) return;
    
    // Left click (destroy block)
    if (event.button === 0) {
      if (this.selectedBlock) {
        // Remove the block
        this.world.setBlock(
          this.selectedBlock.position.x,
          this.selectedBlock.position.y,
          this.selectedBlock.position.z,
          BlockType.AIR
        );
      }
    }
    
    // Right click (place block)
    if (event.button === 2) {
      if (this.selectedBlock) {
        // Calculate position for new block based on the face normal
        const newPos = this.selectedBlock.position.clone().add(this.selectedBlock.normal);
        
        // Check if the player is not inside the new block
        const playerPos = this.yawObject.position.clone();
        const playerBoundingBox = new THREE.Box3(
          new THREE.Vector3(playerPos.x - 0.3, playerPos.y - this.playerHeight, playerPos.z - 0.3),
          new THREE.Vector3(playerPos.x + 0.3, playerPos.y, playerPos.z + 0.3)
        );
        
        const blockBoundingBox = new THREE.Box3(
          new THREE.Vector3(newPos.x, newPos.y, newPos.z),
          new THREE.Vector3(newPos.x + 1, newPos.y + 1, newPos.z + 1)
        );
        
        if (!playerBoundingBox.intersectsBox(blockBoundingBox)) {
          // Place the new block
          this.world.setBlock(
            newPos.x,
            newPos.y,
            newPos.z,
            this.selectedBlockType
          );
        }
      }
    }
  }
  
  update(): void {
    const delta = 1 / 60; // Assume 60 FPS
    
    // Raycast for block selection
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    
    this.selectedBlock = this.world.raycast(
      this.camera.getWorldPosition(new THREE.Vector3()),
      cameraDirection
    );
    
    // Handle movement
    if (this.flyMode) {
      this.velocity.y = 0; // No gravity in fly mode
    } else {
      // Apply gravity
      this.velocity.y -= this.gravity * delta;
    }
    
    // Reset direction
    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.y = Number(this.moveUp) - Number(this.moveDown);
    this.direction.normalize();
    
    // Get direction vectors in world space
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);
    
    // Rotate direction by camera rotation
    forward.applyQuaternion(this.yawObject.quaternion);
    right.applyQuaternion(this.yawObject.quaternion);
    
    // Zero out y component for horizontal movement
    forward.y = 0;
    right.y = 0;
    forward.normalize();
    right.normalize();
    
    // Calculate movement vectors
    if (this.moveForward) {
      this.velocity.add(forward.multiplyScalar(this.MOVEMENT_SPEED));
    }
    if (this.moveBackward) {
      this.velocity.add(forward.multiplyScalar(-this.MOVEMENT_SPEED));
    }
    if (this.moveRight) {
      this.velocity.add(right.multiplyScalar(this.MOVEMENT_SPEED));
    }
    if (this.moveLeft) {
      this.velocity.add(right.multiplyScalar(-this.MOVEMENT_SPEED));
    }
    
    // Apply vertical movement in fly mode
    if (this.flyMode) {
      if (this.moveUp) {
        this.velocity.y = this.MOVEMENT_SPEED;
      } else if (this.moveDown) {
        this.velocity.y = -this.MOVEMENT_SPEED;
      } else {
        this.velocity.y = 0;
      }
    }
    
    // Apply damping - slow down movement over time
    this.velocity.x *= 0.8;
    this.velocity.z *= 0.8;
    
    // Handle collisions with solid blocks
    this.handleCollisions(delta);
  }
  
  private handleCollisions(delta: number): void {
    // Create a player bounding box
    const playerPos = this.yawObject.position.clone();
    
    // Store original position for restoring if collision occurs
    const originalX = playerPos.x;
    const originalY = playerPos.y;
    const originalZ = playerPos.z;
    
    // Try moving in X direction
    playerPos.x += this.velocity.x * delta;
    if (this.checkBlockCollision(playerPos)) {
      // Collision detected, revert position
      playerPos.x = originalX;
      this.velocity.x = 0;
    }
    
    // Try moving in Z direction
    playerPos.z += this.velocity.z * delta;
    if (this.checkBlockCollision(playerPos)) {
      // Collision detected, revert position
      playerPos.z = originalZ;
      this.velocity.z = 0;
    }
    
    // Try moving in Y direction (falling/jumping)
    playerPos.y += this.velocity.y * delta;
    if (this.checkBlockCollision(playerPos)) {
      // If we hit something when moving down, we're on the ground
      if (this.velocity.y < 0) {
        this.canJump = true;
      }
      // Collision detected, revert position
      playerPos.y = originalY;
      this.velocity.y = 0;
    } else {
      // If we're moving and not colliding, we're not on the ground
      if (!this.flyMode && this.velocity.y !== 0) {
        this.canJump = false;
      }
    }
    
    // Update position
    this.yawObject.position.copy(playerPos);
  }
  
  private checkBlockCollision(position: THREE.Vector3): boolean {
    // Player dimensions
    const halfWidth = this.playerWidth * 0.5;
    const halfHeight = this.playerHeight * 0.5;
    
    // Check all 8 corners of player bounding box
    const corners = [
      new THREE.Vector3(position.x - halfWidth, position.y - halfHeight, position.z - halfWidth),
      new THREE.Vector3(position.x - halfWidth, position.y - halfHeight, position.z + halfWidth),
      new THREE.Vector3(position.x + halfWidth, position.y - halfHeight, position.z - halfWidth),
      new THREE.Vector3(position.x + halfWidth, position.y - halfHeight, position.z + halfWidth),
      new THREE.Vector3(position.x - halfWidth, position.y + halfHeight, position.z - halfWidth),
      new THREE.Vector3(position.x - halfWidth, position.y + halfHeight, position.z + halfWidth),
      new THREE.Vector3(position.x + halfWidth, position.y + halfHeight, position.z - halfWidth),
      new THREE.Vector3(position.x + halfWidth, position.y + halfHeight, position.z + halfWidth),
    ];
    
    // Check feet position (important for standing on blocks)
    corners.push(new THREE.Vector3(position.x, position.y - halfHeight - 0.1, position.z));
    
    // Check if any corner intersects with a solid block
    for (const corner of corners) {
      const blockX = Math.floor(corner.x);
      const blockY = Math.floor(corner.y);
      const blockZ = Math.floor(corner.z);
      
      const blockType = this.world.getBlock(blockX, blockY, blockZ);
      
      // If block is not air and not a transparent block, collision occurs
      if (blockType !== BlockType.AIR && 
          blockType !== BlockType.WATER && 
          blockType !== BlockType.GLASS && 
          blockType !== BlockType.LEAVES) {
        return true;
      }
    }
    
    return false;
  }
  
  getPosition(): THREE.Vector3 {
    return this.yawObject.position.clone();
  }
  
  getObject(): THREE.Object3D {
    return this.yawObject;
  }
  
  private updateFlightModeDisplay(): void {
    let flightModeElement = document.getElementById('flight-mode-indicator');
    
    if (!flightModeElement) {
      // Create indicator if it doesn't exist
      flightModeElement = document.createElement('div');
      flightModeElement.id = 'flight-mode-indicator';
      flightModeElement.style.position = 'absolute';
      flightModeElement.style.top = '10px';
      flightModeElement.style.left = '10px';
      flightModeElement.style.padding = '5px 10px';
      flightModeElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      flightModeElement.style.color = 'white';
      flightModeElement.style.fontFamily = 'monospace';
      flightModeElement.style.fontSize = '14px';
      flightModeElement.style.borderRadius = '4px';
      flightModeElement.style.pointerEvents = 'none';
      document.body.appendChild(flightModeElement);
    }
    
    flightModeElement.textContent = this.flyMode ? 'Flight Mode: ON (Press F to toggle)' : 'Flight Mode: OFF (Press F to toggle)';
    flightModeElement.style.backgroundColor = this.flyMode ? 'rgba(0, 128, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
  }
} 