import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to the database');
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
  }
};

export default connectDB;
