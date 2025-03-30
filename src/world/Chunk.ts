import * as THREE from 'three';
import { BlockType } from './BlockType';
import { TextureManager } from './TextureManager';
import { SimplexNoise } from './SimplexNoise';
import { World } from './World';

export class Chunk {
  private scene: THREE.Scene;
  private textureManager: TextureManager;
  private chunkX: number;
  private chunkZ: number;
  private size: number;
  private height: number;
  private blocks: BlockType[][][];
  private mesh: THREE.Group;
  private simplex: SimplexNoise;
  private world: World | null = null;
  
  constructor(
    scene: THREE.Scene,
    textureManager: TextureManager,
    chunkX: number,
    chunkZ: number,
    size: number,
    height: number
  ) {
    this.scene = scene;
    this.textureManager = textureManager;
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.size = size;
    this.height = height;
    this.mesh = new THREE.Group();
    this.simplex = new SimplexNoise();
    
    // Initialize 3D array for blocks
    this.blocks = Array(size).fill(null).map(() => 
      Array(height).fill(null).map(() => 
        Array(size).fill(BlockType.AIR)
      )
    );
    
    // Add mesh to scene
    scene.add(this.mesh);
    
    // Position the chunk correctly in world space
    this.mesh.position.set(
      this.chunkX * this.size,
      0,
      this.chunkZ * this.size
    );
  }
  
  // Set reference to the world
  setWorld(world: World): void {
    this.world = world;
  }
  
  // Generate terrain for this chunk
  generate(): void {
    const worldX = this.chunkX * this.size;
    const worldZ = this.chunkZ * this.size;
    
    // Generate terrain heightmap
    for (let x = 0; x < this.size; x++) {
      for (let z = 0; z < this.size; z++) {
        // Calculate absolute world position for noise functions
        const absX = worldX + x;
        const absZ = worldZ + z;
        
        // Get terrain height at this position (0-100)
        const terrainHeight = this.getTerrainHeight(absX, absZ);
        
        // Fill blocks from bottom to top
        for (let y = 0; y < this.height; y++) {
          // Bedrock at bottom
          if (y === 0) {
            this.blocks[x][y][z] = BlockType.BEDROCK;
          }
          // Stone layer
          else if (y < terrainHeight - 4) {
            this.blocks[x][y][z] = BlockType.STONE;
          }
          // Dirt layer
          else if (y < terrainHeight - 1) {
            this.blocks[x][y][z] = BlockType.DIRT;
          }
          // Surface block - grass, sand, or stone depending on height
          else if (y === Math.floor(terrainHeight - 1)) {
            // Beaches near water level
            if (terrainHeight < 12) {
              this.blocks[x][y][z] = BlockType.SAND;
            } 
            // Higher elevations get stone
            else if (terrainHeight > 24) {
              this.blocks[x][y][z] = BlockType.STONE;
            }
            // Otherwise grass
            else {
              this.blocks[x][y][z] = BlockType.GRASS;
            }
          }
          // Water in lower areas
          else if (y < 10 && terrainHeight < 10) {
            this.blocks[x][y][z] = BlockType.WATER;
          }
          // Air above terrain
          else {
            this.blocks[x][y][z] = BlockType.AIR;
          }
        }
        
        // Add trees randomly
        if (this.blocks[x][Math.floor(terrainHeight - 1)][z] === BlockType.GRASS) {
          // 2% chance for a tree
          if (Math.random() < 0.02) {
            this.generateTree(x, Math.floor(terrainHeight), z);
          }
        }
      }
    }
    
    // Build the mesh for this chunk
    this.updateMesh();
  }
  
  // Generate a tree at the given position
  private generateTree(x: number, y: number, z: number): void {
    // Check if we have enough space for the tree
    if (x < 2 || x >= this.size - 2 || z < 2 || z >= this.size - 2 || y + 5 >= this.height) {
      return;
    }
    
    // Tree trunk
    const trunkHeight = 4 + Math.floor(Math.random() * 3);
    for (let tY = 0; tY < trunkHeight; tY++) {
      this.blocks[x][y + tY][z] = BlockType.WOOD;
    }
    
    // Tree leaves (simple spherical shape)
    const leafRadius = 2;
    for (let lX = -leafRadius; lX <= leafRadius; lX++) {
      for (let lY = -leafRadius; lY <= leafRadius; lY++) {
        for (let lZ = -leafRadius; lZ <= leafRadius; lZ++) {
          // Create a rough sphere of leaves
          const distance = Math.sqrt(lX * lX + lY * lY + lZ * lZ);
          if (distance <= leafRadius) {
            const worldX = x + lX;
            const worldY = y + trunkHeight + lY;
            const worldZ = z + lZ;
            
            // Make sure we're within the chunk boundaries
            if (worldX >= 0 && worldX < this.size && 
                worldY >= 0 && worldY < this.height && 
                worldZ >= 0 && worldZ < this.size) {
              // Don't overwrite trunk blocks
              if (!(lX === 0 && lZ === 0 && lY < 0)) {
                this.blocks[worldX][worldY][worldZ] = BlockType.LEAVES;
              }
            }
          }
        }
      }
    }
  }
  
