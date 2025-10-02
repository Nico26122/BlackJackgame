import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { playerHand, dealerCard, playerValue } = await request.json();

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `You are a professional blackjack advisor. 
    
Player's hand value: ${playerValue}
Dealer's visible card: ${dealerCard.rank} of ${dealerCard.suit}

Give brief, strategic advice (1-2 sentences) on whether the player should HIT or STAND. Consider basic blackjack strategy.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const advice = response.text();

    return NextResponse.json({ advice });
  } catch (error) {
    console.error('Gemini API error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI advice' },
      { status: 500 }
    );
  }
}