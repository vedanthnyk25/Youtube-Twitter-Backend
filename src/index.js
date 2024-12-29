import dotenv from 'dotenv';
import connectDB from './db/Connection.js'; // Correct path for your database connection
import app from './app.js'; // Import the Express app

dotenv.config({
    path: './env',
});

// Connect to the database and start the server
connectDB()
    .then(() => {
        app.on('error', (error) => {
            console.log('Error:', error);
            throw error;
        });
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Listening on port: ${process.env.PORT || 8000}`);
        });
    })
    .catch((err) => {
        console.log('MONGODB connection failed: ', err);
    });
