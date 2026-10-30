export interface SpatialItem {
  id: string;
  x: number;
  y: number;
  radius: number;
  data: any;
}

export class SpatialHashGrid<T = any> {
  private cellSize: number;
  private cells: Map<string, SpatialItem[]>;

  constructor(cellSize: number = 160) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  private getKey(cx: number, cy: number): string {
    return `${cx}:${cy}`;
  }

  clear(): void {
    this.cells.clear();
  }

  insert(item: SpatialItem): void {
    const minCx = Math.floor((item.x - item.radius) / this.cellSize);
    const maxCx = Math.floor((item.x + item.radius) / this.cellSize);
    const minCy = Math.floor((item.y - item.radius) / this.cellSize);
    const maxCy = Math.floor((item.y + item.radius) / this.cellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = this.getKey(cx, cy);
        let cell = this.cells.get(key);
        if (!cell) {
          cell = [];
          this.cells.set(key, cell);
        }
        cell.push(item);
      }
    }
  }

  queryRadius(x: number, y: number, radius: number): SpatialItem[] {
    const results: SpatialItem[] = [];
    const visited = new Set<string>();

    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);
    const radiusSq = radius * radius;

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = this.getKey(cx, cy);
        const cell = this.cells.get(key);
        if (!cell) continue;

        for (let i = 0; i < cell.length; i++) {
          const item = cell[i];
          if (visited.has(item.id)) continue;
          visited.add(item.id);

          const dx = item.x - x;
          const dy = item.y - y;
          const combinedRadius = radius + item.radius;
          if (dx * dx + dy * dy <= combinedRadius * combinedRadius) {
            results.push(item);
          }
        }
      }
    }

    return results;
  }
}

