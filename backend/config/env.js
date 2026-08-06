const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 5000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fsdLbrce',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  /** Sole production admin bootstrap — Google email that receives role=admin */
  SUPER_ADMIN_EMAIL: String(process.env.SUPER_ADMIN_EMAIL || '')
    .trim()
    .toLowerCase(),
}

module.exports = env
