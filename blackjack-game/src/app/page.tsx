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

// Mock AI advice (will be replaced with Gemini later)
const getAIAdvice = async (playerHand: PlayingCard[], dealerCard: PlayingCard, playerValue: number): Promise<string> => {
  const dealerValue = getCardValue(dealerCard);
  
  if (playerValue < 12) return "Hit - Your hand is low, you need more cards.";
  if (playerValue >= 17) return "Stand - Your hand is strong enough.";
  if (dealerValue >= 7 && playerValue < 17) return "Hit - Dealer shows a strong card.";
  return "Stand - Your hand is in a good position.";
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
    if (bet > chips || bet <= 0) {
      setMessage('Invalid bet amount!');
      return;
    }

    const newPlayerHand = [getRandomCard(), getRandomCard()];
    const newDealerHand = [getRandomCard()];
    
    setPlayerHand(newPlayerHand);
    setDealerHand(newDealerHand);
    setGameState('playing');
    setMessage('Hit or Stand?');
    setAiAdvice('');

    // Animate cards
    setTimeout(() => setAnimatingCard(newPlayerHand[0].id), 100);
    setTimeout(() => setAnimatingCard(newPlayerHand[1].id), 300);
    setTimeout(() => setAnimatingCard(newDealerHand[0].id), 500);
    setTimeout(() => setAnimatingCard(null), 700);
  };

  const hit = () => {
    const newCard = getRandomCard();
    const newHand = [...playerHand, newCard];
    setPlayerHand(newHand);
    setAiAdvice('');
    
    setAnimatingCard(newCard.id);
    setTimeout(() => setAnimatingCard(null), 300);

    const value = calculateHandValue(newHand);
    if (value > 21) {
      setTimeout(() => endGame('loss'), 500);
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
          
          setAnimatingCard(newCard.id);
          setTimeout(() => setAnimatingCard(null), 300);
          
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
    await loadUserData(); // Reload to get updated history
  };

  const endGame = async (result: 'loss') => {
    const newChips = chips - bet;
    setChips(newChips);
    await updateChips(user.id, newChips);
    await saveGame(user.id, playerHand, dealerHand, result, bet);
    
    setGameState('ended');
    setMessage(`Bust! You lose $${bet}!`);
    await loadUserData();
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
    const advice = await getAIAdvice(playerHand, dealerHand[0], calculateHandValue(playerHand));
    setAiAdvice(advice);
    setLoadingAI(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const CardComponent = ({ card, hidden = false }: { card: PlayingCard; hidden?: boolean }) => {
    const isRed = card.suit === '♥' || card.suit === '♦';
    const isAnimating = animatingCard === card.id;
    
    return (
      <div 
        className={`relative w-20 h-28 bg-white rounded-lg shadow-lg border-2 border-gray-300 flex flex-col items-center justify-center transition-all duration-300 ${
          isAnimating ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        } ${hidden ? 'bg-blue-600' : ''}`}
      >
        {!hidden ? (
          <>
            <span className={`text-3xl font-bold ${isRed ? 'text-red-600' : 'text-black'}`}>
              {card.rank}
            </span>
            <span className={`text-2xl ${isRed ? 'text-red-600' : 'text-black'}`}>
              {card.suit}
            </span>
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
            <div className="text-white text-4xl">🂠</div>
          </div>
        )}
      </div>
    );
  };

  const HistoryView = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Game History</h2>
        <Button onClick={() => setShowHistory(false)}>Back to Game</Button>
      </div>
      
      <div className="grid gap-4">
        {history.map((game) => (
          <Card key={game.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className={`text-lg font-bold ${
                    game.result === 'win' ? 'text-green-600' : 
                    game.result === 'loss' ? 'text-red-600' : 
                    'text-yellow-600'
                  }`}>
                    {game.result === 'win' ? 'WIN' : game.result === 'loss' ? 'LOSS' : 'PUSH'}
                  </div>
                  <div className="text-sm text-gray-600">
                    Bet: ${game.bet}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(game.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">
                    Player: {calculateHandValue(game.player_hand)}
                  </div>
                  <div className="text-sm font-semibold">
                    Dealer: {calculateHandValue(game.dealer_hand)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {history.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No games played yet. Start playing to build your history!
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
    <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Blackjack</h1>
              <p className="text-lg text-gray-600">Chips: ${chips}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={buyChips} variant="outline">
                Buy 500 Chips
              </Button>
              <Button onClick={() => setShowHistory(true)} variant="outline">
                History
              </Button>
              <Button onClick={handleSignOut} variant="outline">
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Game Area */}
        <div className="bg-green-700 rounded-lg shadow-xl p-8 mb-6">
          {/* Dealer */}
          <div className="mb-12">
            <h2 className="text-white text-xl mb-4">
              Dealer {dealerHand.length > 0 && `(${gameState === 'betting' ? '?' : calculateHandValue(dealerHand)})`}
            </h2>
            <div className="flex gap-4 flex-wrap">
              {dealerHand.map((card) => (
                <CardComponent key={card.id} card={card} />
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="text-center my-8">
            <Alert className="max-w-md mx-auto">
              <AlertDescription className="text-lg font-semibold">
                {message}
              </AlertDescription>
            </Alert>
          </div>

          {/* Player */}
          <div>
            <h2 className="text-white text-xl mb-4">
              You {playerHand.length > 0 && `(${calculateHandValue(playerHand)})`}
            </h2>
            <div className="flex gap-4 flex-wrap">
              {playerHand.map((card) => (
                <CardComponent key={card.id} card={card} />
              ))}
            </div>
          </div>
        </div>

        {/* AI Advice */}
        {aiAdvice && (
          <div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-4 mb-6">
            <p className="text-blue-900 font-semibold">🤖 AI Advice: {aiAdvice}</p>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-xl p-6">
          {gameState === 'betting' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bet Amount
                </label>
                <Input
                  type="number"
                  value={bet}
                  onChange={(e) => setBet(Math.max(1, parseInt(e.target.value) || 0))}
                  min="1"
                  max={chips}
                  className="max-w-xs"
                />
              </div>
              <Button onClick={startGame} className="w-full sm:w-auto" size="lg">
                Deal Cards
              </Button>
            </div>
          )}

          {gameState === 'playing' && (
            <div className="flex gap-4 flex-wrap">
              <Button onClick={hit} size="lg" className="flex-1 min-w-32">
                Hit
              </Button>
              <Button onClick={stand} size="lg" variant="secondary" className="flex-1 min-w-32">
                Stand
              </Button>
              <Button 
                onClick={getAIHelp} 
                size="lg" 
                variant="outline" 
                disabled={loadingAI}
                className="flex-1 min-w-32"
              >
                {loadingAI ? 'Thinking...' : '🤖 Ask AI'}
              </Button>
            </div>
          )}

          {gameState === 'ended' && (
            <Button onClick={resetGame} size="lg" className="w-full sm:w-auto">
              Play Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}