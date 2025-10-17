import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const totalResponse = await fetch('https://timikeys.up.railway.app/api/v1/performances/search?limit=1');
    const totalData = await totalResponse.json();
    const total = totalData.data?.total || 0;

    const today = new Date().toISOString().split('T')[0];
    const todayResponse = await fetch(`https://timikeys.up.railway.app/api/v1/performances/search?date=${today}&limit=1`);
    const todayData = await todayResponse.json();
    const todayCount = todayData.data?.total || 0;

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
