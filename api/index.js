// api/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();

// Serverless-friendly MongoDB connection
let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

async function connectToDatabase() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
      socketTimeoutMS: 45000,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }).then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// Middleware to ensure DB is connected
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    return res.status(503).json({ message: 'Service unavailable: Database not connected' });
  }
});

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://nasa-space-app-25.web.app',
    'https://nasa-space-app-25.firebaseapp.com',
  ],
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

// Validation middlewares
const validatePost = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('content').trim().notEmpty().withMessage('Content is required'),
  body('author').optional().isString().withMessage('Author must be a string'),
];

const validateQuestion = [
  body('question').trim().notEmpty().withMessage('Question is required'),
  body('author').optional().isString().withMessage('Author must be a string'),
];

const validateComment = [
  body('text').trim().notEmpty().withMessage('Comment text is required'),
  body('author').optional().isString().withMessage('Author must be a string'),
];

const validateAnswer = [
  body('text').trim().notEmpty().withMessage('Answer text is required'),
  body('author').optional().isString().withMessage('Author must be a string'),
];

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Schemas
const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  excerpt: { type: String, required: true },
  author: { type: String, default: 'Anonymous', required: true },
  date: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  comments: [{
    author: { type: String, default: 'Anonymous', required: true },
    text: { type: String, required: true },
    date: { type: Date, default: Date.now },
    parentId: { type: mongoose.Schema.Types.ObjectId, default: null },
  }],
  category: { type: String, default: 'User Post' },
  readTime: { type: String, default: '3 min read' },
});
const Post = mongoose.models.Post || mongoose.model('Post', postSchema);

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  author: { type: String, default: 'Anonymous', required: true },
  date: { type: Date, default: Date.now },
  answers: { type: Number, default: 0 },
  votes: { type: Number, default: 0 },
  tags: [{ type: String }],
  answersList: [{
    author: { type: String, default: 'Anonymous', required: true },
    text: { type: String, required: true },
    date: { type: Date, default: Date.now },
  }],
  comments: [{
    author: { type: String, default: 'Anonymous', required: true },
    text: { type: String, required: true },
    date: { type: Date, default: Date.now },
    parentId: { type: mongoose.Schema.Types.ObjectId, default: null },
  }],
});
const Question = mongoose.models.Question || mongoose.model('Question', questionSchema);

// Routes

// Root
app.get('/', (req, res) => res.send('Welcome to Climate Echoes Server'));

// Posts
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find();
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch posts', error: err.message });
  }
});

app.post('/api/posts', validatePost, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const post = new Post({
    title: req.body.title,
    content: req.body.content,
    excerpt: req.body.content.substring(0, 150) + (req.body.content.length > 150 ? '...' : ''),
    author: req.body.author?.trim() || 'Anonymous',
  });

  try {
    const newPost = await post.save();
    res.status(201).json(newPost);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create post', error: err.message });
  }
});

app.patch('/api/posts/:id/like', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    post.likes += 1;
    const updatedPost = await post.save();
    res.json(updatedPost);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.patch('/api/posts/:id/comment', validateComment, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.comments.push({
      author: req.body.author?.trim() || 'Anonymous',
      text: req.body.text,
      parentId: req.body.parentId || null,
    });

    const updatedPost = await post.save();
    res.json(updatedPost);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.get('/api/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Questions
app.get('/api/questions', async (req, res) => {
  try {
    const questions = await Question.find();
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch questions', error: err.message });
  }
});

app.post('/api/questions', validateQuestion, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const question = new Question({
    question: req.body.question,
    author: req.body.author?.trim() || 'Anonymous',
    tags: ['New'],
  });

  try {
    const newQuestion = await question.save();
    res.status(201).json(newQuestion);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create question', error: err.message });
  }
});

app.patch('/api/questions/:id/vote', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ message: 'Question not found' });
    question.votes += req.body.vote === 'up' ? 1 : -1;
    const updatedQuestion = await question.save();
    res.json(updatedQuestion);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.patch('/api/questions/:id/answer', validateAnswer, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ message: 'Question not found' });

    question.answers += 1;
    question.answersList.push({
      author: req.body.author?.trim() || 'Anonymous',
      text: req.body.text,
    });

    const updatedQuestion = await question.save();
    res.json(updatedQuestion);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.patch('/api/questions/:id/comment', validateComment, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ message: 'Question not found' });

    question.comments.push({
      author: req.body.author?.trim() || 'Anonymous',
      text: req.body.text,
      parentId: req.body.parentId || null,
    });

    const updatedQuestion = await question.save();
    res.json(updatedQuestion);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.get('/api/questions/:id', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ message: 'Question not found' });
    res.json(question);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Export for Vercel
module.exports = app;
