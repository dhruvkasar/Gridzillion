import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX, RotateCcw, Monitor, User, Github, Instagram, Share2, Music, Info, X, ChevronRight, Target, Swords, MousePointerClick } from 'lucide-react';
import { useAudio } from './hooks/useAudio';

type Player = 1 | 2;
type GameMode = 'pvai' | 'pvp';
type GameRules = 'classic' | 'advanced';
type GridSize = 6 | 8 | 10 | 12;
type AIDifficulty = 'easy' | 'medium' | 'hard' | 'pro';

const createInitialGrid = (rules: GameRules = 'classic', size: GridSize = 10) => {
  const grid = Array(size).fill(0).map(() => Array(size).fill(0));
  if (rules === 'advanced') {
    let obstaclesPlaced = 0;
    const numObstacles = Math.floor((size * size) * 0.08); // 8% obstacles
    while (obstaclesPlaced < numObstacles) {
      const r = Math.floor(Math.random() * size);
      const c = Math.floor(Math.random() * size);
      if (grid[r][c] === 0) {
        grid[r][c] = -1;
        obstaclesPlaced++;
      }
    }
  }
  return grid;
};

function getValidMoves(grid: number[][], player: number) {
  const moves: {r: number, c: number}[] = [];
  const size = grid.length;
  
  let hasTerritory = false;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === player) {
        hasTerritory = true;
        break;
      }
    }
    if (hasTerritory) break;
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === 0) {
        if (!hasTerritory) {
          moves.push({r, c});
        } else if (
          (r > 0 && grid[r-1][c] === player) ||
          (r < size - 1 && grid[r+1][c] === player) ||
          (c > 0 && grid[r][c-1] === player) ||
          (c < size - 1 && grid[r][c+1] === player)
        ) {
          moves.push({r, c});
        }
      }
    }
  }
  return moves;
}

function applyFlanking(grid: number[][], r: number, c: number, player: number) {
  const newGrid = grid.map(row => [...row]);
  newGrid[r][c] = player;
  const enemy = player === 1 ? 2 : 1;
  let flippedAny = false;
  const size = grid.length;

  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (const [dr, dc] of directions) {
    let currR = r + dr;
    let currC = c + dc;
    const toFlip: {r: number, c: number}[] = [];

    while (currR >= 0 && currR < size && currC >= 0 && currC < size) {
      if (newGrid[currR][currC] === enemy) {
        toFlip.push({r: currR, c: currC});
      } else if (newGrid[currR][currC] === player) {
        if (toFlip.length > 0) {
          flippedAny = true;
          for (const cell of toFlip) {
            newGrid[cell.r][cell.c] = player;
          }
        }
        break;
      } else {
        break;
      }
      currR += dr;
      currC += dc;
    }
  }
  return { newGrid, flippedAny };
}

function evaluateGrid(grid: number[][], rules: GameRules) {
  let score = 0;
  const size = grid.length;
  
  let p1Moves = getValidMoves(grid, 1).length;
  let p2Moves = getValidMoves(grid, 2).length;
  
  let p1Territory = 0;
  let p2Territory = 0;
  
  const center = (size - 1) / 2;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = grid[r][c];
      if (cell === 0 || cell === -1) continue;
      
      const isP2 = cell === 2;
      const sign = isP2 ? 1 : -1;
      
      if (isP2) p2Territory++;
      else p1Territory++;

      if (rules === 'advanced') {
        const isCorner = (r === 0 || r === size - 1) && (c === 0 || c === size - 1);
        const isEdge = r === 0 || r === size - 1 || c === 0 || c === size - 1;
        const isXSquare = (r === 1 || r === size - 2) && (c === 1 || c === size - 2);
        const isCSquare = ((r === 0 || r === size - 1) && (c === 1 || c === size - 2)) ||
                          ((r === 1 || r === size - 2) && (c === 0 || c === size - 1));

        if (isCorner) {
          score += sign * 500;
        } else if (isXSquare || isCSquare) {
          const cornerR = r < size / 2 ? 0 : size - 1;
          const cornerC = c < size / 2 ? 0 : size - 1;
          if (grid[cornerR][cornerC] === 0) {
            score -= sign * 200;
          } else {
            score += sign * 20;
          }
        } else if (isEdge) {
          score += sign * 50;
        } else {
          score += sign * 10;
        }
      } else {
        const distToCenter = Math.abs(r - center) + Math.abs(c - center);
        score += sign * (size - distToCenter);
      }
    }
  }
  
  if (rules === 'advanced') {
    score += (p2Territory - p1Territory) * 10;
    score += (p2Moves - p1Moves) * 20;
  } else {
    score += (p2Territory - p1Territory) * 50;
    score += (p2Moves - p1Moves) * 100;
  }

  if (p1Moves === 0 && p2Moves > 0) score += 10000;
  if (p2Moves === 0 && p1Moves > 0) score -= 10000;
  
  return score;
}

