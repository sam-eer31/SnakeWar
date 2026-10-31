import { Server, routePartykitRequest, type Connection, type ConnectionContext, type WSMessage } from "partyserver";

export interface Env {
  SnakeRoom: {
    get: (id: any) => { fetch: (url: string, init?: any) => Promise<Response> };
    idFromName: (name: string) => any;
  };
}

export interface RoomMetadata {
  id: string;
  name: string;
  hostName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  snakesCount: number;
  playersCount: number;
  uptimeSeconds: number;
  updatedAt: number;
}

export class SnakeRoom extends Server<Env> {
  public env: Env;
  public ctx: any;
  private hostConnId: string | null = null;
  private metadata: RoomMetadata | null = null;
  private lastLobbyHeartbeat: number = 0;

  // In-memory lobby registry (active on the 'lobby' room instance)
  private publicRooms = new Map<string, RoomMetadata>();

  constructor(ctx: any, env: Env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
  }

  private async ensureLobbyRoomsLoaded() {
    if (this.name !== 'lobby') return;
    if (this.publicRooms.size === 0) {
      try {
        const stored = (await this.ctx.storage.get('public_rooms')) as [string, RoomMetadata][] | undefined;
        if (stored) {
          for (const [k, v] of stored) {
            this.publicRooms.set(k, v);
          }
        }
      } catch {}
    }
  }

  async onStart() {
    if (this.name === 'lobby') {
      await this.ensureLobbyRoomsLoaded();
    }
  }

  async onConnect(conn: Connection, _ctx: ConnectionContext) {
    if (this.name === 'lobby') {
      await this.ensureLobbyRoomsLoaded();
      this.cleanExpiredRooms();
      conn.send(JSON.stringify({
        type: 'community_rooms',
        rooms: Array.from(this.publicRooms.values()),
      }));
      return;
    }

    conn.send(JSON.stringify({
      type: 'connected_to_room',
      roomId: this.name,
      hasHost: this.hostConnId !== null,
    }));
  }

  async onMessage(conn: Connection, message: WSMessage) {
    try {
      const raw = typeof message === 'string' ? message : new TextDecoder().decode(message);
      const data = JSON.parse(raw);

      // --- LOBBY OPERATIONS ---
      if (this.name === 'lobby') {
        if (data.type === 'register_public_room' && data.room) {
          this.publicRooms.set(data.room.id, {
            ...data.room,
            updatedAt: Date.now(),
          });
          this.broadcastLobbyUpdate();
        } else if (data.type === 'unregister_public_room' && data.roomId) {
          this.publicRooms.delete(data.roomId);
          this.broadcastLobbyUpdate();
        } else if (data.type === 'get_rooms') {
          await this.ensureLobbyRoomsLoaded();
          this.cleanExpiredRooms();
          conn.send(JSON.stringify({
            type: 'community_rooms',
            rooms: Array.from(this.publicRooms.values()),
          }));
        }
        return;
      }

      // --- GAMEPLAY ROOM OPERATIONS ---

      // 1. Host announces itself
      if (data.type === 'claim_host') {
        this.hostConnId = conn.id;
        this.metadata = data.metadata || null;

        // If public, inform lobby room
        if (data.isPublic && this.metadata) {
          await this.notifyLobby('register', this.metadata);
        }

        conn.send(JSON.stringify({ type: 'host_claimed', roomId: this.name }));
        return;
      }

      // 2. Guest requests to join room
      if (data.type === 'guest_join') {
        const host = this.getHostConnection();
        if (host) {
          host.send(JSON.stringify({
            type: 'guest_joined',
            guestConnId: conn.id,
            name: data.name,
            skinId: data.skinId,
            isSpectator: !!data.isSpectator,
          }));
        } else {
          conn.send(JSON.stringify({
            type: 'error',
            code: 'NO_HOST',
            message: 'Waiting for room host to initialize...',
          }));
        }
        return;
      }

      // 3. Host sending snapshots or tick updates
      if (conn.id === this.hostConnId) {
        const now = Date.now();
        if (this.metadata && now - this.lastLobbyHeartbeat > 25000) {
          this.lastLobbyHeartbeat = now;
          this.metadata.updatedAt = now;
          this.notifyLobby('register', this.metadata).catch(() => {});
        }

        if ((data.type === 'init_response' || data.type === 'game_over_response') && data.targetConnId) {
          const guest = this.getConnection(data.targetConnId);
          if (guest) {
            guest.send(JSON.stringify(data.packet));
          }
        } else if (data.type === 'peer_pong' && data.guestConnId) {
          const guest = this.getConnection(data.guestConnId);
          if (guest) {
            guest.send(JSON.stringify({ type: 'pong', t: data.t }));
          }
        } else if (data.type === 'tick') {
          this.broadcast(raw, [conn.id]);
        } else if (data.type === 'player_joined' || data.type === 'player_left') {
          this.broadcast(raw, [conn.id]);
        }
        return;
      }

      // 4. Guest sends input
      if (data.type === 'input') {
        const host = this.getHostConnection();
        if (host) {
          host.send(JSON.stringify({
            type: 'guest_input',
            guestConnId: conn.id,
            angle: data.angle,
            isBoosting: data.isBoosting,
          }));
        }
        return;
      }

      // 5. Latency ping (measured end-to-end between Guest and Host)
      if (data.type === 'ping') {
        const host = this.getHostConnection();
        if (host && conn.id !== this.hostConnId) {
          host.send(JSON.stringify({ type: 'peer_ping', guestConnId: conn.id, t: data.t }));
        } else {
          conn.send(JSON.stringify({ type: 'pong', t: data.t }));
        }
        return;
      }
    } catch (err) {
      console.error('PartyServer message error:', err);
    }
  }

