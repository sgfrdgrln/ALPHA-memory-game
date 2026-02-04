'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Card {
  id: number;
  symbol: string;
  isFlipped: boolean;
  isMatched: boolean;
  isImage?: boolean;
}

interface LeaderboardEntry {
  name: string;
  moves: number;
  time: number;
  date: string;
}

type GameState = 'not-started' | 'memorizing' | 'playing' | 'won' | 'failed';
type GameMode = 'normal' | 'challenge';

const symbols = ['🎮', '🎯', '🎨', '🎭', '🎪', '🎸', '🎺', '/alphalogo.jpg'];

export default function Home() {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [gameState, setGameState] = useState<GameState>('not-started');
  const [gameMode, setGameMode] = useState<GameMode>('normal');
  const [timer, setTimer] = useState(0);
  const [memorizingTime, setMemorizingTime] = useState(5);
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Initialize game and load leaderboard
  useEffect(() => {
    initializeGame();
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard');
      const result = await response.json();
      if (result.success) {
        setLeaderboard(result.data);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  // Timer for gameplay
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === 'playing') {
      interval = setInterval(() => {
        setTimer((prev) => {
          const newTime = prev + 1;
          // Check if time limit exceeded in challenge mode
          if (gameMode === 'challenge' && newTime >= 15) {
            setGameState('failed');
            return newTime;
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState, gameMode]);

  // Memorizing countdown
  useEffect(() => {
    if (gameState === 'memorizing') {
      const interval = setInterval(() => {
        setMemorizingTime((prev) => {
          if (prev <= 1) {
            // Flip all cards back and start playing
            setCards((cards) =>
              cards.map((c) => ({ ...c, isFlipped: false }))
            );
            setGameState('playing');
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState]);

  const initializeGame = () => {
    const duplicatedSymbols = [...symbols, ...symbols];
    const shuffled = duplicatedSymbols
      .sort(() => Math.random() - 0.5)
      .map((symbol, index) => ({
        id: index,
        symbol,
        isFlipped: false,
        isMatched: false,
        isImage: symbol.startsWith('/'),
      }));
    setCards(shuffled);
    setFlippedCards([]);
    setMoves(0);
    setGameState('not-started');
    setTimer(0);
    setMemorizingTime(5);
    setGameMode('normal');
  };

  const startGame = () => {
    if (!playerName.trim()) {
      alert('Please enter your name!');
      return;
    }
    // Show all cards for memorization
    setCards((cards) =>
      cards.map((c) => ({ ...c, isFlipped: true }))
    );
    setGameState('memorizing');
  };

  const saveToLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: playerName,
          moves,
          time: timer,
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        // Reload leaderboard after saving
        await loadLeaderboard();
      }
    } catch (error) {
      console.error('Error saving to leaderboard:', error);
    }
  };

  const handleCardClick = (id: number) => {
    if (gameState !== 'playing') return;
    
    const card = cards.find((c) => c.id === id);
    if (!card || card.isFlipped || card.isMatched || flippedCards.length === 2) {
      return;
    }

    const newFlippedCards = [...flippedCards, id];
    setFlippedCards(newFlippedCards);

    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isFlipped: true } : c))
    );

    if (newFlippedCards.length === 2) {
      setMoves((prev) => prev + 1);
      const [firstId, secondId] = newFlippedCards;
      const firstCard = cards.find((c) => c.id === firstId);
      const secondCard = cards.find((c) => c.id === secondId);

      if (firstCard?.symbol === secondCard?.symbol) {
        // Match found
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === firstId || c.id === secondId
                ? { ...c, isMatched: true }
                : c
            )
          );
          setFlippedCards([]);
          
          // Check if game is won
          const updatedCards = cards.map((c) =>
            c.id === firstId || c.id === secondId ? { ...c, isMatched: true } : c
          );
          if (updatedCards.every((c) => c.isMatched)) {
            setGameState('won');
            saveToLeaderboard();
          }
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === firstId || c.id === secondId
                ? { ...c, isFlipped: false }
                : c
            )
          );
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-purple-400 via-pink-500 to-red-500 p-4">
      <main className="flex flex-col items-center gap-8 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">
            🧠 Memory Game
          </h1>
          <p className="text-white/90 text-lg">Find all matching pairs!</p>
        </div>

        {/* Start Screen */}
        {gameState === 'not-started' && (
          <div className="flex flex-col items-center gap-6 bg-white/20 backdrop-blur-sm rounded-3xl p-12 text-white">
            <div className="text-6xl mb-4">🎮</div>
            <h2 className="text-3xl font-bold mb-2">Ready to Play?</h2>
            
            {/* Mode Selection */}
            <div className="flex gap-4 mb-2">
              <button
                onClick={() => setGameMode('normal')}
                className={`px-6 py-3 rounded-full font-semibold transition-all transform hover:scale-105 ${
                  gameMode === 'normal'
                    ? 'bg-white text-purple-600 shadow-lg'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                Normal Mode
              </button>
              <button
                onClick={() => setGameMode('challenge')}
                className={`px-6 py-3 rounded-full font-semibold transition-all transform hover:scale-105 ${
                  gameMode === 'challenge'
                    ? 'bg-white text-red-600 shadow-lg'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                ⚡ Challenge Mode
              </button>
            </div>
            
            <p className="text-center text-white/90 mb-4 max-w-md">
              {gameMode === 'normal' ? (
                <>
                  You'll have 5 seconds to memorize the cards before they flip. 
                  Try to find all matching pairs in as few moves as possible!
                </>
              ) : (
                <>
                  <span className="font-bold text-yellow-300">⚡ CHALLENGE MODE:</span><br />
                  5 seconds to memorize, only 15 seconds to complete!<br />
                  Can you handle the pressure?
                </>
              )}
            </p>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="w-full max-w-xs px-6 py-3 rounded-full text-gray-800 text-center font-semibold focus:outline-none focus:ring-4 focus:ring-white/50 transition-all"
              maxLength={20}
            />
            <button
              onClick={startGame}
              className={`px-8 py-4 rounded-full text-xl font-bold hover:bg-white/90 transition-all transform hover:scale-105 shadow-xl ${
                gameMode === 'normal'
                  ? 'bg-white text-purple-600'
                  : 'bg-white text-red-600'
              }`}
            >
              Start {gameMode === 'challenge' ? 'Challenge' : 'Game'}
            </button>
            <button
              onClick={() => setShowLeaderboard(true)}
              className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-full font-semibold hover:bg-white/30 transition-all"
            >
              🏆 View Leaderboard
            </button>
          </div>
        )}

        {/* Memorizing Phase */}
        {gameState === 'memorizing' && (
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-8 py-4 text-white font-semibold animate-pulse">
            <div className="text-center">
              <div className="text-sm opacity-80">Memorize!</div>
              <div className="text-3xl">👀 {memorizingTime}s</div>
            </div>
          </div>
        )}

        {/* Game Stats - only show during playing and won states */}
        {(gameState === 'playing' || gameState === 'won' || gameState === 'failed') && (
          <div className="flex gap-6 bg-white/20 backdrop-blur-sm rounded-2xl px-8 py-4 text-white font-semibold">
            <div className="text-center">
              <div className="text-sm opacity-80">Moves</div>
              <div className="text-3xl">{moves}</div>
            </div>
            <div className="w-px bg-white/30"></div>
            <div className="text-center">
              <div className="text-sm opacity-80">Time</div>
              <div className={`text-3xl ${
                gameMode === 'challenge' && timer >= 12 && gameState === 'playing' 
                  ? 'text-red-300 animate-pulse' 
                  : ''
              }`}>
                {gameMode === 'challenge' && gameState === 'playing' 
                  ? `${15 - timer}s left` 
                  : formatTime(timer)}
              </div>
            </div>
          </div>
        )}

        {/* Game Board - show when not in start state */}
        {gameState !== 'not-started' && (
          <div className="grid grid-cols-4 gap-4 w-full max-w-lg">
            {cards.map((card) => (
              <button
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                disabled={card.isMatched || gameState === 'memorizing'}
                className={`aspect-square rounded-2xl text-5xl font-bold transition-all duration-300 transform hover:scale-105 flex items-center justify-center overflow-hidden ${
                  card.isFlipped || card.isMatched
                    ? 'bg-white shadow-xl'
                    : 'bg-white/30 backdrop-blur-sm hover:bg-white/40'
                } ${card.isMatched ? 'opacity-50' : ''} ${
                  gameState === 'memorizing' ? 'cursor-default' : ''
                }`}
              >
                {card.isFlipped || card.isMatched ? (
                  card.isImage ? (
                    <Image
                      src={card.symbol}
                      alt="Alpha Logo"
                      width={80}
                      height={80}
                      className="object-contain"
                    />
                  ) : (
                    card.symbol
                  )
                ) : (
                  '?'
                )}
              </button>
            ))}
          </div>
        )}

        {/* Win Message */}
        {gameState === 'won' && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 text-center space-y-4 shadow-2xl">
              <div className="text-6xl">🎉</div>
              <h2 className="text-3xl font-bold text-gray-800">You Won!</h2>
              {gameMode === 'challenge' && (
                <div className="text-xl font-bold text-red-600">⚡ Challenge Mode Complete! ⚡</div>
              )}
              <div className="text-gray-600">
                <p>Moves: <span className="font-bold text-purple-600">{moves}</span></p>
                <p>Time: <span className="font-bold text-purple-600">{formatTime(timer)}</span></p>
              </div>
              <button
                onClick={initializeGame}
                className="bg-linear-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-full font-semibold hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105"
              >
                Play Again
              </button>
            </div>
          </div>
        )}

        {/* Failed Message */}
        {gameState === 'failed' && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 text-center space-y-4 shadow-2xl">
              <div className="text-6xl">⏰</div>
              <h2 className="text-3xl font-bold text-gray-800">Time's Up!</h2>
              <p className="text-gray-600">
                You ran out of time in Challenge Mode.<br />
                Better luck next time!
              </p>
              <div className="text-gray-600">
                <p>Moves: <span className="font-bold text-red-600">{moves}</span></p>
                <p>Time: <span className="font-bold text-red-600">{formatTime(timer)}</span></p>
              </div>
              <button
                onClick={initializeGame}
                className="bg-linear-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-full font-semibold hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Reset Button - only show during playing state */}
        {gameState === 'playing' && (
          <button
            onClick={initializeGame}
            className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-full font-semibold hover:bg-white/30 transition-all"
          >
            Reset Game
          </button>
        )}

        {/* Leaderboard Modal */}
        {showLeaderboard && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-gray-800">🏆 Leaderboard</h2>
                <button
                  onClick={() => setShowLeaderboard(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>
              {leaderboard.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No scores yet. Be the first to play!</p>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-4 rounded-xl ${
                        index === 0
                          ? 'bg-linear-to-r from-yellow-400 to-yellow-500 text-white'
                          : index === 1
                          ? 'bg-linear-to-r from-gray-300 to-gray-400 text-gray-800'
                          : index === 2
                          ? 'bg-linear-to-r from-orange-400 to-orange-500 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                        </span>
                        <div>
                          <div className="font-bold">{entry.name}</div>
                          <div className="text-sm opacity-80">{entry.date}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{entry.moves} moves</div>
                        <div className="text-sm opacity-80">{formatTime(entry.time)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

