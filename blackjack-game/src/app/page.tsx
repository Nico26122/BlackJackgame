'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getChips, updateChips, saveGame, getHistory } from '@/lib/supabaseAPI';

// Card type definitions
type Suit = '♠' | '♥' | '♦' | '♣';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

interface PlayingCard {
  suit: Suit;
  rank: Rank;
  id: string;
}

interface GameHistory {
  id: string;
  user_id: string;
  player_hand: PlayingCard[];
  dealer_hand: PlayingCard[];
  result: 'win' | 'loss' | 'push';
  bet: number;
  created_at: string;
}

// Utility functions
const suits: Suit[] = ['♠', '♥', '♦', '♣'];
const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const getRandomCard = (): PlayingCard => {
  const suit = suits[Math.floor(Math.random() * suits.length)];
  const rank = ranks[Math.floor(Math.random() * ranks.length)];
  return { suit, rank, id: `${Date.now()}-${Math.random()}` };
};

const getCardValue = (card: PlayingCard): number => {
  if (card.rank === 'A') return 11;
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  return parseInt(card.rank);
};

const calculateHandValue = (hand: PlayingCard[]): number => {
  let value = 0;
  let aces = 0;

  hand.forEach(card => {
    if (card.rank === 'A') {
      aces += 1;
      value += 11;
    } else {
      value += getCardValue(card);
    }
  });

  while (value > 21 && aces > 0) {
    value -= 10;
    aces -= 1;
  }

  return value;
};


