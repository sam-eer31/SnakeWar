'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, LeaderboardEntry, PlayerStats, GameOverStats } from '@/game/GameEngine';
import { Snake } from '@/game/entities/Snake';
import { loadSettings, saveSettings, GameSettings, DEFAULT_SETTINGS } from '@/game/config/settings';
import { ArenaSessionConfig, DEFAULT_SESSION_CONFIG } from '@/game/config/session';
import { GAME_CONFIG } from '@/game/config/constants';
import { ScoreDisplay } from './HUD/ScoreDisplay';
import { Leaderboard } from './HUD/Leaderboard';
import { Minimap } from './HUD/Minimap';
import { BoostGauge } from './HUD/BoostGauge';
import { PowerUpStatus } from './HUD/PowerUpStatus';
import { SpectatorControls } from './HUD/SpectatorControls';
import { VirtualJoystick } from './UI/VirtualJoystick';
import { StartMenu } from './Menus/StartMenu';
import { GameOverModal } from './Menus/GameOverModal';
import { SkinSelector } from './Menus/SkinSelector';
import { SettingsModal } from './Menus/SettingsModal';
import { MatchSetupModal } from './Menus/MatchSetupModal';
import { PublicArenasModal } from './Menus/PublicArenasModal';
import { SnakeWarLoader } from './UI/SnakeWarLoader';
import { MatchConnectingOverlay } from './UI/MatchConnectingOverlay';
import { ArenaNotificationFeed, ArenaNotification } from './HUD/ArenaNotificationFeed';
import { PartyHost, PartyGuest, getActivePartyHost } from '@/game/network/PartyClient';
import { Home, Globe } from 'lucide-react';

type GameState = 'menu' | 'playing' | 'spectating' | 'gameover';

