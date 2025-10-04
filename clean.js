const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
    });
    console.log('Connected to MongoDB Atlas for cleaning');
  } catch (err) {
    console.error('Failed to connect to MongoDB Atlas:', err.message);
    process.exit(1);
  }
};

const cleanData = async () => {
  // Define Post Schema
  const postSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    excerpt: { type: String, required: true },
    author: { type: String, required: true },
    date: { type: Date, default: Date.now },
    likes: { type: Number, default: 0 },
    comments: [{ author: String, text: String, date: { type: Date, default: Date.now } }],
    category: { type: String, default: 'User Post' },
    readTime: { type: String, default: '3 min read' }
  });
  const Post = mongoose.model('Post', postSchema);

  // Define Question Schema
  const questionSchema = new mongoose.Schema({
    question: { type: String, required: true },
    author: { type: String, required: true },
    date: { type: Date, default: Date.now },
    answers: { type: Number, default: 0 },
    votes: { type: Number, default: 0 },
    tags: [{ type: String }],
    answersList: [{ author: String, text: String, date: { type: Date, default: Date.now } }],
    comments: [{ author: String, text: String, date: { type: Date, default: Date.now } }]
  });
  const Question = mongoose.model('Question', questionSchema);

  console.log('WARNING: This script will delete ALL Post and Question data from the database. Running now...');

  try {
    await Post.deleteMany({});
    console.log('All Post documents deleted.');
    await Question.deleteMany({});
    console.log('All Question documents deleted.');
  } catch (err) {
    console.error('Error cleaning data:', err.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  }
};

(async () => {
  await connectDB();
  await cleanData();
})();