export default function BlackjackGame() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  
  const [chips, setChips] = useState(0);
  const [bet, setBet] = useState(10);
  const [playerHand, setPlayerHand] = useState<PlayingCard[]>([]);
  const [dealerHand, setDealerHand] = useState<PlayingCard[]>([]);
  const [gameState, setGameState] = useState<'betting' | 'playing' | 'dealer' | 'ended'>('betting');
  const [message, setMessage] = useState('Place your bet to start!');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<GameHistory[]>([]);
  const [aiAdvice, setAiAdvice] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [animatingCard, setAnimatingCard] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newCardId, setNewCardId] = useState<string | null>(null);


  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load user data when authenticated
  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    
    setLoading(true);
    const userChips = await getChips(user.id);
    const userHistory = await getHistory(user.id);
    
    setChips(userChips);
    setHistory(userHistory);
    setLoading(false);
  };

  // Show loading while checking auth
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  // Don't render game if no user
  if (!user) {
    return null;
  }

  const startGame = () => {
    if (bet <= 0 || bet > chips) {
      setMessage(bet <= 0 ? 'Please enter a valid bet amount!' : 'Insufficient chips!');
      return;
    }

    setAiAdvice('');
    setGameState('playing');
    setMessage('Dealing...');
    setNewCardId(null);

    const card1 = getRandomCard();
    const card2 = getRandomCard();
    const dealerCard = getRandomCard();

    // Deal first player card
    setTimeout(() => {
      setPlayerHand([card1]);
      setNewCardId(card1.id);
    }, 300);

    // Deal dealer card
    setTimeout(() => {
      setDealerHand([dealerCard]);
      setNewCardId(dealerCard.id);
    }, 900);

    // Deal second player card
    setTimeout(() => {
      setPlayerHand([card1, card2]);
      setNewCardId(card2.id);
    }, 1500);

    // Check for blackjack
    setTimeout(() => {
      setNewCardId(null);
      const playerValue = calculateHandValue([card1, card2]);
      
      if (playerValue === 21) {
        setGameState('ended');
        const winAmount = Math.floor(bet * 1.5);
        const newChips = chips + winAmount;
        setChips(newChips);
        setMessage(`BLACKJACK! You win $${winAmount}!`);
        
        updateChips(user.id, newChips);
        saveGame(user.id, [card1, card2], [dealerCard], 'win', bet);
        
        const newGame = {
          id: Date.now().toString(),
          user_id: user.id,
          player_hand: [card1, card2],
          dealer_hand: [dealerCard],
          result: 'win' as const,
          bet,
          created_at: new Date().toISOString()
        };
        setHistory([newGame, ...history]);
      } else {
        setMessage('Hit or Stand?');
      }
    }, 2100);
  };

  const hit = () => {
    const newCard = getRandomCard();
    const newHand = [...playerHand, newCard];
    setPlayerHand(newHand);
    setAiAdvice('');
    setNewCardId(newCard.id); 
    
    setTimeout(() => setNewCardId(null), 600); // Clear after animation

    const value = calculateHandValue(newHand);
    if (value > 21) {
      setTimeout(() => endGame('loss'), 800);
    }
  };

  const stand = () => {
    setGameState('dealer');
    setMessage('Dealer is playing...');
    dealerPlay();
  };

  const dealerPlay = () => {
    let newDealerHand = [...dealerHand];
    let dealerValue = calculateHandValue(newDealerHand);
    
    const dealCard = () => {
      if (dealerValue < 17) {
        setTimeout(() => {
          const newCard = getRandomCard();
          newDealerHand = [...newDealerHand, newCard];
          setDealerHand(newDealerHand);
          setNewCardId(newCard.id); 
          
          setTimeout(() => setNewCardId(null), 600); // Clear after animation
          
          dealerValue = calculateHandValue(newDealerHand);
          dealCard();
        }, 1000);
      } else {
        setTimeout(() => determineWinner(newDealerHand), 500);
      }
    };
    
    dealCard();
  };

  const determineWinner = async (finalDealerHand: PlayingCard[]) => {
    const playerValue = calculateHandValue(playerHand);
    const dealerValue = calculateHandValue(finalDealerHand);
    
    let result: 'win' | 'loss' | 'push';
    let newChips = chips;

    if (dealerValue > 21) {
      result = 'win';
      newChips = chips + bet;
      setMessage(`Dealer busts! You win $${bet}!`);
    } else if (playerValue > dealerValue) {
      result = 'win';
      newChips = chips + bet;
      setMessage(`You win $${bet}!`);
    } else if (playerValue < dealerValue) {
      result = 'loss';
      newChips = chips - bet;
      setMessage(`You lose $${bet}!`);
    } else {
      result = 'push';
      setMessage('Push! Bet returned.');
    }

    setChips(newChips);
    await updateChips(user.id, newChips);
    await saveGame(user.id, playerHand, finalDealerHand, result, bet);
    
    setGameState('ended');
    
    // Add to history locally to avoid full reload when determeining winner
    const newGame = {
      id: Date.now().toString(),
      user_id: user.id,
      player_hand: playerHand,
      dealer_hand: finalDealerHand,
      result,
      bet,
      created_at: new Date().toISOString()
    };
    setHistory([newGame, ...history]);
  };

  const endGame = async (result: 'loss') => {
    const newChips = chips - bet;
    setChips(newChips);
    await updateChips(user.id, newChips);
    await saveGame(user.id, playerHand, dealerHand, result, bet);
    
    setGameState('ended');
    setMessage(`Bust! You lose $${bet}!`);
    //await loadUserData(); <-- avoid full reload
    const newGame = {
      id: Date.now().toString(),
      user_id: user.id,
      player_hand: playerHand,
      dealer_hand: dealerHand,
      result: 'loss' as const,
      bet,
      created_at: new Date().toISOString()
    };
    setHistory([newGame, ...history]);
  };


  const resetGame = () => {
    setPlayerHand([]);
    setDealerHand([]);
    setGameState('betting');
    setMessage('Place your bet to start!');
    setAiAdvice('');
  };

  const buyChips = async () => {
    const newChips = chips + 500;
    setChips(newChips);
    await updateChips(user.id, newChips);
    setMessage('Added 500 chips!');
  };

  const getAIHelp = async () => {
    if (gameState !== 'playing' || playerHand.length === 0) return;
    
    setLoadingAI(true);
    
    try {
      const response = await fetch('/api/ai-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerHand,
          dealerCard: dealerHand[0],
          playerValue: calculateHandValue(playerHand),
        }),
      });

      const data = await response.json();
      
      if (data.advice) {
        setAiAdvice(data.advice);
      } else {
        setAiAdvice('Unable to get advice right now.');
      }
    } catch (error) {
      console.error('Error getting AI advice:', error);
      setAiAdvice('Error getting advice. Please try again.');
    }
    
    setLoadingAI(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const CardComponent = ({ card, hidden = false }: { card: PlayingCard; hidden?: boolean }) => {
    const isRed = card.suit === '♥' || card.suit === '♦';
    const shouldAnimate = card.id === newCardId;
    
    return (
      <div 
        className={`relative w-24 h-36 bg-white rounded-xl shadow-2xl border-2 border-gray-200 flex flex-col items-center justify-center transform hover:scale-105 ${shouldAnimate ? 'card-enter' : 'opacity-100'}`}
        style={{
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
        }}
      >
        {!hidden ? (
          <>
            <span className={`text-4xl font-bold ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
              {card.rank}
            </span>
            <span className={`text-3xl ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
              {card.suit}
            </span>
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center">
            <div className="text-white text-5xl">🂠</div>
          </div>
        )}
      </div>
    );
  };

  const HistoryView = () => (
    <div className="space-y-6">
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-white">Game History</h2>
          <Button 
            onClick={() => setShowHistory(false)}
            className="backdrop-blur-xl bg-white/10 border border-white/20 hover:bg-white/20 text-white transition-all"
          >
            Back to Game
          </Button>
        </div>
      </div>
      
      <div className="grid gap-4">
        {history.map((game) => {
          const isBlackjack = game.result === 'win' && 
                            calculateHandValue(game.player_hand) === 21 && 
                            game.player_hand.length === 2;
          
          return (
            <div 
              key={game.id}
              className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-xl p-6 hover:bg-white/15 transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className={`text-2xl font-bold mb-2 ${
                    game.result === 'win' ? 'text-green-400' : 
                    game.result === 'loss' ? 'text-red-400' : 
                    'text-yellow-400'
                  }`}>
                    {isBlackjack ? '⭐ BLACKJACK!' : 
                    game.result === 'win' ? ' WIN' : 
                    game.result === 'loss' ? ' LOSS' : '🤝 PUSH'}
                  </div>
                  <div className="text-white/90 font-semibold">
                    Bet: ${game.bet} {isBlackjack && `(Won $${Math.floor(game.bet * 1.5)})`}
                  </div>
                  <div className="text-white/60 text-sm mt-1">
                    {new Date(game.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-semibold">
                    Player: {calculateHandValue(game.player_hand)}
                  </div>
                  <div className="text-white font-semibold">
                    Dealer: {calculateHandValue(game.dealer_hand)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {history.length === 0 && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">🎴</div>
            <p className="text-white/70 text-lg">
              No games played yet. Start playing to build your history!
            </p>
          </div>
        )}
      </div>
    </div>
  );

  if (showHistory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-900 p-4">
        <div className="max-w-4xl mx-auto">
          <HistoryView />
        </div>
      </div>
    );
  }

return (
  <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-green-900 to-teal-900 p-4">
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-6 mb-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
              Blackjack
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <p className="text-xl font-semibold text-white">
                  ${chips.toLocaleString()}
                </p>
              </div>
              <p className="text-sm text-white/70">{user.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={buyChips} 
              variant="outline"
              className="backdrop-blur-xl bg-white/10 border-white/20 text-white hover:bg-white/20 transition-all"
            >
              Buy 500 Chips
            </Button>
            <Button 
              onClick={() => setShowHistory(true)} 
              variant="outline"
              className="backdrop-blur-xl bg-white/10 border-white/20 text-white hover:bg-white/20 transition-all"
            >
              History
            </Button>
            <Button 
              onClick={handleSignOut} 
              variant="outline"
              className="backdrop-blur-xl bg-white/10 border-white/20 text-white hover:bg-white/20 transition-all"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-green-800/40 to-emerald-900/40 border border-white/20 rounded-2xl shadow-2xl p-8 mb-6">
        {/* Dealer */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-red-500/20 backdrop-blur-xl border border-red-400/30 flex items-center justify-center">
              <span className="text-2xl">🎰</span>
            </div>
            <h2 className="text-2xl font-bold text-white">
              Dealer {dealerHand.length > 0 && (
                <span className="ml-2 text-xl text-white/70">
                  ({gameState === 'betting' ? '?' : calculateHandValue(dealerHand)})
                </span>
              )}
            </h2>
          </div>
          <div className="flex gap-4 flex-wrap min-h-32">
            {dealerHand.map((card) => (
              <CardComponent key={card.id} card={card} />
            ))}
          </div>
        </div>

        {/* Message */}
        <div className="text-center my-10">
          <div className="inline-block backdrop-blur-xl bg-white/10 border border-white/30 rounded-2xl px-8 py-4 shadow-lg">
            <p className="text-2xl font-bold text-white tracking-wide">
              {message}
            </p>
          </div>
        </div>

        {/* Player */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 backdrop-blur-xl border border-blue-400/30 flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
            <h2 className="text-2xl font-bold text-white">
              You {playerHand.length > 0 && (
                <span className="ml-2 text-xl text-white/70">
                  ({calculateHandValue(playerHand)})
                </span>
              )}
            </h2>
          </div>
          <div className="flex gap-4 flex-wrap min-h-32">
            {playerHand.map((card) => (
              <CardComponent key={card.id} card={card} />
            ))}
          </div>
        </div>
      </div>

      {/* AI Advice */}
      {aiAdvice && (
        <div className="backdrop-blur-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-2xl p-6 mb-6 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="text-3xl">🤖</div>
            <div>
              <p className="text-sm font-semibold text-blue-200 mb-1">AI Advisor</p>
              <p className="text-white text-lg">{aiAdvice}</p>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-6">
       {gameState === 'betting' && (
        <div className="space-y-6">
          <div>
            <label className="block text-lg font-semibold text-white mb-4">
              Place Your Bet
            </label>
            
            {/* Increment Buttons */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Button
                onClick={() => setBet(Math.min(chips, bet + 25))}
                disabled={chips < bet + 25}
                variant="outline"
                className="backdrop-blur-xl bg-white/10 border-white/20 text-white hover:bg-white/20 h-16 text-lg font-bold transition-all disabled:opacity-50"
              >
                +$25
              </Button>
              <Button
                onClick={() => setBet(Math.min(chips, bet + 50))}
                disabled={chips < bet + 50}
                variant="outline"
                className="backdrop-blur-xl bg-white/10 border-white/20 text-white hover:bg-white/20 h-16 text-lg font-bold transition-all disabled:opacity-50"
              >
                +$50
              </Button>
              <Button
                onClick={() => setBet(Math.min(chips, bet + 100))}
                disabled={chips < bet + 100}
                variant="outline"
                className="backdrop-blur-xl bg-white/10 border-white/20 text-white hover:bg-white/20 h-16 text-lg font-bold transition-all disabled:opacity-50"
              >
                +$100
              </Button>
            </div>

            {/* Editable Current Bet Display */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/30 rounded-xl p-4">
              <p className="text-white/70 text-sm mb-2 text-center">Current Bet</p>
              <Input
                type="number"
                value={bet === 0 ? '' : bet}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setBet(0);
                  } else {
                    const num = parseInt(value);
                    if (!isNaN(num)) {
                      setBet(Math.min(chips, Math.max(0, num)));
                    }
                  }
                }}
                placeholder="Enter amount"
                min="0"
                max={chips}
                className="bg-white/5 border-white/30 text-white text-3xl font-bold text-center h-16 backdrop-blur-xl placeholder:text-white/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              {bet === 0 && (
                <p className="text-red-400 text-sm text-center mt-2 font-semibold">
                  Invalid bet amount
                </p>
              )}
            </div>
          </div>
          
          <Button 
            onClick={startGame} 
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-lg h-14 shadow-lg hover:shadow-xl transition-all"
            size="lg"
          >
            Deal Cards
          </Button>
        </div>
      )}

        {gameState === 'playing' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button 
              onClick={hit} 
              type="button"
              size="lg" 
              disabled={newCardId !== null}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold text-lg h-16 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Hit 👆
            </Button>
            <Button 
              onClick={stand} 
              type="button"
              size="lg" 
              disabled={newCardId !== null}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold text-lg h-16 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Stand ✋
            </Button>
            <Button 
              onClick={getAIHelp} 
              type="button"
              size="lg" 
              disabled={loadingAI || newCardId !== null}
              className="backdrop-blur-xl bg-white/10 border border-white/20 hover:bg-white/20 text-white font-bold text-lg h-16 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingAI ? '⏳ Thinking...' : '🤖 Ask AI'}
            </Button>
          </div>
        )}

        {gameState === 'ended' && (
          <Button 
            onClick={resetGame} 
            size="lg" 
            className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold text-lg h-14 px-12 shadow-lg hover:shadow-xl transition-all"
          >
            Play Again 
          </Button>
        )}
      </div>
    </div>
  </div>
);
}