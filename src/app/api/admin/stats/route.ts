import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get total count by searching all performances
    const totalResponse = await fetch('https://timikeys.up.railway.app/api/v1/performances/search?q=&limit=1');
    const totalData = await totalResponse.json();
    const total = totalData.data?.total || 0;

    // For "today's count", we'll use a placeholder since we don't have dates yet
    // Once you implement TikTok upload dates, you can filter by today's date
    const todayCount = 0; // Placeholder

    return NextResponse.json({
      total,
      today: todayCount
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({
      total: 0,
      today: 0
    });
  }
}