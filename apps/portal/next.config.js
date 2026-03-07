const path = require('path');

const ANIME_URL = process.env.ANIME_URL || 'http://localhost:3001';
const SAVINGS_URL = process.env.SAVINGS_URL || 'http://localhost:3002';
const RAG_URL = process.env.RAG_URL || 'http://localhost:3003';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@myhomeapp/shared'],
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  async rewrites() {
    return [
      // Anime — basePath /anime handles all sub-routes and static assets automatically
      { source: '/anime', destination: `${ANIME_URL}/anime` },
      { source: '/anime/:path*', destination: `${ANIME_URL}/anime/:path*` },
      { source: '/api/anime/:path*', destination: `${ANIME_URL}/api/anime/:path*` },
      { source: '/api/actions/perform-tasks/anime', destination: `${ANIME_URL}/api/actions/perform-tasks` },

      // Savings
      { source: '/savings', destination: `${SAVINGS_URL}/savings` },
      { source: '/savings/:path*', destination: `${SAVINGS_URL}/savings/:path*` },
      { source: '/api/savings/:path*', destination: `${SAVINGS_URL}/api/savings/:path*` },
      { source: '/api/actions/perform-tasks/savings', destination: `${SAVINGS_URL}/api/actions/perform-tasks` },

      // RAG
      { source: '/rag', destination: `${RAG_URL}/rag` },
      { source: '/rag/:path*', destination: `${RAG_URL}/rag/:path*` },
      { source: '/api/rag/:path*', destination: `${RAG_URL}/api/rag/:path*` },
    ];
  },
};

module.exports = nextConfig;
