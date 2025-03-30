import * as THREE from 'three';
import { BlockType } from './BlockType';

export class TextureManager {
  private textureLoader: THREE.TextureLoader;
  private textures: Map<BlockType, THREE.Texture[]>;
  
  constructor() {
    this.textureLoader = new THREE.TextureLoader();
    this.textures = new Map();
    
    this.loadTextures();
  }
  
  private loadTextures(): void {
    // Define default texture for missing textures
    const defaultTexture = this.createDefaultTexture();
    
    // Create simple colored textures for each block type with consistent settings
    this.createTextureSet(BlockType.DIRT, 0x8B4513);  // Brown
    this.createTextureSet(BlockType.STONE, 0x808080); // Gray
    this.createTextureSet(BlockType.WOOD, 0x966F33);  // Brown wood
    this.createTextureSet(BlockType.LEAVES, 0x2E8B57, 0.8); // Dark green with slight transparency
    this.createTextureSet(BlockType.WATER, 0x4169E1, 0.7); // Blue with transparency
    this.createTextureSet(BlockType.SAND, 0xF4A460);  // Sand yellow
    this.createTextureSet(BlockType.GLASS, 0xADD8E6, 0.3); // Light blue with transparency
    this.createTextureSet(BlockType.BRICK, 0xB22222); // Fire brick red
    this.createTextureSet(BlockType.BEDROCK, 0x333333); // Dark gray
    
    // Special case for grass block
    const grassTop = this.createColoredTexture(0x3BBF4A); // Green top
    const grassSide = this.createBicolorTexture(0x3BBF4A, 0x8B4513); // Green+brown side
    const grassBottom = this.createColoredTexture(0x8B4513); // Brown bottom
    
    // Set different textures for each face of the grass block
    // Order: right, left, top, bottom, front, back
    this.textures.set(BlockType.GRASS, [
      grassSide, grassSide, grassTop, grassBottom, grassSide, grassSide
    ]);
  }
  
  private createTextureSet(type: BlockType, color: number, opacity: number = 1.0): void {
    // For sides
    const mainTexture = this.createColoredTexture(color, opacity);
    // For top (slightly lighter)
    const topTexture = this.createColoredTexture(this.lightenColor(color, 20), opacity);
    // For bottom (slightly darker)
    const bottomTexture = this.createColoredTexture(this.darkenColor(color, 20), opacity);
    
    // Create an array with textures for all 6 faces (right, left, top, bottom, front, back)
    this.textures.set(type, [
      mainTexture, mainTexture, topTexture, bottomTexture, mainTexture, mainTexture
    ]);
  }
  
  private lightenColor(color: number, percent: number): number {
    const r = Math.min(255, ((color >> 16) & 255) + percent);
    const g = Math.min(255, ((color >> 8) & 255) + percent);
    const b = Math.min(255, (color & 255) + percent);
    return (r << 16) | (g << 8) | b;
  }
  
  private darkenColor(color: number, percent: number): number {
    const r = Math.max(0, ((color >> 16) & 255) - percent);
    const g = Math.max(0, ((color >> 8) & 255) - percent);
    const b = Math.max(0, (color & 255) - percent);
    return (r << 16) | (g << 8) | b;
  }
  
  private createDefaultTexture(): THREE.Texture {
    // Create a small canvas for the texture
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Draw purple/black checkerboard (missing texture indicator)
      ctx.fillStyle = '#FF00FF'; // Magenta
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#000000'; // Black
      ctx.fillRect(0, 0, 8, 8);
      ctx.fillRect(8, 8, 8, 8);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }
  
  private createColoredTexture(color: number, opacity: number = 1.0): THREE.Texture {
    // Create a small canvas for the texture
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Convert hex color to RGB
      const r = (color >> 16) & 255;
      const g = (color >> 8) & 255;
      const b = color & 255;
      
      // Fill the canvas with the color
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      ctx.fillRect(0, 0, 16, 16);
      
      // Add some noise for texture
      ctx.fillStyle = `rgba(0, 0, 0, 0.1)`;
      for (let i = 0; i < 30; i++) {
        const x = Math.floor(Math.random() * 16);
        const y = Math.floor(Math.random() * 16);
        ctx.fillRect(x, y, 1, 1);
      }
      
      // Add a slight border
      ctx.strokeStyle = `rgba(0, 0, 0, 0.2)`;
      ctx.strokeRect(0, 0, 16, 16);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }
  
  private createBicolorTexture(topColor: number, bottomColor: number): THREE.Texture {
    // Create a small canvas for the texture
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Convert hex colors to RGB
      const topR = (topColor >> 16) & 255;
      const topG = (topColor >> 8) & 255;
      const topB = topColor & 255;
      
      const bottomR = (bottomColor >> 16) & 255;
      const bottomG = (bottomColor >> 8) & 255;
      const bottomB = bottomColor & 255;
      
      // Fill the top part with the top color
      ctx.fillStyle = `rgb(${topR}, ${topG}, ${topB})`;
      ctx.fillRect(0, 0, 16, 4);
      
      // Fill the bottom part with the bottom color
      ctx.fillStyle = `rgb(${bottomR}, ${bottomG}, ${bottomB})`;
      ctx.fillRect(0, 4, 16, 12);
      
      // Add some noise for texture
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      for (let i = 0; i < 30; i++) {
        const x = Math.floor(Math.random() * 16);
        const y = Math.floor(Math.random() * 16);
        ctx.fillRect(x, y, 1, 1);
      }
      
      // Add a slight border
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.strokeRect(0, 0, 16, 16);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }
  
  // Get textures for a specific block type
  getTextures(type: BlockType): THREE.Texture[] {
    const textures = this.textures.get(type);
    
    if (!textures) {
      // Return default texture if type is not found
      const defaultTexture = this.createDefaultTexture();
      return Array(6).fill(defaultTexture);
    }
    
    return textures;
  }
} 