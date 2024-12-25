import dotenv from 'dotenv'
import connectDB from './db/Connection.js'

dotenv.config({
    path:'./env'
})

connectDB()
.then(
    ()=> {
        app.on("error", (error)=>{
            console.log("Error:", error)
            throw error
        })
        app.listen(process.env.PORT||8000, ()=>{
            console.log(`listening on port: ${process.env.PORT}`)
        })
    }
)
.catch(
    (err)=> {
        console.log("MONGODB connection failed: ", err)
    }
)