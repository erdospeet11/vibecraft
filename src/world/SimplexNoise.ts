// A simple implementation of Perlin noise to replace THREE.js SimplexNoise
export class SimplexNoise {
  private perm: number[] = [];
  private gradP: number[][] = [];
  private grad3: number[][] = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
  ];

  constructor(seed: number = Math.random()) {
    this.seed(seed);
  }

  private seed(seed: number): void {
    if (seed > 0 && seed < 1) {
      seed *= 65536;
    }

    seed = Math.floor(seed);
    if (seed < 256) {
      seed |= seed << 8;
    }

    const p = this.perm = new Array(512);
    const gradP = this.gradP = new Array(512);

    // Generate permutation table
    for (let i = 0; i < 256; i++) {
      let v;
      if (i & 1) {
        v = 3 * i ^ seed;
      } else {
        v = i ^ seed;
      }
      p[i] = p[i + 256] = v % 256;
    }

    // Associate gradient with permutation
    for (let i = 0; i < 512; i++) {
      gradP[i] = this.grad3[p[i] % 12];
    }
  }

  // 2D Perlin Noise
  noise(x: number, y: number): number {
    // Find unit grid cell containing point
    let X = Math.floor(x);
    let Y = Math.floor(y);
    
    // Get relative coordinates of point within that cell
    x = x - X;
    y = y - Y;
    
    // Wrap the integer cells at 255
    X = X & 255;
    Y = Y & 255;

    // Calculate a set of four hashed gradient indices
    const n00 = this.dot(this.gradP[(X + this.perm[Y]) & 511], x, y);
    const n01 = this.dot(this.gradP[(X + this.perm[Y + 1]) & 511], x, y - 1);
    const n10 = this.dot(this.gradP[(X + 1 + this.perm[Y]) & 511], x - 1, y);
    const n11 = this.dot(this.gradP[(X + 1 + this.perm[Y + 1]) & 511], x - 1, y - 1);

    // Compute the fade curve
    const u = this.fade(x);

    // Interpolate the four results
    return this.lerp(
      this.lerp(n00, n10, u),
      this.lerp(n01, n11, u),
      this.fade(y)
    );
  }

  private dot(g: number[], x: number, y: number): number {
    return g[0] * x + g[1] * y;
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }
} 