function minimax(grid: number[][], depth: number, alpha: number, beta: number, isMaximizing: boolean, rules: GameRules): number {
  if (depth === 0) {
    return evaluateGrid(grid, rules);
  }

  const player = isMaximizing ? 2 : 1;
  const moves = getValidMoves(grid, player);

  if (moves.length === 0) {
    const nextPlayerMoves = getValidMoves(grid, isMaximizing ? 1 : 2);
    if (nextPlayerMoves.length === 0) {
      return evaluateGrid(grid, rules);
    }
    return minimax(grid, depth - 1, alpha, beta, !isMaximizing, rules);
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      let nextGrid;
      if (rules === 'advanced') {
        nextGrid = applyFlanking(grid, move.r, move.c, player).newGrid;
      } else {
        nextGrid = grid.map(row => [...row]);
        nextGrid[move.r][move.c] = player;
      }
      const ev = minimax(nextGrid, depth - 1, alpha, beta, false, rules);
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      let nextGrid;
      if (rules === 'advanced') {
        nextGrid = applyFlanking(grid, move.r, move.c, player).newGrid;
      } else {
        nextGrid = grid.map(row => [...row]);
        nextGrid[move.r][move.c] = player;
      }
      const ev = minimax(nextGrid, depth - 1, alpha, beta, true, rules);
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function getBestMove(grid: number[][], moves: {r: number, c: number}[], rules: GameRules, difficulty: AIDifficulty) {
  if (difficulty === 'easy') {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  if (difficulty === 'pro') {
    let bestMoves = [moves[0]];
    let maxScore = -Infinity;
    const depth = 3; // Increased depth for pro
    
    for (const move of moves) {
      let nextGrid;
      if (rules === 'advanced') {
        nextGrid = applyFlanking(grid, move.r, move.c, 2).newGrid;
      } else {
        nextGrid = grid.map(row => [...row]);
        nextGrid[move.r][move.c] = 2;
      }
      const score = minimax(nextGrid, depth - 1, -Infinity, Infinity, false, rules);
      if (score > maxScore) {
        maxScore = score;
        bestMoves = [move];
      } else if (score === maxScore) {
        bestMoves.push(move);
      }
    }
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  let bestMove = moves[0];
  let maxScore = -Infinity;
  const size = grid.length;
  
  for (const move of moves) {
    let score = 0;
    if (rules === 'advanced') {
      const { newGrid } = applyFlanking(grid, move.r, move.c, 2);
      let myTerritory = 0;
      let enemyTerritory = 0;
      newGrid.forEach(row => row.forEach(cell => {
        if (cell === 2) myTerritory++;
        if (cell === 1) enemyTerritory++;
      }));
      score = myTerritory - enemyTerritory;
    } else {
      let emptyNeighbors = 0;
      const {r, c} = move;
      if (r > 0 && grid[r-1][c] === 0) emptyNeighbors++;
      if (r < size - 1 && grid[r+1][c] === 0) emptyNeighbors++;
      if (c > 0 && grid[r][c-1] === 0) emptyNeighbors++;
      if (c < size - 1 && grid[r][c+1] === 0) emptyNeighbors++;
      score = emptyNeighbors;
    }
    
    if (difficulty === 'hard') {
      const isCorner = (move.r === 0 || move.r === size - 1) && (move.c === 0 || move.c === size - 1);
      const isEdge = move.r === 0 || move.r === size - 1 || move.c === 0 || move.c === size - 1;
      if (isCorner) score += 5;
      else if (isEdge) score += 2;
    }
    
    if (score > maxScore) {
      maxScore = score;
      bestMove = move;
    } else if (score === maxScore && Math.random() > 0.5) {
      bestMove = move;
    }
  }
  return bestMove;
}

const CreatorLink = ({ name, github, insta }: { name: string, github: string, insta: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative inline-block mx-1">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="font-bold underline decoration-2 underline-offset-4 hover:text-bauhaus-yellow transition-colors cursor-pointer uppercase"
      >
        {name}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-bauhaus-yellow text-bauhaus-black border-2 border-bauhaus-black hard-shadow-sm p-2 flex gap-3 z-20"
          >
            <a href={github} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform" title="GitHub">
              <Github size={20} />
            </a>
            <a href={insta} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform" title="Instagram">
              <Instagram size={20} />
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Onboarding = ({ step, onNext, onSkip }: { step: number, onNext: () => void, onSkip: () => void }) => {
  return (
    <div className="min-h-screen w-screen bg-bauhaus-bg flex items-center justify-center p-4 font-sans">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div 
            key="step0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="bg-white border-4 border-bauhaus-black hard-shadow-lg overflow-hidden max-w-3xl w-full flex flex-col md:flex-row"
          >
            <div className="p-8 md:w-1/2 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <Target className="text-bauhaus-red" size={32} />
                <h2 className="text-3xl font-bold uppercase tracking-tight text-bauhaus-black">The Objective</h2>
              </div>
              <p className="text-gray-600 font-medium mb-8 leading-relaxed text-lg">
                Color War is a strategic game of territorial expansion. Your goal is simple: have the most squares of your color when the board is completely full.
              </p>
              
              <div className="flex gap-4 mt-auto">
                <button onClick={onSkip} className="px-6 py-2 border-2 border-gray-300 text-gray-500 font-bold uppercase hover:bg-gray-50 transition-colors cursor-pointer">Skip</button>
                <button onClick={onNext} className="flex-1 bg-bauhaus-yellow border-2 border-bauhaus-black px-6 py-2 font-bold uppercase hover:translate-y-1 hover:translate-x-1 hard-shadow-sm hover:shadow-none transition-all flex justify-center items-center gap-2 cursor-pointer">
                  Next <ChevronRight size={20} />
                </button>
              </div>
            </div>
            <div className="bg-bauhaus-yellow/20 md:w-1/2 p-8 flex items-center justify-center border-t-4 md:border-t-0 md:border-l-4 border-bauhaus-black">
              <div className="grid grid-cols-4 gap-1 p-2 bg-bauhaus-black border-4 border-bauhaus-black hard-shadow-sm w-48 h-48">
                {Array.from({length: 16}).map((_, i) => (
                  <motion.div 
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, backgroundColor: i % 3 === 0 ? '#E8312B' : (i % 2 === 0 ? '#2B67F6' : '#FFFFFF') }}
                    transition={{ delay: i * 0.1, duration: 0.3 }}
                    className="w-full h-full"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="bg-white border-4 border-bauhaus-black hard-shadow-lg overflow-hidden max-w-3xl w-full flex flex-col md:flex-row"
          >
            <div className="p-8 md:w-1/2 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <MousePointerClick className="text-bauhaus-blue" size={32} />
                <h2 className="text-3xl font-bold uppercase tracking-tight text-bauhaus-black">Basic Rules</h2>
              </div>
              <p className="text-gray-600 font-medium mb-8 leading-relaxed text-lg">
                You can only place a tile adjacent to an existing tile on the board. Block your opponent's path to limit their moves and control the board.
              </p>
              
              <div className="flex gap-4 mt-auto">
                <button onClick={onSkip} className="px-6 py-2 border-2 border-gray-300 text-gray-500 font-bold uppercase hover:bg-gray-50 transition-colors cursor-pointer">Skip</button>
                <button onClick={onNext} className="flex-1 bg-bauhaus-blue text-white border-2 border-bauhaus-black px-6 py-2 font-bold uppercase hover:translate-y-1 hover:translate-x-1 hard-shadow-sm hover:shadow-none transition-all flex justify-center items-center gap-2 cursor-pointer">
                  Next <ChevronRight size={20} />
                </button>
              </div>
            </div>
            <div className="bg-bauhaus-blue/10 md:w-1/2 p-8 flex items-center justify-center border-t-4 md:border-t-0 md:border-l-4 border-bauhaus-black">
              <div className="grid grid-cols-3 gap-1 p-1 bg-bauhaus-black border-4 border-bauhaus-black hard-shadow-sm w-40 h-40 relative">
                {Array.from({length: 9}).map((_, i) => {
                  if (i === 4) return <div key={i} className="bg-bauhaus-red w-full h-full" />;
                  if (i === 1) return (
                    <motion.div key={i} 
                      animate={{ backgroundColor: ['#FFFFFF', '#fca5a5', '#E8312B', '#E8312B'] }}
                      transition={{ repeat: Infinity, duration: 2, times: [0, 0.4, 0.6, 1] }}
                      className="w-full h-full relative"
                    >
                      <motion.div 
                        animate={{ opacity: [0, 1, 0, 0] }}
                        transition={{ repeat: Infinity, duration: 2, times: [0, 0.2, 0.4, 1] }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <MousePointerClick size={24} className="text-bauhaus-black" />
                      </motion.div>
                    </motion.div>
                  );
                  return <div key={i} className="bg-white w-full h-full" />;
                })}
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white border-4 border-bauhaus-black hard-shadow-lg overflow-hidden max-w-3xl w-full flex flex-col md:flex-row"
          >
            <div className="p-8 md:w-1/2 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <Swords className="text-bauhaus-red" size={32} />
                <h2 className="text-3xl font-bold uppercase tracking-tight text-bauhaus-black">Advanced Mode</h2>
              </div>
              <p className="text-gray-600 font-medium mb-8 leading-relaxed text-lg">
                In <span className="text-bauhaus-red font-bold">Advanced</span> mode, placing a tile that traps your opponent's tiles between two of yours will flip them to your color!
              </p>
              
              <div className="flex gap-4 mt-auto">
                <button 
                  onClick={onNext} 
                  className="flex-1 bg-bauhaus-red text-white border-2 border-bauhaus-black px-6 py-3 font-bold uppercase text-xl hover:translate-y-1 hover:translate-x-1 hard-shadow-sm hover:shadow-none focus-visible:ring-4 focus-visible:ring-bauhaus-blue focus-visible:outline-none transition-all w-full cursor-pointer"
                >
                  Play Now
                </button>
              </div>
            </div>
            <div className="bg-bauhaus-red/10 md:w-1/2 p-8 flex items-center justify-center border-t-4 md:border-t-0 md:border-l-4 border-bauhaus-black">
              <div className="grid grid-cols-5 gap-1 p-1 bg-bauhaus-black border-4 border-bauhaus-black hard-shadow-sm w-full h-16">
                <div className="bg-bauhaus-red w-full h-full" />
                <motion.div 
                  animate={{ backgroundColor: ['#2B67F6', '#2B67F6', '#E8312B', '#E8312B'] }}
                  transition={{ repeat: Infinity, duration: 2.5, times: [0, 0.4, 0.6, 1] }}
                  className="w-full h-full" 
                />
                <motion.div 
                  animate={{ backgroundColor: ['#2B67F6', '#2B67F6', '#E8312B', '#E8312B'] }}
                  transition={{ repeat: Infinity, duration: 2.5, times: [0, 0.4, 0.6, 1] }}
                  className="w-full h-full" 
                />
                <motion.div 
                  animate={{ backgroundColor: ['#FFFFFF', '#fca5a5', '#E8312B', '#E8312B'] }}
                  transition={{ repeat: Infinity, duration: 2.5, times: [0, 0.3, 0.5, 1] }}
                  className="w-full h-full relative" 
                >
                  <motion.div 
                    animate={{ opacity: [0, 1, 0, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5, times: [0, 0.15, 0.3, 1] }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <MousePointerClick size={20} className="text-bauhaus-black" />
                  </motion.div>
                </motion.div>
                <div className="bg-white w-full h-full" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [gameRules, setGameRules] = useState<GameRules>('classic');
  const [gridSize, setGridSize] = useState<GridSize>(10);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medium');
  const [grid, setGrid] = useState<number[][]>(createInitialGrid('classic', 10));
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [gameMode, setGameMode] = useState<GameMode>('pvai');
  const [winner, setWinner] = useState<Player | 'draw' | null>(null);
  const [scores, setScores] = useState({ 1: 0, 2: 0 });
  const [invalidMove, setInvalidMove] = useState<{r: number, c: number} | null>(null);
  const [playbackColumn, setPlaybackColumn] = useState<number | null>(null);
  const [isPlayingComposition, setIsPlayingComposition] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  
  const isProcessingRef = useRef(false);
  
  const hasGameStarted = grid.some(row => row.some(cell => cell === 1 || cell === 2));
  
  const { initAudio, playChunk, playError, playFanfare, playFlip, playComposition, toggleBgm, stopBgm, isBgmPlaying } = useAudio();

  const resetGame = useCallback((rulesOverride?: GameRules, modeOverride?: GameMode, sizeOverride?: GridSize, diffOverride?: AIDifficulty) => {
    const finalRules = rulesOverride || gameRules;
    const finalMode = modeOverride || gameMode;
    const finalSize = sizeOverride || gridSize;
    const finalDiff = diffOverride || aiDifficulty;
    
    setGrid(createInitialGrid(finalRules, finalSize));
    setCurrentPlayer(1);
    setWinner(null);
    setScores({ 1: 0, 2: 0 });
    setInvalidMove(null);
    isProcessingRef.current = false;
    
    if (rulesOverride) setGameRules(rulesOverride);
    if (modeOverride) setGameMode(modeOverride);
    if (sizeOverride) setGridSize(sizeOverride);
    if (diffOverride) setAiDifficulty(diffOverride);
  }, [gameRules, gameMode, gridSize, aiDifficulty]);

  const handleShare = async () => {
    const shareData = {
      title: 'Gridzillion - Color War',
      text: 'Paint the grid. Claim territory. Play Color War with me!',
      url: window.location.href
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const makeMove = useCallback((r: number, c: number, player: Player) => {
    setGrid(prev => {
      let newGrid = prev.map(row => [...row]);
      let flipped = false;

      if (gameRules === 'advanced') {
        const result = applyFlanking(newGrid, r, c, player);
        newGrid = result.newGrid;
        flipped = result.flippedAny;
      } else {
        newGrid[r][c] = player;
      }

      if (flipped && playFlip) playFlip();
      
      let s1 = 0, s2 = 0, empty = 0;
      newGrid.forEach(row => row.forEach(cell => {
        if (cell === 1) s1++;
        else if (cell === 2) s2++;
        else if (cell === 0) empty++;
      }));
      setScores({ 1: s1, 2: s2 });
      
      const nextPlayer = player === 1 ? 2 : 1;
      const nextValidMoves = getValidMoves(newGrid, nextPlayer);
      const currentValidMoves = getValidMoves(newGrid, player);
      
      if (empty === 0 || (nextValidMoves.length === 0 && currentValidMoves.length === 0)) {
        if (s1 > s2) setWinner(1);
        else if (s2 > s1) setWinner(2);
        else setWinner('draw');
        stopBgm();
        playFanfare();
      } else if (nextValidMoves.length === 0) {
        setCurrentPlayer(player);
      } else {
        setCurrentPlayer(nextPlayer);
      }
      
      return newGrid;
    });
  }, [gameRules, playFanfare, stopBgm, playFlip]);

  const handleCellClick = (r: number, c: number) => {
    initAudio();
    if (winner) return;
    if (gameMode === 'pvai' && currentPlayer === 2) return;
    if (isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    
    const validMoves = getValidMoves(grid, currentPlayer);
    const isValid = validMoves.some(m => m.r === r && m.c === c);
    
    if (!isValid) {
      setInvalidMove({r, c});
      playError();
      setTimeout(() => {
        setInvalidMove(null);
        isProcessingRef.current = false;
      }, 300);
      return;
    }
    
    playChunk();
    makeMove(r, c, currentPlayer);
  };

  useEffect(() => {
    isProcessingRef.current = false;
  }, [grid, currentPlayer]);

  useEffect(() => {
    if (gameMode === 'pvai' && currentPlayer === 2 && !winner) {
      const timer = setTimeout(() => {
        const validMoves = getValidMoves(grid, 2);
        if (validMoves.length > 0) {
          const bestMove = getBestMove(grid, validMoves, gameRules, aiDifficulty);
          playChunk();
          makeMove(bestMove.r, bestMove.c, 2);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, gameMode, gameRules, aiDifficulty, grid, winner, makeMove, playChunk]);

  if (onboardingStep < 3) {
    return <Onboarding step={onboardingStep} onNext={() => setOnboardingStep(s => s + 1)} onSkip={() => setOnboardingStep(3)} />;
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="bg-bauhaus-yellow border-b-4 border-bauhaus-black p-4 sm:p-6 relative overflow-hidden">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center relative z-10 gap-4">
          <div className="flex items-center gap-4">
            <svg width="40" height="40" viewBox="0 0 32 32" className="overflow-visible">
              <circle cx="10" cy="16" r="8" fill="var(--color-bauhaus-red)" stroke="var(--color-bauhaus-black)" strokeWidth="2" />
              <rect x="12" y="8" width="16" height="16" fill="var(--color-bauhaus-blue)" stroke="var(--color-bauhaus-black)" strokeWidth="2" />
              <polygon points="20,4 32,28 8,28" fill="var(--color-bauhaus-yellow)" stroke="var(--color-bauhaus-black)" strokeWidth="2" opacity="0.9" />
            </svg>
            <h1 className="text-4xl sm:text-5xl tracking-tighter uppercase text-bauhaus-black mt-1">Color War</h1>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setShowInfoModal(true)} 
              aria-label="How to Play"
              title="How to Play"
              className="p-3 bg-bauhaus-bg border-2 border-bauhaus-black hard-shadow-sm hover:translate-y-1 hover:translate-x-1 hover:shadow-none focus-visible:ring-4 focus-visible:ring-bauhaus-blue focus-visible:outline-none transition-all cursor-pointer"
            >
              <Info size={24} aria-hidden="true" />
            </button>
            <button 
              onClick={handleShare} 
              aria-label="Share Game"
              title="Share Game"
              className="p-3 bg-bauhaus-bg border-2 border-bauhaus-black hard-shadow-sm hover:translate-y-1 hover:translate-x-1 hover:shadow-none focus-visible:ring-4 focus-visible:ring-bauhaus-blue focus-visible:outline-none transition-all cursor-pointer"
            >
              <Share2 size={24} aria-hidden="true" />
            </button>
            <button 
              onClick={toggleBgm} 
              aria-label={isBgmPlaying ? "Mute background music" : "Play background music"}
              title={isBgmPlaying ? "Mute Music" : "Play Music"}
              className="p-3 bg-bauhaus-bg border-2 border-bauhaus-black hard-shadow-sm hover:translate-y-1 hover:translate-x-1 hover:shadow-none focus-visible:ring-4 focus-visible:ring-bauhaus-blue focus-visible:outline-none transition-all cursor-pointer"
            >
              {isBgmPlaying ? <Volume2 size={24} aria-hidden="true" /> : <VolumeX size={24} aria-hidden="true" />}
            </button>
            <button 
              onClick={() => resetGame()} 
              aria-label="Reset Game"
              title="Reset Game"
              className="p-3 bg-bauhaus-bg border-2 border-bauhaus-black hard-shadow-sm hover:translate-y-1 hover:translate-x-1 hover:shadow-none focus-visible:ring-4 focus-visible:ring-bauhaus-blue focus-visible:outline-none transition-all cursor-pointer"
            >
              <RotateCcw size={24} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-bauhaus-red border-4 border-bauhaus-black rotate-45 z-0 hidden sm:block"></div>
        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-bauhaus-blue border-4 border-bauhaus-black rotate-45 z-0 hidden sm:block"></div>
      </header>

      <main className="flex-grow flex flex-col items-center p-4 sm:p-8 relative">
        <AnimatePresence mode="wait">
          {hasGameStarted ? (
            <motion.div 
              key="game-active-summary"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-wrap justify-center items-center gap-4 mb-8 w-full max-w-3xl"
            >
              <div className="bg-white border-2 border-bauhaus-black hard-shadow-sm px-4 py-2 font-bold uppercase text-sm sm:text-base flex flex-wrap justify-center gap-3 items-center">
                <span className="flex items-center gap-2">
                  {gameMode === 'pvai' ? <Monitor size={16} /> : <User size={16} />} 
                  {gameMode === 'pvai' ? 'VS AI' : '2 Player'}
                </span>
                <span className="text-gray-300">|</span>
                <span className={gameRules === 'advanced' ? 'text-bauhaus-red' : ''}>{gameRules}</span>
                <span className="text-gray-300">|</span>
                <span>{gridSize}x{gridSize}</span>
                {gameMode === 'pvai' && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="text-bauhaus-blue">{aiDifficulty}</span>
                  </>
                )}
              </div>
              <button 
                onClick={() => resetGame()}
                className="bg-bauhaus-yellow border-2 border-bauhaus-black hard-shadow-sm px-4 py-2 font-bold uppercase text-sm sm:text-base hover:translate-y-1 hover:translate-x-1 hover:shadow-none focus-visible:ring-4 focus-visible:ring-bauhaus-blue focus-visible:outline-none transition-all flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw size={18} /> Restart
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="game-setup-panel"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex flex-col items-center gap-4 mb-4 w-full max-w-3xl bg-white border-4 border-bauhaus-black hard-shadow p-4 sm:p-6"
            >
              <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-widest border-b-4 border-bauhaus-black pb-2 w-full text-center">Game Setup</h2>
              
              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                {/* Mode */}
                <div className="flex flex-col gap-2">
                  <label className="font-bold uppercase text-sm tracking-widest text-gray-500">Opponent</label>
                  <div className="flex border-2 border-bauhaus-black">
                    <button 
                      onClick={() => resetGame(undefined, 'pvai')}
                      aria-pressed={gameMode === 'pvai'}
                      className={`flex-1 flex justify-center items-center gap-2 px-3 py-3 font-bold uppercase transition-colors focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-bauhaus-blue focus-visible:outline-none ${gameMode === 'pvai' ? 'bg-bauhaus-black text-white' : 'hover:bg-gray-200 cursor-pointer'}`}
                    >
                      <Monitor size={18} aria-hidden="true" /> VS AI
                    </button>
                    <button 
                      onClick={() => resetGame(undefined, 'pvp')}
                      aria-pressed={gameMode === 'pvp'}
                      className={`flex-1 flex justify-center items-center gap-2 px-3 py-3 font-bold uppercase transition-colors border-l-2 border-bauhaus-black focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-bauhaus-blue focus-visible:outline-none ${gameMode === 'pvp' ? 'bg-bauhaus-black text-white' : 'hover:bg-gray-200 cursor-pointer'}`}
                    >
                      <User size={18} aria-hidden="true" /> 2 Player
                    </button>
                  </div>
                </div>

                {/* Rules */}
                <div className="flex flex-col gap-2">
                  <label className="font-bold uppercase text-sm tracking-widest text-gray-500">Ruleset</label>
                  <div className="flex border-2 border-bauhaus-black">
                    <button 
                      onClick={() => resetGame('classic')}
                      aria-pressed={gameRules === 'classic'}
                      className={`flex-1 px-3 py-3 font-bold uppercase transition-colors focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-bauhaus-blue focus-visible:outline-none ${gameRules === 'classic' ? 'bg-bauhaus-yellow text-bauhaus-black' : 'hover:bg-gray-200 cursor-pointer'}`}
                    >
                      Classic
                    </button>
                    <button 
                      onClick={() => resetGame('advanced')}
                      aria-pressed={gameRules === 'advanced'}
                      className={`flex-1 px-3 py-3 font-bold uppercase transition-colors border-l-2 border-bauhaus-black focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-bauhaus-blue focus-visible:outline-none ${gameRules === 'advanced' ? 'bg-bauhaus-yellow text-bauhaus-black' : 'hover:bg-gray-200 cursor-pointer'}`}
                    >
                      Advanced
                    </button>
                  </div>
                </div>

                {/* Grid Size */}
                <div className="flex flex-col gap-2">
                  <label className="font-bold uppercase text-sm tracking-widest text-gray-500">Grid Size</label>
                  <div className="flex border-2 border-bauhaus-black">
                    {([6, 8, 10, 12] as GridSize[]).map((size, i) => (
                      <button 
                        key={size}
                        onClick={() => resetGame(undefined, undefined, size)}
                        aria-pressed={gridSize === size}
                        className={`flex-1 px-2 py-3 font-bold uppercase transition-colors ${i > 0 ? 'border-l-2 border-bauhaus-black' : ''} focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-bauhaus-blue focus-visible:outline-none ${gridSize === size ? 'bg-bauhaus-red text-white' : 'hover:bg-gray-200 cursor-pointer'}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Difficulty */}
                <div className={`flex flex-col gap-2 transition-opacity duration-300 ${gameMode === 'pvp' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                  <label className="font-bold uppercase text-sm tracking-widest text-gray-500">AI Difficulty</label>
                  <div className="flex border-2 border-bauhaus-black">
                    {(['easy', 'medium', 'hard', 'pro'] as AIDifficulty[]).map((diff, i) => (
                      <button 
                        key={diff}
                        onClick={() => resetGame(undefined, undefined, undefined, diff)}
                        aria-pressed={aiDifficulty === diff}
                        tabIndex={gameMode === 'pvp' ? -1 : 0}
                        className={`flex-1 px-1 sm:px-2 py-3 text-xs sm:text-sm font-bold uppercase transition-colors ${i > 0 ? 'border-l-2 border-bauhaus-black' : ''} focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-bauhaus-blue focus-visible:outline-none ${aiDifficulty === diff ? 'bg-bauhaus-blue text-white' : 'hover:bg-gray-200 cursor-pointer'}`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-center gap-4 mb-2 w-full max-w-2xl flex-shrink-0">
          <div className="flex-1 bg-bauhaus-red border-4 border-bauhaus-black hard-shadow p-2 sm:p-3 text-white flex justify-between items-center relative overflow-hidden">
            <span className="text-sm sm:text-xl uppercase z-10 font-bold">Red</span>
            <div className="flex items-center gap-2 z-10">
              {currentPlayer === 1 && gameMode === 'pvai' && <span className="animate-pulse text-xl">...</span>}
              <span className="text-3xl sm:text-5xl font-bold">{scores[1]}</span>
            </div>
            {currentPlayer === 1 && <motion.div layoutId="activePlayer" className="absolute bottom-0 left-0 right-0 h-1 sm:h-2 bg-white" />}
          </div>
          <div className="flex-1 bg-bauhaus-blue border-4 border-bauhaus-black hard-shadow p-2 sm:p-3 text-white flex justify-between items-center relative overflow-hidden">
            <span className="text-sm sm:text-xl uppercase z-10 font-bold">Blue</span>
            <div className="flex items-center gap-2 z-10">
              {currentPlayer === 2 && gameMode === 'pvai' && <span className="animate-pulse text-xl">...</span>}
              <span className="text-3xl sm:text-5xl font-bold">{scores[2]}</span>
            </div>
            {currentPlayer === 2 && <motion.div layoutId="activePlayer" className="absolute bottom-0 left-0 right-0 h-1 sm:h-2 bg-white" />}
          </div>
        </div>

        <div className="flex-grow flex justify-center items-center w-full min-h-0 py-2">
          <div 
            role="grid"
            aria-label="Game Board"
            className="grid bg-bauhaus-black border-4 border-bauhaus-black hard-shadow"
            style={{ 
              gridTemplateColumns: `repeat(${gridSize}, 1fr)`, 
              gridTemplateRows: `repeat(${gridSize}, 1fr)`,
              gap: '2px',
              width: 'min(90vw, 600px, calc(100vh - 350px))',
              height: 'min(90vw, 600px, calc(100vh - 350px))'
            }}
          >
            {grid.map((row, r) => row.map((cell, c) => {
              const isInvalid = invalidMove?.r === r && invalidMove?.c === c;
              const isValidMove = getValidMoves(grid, currentPlayer).some(m => m.r === r && m.c === c);
              const hoverClass = cell === 0 && isValidMove 
                ? (currentPlayer === 1 ? 'hover-preview-red' : 'hover-preview-blue') 
                : '';
              
              let cellLabel = "Empty cell";
              if (cell === 1) cellLabel = "Red territory";
              else if (cell === 2) cellLabel = "Blue territory";
              else if (cell === -1) cellLabel = "Obstacle";

              return (
                <motion.div
                  key={`${r}-${c}`}
                  id={`cell-${r}-${c}`}
                  role="gridcell"
                  aria-label={`${cellLabel} at row ${r + 1}, column ${c + 1}`}
                  tabIndex={isValidMove ? 0 : -1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCellClick(r, c);
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      document.getElementById(`cell-${r - 1}-${c}`)?.focus();
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      document.getElementById(`cell-${r + 1}-${c}`)?.focus();
                    } else if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      document.getElementById(`cell-${r}-${c - 1}`)?.focus();
                    } else if (e.key === 'ArrowRight') {
                      e.preventDefault();
                      document.getElementById(`cell-${r}-${c + 1}`)?.focus();
                    }
                  }}
                  onClick={() => handleCellClick(r, c)}
                  animate={isInvalid ? { x: [-5, 5, -5, 5, 0], backgroundColor: '#ff0000' } : {}}
                  transition={{ duration: 0.3 }}
                  className={`
                    relative w-full h-full flex items-center justify-center focus:ring-inset focus:ring-4 focus:ring-bauhaus-yellow focus:outline-none focus:z-20
                    ${cell === -1 ? 'bg-bauhaus-black' : cell === 0 ? 'bg-bauhaus-bg' : cell === 1 ? 'bg-bauhaus-red' : 'bg-bauhaus-blue'}
                    ${cell === 0 && isValidMove ? 'cursor-pointer' : cell === -1 ? 'cursor-not-allowed' : 'cursor-default'}
                    ${hoverClass}
                  `}
                >
                  {playbackColumn === c && (
                    <div className="absolute inset-0 bg-white opacity-50 z-20 pointer-events-none"></div>
                  )}
                  {cell === -1 && (
                    <div className="w-1/2 h-1/2 bg-bauhaus-bg opacity-20 rotate-45"></div>
                  )}
                  <AnimatePresence>
                    {(cell === 1 || cell === 2) && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`absolute inset-0 ${cell === 1 ? 'bg-bauhaus-red' : 'bg-bauhaus-blue'}`}
                      />
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            }))}
          </div>
        </div>
      </main>

      <footer className="bg-bauhaus-black text-white p-6 text-center border-t-4 border-bauhaus-black flex flex-col items-center gap-4">
        <p className="uppercase tracking-widest text-sm">Paint the grid. Claim territory. The color with the most squares at end wins.</p>
        <div className="text-sm uppercase tracking-widest">
          Built by 
          <CreatorLink 
            name="Aditya" 
            github="https://github.com/adimestry" 
            insta="https://www.instagram.com/aditya_mestry_x007/" 
          /> 
          and 
          <CreatorLink 
            name="Dhruv" 
            github="https://github.com/dhruvkasar" 
            insta="https://www.instagram.com/dhruvvkasar/" 
          />
        </div>
      </footer>

      <AnimatePresence>
        {showInfoModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setShowInfoModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white border-4 border-bauhaus-black hard-shadow max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-10 relative"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowInfoModal(false)}
                className="absolute top-4 right-4 p-2 bg-bauhaus-bg border-2 border-bauhaus-black hover:bg-bauhaus-red hover:text-white transition-colors cursor-pointer"
              >
                <X size={24} />
              </button>
              <h2 className="text-3xl sm:text-4xl font-bold uppercase mb-6 border-b-4 border-bauhaus-black pb-2">How to Play</h2>
              
              <div className="space-y-6 text-lg">
                <section>
                  <h3 className="text-2xl font-bold text-bauhaus-blue mb-2 uppercase">The Basics</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Goal:</strong> Claim the most territory on the grid.</li>
                    <li><strong>First Move:</strong> You can place your first tile anywhere.</li>
                    <li><strong>Expansion:</strong> All subsequent tiles must be placed adjacent (up, down, left, or right) to your existing territory.</li>
                    <li>The game ends when the board is full or neither player can move.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-2xl font-bold text-bauhaus-red mb-2 uppercase">Advanced Rules</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Obstacles:</strong> Black squares with diagonal lines are blocked. You cannot claim them.</li>
                    <li><strong>Flanking (Capture):</strong> If you place a tile that traps a line of your opponent's tiles between two of your own, those trapped tiles flip to your color!</li>
                  </ul>
                </section>
                
                <section>
                  <h3 className="text-2xl font-bold text-bauhaus-yellow mb-2 uppercase drop-shadow-md">Controls</h3>
                  <p>Click or tap a cell to claim it. You can also use the <strong>Tab</strong> key to navigate valid moves and press <strong>Enter</strong> or <strong>Space</strong> to claim.</p>
                </section>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {winner && !isPlayingComposition && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 flex flex-col items-center justify-center text-white p-4
              ${winner === 1 ? 'bg-bauhaus-red' : winner === 2 ? 'bg-bauhaus-blue' : 'bg-bauhaus-black'}
            `}
          >
            <motion.h2 
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="text-6xl sm:text-8xl uppercase mb-8 text-center"
              style={{ textShadow: '8px 8px 0px var(--color-bauhaus-black)' }}
            >
              {winner === 'draw' ? 'Draw!' : `${winner === 1 ? 'Red' : 'Blue'} Wins!`}
            </motion.h2>
            
            <div className="flex gap-8 sm:gap-16 mb-12 text-2xl sm:text-4xl">
              <div className="flex flex-col items-center bg-bauhaus-black p-6 sm:p-8 border-4 border-white hard-shadow">
                <span className="uppercase">Red</span>
                <span className="text-6xl sm:text-8xl font-bold mt-2">{scores[1]}</span>
              </div>
              <div className="flex flex-col items-center bg-bauhaus-black p-6 sm:p-8 border-4 border-white hard-shadow">
                <span className="uppercase">Blue</span>
                <span className="text-6xl sm:text-8xl font-bold mt-2">{scores[2]}</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
              <button 
                onClick={() => resetGame()}
                className="px-8 sm:px-12 py-4 sm:py-6 bg-bauhaus-yellow text-bauhaus-black border-4 border-bauhaus-black hard-shadow text-2xl sm:text-3xl uppercase hover:translate-y-2 hover:translate-x-2 hover:shadow-none focus-visible:ring-4 focus-visible:ring-white focus-visible:outline-none transition-all cursor-pointer"
              >
                Play Again
              </button>
              <button 
                onClick={() => {
                  setIsPlayingComposition(true);
                  playComposition(grid, winner, setPlaybackColumn, () => {
                    setPlaybackColumn(null);
                    setIsPlayingComposition(false);
                  });
                }}
                className="px-8 sm:px-12 py-4 sm:py-6 bg-white text-bauhaus-black border-4 border-bauhaus-black hard-shadow text-xl sm:text-2xl uppercase hover:translate-y-2 hover:translate-x-2 hover:shadow-none focus-visible:ring-4 focus-visible:ring-white focus-visible:outline-none transition-all cursor-pointer flex items-center justify-center gap-3"
              >
                <Music size={28} /> Listen to Match
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