  // Calculate terrain height using noise functions
  private getTerrainHeight(x: number, z: number): number {
    // Large scale noise for overall terrain shape
    const largeScale = 0.01;
    const largeMagnitude = 20;
    const largeNoise = this.simplex.noise(x * largeScale, z * largeScale) * largeMagnitude;
    
    // Medium scale noise for hills/valleys
    const mediumScale = 0.05;
    const mediumMagnitude = 10;
    const mediumNoise = this.simplex.noise(x * mediumScale, z * mediumScale) * mediumMagnitude;
    
    // Small scale noise for terrain details
    const smallScale = 0.2;
    const smallMagnitude = 3;
    const smallNoise = this.simplex.noise(x * smallScale, z * smallScale) * smallMagnitude;
    
    // Combine noise layers and ensure minimum height
    const baseHeight = 10;
    const terrainHeight = baseHeight + largeNoise + mediumNoise + smallNoise;
    
    return Math.max(1, Math.min(this.height - 1, terrainHeight));
  }
  
  // Check if a block should have a face visible in the given direction
  private isFaceVisible(x: number, y: number, z: number, dx: number, dy: number, dz: number): boolean {
    // Check if the adjacent block is outside of chunk boundaries
    const nx = x + dx;
    const ny = y + dy;
    const nz = z + dz;
    
    // If adjacent block is outside the chunk
    if (nx < 0 || nx >= this.size || ny < 0 || ny >= this.height || nz < 0 || nz >= this.size) {
      // If this is at the edge of the chunk, check the neighboring chunk
      const worldX = this.chunkX * this.size + x;
      const worldZ = this.chunkZ * this.size + z;
      
      // Use the chunk's position to get the world coordinates
      const adjacentWorldX = worldX + dx;
      const adjacentWorldY = ny;
      const adjacentWorldZ = worldZ + dz;
      
      // Ask the world for the block type at this position if world reference exists
      if (this.world) {
        const adjacentBlockType = this.world.getBlock(adjacentWorldX, adjacentWorldY, adjacentWorldZ);
        
        // If the adjacent block is air, the face is visible
        if (adjacentBlockType === BlockType.AIR) {
          return true;
        }
        
        // If adjacent block is transparent (but not the same as current block),
        // show the face (e.g., when water is adjacent to glass)
        const currentBlockType = this.blocks[x][y][z];
        if (currentBlockType !== adjacentBlockType && 
            [BlockType.WATER, BlockType.GLASS, BlockType.LEAVES].includes(adjacentBlockType)) {
          return true;
        }
        
        return false;
      }
      
      // If no world reference, assume visible
      return true;
    }
    
    // Get the type of the adjacent block
    const adjacentType = this.blocks[nx][ny][nz];
    const currentType = this.blocks[x][y][z];
    
    // If the adjacent block is air, the face is visible
    if (adjacentType === BlockType.AIR) {
      return true;
    }
    
    // If the current block is transparent, we show faces between transparent blocks 
    // of different types (e.g., water next to glass)
    if (currentType !== adjacentType && 
        [BlockType.WATER, BlockType.GLASS, BlockType.LEAVES].includes(currentType) &&
        [BlockType.WATER, BlockType.GLASS, BlockType.LEAVES].includes(adjacentType)) {
      return true;
    }
    
    // Handle transparency - if adjacent block is transparent and current isn't, show face
    return (currentType !== adjacentType) && 
           [BlockType.WATER, BlockType.GLASS, BlockType.LEAVES].includes(adjacentType);
  }
  
