import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set');
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      );
    }

    const { playerHand, dealerCard, playerValue } = await request.json();

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are a professional blackjack advisor. 
    
Player's hand value: ${playerValue}
Dealer's visible card: ${dealerCard.rank} of ${dealerCard.suit}

Give brief advice (1-2 sentences) on whether the player should HIT or STAND. 
Only recommend these two actions - do not mention double down, split, or surrender.
Consider basic blackjack strategy.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const advice = response.text();

    return NextResponse.json({ advice });
  } catch (error: any) {
    console.error('Gemini API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get AI advice' },
      { status: 500 }
    );
  }
}