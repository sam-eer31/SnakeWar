'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, LeaderboardEntry, PlayerStats, GameOverStats } from '@/game/GameEngine';
import { Snake } from '@/game/entities/Snake';
import { loadSettings, saveSettings, GameSettings, DEFAULT_SETTINGS } from '@/game/config/settings';
import { ArenaSessionConfig, DEFAULT_SESSION_CONFIG } from '@/game/config/session';
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
import { NetworkClient } from '@/game/network/NetworkClient';

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

  // Dynamic Engine State for React HUD
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [gameOverStats, setGameOverStats] = useState<GameOverStats | null>(null);
  const [isBoosting, setIsBoosting] = useState(false);

  // Drag state for Free Cam pan
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Load persisted settings and high score on mount
  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    try {
      const savedHs = localStorage.getItem('snake_io_highscore');
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

    // Handle full screen resize
    const handleResize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (engineRef.current) {
        engineRef.current.resize(window.innerWidth, window.innerHeight);
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
    };

    engine.onLeaderboardUpdate = (entries) => {
      setLeaderboard(entries);
    };

    engine.onSpectateChange = (target, freeCam) => {
      setSpectatedSnake(target);
      setIsFreeCam(freeCam);
      setCurrentZoom(engine.camera.targetZoom);
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
          localStorage.setItem('snake_io_highscore', stats.score.toString());
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
        } else if (e.code === 'KeyA') {
          engineRef.current.camera.panFreeCam(panSpeed, 0);
          setIsFreeCam(true);
        } else if (e.code === 'KeyD') {
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
          engineRef.current.camera.setManualZoomDirect(1.0);
          setCurrentZoom(1.0);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!engineRef.current) return;
      if (gameState === 'playing') {
        if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
          engineRef.current.setPlayerBoosting(false);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
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
    engineRef.current.camera.setManualZoomDirect(1.0);
    setCurrentZoom(1.0);
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
      engineRef.current.stop();
    }
    setOnlineServerInfo(null);
    setGameState('menu');
  }, []);

  // Join or Spectate Public Dedicated Arena
  const handleJoinPublicArena = useCallback(
    async (roomId: 'medium' | 'hard', isSpectating: boolean, serverUrl: string) => {
      if (!engineRef.current) return;
      setShowPublicArenas(false);

      try {
        const client = new NetworkClient();
        await client.connect(
          serverUrl,
          roomId,
          settings.playerName || 'Player',
          settings.selectedSkinId || 'emerald-dragon',
          isSpectating
        );

        setOnlineServerInfo({ roomId, ping: client.ping });
        client.onPing = (ping) => {
          setOnlineServerInfo({ roomId, ping });
        };

        engineRef.current.startOnlineSession(client, isSpectating);
        setGameState(isSpectating ? 'spectating' : 'playing');
      } catch (err) {
        console.error('Failed to connect to dedicated multiplayer server:', err);
        alert('Could not connect to the official dedicated server. Please ensure the Render server is live.');
        setGameState('menu');
      }
    },
    [settings.playerName, settings.selectedSkinId]
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
        <div className="fixed inset-0 pointer-events-none p-1.5 sm:p-2.5 flex flex-col justify-between z-20">
          {/* Top Bar: Minimap & Score on TOP LEFT, Small Leaderboard on TOP RIGHT */}
          <div className="flex justify-between items-start w-full">
            {/* Top Left: Minimap Radar on left, ScoreDisplay right beside it */}
            <div className="flex items-start gap-1 sm:gap-1.5 pointer-events-none">
              <div className="flex flex-col items-center flex-shrink-0">
                {settings.showMinimap && (
                  <Minimap
                    playerSnake={engineRef.current?.playerSnake || null}
                    allSnakes={engineRef.current?.allSnakes || []}
                    powerUps={engineRef.current?.powerUps || []}
                    arenaRadius={engineRef.current?.sessionConfig.arenaRadius}
                  />
                )}
                {onlineServerInfo && (
                  <div className="mt-1 bg-black/60 backdrop-blur-md border border-emerald-500/30 rounded-lg px-1.5 py-0.5 text-[8px] font-mono text-emerald-300 flex items-center gap-1 shadow whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{onlineServerInfo.roomId.toUpperCase()} • {onlineServerInfo.ping}ms</span>
                  </div>
                )}
              </div>

              {/* Score Display (Right side of map, stuck to top) */}
              <div className="pt-0.5">
                <ScoreDisplay stats={playerStats} highScore={highScore} />
              </div>
            </div>

            {/* Top Right: Slither.io-style Compact Leaderboard */}
            <div>
              <Leaderboard
                entries={leaderboard}
                playerRank={playerStats?.rank}
                playerScore={playerStats?.score}
                playerName={settings.playerName}
              />
            </div>
          </div>

          {/* Active Power-Ups Badges (under minimap on left) */}
          <div className="absolute top-18 sm:top-22 left-1.5 sm:left-2.5">
            <PowerUpStatus items={playerStats?.activePowerUps || []} />
          </div>

          {/* Bottom Bar: FPS on BOTTOM LEFT, Boost Gauge Center, Controls on Right */}
          <div className="flex justify-between items-end w-full">
            {/* Bottom Left: FPS Counter */}
            <div className="flex items-center min-w-[70px]">
              {settings.showFps && playerStats && (
                <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-md px-2 py-0.5 text-[10px] font-mono text-emerald-400 select-none shadow">
                  {playerStats.fps} FPS
                </div>
              )}
            </div>

            {/* Center: Boost Gauge */}
            <div className="flex-1 flex justify-center mb-1">
              <BoostGauge
                mass={playerStats?.mass || 50}
                isBoosting={isBoosting}
                hasTurbo={
                  playerStats?.activePowerUps.some((p) => p.type === 'turbo') || false
                }
              />
            </div>

            {/* Bottom Right: Quick In-game Controls */}
            <div className="flex items-center gap-2 pointer-events-auto min-w-[70px] justify-end">
              <button
                onClick={handleReturnToMenu}
                className="w-10 h-10 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-slate-300 hover:text-white flex items-center justify-center text-sm shadow-xl transition-colors"
                title="Return to Menu"
              >
                🏠
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="w-10 h-10 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-slate-300 hover:text-white flex items-center justify-center text-sm shadow-xl transition-colors"
                title="Settings"
              >
                ⚙️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spectator Mode HUD */}
      {gameState === 'spectating' && (
        <div className="fixed inset-0 pointer-events-none p-2 sm:p-3.5 flex flex-col justify-between z-20">
          {/* Top Bar: Minimap & Arena Info on TOP LEFT, Small Leaderboard on TOP RIGHT */}
          <div className="flex justify-between items-start w-full">
            {/* Top Left: Minimap Radar and Arena Overview */}
            <div className="flex items-start gap-2 pointer-events-auto">
              {settings.showMinimap && (
                <Minimap
                  playerSnake={spectatedSnake}
                  allSnakes={engineRef.current?.allSnakes || []}
                  powerUps={engineRef.current?.powerUps || []}
                  arenaRadius={engineRef.current?.sessionConfig.arenaRadius}
                />
              )}
              <div className="bg-black/40 backdrop-blur-[2px] border border-white/10 rounded-lg px-2 py-1 shadow-lg text-[10px] text-slate-300 flex flex-col gap-0.5">
                <div className="flex items-center gap-1 font-bold text-slate-200">
                  <span>🌐</span>
                  <span>Arena: {sessionConfig.arenaRadius * 2}m</span>
                </div>
                <div className="text-slate-300">
                  Snakes: <strong className="text-cyan-400">{engineRef.current?.allSnakes.length || 0}</strong>
                </div>
                <div className="text-slate-400 text-[9px]">
                  Difficulty: <strong className="text-amber-300 capitalize">{sessionConfig.botDifficulty}</strong>
                </div>
                {onlineServerInfo && (
                  <div className="text-emerald-400 text-[9px] font-mono flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>PUBLIC ARENA • {onlineServerInfo.ping}ms</span>
                  </div>
                )}
              </div>
            </div>

            {/* Top Right: Slither.io-style Compact Clickable Leaderboard */}
            <div>
              <Leaderboard
                entries={leaderboard}
                spectatingSnakeId={spectatedSnake?.id}
                onSelectSnake={handleSelectSnake}
                isSpectating={true}
              />
            </div>
          </div>

          {/* Bottom Left: FPS counter in spectator mode */}
          <div className="absolute bottom-3 sm:bottom-5 left-3 sm:left-5 pointer-events-none z-10">
            {settings.showFps && playerStats && (
              <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-md px-2 py-0.5 text-[10px] font-mono text-emerald-400 select-none shadow">
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
          onBoostChange={(boosting) => engineRef.current?.setPlayerBoosting(boosting)}
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

      {/* Create Arena Match / Server Settings Modal */}
      {showMatchSetup && (
        <MatchSetupModal
          initialConfig={sessionConfig}
          onLaunchMatch={(cfg) => handleStartGame(cfg)}
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
          onPlayAgain={() => handleStartGame(sessionConfig)}
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

      {/* SnakeWar Entrance Preloader Overlay */}
      {!hasEntered && (
        <SnakeWarLoader onEnter={() => setHasEntered(true)} />
      )}
    </div>
  );
};
