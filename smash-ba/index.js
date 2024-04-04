import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import bodyParser from 'body-parser';
import cors from 'cors';
import mongoose from 'mongoose';

// import routers
import {router as userRoute} from './routes/api/user.js'

import socketProvider from './sockets/socket.js';

// Load environment variables from .env file
// const result = dotenv.config({
//   path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env',
// });

// if (result.error) {
//   throw result.error;
// }

// Define config variable.
const mongoURI = 'mongodb+srv://thrillseeker:1115@cluster0.dnl8hkl.mongodb.net/smash';

// DB connection
mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connection established'))
  .catch((err) => console.error('MongoDB connection error:', err));

mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to db');
});

mongoose.connection.on('error', (err) => {
  console.log(err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose connection is disconnected.');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
});

// Initialize express app
const app = express();
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

const whitelist = ['http://193.111.250.234:5173',"http://localhost:5173", "https://smash-fe.vercel.app"];
const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
  } else {
   callback(new Error('Not allowed by CORS'));
  }
 },
};

// app.use(express.json());
// { extended: false }
app.use(cors(corsOptions));

app.use(cors());

// Define Routes
app.get('/', (req, res) => {
  res.json("Backend connect test.");
});

app.use('/users', userRoute);

// Create HTTP server
const server = http.createServer(app);

// Instantiate server via Socket.IO
const io = new Server(server, {
  // CORS: allow connection between client and server who have different posts.
  cors: {
    origin: ['http://193.111.250.234:5173',"http://localhost:5173", "https://smash-fe.vercel.app"],
  },
});

socketProvider(io);

const PORT = process.env.PORT || 1101;

// Start server
server.listen(PORT, () => console.log(`Server is running on port: ${PORT}`));
