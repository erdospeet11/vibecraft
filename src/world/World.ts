import * as THREE from 'three';
import { BlockType } from './BlockType';
import { Chunk } from './Chunk';
import { TextureManager } from './TextureManager';

export class World {
  private scene: THREE.Scene;
  private chunks: Map<string, Chunk>;
  private textureManager: TextureManager;
  
  // World constants
  readonly CHUNK_SIZE = 16;
  readonly WORLD_HEIGHT = 128;
  readonly RENDER_DISTANCE = 3;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.chunks = new Map();
    this.textureManager = new TextureManager();
    
    // Generate initial chunks
    this.generateInitialChunks();
  }

  // Get the scene object
  getScene(): THREE.Scene {
    return this.scene;
  }

  // Get the texture manager
  getTextureManager(): TextureManager {
    return this.textureManager;
  }

  private generateInitialChunks(): void {
    // Generate chunks in a square around origin
    for (let x = -this.RENDER_DISTANCE; x <= this.RENDER_DISTANCE; x++) {
      for (let z = -this.RENDER_DISTANCE; z <= this.RENDER_DISTANCE; z++) {
        this.generateChunk(x, z);
      }
    }
  }

  private generateChunk(chunkX: number, chunkZ: number): void {
    const chunkKey = `${chunkX},${chunkZ}`;
    
    if (!this.chunks.has(chunkKey)) {
      const chunk = new Chunk(
        this.scene, 
        this.textureManager,
        chunkX, 
        chunkZ, 
        this.CHUNK_SIZE, 
        this.WORLD_HEIGHT
      );
      
      // Set reference to the world
      chunk.setWorld(this);
      
      this.chunks.set(chunkKey, chunk);
      chunk.generate();
    }
  }

  // Get block at world coordinates
  getBlock(x: number, y: number, z: number): BlockType {
    if (y < 0 || y >= this.WORLD_HEIGHT) {
      return BlockType.AIR;
    }
    
    const chunkX = Math.floor(x / this.CHUNK_SIZE);
    const chunkZ = Math.floor(z / this.CHUNK_SIZE);
    const chunkKey = `${chunkX},${chunkZ}`;
    
    const chunk = this.chunks.get(chunkKey);
    if (!chunk) {
      return BlockType.AIR;
    }
    
    const localX = Math.floor(x % this.CHUNK_SIZE);
    const localZ = Math.floor(z % this.CHUNK_SIZE);
    
    // Handle negative coordinates correctly
    const adjustedLocalX = localX < 0 ? localX + this.CHUNK_SIZE : localX;
    const adjustedLocalZ = localZ < 0 ? localZ + this.CHUNK_SIZE : localZ;
    
    return chunk.getBlock(adjustedLocalX, y, adjustedLocalZ);
  }

  // Set block at world coordinates
  setBlock(x: number, y: number, z: number, type: BlockType): void {
    if (y < 0 || y >= this.WORLD_HEIGHT) {
      return;
    }
    
    const chunkX = Math.floor(x / this.CHUNK_SIZE);
    const chunkZ = Math.floor(z / this.CHUNK_SIZE);
    const chunkKey = `${chunkX},${chunkZ}`;
    
    const chunk = this.chunks.get(chunkKey);
    if (!chunk) {
      return;
    }
    
    const localX = Math.floor(x % this.CHUNK_SIZE);
    const localZ = Math.floor(z % this.CHUNK_SIZE);
    
    // Handle negative coordinates correctly
    const adjustedLocalX = localX < 0 ? localX + this.CHUNK_SIZE : localX;
    const adjustedLocalZ = localZ < 0 ? localZ + this.CHUNK_SIZE : localZ;
    
    chunk.setBlock(adjustedLocalX, y, adjustedLocalZ, type);
    
    // Update neighboring chunks if the block is on a boundary
    this.updateNeighborChunksIfNeeded(x, y, z);
  }

  private updateNeighborChunksIfNeeded(x: number, y: number, z: number): void {
    const localX = Math.floor(x % this.CHUNK_SIZE);
    const localZ = Math.floor(z % this.CHUNK_SIZE);
    
    // Check if the block is on a chunk boundary
    if (localX === 0 || localX === this.CHUNK_SIZE - 1 || 
        localZ === 0 || localZ === this.CHUNK_SIZE - 1) {
      
      // Update chunks in all 4 directions, only if they exist
      const directions = [
        {dx: -1, dz: 0}, // West
        {dx: 1, dz: 0},  // East
        {dx: 0, dz: -1}, // North
        {dx: 0, dz: 1}   // South
      ];
      
      const chunkX = Math.floor(x / this.CHUNK_SIZE);
      const chunkZ = Math.floor(z / this.CHUNK_SIZE);
      
      for (const {dx, dz} of directions) {
        const neighborKey = `${chunkX + dx},${chunkZ + dz}`;
        const neighborChunk = this.chunks.get(neighborKey);
        
        if (neighborChunk) {
          neighborChunk.updateMesh();
        }
      }
    }
  }

  // Ray cast for block selection
  raycast(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number = 5): { 
    position: THREE.Vector3, 
    normal: THREE.Vector3,
    blockType: BlockType
  } | null {
    // Simple ray marching algorithm
    const step = 0.1;
    const maxSteps = maxDistance / step;
    
    const ray = direction.clone().normalize();
    const currentPos = origin.clone();
    
    for (let i = 0; i < maxSteps; i++) {
      const x = Math.floor(currentPos.x);
      const y = Math.floor(currentPos.y);
      const z = Math.floor(currentPos.z);
      
      const blockType = this.getBlock(x, y, z);
      
      if (blockType !== BlockType.AIR) {
        // Calculate the normal vector (the face we hit)
        const previousPos = currentPos.clone().sub(ray.clone().multiplyScalar(step));
        const dx = Math.floor(previousPos.x) - x;
        const dy = Math.floor(previousPos.y) - y;
        const dz = Math.floor(previousPos.z) - z;
        
        const normal = new THREE.Vector3(dx, dy, dz);
        
        return {
          position: new THREE.Vector3(x, y, z),
          normal,
          blockType
        };
      }
      
      // Move along the ray
      currentPos.add(ray.clone().multiplyScalar(step));
    }
    
    return null;
  }

  update(playerPos: THREE.Vector3): void {
    const currentPlayerChunkX = Math.floor(playerPos.x / this.CHUNK_SIZE);
    const currentPlayerChunkZ = Math.floor(playerPos.z / this.CHUNK_SIZE);

    // console.log(`Player at chunk: ${currentPlayerChunkX}, ${currentPlayerChunkZ}`); // Debug log

    const requiredChunks = new Set<string>();
    const chunksToLoad: { x: number, z: number }[] = [];

    // Determine required chunks
    for (let x = currentPlayerChunkX - this.RENDER_DISTANCE; x <= currentPlayerChunkX + this.RENDER_DISTANCE; x++) {
      for (let z = currentPlayerChunkZ - this.RENDER_DISTANCE; z <= currentPlayerChunkZ + this.RENDER_DISTANCE; z++) {
        const chunkKey = `${x},${z}`;
        requiredChunks.add(chunkKey);
        if (!this.chunks.has(chunkKey)) {
          chunksToLoad.push({ x, z });
        }
      }
    }

    // // Debug log required chunks
    // if (chunksToLoad.length > 0) {
    //   console.log('Required Chunks:', Array.from(requiredChunks));
    //   console.log('Chunks to Load:', chunksToLoad);
    // }

    // Load new chunks
    chunksToLoad.forEach(({ x, z }) => {
      // console.log(`Generating chunk: ${x}, ${z}`); // Debug log
      this.generateChunk(x, z);
    });

    // Unload old chunks
    this.chunks.forEach((chunk, chunkKey) => {
      if (!requiredChunks.has(chunkKey)) {
        // console.log(`Disposing chunk: ${chunkKey}`); // Debug log
        chunk.dispose();
        this.chunks.delete(chunkKey);
      }
    });
  }
} 