  async onClose(conn: Connection, _code: number, _reason: string, _wasClean: boolean) {
    if (this.name === 'lobby') return;

    if (conn.id === this.hostConnId) {
      this.hostConnId = null;
      this.broadcast(JSON.stringify({
        type: 'room_closed',
        message: 'The match host has disconnected.',
      }));
      await this.notifyLobby('unregister', { roomId: this.name });
    } else {
      const host = this.getHostConnection();
      if (host) {
        host.send(JSON.stringify({
          type: 'guest_left',
          guestConnId: conn.id,
        }));
      }
    }
  }

  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (this.name === 'lobby') {
      if (url.pathname.endsWith('/api/register') && request.method === 'POST') {
        const meta = await request.json() as RoomMetadata;
        this.publicRooms.set(meta.id, { ...meta, updatedAt: Date.now() });
        this.broadcastLobbyUpdate();
        try {
          await this.ctx.storage.put('public_rooms', Array.from(this.publicRooms.entries()));
        } catch {}
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname.endsWith('/api/unregister') && request.method === 'POST') {
        const { roomId } = await request.json() as { roomId: string };
        this.publicRooms.delete(roomId);
        this.broadcastLobbyUpdate();
        try {
          await this.ctx.storage.put('public_rooms', Array.from(this.publicRooms.entries()));
        } catch {}
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname.endsWith('/api/rooms') || request.method === 'GET') {
        this.cleanExpiredRooms();
        return new Response(JSON.stringify(Array.from(this.publicRooms.values())), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    return new Response('Not found', { status: 404 });
  }

  private getHostConnection(): Connection | null {
    if (!this.hostConnId) return null;
    return this.getConnection(this.hostConnId) || null;
  }

  private broadcastLobbyUpdate() {
    this.cleanExpiredRooms();
    const packet = JSON.stringify({
      type: 'community_rooms',
      rooms: Array.from(this.publicRooms.values()),
    });
    this.broadcast(packet);
  }

  private cleanExpiredRooms() {
    const now = Date.now();
    for (const [id, room] of this.publicRooms.entries()) {
      if (now - room.updatedAt > 300000) {
        this.publicRooms.delete(id);
      }
    }
  }

  private async notifyLobby(action: 'register' | 'unregister', payload: any) {
    try {
      if (!this.env?.SnakeRoom) return;
      const lobbyStub = this.env.SnakeRoom.get(this.env.SnakeRoom.idFromName('lobby'));
      await lobbyStub.fetch(`https://lobby/api/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn(`Failed to notify lobby (${action}):`, err);
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Support /party/:room as alias for /parties/snake-room/:room
    if (url.pathname.startsWith('/party/')) {
      const room = url.pathname.slice('/party/'.length);
      url.pathname = `/parties/snake-room/${room}`;
      return (
        (await routePartykitRequest(new Request(url.toString(), request), env, { cors: true })) ||
        new Response('Not found', { status: 404 })
      );
    }

    return (
      (await routePartykitRequest(request, env, { cors: true })) ||
      new Response('SnakeWar Cloudflare Worker Running', { status: 200 })
    );
  },
};
