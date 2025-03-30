import * as THREE from 'three';
import { SimplexNoise } from './SimplexNoise';

export class Sky {
  private scene: THREE.Scene;
  private clouds: THREE.Group;
  private simplex: SimplexNoise;
  private cloudTexture: THREE.Texture;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.clouds = new THREE.Group();
    this.simplex = new SimplexNoise();
    this.cloudTexture = this.createCloudTexture();

    this.generateClouds();
    this.scene.add(this.clouds);
  }

  private createCloudTexture(): THREE.Texture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Create a transparent background
      ctx.fillStyle = 'rgba(0, 0, 0, 0)';
      ctx.fillRect(0, 0, size, size);

      // Draw multiple overlapping circles with feathered edges for a cloud shape
      for (let i = 0; i < 20; i++) {
        const radius = Math.random() * 20 + 10; // Random radius
        const x = Math.random() * size;
        const y = Math.random() * size;

        // Create radial gradient for soft edges
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)'); // Opaque center
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)'); // Transparent edge

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.needsUpdate = true;
    return texture;
  }

  private generateClouds(): void {
    const cloudMaterial = new THREE.MeshBasicMaterial({
      map: this.cloudTexture,
      transparent: true,
      opacity: 0.8,
      depthWrite: false, // Don't write to depth buffer
      side: THREE.DoubleSide
    });

    const cloudGeometry = new THREE.PlaneGeometry(100, 100); // Large plane for each cloud patch
    const numClouds = 50;
    const spread = 500; // How far the clouds spread out
    const cloudHeight = 150; // Height of the clouds

    for (let i = 0; i < numClouds; i++) {
      const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);

      // Random position within the spread area
      const x = (Math.random() - 0.5) * spread * 2;
      const z = (Math.random() - 0.5) * spread * 2;
      
      cloudMesh.position.set(x, cloudHeight + (Math.random() - 0.5) * 10, z);
      cloudMesh.rotation.x = -Math.PI / 2; // Lay flat
      cloudMesh.rotation.z = Math.random() * Math.PI * 2; // Random rotation

      this.clouds.add(cloudMesh);
    }
  }

  update(delta: number): void {
    // Move clouds slowly
    this.clouds.children.forEach(cloud => {
      // Simple linear movement for now
      cloud.position.x += 5 * delta; // Adjust speed as needed
      
      // Wrap clouds around when they go too far
      const wrapDistance = 600;
      if (cloud.position.x > wrapDistance) {
        cloud.position.x -= wrapDistance * 2;
      }
    });
  }
} 