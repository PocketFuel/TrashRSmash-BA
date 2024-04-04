export default function(){
    const mongoose = require('mongoose');
    // Define config variable.
    const mongoURI = 'mongodb+srv://thrillseeker:1115@cluster0.dnl8hkl.mongodb.net/smash';
    
    
    mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
      .then(() => console.log('MongoDB connection established'))
      .catch(err => console.error('MongoDB connection error:', err));
    
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
}