  // Build a mesh for the chunk based on visible blocks
  updateMesh(): void {
    // Remove old mesh
    this.mesh.clear();
    
    // Create geometry for each block type
    const blockMaterials = new Map<BlockType, THREE.Material>();
    const blockFaceGeometries = new Map<string, {
      positions: number[], 
      normals: number[], 
      uvs: number[], 
      indices: number[]
    }>();
    
    // Track number of faces for stats
    let totalFaces = 0;
    
    // Define directions for each face
    const directions = [
      { dir: [1, 0, 0], norm: [1, 0, 0], uvs: [0, 1, 1, 1, 1, 0, 0, 0] }, // right
      { dir: [-1, 0, 0], norm: [-1, 0, 0], uvs: [0, 1, 1, 1, 1, 0, 0, 0] }, // left
      { dir: [0, 1, 0], norm: [0, 1, 0], uvs: [0, 1, 1, 1, 1, 0, 0, 0] }, // top
      { dir: [0, -1, 0], norm: [0, -1, 0], uvs: [0, 1, 1, 1, 1, 0, 0, 0] }, // bottom
      { dir: [0, 0, 1], norm: [0, 0, 1], uvs: [0, 1, 1, 1, 1, 0, 0, 0] }, // front
      { dir: [0, 0, -1], norm: [0, 0, -1], uvs: [0, 1, 1, 1, 1, 0, 0, 0] }, // back
    ];
    
    // Loop through all blocks in the chunk
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.height; y++) {
        for (let z = 0; z < this.size; z++) {
          const blockType = this.blocks[x][y][z];
          
          // Skip air blocks
          if (blockType === BlockType.AIR) {
            continue;
          }
          
          // Create materials for this block type if needed
          if (!blockMaterials.has(blockType)) {
            const textures = this.textureManager.getTextures(blockType);
            
            // We'll create a material for each block type
            const material = new THREE.MeshLambertMaterial({ 
              map: textures[0],  // Use the first texture as default
              transparent: [BlockType.WATER, BlockType.GLASS, BlockType.LEAVES].includes(blockType),
              opacity: blockType === BlockType.WATER ? 0.7 : 
                      blockType === BlockType.GLASS ? 0.3 : 
                      blockType === BlockType.LEAVES ? 0.8 : 1.0,
              side: THREE.DoubleSide, // Use double-sided rendering to ensure all faces are visible
              depthWrite: blockType !== BlockType.WATER && blockType !== BlockType.GLASS // Disable depth write for transparent blocks
            });
            
            blockMaterials.set(blockType, material);
          }
          
          // Check each face of the block
          for (let i = 0; i < directions.length; i++) {
            const dx = directions[i].dir[0];
            const dy = directions[i].dir[1];
            const dz = directions[i].dir[2];
            
            // Only add faces that are visible
            if (this.isFaceVisible(x, y, z, dx, dy, dz)) {
              totalFaces++;
              
              // Create unique key for this block type and direction
              const geoKey = `${blockType}_${i}`;
              
              // Create geometry for this face type if needed
              if (!blockFaceGeometries.has(geoKey)) {
                blockFaceGeometries.set(geoKey, {
                  positions: [], 
                  normals: [], 
                  uvs: [], 
                  indices: []
                });
              }
              
              const geo = blockFaceGeometries.get(geoKey)!;
              const vOffset = geo.positions.length / 3;
              
              // Face vertices
              const fx = x + 0.5 + dx * 0.5;
              const fy = y + 0.5 + dy * 0.5;
              const fz = z + 0.5 + dz * 0.5;
              
              // Generate vertices more efficiently with less object creation
              let tx = 0, ty = 0, tz = 0;
              let bx = 0, by = 0, bz = 0;
              
              if (Math.abs(dy) > 0.5) {
                // Top/bottom face
                tx = 1; ty = 0; tz = 0;
                bx = 0; by = 0; bz = 1;
              } else if (Math.abs(dx) > 0.5) {
                // Left/right face
                tx = 0; ty = 0; tz = 1;
                bx = 0; by = 1; bz = 0;
              } else {
                // Front/back face
                tx = 1; ty = 0; tz = 0;
                bx = 0; by = 1; bz = 0;
              }
              
              // Scale tangent and bitangent
              tx *= 0.5; ty *= 0.5; tz *= 0.5;
              bx *= 0.5; by *= 0.5; bz *= 0.5;
              
              // For top faces, we need to adjust the winding order to make them visible
              if (dy > 0) {
                // Top face - counter-clockwise winding
                geo.positions.push(
                  fx - tx - bx, fy, fz - tz - bz, // bottom left
                  fx + tx - bx, fy, fz + tz - bz, // bottom right
                  fx + tx + bx, fy, fz + tz + bz, // top right
                  fx - tx + bx, fy, fz - tz + bz  // top left
                );
              } else if (dy < 0) {
                // Bottom face - reverse winding for bottom face
                geo.positions.push(
                  fx - tx - bx, fy, fz - tz - bz, // bottom left
                  fx - tx + bx, fy, fz - tz + bz, // top left
                  fx + tx + bx, fy, fz + tz + bz, // top right
                  fx + tx - bx, fy, fz + tz - bz  // bottom right
                );
              } else {
                // Side faces - standard winding
                geo.positions.push(
                  fx - tx - bx, fy - ty - by, fz - tz - bz, // v1 (bottom left)
                  fx + tx - bx, fy + ty - by, fz + tz - bz, // v2 (bottom right)
                  fx + tx + bx, fy + ty + by, fz + tz + bz, // v3 (top right)
                  fx - tx + bx, fy - ty + by, fz - tz + bz  // v4 (top left)
                );
              }
              
              // Add face normal - ensure correct normal for each face direction
              const nx = directions[i].norm[0];
              const ny = directions[i].norm[1];
              const nz = directions[i].norm[2];
              
              // Make sure normals are exactly along the face direction
              // This is important for correct lighting on each face
              if (Math.abs(dx) > 0.5) {
                // Right/left face
                for (let j = 0; j < 4; j++) {
                  geo.normals.push(dx, 0, 0);
                }
              } else if (Math.abs(dy) > 0.5) {
                // Top/bottom face
                for (let j = 0; j < 4; j++) {
                  geo.normals.push(0, dy, 0);
                }
              } else {
                // Front/back face
                for (let j = 0; j < 4; j++) {
                  geo.normals.push(0, 0, dz);
                }
              }
              
              // Add UVs - proper order for WebGL texture coordinates based on face orientation
              if (dy > 0) {
                // Top face
                geo.uvs.push(
                  0, 0, // v1 (bottom left)
                  1, 0, // v2 (bottom right)
                  1, 1, // v3 (top right)
                  0, 1  // v4 (top left)
                );
              } else if (dy < 0) {
                // Bottom face - same UVs as top but different winding
                geo.uvs.push(
                  0, 0, // v1 (bottom left)
                  0, 1, // v2 (top left)
                  1, 1, // v3 (top right)
                  1, 0  // v4 (bottom right)
                );
              } else {
                // Side faces
                geo.uvs.push(
                  0, 0, // v1 (bottom left)
                  1, 0, // v2 (bottom right)
                  1, 1, // v3 (top right)
                  0, 1  // v4 (top left)
                );
              }
              
              // Add indices for two triangles with correct winding order
              // For different face directions, we may need different winding orders
              if (dy > 0) {
                // Top face - counter-clockwise winding
                geo.indices.push(
                  vOffset, vOffset + 1, vOffset + 2, // first triangle (bottom-left, bottom-right, top-right)
                  vOffset, vOffset + 2, vOffset + 3  // second triangle (bottom-left, top-right, top-left)
                );
              } else if (dy < 0) {
                // Bottom face - reverse winding for bottom face
                geo.indices.push(
                  vOffset, vOffset + 3, vOffset + 2, // first triangle (reverse order)
                  vOffset, vOffset + 2, vOffset + 1  // second triangle (reverse order)
                );
              } else {
                // Side faces - standard winding
                geo.indices.push(
                  vOffset, vOffset + 1, vOffset + 2, // first triangle
                  vOffset, vOffset + 2, vOffset + 3  // second triangle
                );
              }
            }
          }
        }
      }
    }
    
    // Create meshes for each block type and face direction
    blockFaceGeometries.forEach((geo, geoKey) => {
      if (geo.positions.length === 0) return;
      
      const [blockTypeStr, faceIndexStr] = geoKey.split('_');
      const blockType = parseInt(blockTypeStr) as BlockType;
      const faceIndex = parseInt(faceIndexStr);
      
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(geo.positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(geo.normals, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(geo.uvs, 2));
      geometry.setIndex(geo.indices);
      
      // Optional: geometry optimization
      geometry.computeBoundingSphere();
      
      // Get base material and clone it for this specific face
      const baseMaterial = blockMaterials.get(blockType)! as THREE.MeshLambertMaterial;
      const material = baseMaterial.clone();
      
      // Get appropriate texture for this face
      const textures = this.textureManager.getTextures(blockType);
      if (textures.length > faceIndex) {
        material.map = textures[faceIndex];
      }
      
      const mesh = new THREE.Mesh(geometry, material);
      
      // Add the mesh to the chunk group
      this.mesh.add(mesh);
    });
    
    // console.log(`Chunk ${this.chunkX},${this.chunkZ} rendered with ${totalFaces} faces`);
  }
  
  // Get block at local chunk coordinates
  getBlock(x: number, y: number, z: number): BlockType {
    if (x < 0 || x >= this.size || y < 0 || y >= this.height || z < 0 || z >= this.size) {
      return BlockType.AIR;
    }
    
    return this.blocks[x][y][z];
  }
  
  // Set block at local chunk coordinates and update mesh
  setBlock(x: number, y: number, z: number, type: BlockType): void {
    if (x < 0 || x >= this.size || y < 0 || y >= this.height || z < 0 || z >= this.size) {
      return;
    }
    
    this.blocks[x][y][z] = type;
    this.updateMesh();
  }
  
  // Cleanup resources when chunk is unloaded
  dispose(): void {
    // Remove the chunk mesh from the scene
    this.scene.remove(this.mesh);
    
    // Dispose of geometries and materials
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      }
    });
  }
} 