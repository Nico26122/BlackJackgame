import { supabase } from './supabase';

// Get user's chip balance
export async function getChips(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('profiles')
    .select('chips')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching chips:', error);
    return 0;
  }

  return data?.chips || 0;
}

// Update user's chip balance
export async function updateChips(userId: string, newChips: number): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ chips: newChips, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('Error updating chips:', error);
  }
}

// Save game to history
export async function saveGame(
  userId: string,
  playerHand: any[],
  dealerHand: any[],
  result: 'win' | 'loss' | 'push',
  bet: number
): Promise<void> {
  const { error } = await supabase
    .from('game_history')
    .insert({
      user_id: userId,
      player_hand: playerHand,
      dealer_hand: dealerHand,
      result,
      bet,
    });

  if (error) {
    console.error('Error saving game:', error);
  }
}

// Get user's game history
export async function getHistory(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('game_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching history:', error);
    return [];
  }

  return data || [];
}