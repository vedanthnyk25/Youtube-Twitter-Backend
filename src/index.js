import dotenv from 'dotenv'
import connectDB from './db/Connection.js'

dotenv.config({
    path:'./env'
})

connectDB()