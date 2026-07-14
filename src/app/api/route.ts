import { NextResponse } from 'next/server'

// API health/info endpoint
export async function GET() {
  return NextResponse.json({
    name: 'RippleEffect API',
    version: '1.0.0',
    description: 'Tap water & microplastics database API',
    endpoints: [
      'GET  /api/utilities?q=',
      'GET  /api/utilities/:id',
      'GET  /api/contaminants',
      'GET  /api/samples?utilityId=&contaminantId=',
      'GET  /api/reports',
      'POST /api/reports',
      'GET  /api/stats',
      'GET  /api/export?format=csv|json&table=utilities|contaminants|samples|reports',
      'POST /api/import',
      'POST /api/auth/login',
      'POST /api/auth/logout',
      'GET  /api/auth/me',
    ],
  })
}
