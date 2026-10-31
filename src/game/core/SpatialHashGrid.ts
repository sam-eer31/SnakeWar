export interface SpatialItem {
  id: string;
  x: number;
  y: number;
  radius: number;
  data: any;
  _queryId?: number;
}

export class SpatialHashGrid<T = any> {
  private cellSize: number;
  private cells: Map<number, SpatialItem[]>;
  private itemCells: Map<string, number[]>;
  private currentQueryId: number = 1;

  constructor(cellSize: number = 160) {
    this.cellSize = cellSize;
    this.cells = new Map();
    this.itemCells = new Map();
  }

  // Pure integer bit-hash: zero string allocations in V8
  private getKey(cx: number, cy: number): number {
    return ((cx + 32768) & 0xffff) | (((cy + 32768) & 0xffff) << 16);
  }

  clear(): void {
    this.cells.clear();
    this.itemCells.clear();
  }

  insert(item: SpatialItem): void {
    const minCx = Math.floor((item.x - item.radius) / this.cellSize);
    const maxCx = Math.floor((item.x + item.radius) / this.cellSize);
    const minCy = Math.floor((item.y - item.radius) / this.cellSize);
    const maxCy = Math.floor((item.y + item.radius) / this.cellSize);

    const keys: number[] = [];

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = this.getKey(cx, cy);
        keys.push(key);
        let cell = this.cells.get(key);
        if (!cell) {
          cell = [];
          this.cells.set(key, cell);
        }
        cell.push(item);
      }
    }

    this.itemCells.set(item.id, keys);
  }

  remove(itemId: string): void {
    const keys = this.itemCells.get(itemId);
    if (!keys) return;

    for (let k = 0; k < keys.length; k++) {
      const cell = this.cells.get(keys[k]);
      if (cell) {
        const idx = cell.findIndex((it) => it.id === itemId);
        if (idx !== -1) {
          const last = cell.pop()!;
          if (idx < cell.length) {
            cell[idx] = last;
          }
        }
      }
    }

    this.itemCells.delete(itemId);
  }

  updateItem(item: SpatialItem): void {
    this.remove(item.id);
    this.insert(item);
  }

  queryRadius(x: number, y: number, radius: number): SpatialItem[] {
    const results: SpatialItem[] = [];
    const qId = ++this.currentQueryId;
    if (this.currentQueryId > 2000000000) this.currentQueryId = 1;

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

        const len = cell.length;
        for (let i = 0; i < len; i++) {
          const item = cell[i];
          if (item._queryId === qId) continue;
          item._queryId = qId;

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