export const GameView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('menu');
  const [hasEntered, setHasEntered] = useState<boolean>(false);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [sessionConfig, setSessionConfig] = useState<ArenaSessionConfig>(DEFAULT_SESSION_CONFIG);
  const [highScore, setHighScore] = useState<number>(0);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);

  // Spectator State
  const [spectatedSnake, setSpectatedSnake] = useState<Snake | null>(null);
  const [isFreeCam, setIsFreeCam] = useState<boolean>(false);
  const [currentZoom, setCurrentZoom] = useState<number>(1.0);

  // Modals
  const [showSkins, setShowSkins] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMatchSetup, setShowMatchSetup] = useState(false);
  const [showPublicArenas, setShowPublicArenas] = useState(false);
  const [onlineServerInfo, setOnlineServerInfo] = useState<{ roomId: string; ping: number } | null>(null);
  const [notifications, setNotifications] = useState<ArenaNotification[]>([]);
  const [connectingState, setConnectingState] = useState<{
    title: string;
    subtitle: string;
    roomCode?: string;
    onCancel?: () => void;
  } | null>(null);

  const addNotification = useCallback((type: 'join' | 'leave' | 'info', message: string, playerName?: string) => {
    const notif: ArenaNotification = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      playerName,
      timestamp: Date.now(),
    };
    setNotifications((prev) => [...prev.slice(-3), notif]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    }, 4500);
  }, []);

  // Dynamic Engine State for React HUD
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [gameOverStats, setGameOverStats] = useState<GameOverStats | null>(null);
  const [isBoosting, setIsBoosting] = useState(false);

  // Drag state for Free Cam pan
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const lastPinchDistRef = useRef<number | null>(null);

  // Load persisted settings and high score on mount
  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    try {
      const savedHs = localStorage.getItem('snakewar_highscore') || localStorage.getItem('snake_io_highscore');
      if (savedHs) setHighScore(parseInt(savedHs, 10));
    } catch {}
  }, []);

  // Update engine when settings change
  const handleUpdateSettings = (partial: Partial<GameSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...partial };
      saveSettings(merged);
      if (engineRef.current) {
        engineRef.current.updateSettings(merged);
      }
      return merged;
    });
  };

  const handleToggleSound = useCallback(() => {
    handleUpdateSettings({ soundMuted: !settings.soundMuted });
  }, [settings.soundMuted]);

  // Initialize GameEngine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle full screen resize with high-performance capped DPI (prevents 4K fill-rate lag)
    const handleResize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      if (engineRef.current) {
        engineRef.current.resize(window.innerWidth, window.innerHeight, dpr);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const engine = new GameEngine(canvas, settings);
    engineRef.current = engine;

    // Engine Event Hooks
    engine.onStatsUpdate = (stats) => {
      setPlayerStats(stats);
      setIsBoosting(engine.playerSnake?.isBoosting || false);
      if (engine.isSpectating && !engine.camera.hasManualZoom) {
        setCurrentZoom(engine.camera.targetZoom);
      }
    };

    engine.onLeaderboardUpdate = (entries) => {
      setLeaderboard(entries);
    };

    engine.onSpectateChange = (target, freeCam) => {
      setSpectatedSnake(target);
      setIsFreeCam(freeCam);
      setCurrentZoom(engine.camera.targetZoom);
    };

    engine.onPingUpdate = (ping) => {
      setOnlineServerInfo((prev) => (prev ? { ...prev, ping } : prev));
    };

    engine.onGameOver = (stats) => {
      setGameOverStats(stats);
      setGameState('gameover');

      // Check high score
      let newHigh = false;
      if (stats.score > highScore) {
        setHighScore(stats.score);
        newHigh = true;
        try {
          localStorage.setItem('snakewar_highscore', stats.score.toString());
        } catch {}
      }
      setIsNewHighScore(newHigh);
    };

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.stop();
    };
  }, []);

  // Mouse & Touch Input Listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!engineRef.current) return;

      if (gameState === 'playing') {
        engineRef.current.setMouseTarget(e.clientX, e.clientY);
      } else if (gameState === 'spectating' && isDraggingRef.current) {
        const dx = e.clientX - lastMousePosRef.current.x;
        const dy = e.clientY - lastMousePosRef.current.y;
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
        engineRef.current.camera.panFreeCam(dx, dy);
        setIsFreeCam(true);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!engineRef.current) return;

      if (gameState === 'playing') {
        if (e.button === 0 || e.button === 2) {
          engineRef.current.setPlayerBoosting(true);
          setIsBoosting(true);
        }
      } else if (gameState === 'spectating') {
        isDraggingRef.current = true;
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = () => {
      if (!engineRef.current) return;

      if (gameState === 'playing') {
        engineRef.current.setPlayerBoosting(false);
        setIsBoosting(false);
      } else if (gameState === 'spectating') {
        isDraggingRef.current = false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleWheel = (e: WheelEvent) => {
      if (!engineRef.current) return;
      if (gameState === 'spectating') {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.88 : 1.14;
        engineRef.current.camera.adjustManualZoom(factor);
        setCurrentZoom(engineRef.current.camera.targetZoom);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!engineRef.current) return;

      if (gameState === 'playing') {
        if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
          engineRef.current.setPlayerBoosting(true);
          setIsBoosting(true);
        }

        // Keyboard steering support (Arrow keys / WASD)
        if (settings.controlScheme === 'keyboard') {
          let angle: number | null = null;
          if (e.code === 'KeyW' || e.code === 'ArrowUp') angle = -Math.PI / 2;
          if (e.code === 'KeyD' || e.code === 'ArrowRight') angle = 0;
          if (e.code === 'KeyS' || e.code === 'ArrowDown') angle = Math.PI / 2;
          if (e.code === 'KeyA' || e.code === 'ArrowLeft') angle = Math.PI;

          if (angle !== null) {
            engineRef.current.setPlayerAngle(angle);
          }
        }
      } else if (gameState === 'spectating') {
        // Free Cam Navigation with WASD / Arrows
        const panSpeed = 35;
        if (e.code === 'KeyW' || e.code === 'ArrowUp') {
          engineRef.current.camera.panFreeCam(0, panSpeed);
          setIsFreeCam(true);
        } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
          engineRef.current.camera.panFreeCam(0, -panSpeed);
          setIsFreeCam(true);
        } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
          engineRef.current.camera.panFreeCam(panSpeed, 0);
          setIsFreeCam(true);
        } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
          engineRef.current.camera.panFreeCam(-panSpeed, 0);
          setIsFreeCam(true);
        } else if (e.code === 'BracketLeft') {
          engineRef.current.cycleSpectator(-1);
        } else if (e.code === 'BracketRight') {
          engineRef.current.cycleSpectator(1);
        } else if (e.code === 'KeyF') {
          engineRef.current.toggleFreeCam();
          setIsFreeCam(engineRef.current.camera.isFreeCam);
        } else if (e.code === 'Equal' || e.code === 'NumpadAdd') {
          engineRef.current.camera.adjustManualZoom(1.15);
          setCurrentZoom(engineRef.current.camera.targetZoom);
        } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
          engineRef.current.camera.adjustManualZoom(0.85);
          setCurrentZoom(engineRef.current.camera.targetZoom);
        } else if (e.code === 'Digit0' || e.code === 'Numpad0') {
          engineRef.current.camera.resetManualZoom();
          setCurrentZoom(engineRef.current.camera.targetZoom);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!engineRef.current) return;
      if (gameState === 'playing') {
        if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
          engineRef.current.setPlayerBoosting(false);
          setIsBoosting(false);
        }
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (gameState === 'spectating') {
        if (e.touches.length === 1) {
          isDraggingRef.current = true;
          lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
          isDraggingRef.current = false;
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          lastPinchDistRef.current = Math.hypot(dx, dy);
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (gameState === 'spectating') {
        if (isDraggingRef.current && e.touches.length === 1) {
          const touch = e.touches[0];
          const dx = touch.clientX - lastMousePosRef.current.x;
          const dy = touch.clientY - lastMousePosRef.current.y;
          lastMousePosRef.current = { x: touch.clientX, y: touch.clientY };
          engineRef.current?.camera.panFreeCam(dx, dy);
          setIsFreeCam(true);
        } else if (e.touches.length === 2 && lastPinchDistRef.current !== null) {
          e.preventDefault();
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.hypot(dx, dy);
          if (dist > 10 && lastPinchDistRef.current > 10) {
            const pinchFactor = dist / lastPinchDistRef.current;
            const factor = 1 + (pinchFactor - 1) * 0.9;
            engineRef.current?.camera.adjustManualZoom(factor);
            if (engineRef.current) {
              setCurrentZoom(engineRef.current.camera.targetZoom);
            }
            lastPinchDistRef.current = dist;
          }
        }
      }
    };

    const handleTouchEnd = () => {
      if (gameState === 'spectating') {
        isDraggingRef.current = false;
        lastPinchDistRef.current = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, settings.controlScheme]);

  // Start Playing with Server Session Config
  const handleStartGame = useCallback(
    (overrideConfig?: ArenaSessionConfig) => {
      if (!engineRef.current) return;
      engineRef.current.camera.resetManualZoom();
      const cfg = overrideConfig || sessionConfig;
      setSessionConfig(cfg);
      setShowMatchSetup(false);
      setGameState('playing');
      engineRef.current.start(settings.playerName, settings.selectedSkinId, cfg);
    },
    [settings.playerName, settings.selectedSkinId, sessionConfig]
  );

  // Start Spectator Mode from Menu
  const handleStartSpectating = useCallback(
    (overrideConfig?: ArenaSessionConfig) => {
      if (!engineRef.current) return;
      const cfg = overrideConfig || sessionConfig;
      setSessionConfig(cfg);
      setShowMatchSetup(false);
      setGameState('spectating');
      engineRef.current.startSpectating(cfg);
      setSpectatedSnake(engineRef.current.getSpectateTarget());
      setIsFreeCam(engineRef.current.camera.isFreeCam);
      setCurrentZoom(engineRef.current.camera.targetZoom);
    },
    [sessionConfig]
  );

  // Seamlessly switch to spectator mode from gameover
  const handleSwitchToSpectator = useCallback(() => {
    if (!engineRef.current) return;
    setGameState('spectating');
    engineRef.current.switchToSpectator();
    setSpectatedSnake(engineRef.current.getSpectateTarget());
    setIsFreeCam(engineRef.current.camera.isFreeCam);
    setCurrentZoom(engineRef.current.camera.targetZoom);
  }, []);

  // Join match from spectator mode
  const handleJoinArenaFromSpectator = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.camera.resetManualZoom();
    setGameState('playing');
    engineRef.current.joinArenaAsPlayer(settings.playerName, settings.selectedSkinId);
  }, [settings.playerName, settings.selectedSkinId]);

  // Spectator control actions
  const handleCyclePrev = useCallback(() => {
    engineRef.current?.cycleSpectator(-1);
    setSpectatedSnake(engineRef.current?.getSpectateTarget() || null);
    setIsFreeCam(false);
  }, []);

  const handleCycleNext = useCallback(() => {
    engineRef.current?.cycleSpectator(1);
    setSpectatedSnake(engineRef.current?.getSpectateTarget() || null);
    setIsFreeCam(false);
  }, []);

  const handleToggleFreeCam = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.toggleFreeCam();
    setIsFreeCam(engineRef.current.camera.isFreeCam);
    setSpectatedSnake(engineRef.current.getSpectateTarget());
  }, []);

  const handleZoomIn = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.camera.adjustManualZoom(1.2);
    setCurrentZoom(engineRef.current.camera.targetZoom);
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.camera.adjustManualZoom(0.833);
    setCurrentZoom(engineRef.current.camera.targetZoom);
  }, []);

  const handleResetZoom = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.camera.resetManualZoom();
    setCurrentZoom(engineRef.current.camera.targetZoom);
  }, []);

  const handleSelectSnake = useCallback((snakeId: string) => {
    if (!engineRef.current) return;
    engineRef.current.spectateSnake(snakeId);
    setSpectatedSnake(engineRef.current.getSpectateTarget());
    setIsFreeCam(false);
  }, []);

  // Return to Main Menu
  const handleReturnToMenu = useCallback(() => {
    if (engineRef.current) {
      if (engineRef.current.networkClient) {
        try {
          engineRef.current.networkClient.disconnect();
        } catch {}
        engineRef.current.networkClient = null;
      }
      if (engineRef.current.partyHost) {
        try {
          engineRef.current.partyHost.disconnect();
        } catch {}
        engineRef.current.partyHost = null;
      }
      engineRef.current.stop();
      engineRef.current.camera.resetManualZoom();
    }
    setOnlineServerInfo(null);
    setGameState('menu');
  }, []);

  // Join or Spectate Match (via Code or Community Arena)
  const handleJoinPublicArena = useCallback(
    async (roomCode: string, isSpectating: boolean) => {
      if (!engineRef.current || !roomCode) return;
      setShowPublicArenas(false);

      let activeGuest: PartyGuest | null = null;
      setConnectingState({
        title: isSpectating ? 'SPECTATING ARENA' : 'JOINING ARENA',
        subtitle: 'Connecting to room and negotiating P2P session...',
        roomCode,
        onCancel: () => {
          if (activeGuest) {
            try { activeGuest.disconnect(); } catch {}
          }
          setConnectingState(null);
          setGameState('menu');
        },
      });

      try {
        const partyHostAddress = getActivePartyHost();
        const guest = new PartyGuest();
        activeGuest = guest;

        guest.onPlayerJoined = (name) => {
          addNotification('join', 'entered the arena!', name);
        };
        guest.onPlayerLeft = (name) => {
          addNotification('leave', 'left the arena.', name);
        };
        guest.onRoomClosed = (msg) => {
          alert(msg);
          handleReturnToMenu();
        };
        guest.onError = (msg) => {
          alert(msg);
          handleReturnToMenu();
        };

        await guest.connect(
          partyHostAddress,
          roomCode,
          settings.playerName || 'Player',
          settings.selectedSkinId || 'emerald-dragon',
          isSpectating
        );

        const displayRoomId = `Room [${roomCode}]`;
        setOnlineServerInfo({ roomId: displayRoomId, ping: guest.ping });
        guest.onPing = (ping) => {
          setOnlineServerInfo({ roomId: displayRoomId, ping });
        };

        engineRef.current.startOnlineSession(guest as any, isSpectating);
        setGameState(isSpectating ? 'spectating' : 'playing');
        setConnectingState(null);
        addNotification('info', `Connected to ${displayRoomId}`);
      } catch (err) {
        console.error('Failed to connect to room:', err);
        setConnectingState(null);
        alert(`Could not connect to Room "${roomCode}". Please check your internet connection.`);
        setGameState('menu');
      }
    },
    [settings.playerName, settings.selectedSkinId, addNotification, handleReturnToMenu]
  );

  // Launch Player-Hosted Online Arena (Path B: Host-Authoritative Simulation)
  const handleLaunchOnlineRoom = useCallback(
    async (
      mode: 'public' | 'private',
      roomCode: string,
      roomName: string,
      config: ArenaSessionConfig
    ) => {
      if (!engineRef.current) return;
      setShowMatchSetup(false);

      let activeHost: PartyHost | null = null;
      setConnectingState({
        title: 'HOSTING ARENA',
        subtitle: 'Establishing edge room & preparing host simulation...',
        roomCode,
        onCancel: () => {
          if (activeHost) {
            try { activeHost.disconnect(); } catch {}
          }
          setConnectingState(null);
          setGameState('menu');
        },
      });

      try {
        const partyHostAddress = getActivePartyHost();
        const host = new PartyHost(roomCode);
        activeHost = host;

        await host.connect(
          partyHostAddress,
          mode === 'public',
          roomName,
          settings.playerName || 'Host',
          config.botDifficulty,
          config.botCount
        );

        engineRef.current.camera.resetManualZoom();
        setSessionConfig(config);
        setGameState('playing');
        engineRef.current.start(settings.playerName, settings.selectedSkinId, config);
        engineRef.current.attachPartyHost(host);
        setConnectingState(null);

        const displayId = mode === 'private' ? `Private [${roomCode}]` : roomName;
        setOnlineServerInfo({ roomId: displayId, ping: host.ping });
        host.onPing = (ping) => {
          setOnlineServerInfo((prev) => (prev ? { ...prev, ping } : { roomId: displayId, ping }));
        };

        addNotification('info', `Arena hosted on Edge (${mode === 'private' ? `Code: ${roomCode}` : 'Public'}).`);
      } catch (err) {
        console.error('Failed to create edge room:', err);
        setConnectingState(null);
        alert('Could not launch online arena. Please ensure internet is connected.');
        setGameState('menu');
      }
    },
    [settings.playerName, settings.selectedSkinId, addNotification]
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      {/* Primary Game Canvas */}
      <canvas
        ref={canvasRef}
        className={`block w-full h-full ${
          gameState === 'spectating' ? (isFreeCam ? 'cursor-grab active:cursor-grabbing' : 'cursor-default') : 'cursor-crosshair'
        }`}
      />

      {/* In-Game Playing HUD */}
      {gameState === 'playing' && (
        <div className="fixed inset-0 pointer-events-none z-20">
          {/* Extreme Top Left Corner: Compact Leaderboard with No Gap */}
          <div className="absolute top-0 left-0 z-30 pointer-events-none">
            <Leaderboard
              entries={leaderboard}
              playerRank={playerStats?.rank}
              playerScore={playerStats?.score}
              playerName={settings.playerName}
            />
          </div>

          {/* Top Center: Clean Score Display */}
          <div className="absolute top-1.5 sm:top-2.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <ScoreDisplay stats={playerStats} highScore={highScore} />
          </div>

          {/* Top Right: Home Button + Minimap Radar + Server Info */}
          <div className="absolute top-1.5 sm:top-2.5 right-1.5 sm:right-2.5 z-30 flex flex-col items-end gap-1.5 pointer-events-none">
            <div className="flex items-start gap-2">
              <button
                onClick={handleReturnToMenu}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#0a0e1a]/95 border border-[#1e293b] text-[#94a3b8] hover:text-[#f1f5f9] hover:border-slate-600 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-lg pointer-events-auto shrink-0 mt-0.5"
                title="Return to Menu"
              >
                <Home className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-end pointer-events-none">
                {settings.showMinimap && (
                  <Minimap
                    playerSnake={engineRef.current?.playerSnake || null}
                    allSnakes={engineRef.current?.allSnakes || []}
                    powerUps={engineRef.current?.powerUps || []}
                    arenaRadius={engineRef.current?.sessionConfig.arenaRadius}
                  />
                )}
                {onlineServerInfo && (
                  <div className="mt-1 bg-black/85 border border-emerald-500/30 rounded-lg px-1.5 py-0.5 text-[8px] font-mono text-emerald-300 flex items-center gap-1 shadow whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{onlineServerInfo.roomId.toUpperCase()} • {onlineServerInfo.ping}ms</span>
                  </div>
                )}
              </div>
            </div>

            {/* Arena Join/Leave Notification Feed */}
            <ArenaNotificationFeed notifications={notifications} />
          </div>

          {/* Active Power-Ups Badges (under leaderboard on left) */}
          <div className="absolute top-[36.5vh] left-1.5 sm:left-2">
            <PowerUpStatus items={playerStats?.activePowerUps || []} />
          </div>

          {/* Bottom Bar: FPS on BOTTOM LEFT, Boost Gauge Center */}
          <div className="absolute inset-x-0 bottom-0 p-1.5 sm:p-2.5 flex justify-between items-end w-full pointer-events-none">
            {/* Bottom Left: FPS Counter */}
            <div className="flex items-center min-w-[70px]">
              {settings.showFps && playerStats && (
                <div className="bg-black/80 border border-white/10 rounded-md px-2 py-0.5 text-[10px] font-mono text-emerald-400 select-none shadow">
                  {playerStats.fps} FPS
                </div>
              )}
            </div>

            {/* Center: Boost Gauge */}
            <div className="flex-1 flex justify-center mb-1 pointer-events-auto">
              <BoostGauge
                mass={playerStats?.mass || 50}
                isBoosting={isBoosting}
                hasTurbo={
                  playerStats?.activePowerUps.some((p) => p.type === 'turbo') || false
                }
              />
            </div>

            {/* Bottom Right Spacer (to keep BoostGauge centered) */}
            <div className="min-w-[70px]" />
          </div>
        </div>
      )}

      {/* Spectator Mode HUD */}
      {gameState === 'spectating' && (
        <div className="fixed inset-0 pointer-events-none z-20">
          {/* Extreme Top Left Corner: Clickable Leaderboard with No Gap */}
          <div className="absolute top-0 left-0 z-30 pointer-events-auto">
            <Leaderboard
              entries={leaderboard}
              spectatingSnakeId={spectatedSnake?.id}
              onSelectSnake={handleSelectSnake}
              isSpectating={true}
            />
          </div>

          {/* Top Right: Home Button + Minimap Radar and Arena Overview */}
          <div className="absolute top-1.5 sm:top-2.5 right-1.5 sm:right-2.5 z-20 flex flex-col items-end gap-1.5 pointer-events-none">
            <div className="flex items-start gap-2 pointer-events-auto">
              <button
                onClick={handleReturnToMenu}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#0a0e1a]/95 border border-[#1e293b] text-[#94a3b8] hover:text-[#f1f5f9] hover:border-slate-600 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-lg shrink-0 mt-0.5"
                title="Return to Menu"
              >
                <Home className="w-4 h-4" />
              </button>
              {settings.showMinimap && (
                <Minimap
                  playerSnake={spectatedSnake}
                  allSnakes={engineRef.current?.allSnakes || []}
                  powerUps={engineRef.current?.powerUps || []}
                  arenaRadius={engineRef.current?.sessionConfig.arenaRadius}
                />
              )}
              <div className="bg-[#0a0e1a]/95 border border-[#1e293b] rounded-xl px-2.5 py-1.5 text-[10px] text-[#94a3b8] flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 font-game font-bold text-[#f1f5f9] uppercase tracking-wider">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>Arena: {sessionConfig.arenaRadius * 2}m</span>
                </div>
                <div className="text-[#94a3b8] font-game">
                  Snakes: <strong className="text-blue-400">{engineRef.current?.allSnakes.length || 0}</strong>
                </div>
                <div className="text-[#64748b] font-game text-[9px] uppercase tracking-wider">
                  Difficulty: <strong className="text-amber-400 capitalize">{sessionConfig.botDifficulty}</strong>
                </div>
                {onlineServerInfo && (
                  <div className="text-emerald-400 text-[9px] font-game uppercase tracking-wider flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>PUBLIC ARENA • {onlineServerInfo.ping}ms</span>
                  </div>
                )}
              </div>
            </div>

            {/* Arena Join/Leave Notification Feed in Spectator */}
            <ArenaNotificationFeed notifications={notifications} />
          </div>

          {/* Bottom Left: FPS counter in spectator mode */}
          <div className="absolute bottom-3 sm:bottom-5 left-3 sm:left-5 pointer-events-none z-10">
            {settings.showFps && playerStats && (
              <div className="bg-black/80 border border-white/10 rounded-md px-2 py-0.5 text-[10px] font-mono text-emerald-400 select-none shadow">
                {playerStats.fps} FPS
              </div>
            )}
          </div>

          {/* Bottom Floating Spectator Controls */}
          <SpectatorControls
            spectatedSnake={spectatedSnake}
            isFreeCam={isFreeCam}
            currentZoom={currentZoom}
            totalSnakes={engineRef.current?.allSnakes.length || 0}
            onCyclePrev={handleCyclePrev}
            onCycleNext={handleCycleNext}
            onToggleFreeCam={handleToggleFreeCam}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetZoom={handleResetZoom}
            onJoinArena={handleJoinArenaFromSpectator}
            onReturnToMenu={handleReturnToMenu}
          />
        </div>
      )}

      {/* Mobile / Touch Joystick */}
      {gameState === 'playing' && (
        <VirtualJoystick
          onMove={(angle) => engineRef.current?.setPlayerAngle(angle)}
          onBoostChange={(boosting) => {
            engineRef.current?.setPlayerBoosting(boosting);
            setIsBoosting(boosting);
          }}
        />
      )}

      {/* Professional Main Menu Overlay */}
      {gameState === 'menu' && (
        <StartMenu
          playerName={settings.playerName}
          selectedSkinId={settings.selectedSkinId}
          highScore={highScore}
          soundMuted={settings.soundMuted}
          sessionConfig={sessionConfig}
          onPlayerNameChange={(name) => handleUpdateSettings({ playerName: name })}
          onSelectSkin={(id) => handleUpdateSettings({ selectedSkinId: id })}
          onToggleSound={handleToggleSound}
          onOpenSkins={() => setShowSkins(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenMatchSetup={() => setShowMatchSetup(true)}
          onOpenPublicArenas={() => setShowPublicArenas(true)}
          onQuickPlay={() => handleStartGame(sessionConfig)}
          onSpectate={() => handleStartSpectating(sessionConfig)}
        />
      )}

      {/* Official Public Dedicated Arenas Modal */}
      {showPublicArenas && (
        <PublicArenasModal
          onJoinArena={handleJoinPublicArena}
          onClose={() => setShowPublicArenas(false)}
        />
      )}

      {/* Host Arena Match Modal (Offline Solo, Public Online, Private Code) */}
      {showMatchSetup && (
        <MatchSetupModal
          initialConfig={sessionConfig}
          onLaunchOffline={(cfg) => handleStartGame(cfg)}
          onLaunchOnlineRoom={handleLaunchOnlineRoom}
          onSpectateMatch={(cfg) => handleStartSpectating(cfg)}
          onClose={() => setShowMatchSetup(false)}
        />
      )}

      {/* Game Over Modal */}
      {gameState === 'gameover' && gameOverStats && (
        <GameOverModal
          stats={gameOverStats}
          highScore={highScore}
          isNewHighScore={isNewHighScore}
          onPlayAgain={() => {
            if (engineRef.current) {
              if (engineRef.current.isOnline) {
                const client = engineRef.current.networkClient as any;
                if (client && client.isConnected && typeof client.respawn === 'function') {
                  client.respawn(
                    settings.playerName || 'Player',
                    settings.selectedSkinId || 'emerald-dragon'
                  );
                  setGameState('playing');
                  return;
                }
              } else if (engineRef.current.partyHost && engineRef.current.partyHost.isConnected) {
                engineRef.current.respawnPlayer(
                  settings.playerName || 'Host',
                  settings.selectedSkinId || 'emerald-dragon'
                );
                setGameState('playing');
                return;
              } else {
                handleStartGame(sessionConfig);
                return;
              }
            }
            if (onlineServerInfo) {
              handleReturnToMenu();
              setShowPublicArenas(true);
            } else {
              handleStartGame(sessionConfig);
            }
          }}
          onReturnToMenu={handleReturnToMenu}
          onChangeSkin={() => setShowSkins(true)}
          onReconfigureMatch={() => setShowMatchSetup(true)}
          onSpectate={handleSwitchToSpectator}
        />
      )}

      {/* Skin Customizer Modal */}
      {showSkins && (
        <SkinSelector
          selectedSkinId={settings.selectedSkinId}
          onSelectSkin={(id) => handleUpdateSettings({ selectedSkinId: id })}
          onClose={() => setShowSkins(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Professional Match Connecting / Hosting Overlay */}
      {connectingState && (
        <MatchConnectingOverlay
          title={connectingState.title}
          subtitle={connectingState.subtitle}
          roomCode={connectingState.roomCode}
          onCancel={connectingState.onCancel}
        />
      )}

      {/* SnakeWar Entrance Preloader Overlay */}
      {!hasEntered && (
        <SnakeWarLoader onEnter={() => setHasEntered(true)} />
      )}
    </div>
  );
};
