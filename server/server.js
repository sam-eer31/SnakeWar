/**
 * SnakeWar High-Speed Regional Multiplayer Broker Server
 * Ultra-lightweight event-driven WebSocket relay server.
 * 0% idle CPU usage - perfectly optimized for Render Free Tier.
 */

const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 3001;

// =============================================================================
// SNAKEROOM BROKER STATE (In-Memory)
// =============================================================================
const publicLobbyRooms = new Map(); // roomId -> RoomMetadata
const brokerRooms = new Map(); // roomName -> { name, clients: Map(connId -> ws), hostConnId, hostWs, metadata }

function cleanExpiredLobbyRooms() {
  const now = Date.now();
  for (const [id, room] of publicLobbyRooms.entries()) {
    if (now - (room.updatedAt || 0) > 300000) {
      publicLobbyRooms.delete(id);
    }
  }
}

function broadcastLobbyUpdate() {
  cleanExpiredLobbyRooms();
  const packet = JSON.stringify({
    type: 'community_rooms',
    rooms: Array.from(publicLobbyRooms.values()),
  });
  const lobby = brokerRooms.get('lobby');
  if (lobby) {
    for (const clientWs of lobby.clients.values()) {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(packet);
      }
    }
  }
}

function handleBrokerConnection(ws, pathname) {
  const roomName = decodeURIComponent(
    pathname.replace(/^\/parties\/snake-room\//, '').replace(/^\/party\//, '')
  );
  const connId = `conn_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
  ws.connId = connId;

  // LOBBY ROOM
  if (roomName === 'lobby') {
    let lobby = brokerRooms.get('lobby');
    if (!lobby) {
      lobby = { name: 'lobby', clients: new Map(), hostConnId: null, hostWs: null, metadata: null };
      brokerRooms.set('lobby', lobby);
    }
    lobby.clients.set(connId, ws);

    cleanExpiredLobbyRooms();
    ws.send(JSON.stringify({
      type: 'community_rooms',
      rooms: Array.from(publicLobbyRooms.values()),
    }));

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'get_rooms') {
          cleanExpiredLobbyRooms();
          ws.send(JSON.stringify({
            type: 'community_rooms',
            rooms: Array.from(publicLobbyRooms.values()),
          }));
        } else if (data.type === 'register_public_room' && data.room) {
          publicLobbyRooms.set(data.room.id, {
            ...data.room,
            updatedAt: Date.now(),
          });
          broadcastLobbyUpdate();
        } else if (data.type === 'unregister_public_room' && data.roomId) {
          publicLobbyRooms.delete(data.roomId);
          broadcastLobbyUpdate();
        }
      } catch (err) {
        console.error('[Broker Lobby] Message parse error:', err);
      }
    });

    ws.on('close', () => {
      lobby.clients.delete(connId);
      if (lobby.clients.size === 0) {
        brokerRooms.delete('lobby');
      }
    });
    return;
  }

  // MATCH ROOM
  let room = brokerRooms.get(roomName);
  if (!room) {
    room = { name: roomName, clients: new Map(), hostConnId: null, hostWs: null, metadata: null };
    brokerRooms.set(roomName, room);
  }
  room.clients.set(connId, ws);

  ws.send(JSON.stringify({
    type: 'connected_to_room',
    roomId: roomName,
    hasHost: room.hostConnId !== null,
  }));

  ws.on('message', (message) => {
    try {
      const raw = message.toString();
      const data = JSON.parse(raw);

      // 1. Host claims authority
      if (data.type === 'claim_host') {
        room.hostConnId = connId;
        room.hostWs = ws;
        room.metadata = data.metadata || null;

        if (data.isPublic && room.metadata) {
          publicLobbyRooms.set(room.metadata.id, {
            ...room.metadata,
            updatedAt: Date.now(),
          });
          broadcastLobbyUpdate();
        }

        ws.send(JSON.stringify({ type: 'host_claimed', roomId: roomName }));
        return;
      }

      // 2. Guest joins
      if (data.type === 'guest_join') {
        if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
          room.hostWs.send(JSON.stringify({
            type: 'guest_joined',
            guestConnId: connId,
            name: data.name,
            skinId: data.skinId,
            isSpectator: !!data.isSpectator,
          }));
        } else {
          ws.send(JSON.stringify({
            type: 'error',
            code: 'NO_HOST',
            message: 'Waiting for room host to connect...',
          }));
        }
        return;
      }

      // 3. Host sending frames/responses to guests
      if (connId === room.hostConnId) {
        if ((data.type === 'init_response' || data.type === 'game_over_response') && data.targetConnId) {
          const guest = room.clients.get(data.targetConnId);
          if (guest && guest.readyState === WebSocket.OPEN) {
            guest.send(JSON.stringify(data.packet));
          }
        } else if (data.type === 'peer_pong' && data.guestConnId) {
          const guest = room.clients.get(data.guestConnId);
          if (guest && guest.readyState === WebSocket.OPEN) {
            guest.send(JSON.stringify({ type: 'pong', t: data.t }));
          }
        } else if (data.type === 'tick') {
          for (const [cId, clientWs] of room.clients) {
            if (cId !== connId && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(raw);
            }
          }
        } else if (data.type === 'player_joined' || data.type === 'player_left') {
          for (const [cId, clientWs] of room.clients) {
            if (cId !== connId && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(raw);
            }
          }
        }
        return;
      }

      // 4. Guest sending input to host
      if (data.type === 'input') {
        if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
          room.hostWs.send(JSON.stringify({
            type: 'guest_input',
            guestConnId: connId,
            angle: data.angle,
            isBoosting: data.isBoosting,
          }));
        }
        return;
      }

      // 5. Ping
      if (data.type === 'ping') {
        if (room.hostWs && connId !== room.hostConnId && room.hostWs.readyState === WebSocket.OPEN) {
          room.hostWs.send(JSON.stringify({ type: 'peer_ping', guestConnId: connId, t: data.t }));
        } else {
          ws.send(JSON.stringify({ type: 'pong', t: data.t }));
        }
        return;
      }

      // 6. Respawn
      if (data.type === 'respawn') {
        if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
          room.hostWs.send(JSON.stringify({
            type: 'guest_joined',
            guestConnId: connId,
            name: data.name,
            skinId: data.skinId,
            isSpectator: false,
          }));
        }
        return;
      }
    } catch (err) {
      console.error(`[Broker Room ${roomName}] Message error:`, err);
    }
  });

  ws.on('close', () => {
    room.clients.delete(connId);
    if (connId === room.hostConnId) {
      room.hostConnId = null;
      room.hostWs = null;
      for (const clientWs of room.clients.values()) {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({
            type: 'room_closed',
            message: 'The match host has left.',
          }));
        }
      }
      if (publicLobbyRooms.has(roomName)) {
        publicLobbyRooms.delete(roomName);
        broadcastLobbyUpdate();
      }
    } else {
      if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
        room.hostWs.send(JSON.stringify({
          type: 'guest_left',
          guestConnId: connId,
        }));
      }
    }
    if (room.clients.size === 0) {
      brokerRooms.delete(roomName);
    }
  });
}

// =============================================================================
// HTTP HEALTHCHECK & API SERVER (RENDER COMPLIANT)
// =============================================================================
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  if (pathname === '/health' || pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'snakewar-regional-broker',
      uptime: Math.floor(process.uptime()),
      activeRooms: brokerRooms.size,
      publicRooms: publicLobbyRooms.size,
    }, null, 2));
    return;
  }

  if (pathname.includes('/lobby/api/rooms') || pathname === '/api/rooms') {
    cleanExpiredLobbyRooms();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(Array.from(publicLobbyRooms.values())));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('SnakeWar High-Speed Regional Broker is running.\nConnect via ws://localhost:' + PORT);
});

// =============================================================================
// WEBSOCKET SERVER
// =============================================================================
const wss = new WebSocketServer({ server });

// Heartbeat to prevent reverse proxy / Render idle drops
const heartbeatInterval = setInterval(() => {
  for (const client of wss.clients) {
    if (client.isAlive === false) {
      client.terminate();
      continue;
    }
    client.isAlive = false;
    client.ping();
  }
}, 25000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  handleBrokerConnection(ws, pathname);
});

// Start Server
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`SnakeWar High-Speed Broker listening on port ${PORT}`);
  console.log(`HTTP Healthcheck: http://localhost:${PORT}/health`);
  console.log(`WebSocket Broker: ws://localhost:${PORT}`);
  console.log(`Background Bot Load: 0 bots (0% CPU Usage)`);
  console.log(`=======================================================`);
});

module.exports = {
  server,
  brokerRooms,
  publicLobbyRooms,
};
