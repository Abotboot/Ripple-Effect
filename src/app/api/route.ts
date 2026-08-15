import { NextResponse } from 'next/server'

// API health/info endpoint
export async function GET() {
  return NextResponse.json({
    name: 'A Ripple Effect Initiative API',
    version: '1.0.0',
    description: 'Freshwater & microplastics database API',
    endpoints: [
      'GET  /api/utilities?q=',
      'GET  /api/utilities/:id',
      'GET  /api/utilities/near?lat=&lng=&radius=',
      'GET  /api/contaminants',
      'GET  /api/contaminants/:id',
      'GET  /api/samples?utilityId=&contaminantId=',
      'GET  /api/reports',
      'POST /api/reports',
      'GET  /api/stats',
      'GET  /api/activity',
      'POST /api/alerts',
      'GET  /api/alerts',
      'POST /api/chapters',
      'GET  /api/chapters (admin)',
      'POST /api/donations',
      'GET  /api/donations (admin)',
      'GET  /api/export?format=csv|json&table=utilities|contaminants|samples|reports',
      'POST /api/import',
      'POST /api/auth/login',
      'POST /api/auth/logout',
      'GET  /api/auth/me',
    ],
  })
}
