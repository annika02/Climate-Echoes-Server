const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

// Input validation middleware
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

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', {
    message: err.message,
    stack: err.stack,
    endpoint: req.path,
    method: req.method,
  });
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Define Post Schema and Model
const postSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Title is required'] },
  content: { type: String, required: [true, 'Content is required'] },
  excerpt: { type: String, required: [true, 'Excerpt is required'] },
  author: { type: String, required: [true, 'Author is required'], default: 'Anonymous' },
  date: { type: Date, default: Date.now, required: true },
  likes: { type: Number, default: 0 },
  comments: [{
    author: { type: String, default: 'Anonymous', required: true },
    text: { type: String, required: true },
    date: { type: Date, default: Date.now, required: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, default: null }
  }],
  category: { type: String, default: 'User Post' },
  readTime: { type: String, default: '3 min read' }
});
const Post = mongoose.model('Post', postSchema);

// Define Question Schema and Model
const questionSchema = new mongoose.Schema({
  question: { type: String, required: [true, 'Question is required'] },
  author: { type: String, required: [true, 'Author is required'], default: 'Anonymous' },
  date: { type: Date, default: Date.now, required: true },
  answers: { type: Number, default: 0 },
  votes: { type: Number, default: 0 },
  tags: [{ type: String }],
  answersList: [{
    author: { type: String, default: 'Anonymous', required: true },
    text: { type: String, required: true },
    date: { type: Date, default: Date.now, required: true }
  }],
  comments: [{
    author: { type: String, default: 'Anonymous', required: true },
    text: { type: String, required: true },
    date: { type: Date, default: Date.now, required: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, default: null }
  }]
});
const Question = mongoose.model('Question', questionSchema);

// API Routes
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find();
    res.json(posts);
  } catch (err) {
    console.error('Error in GET /api/posts:', err);
    res.status(500).json({ message: 'Failed to fetch posts', error: err.message });
  }
});

app.post('/api/posts', validatePost, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const post = new Post({
    title: req.body.title,
    content: req.body.content,
    excerpt: req.body.content.substring(0, 150) + (req.body.content.length > 150 ? '...' : ''),
    author: req.body.author && req.body.author.trim() !== '' ? req.body.author.trim() : 'Anonymous',
    date: new Date(),
    likes: 0,
    comments: [],
    category: 'User Post',
    readTime: '3 min read'
  });
  try {
    const newPost = await post.save();
    res.status(201).json(newPost);
  } catch (err) {
    console.error('Error in POST /api/posts:', err);
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
    console.error('Error in PATCH /api/posts/:id/like:', err);
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
      author: req.body.author && req.body.author.trim() !== '' ? req.body.author.trim() : 'Anonymous',
      text: req.body.text,
      date: new Date(),
      parentId: req.body.parentId || null
    });
    const updatedPost = await post.save();
    res.json(updatedPost);
  } catch (err) {
    console.error('Error in PATCH /api/posts/:id/comment:', err);
    res.status(400).json({ message: err.message });
  }
});

app.get('/api/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    console.error('Error in GET /api/posts/:id:', err);
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/questions', async (req, res) => {
  try {
    const questions = await Question.find();
    res.json(questions);
  } catch (err) {
    console.error('Error in GET /api/questions:', err);
    res.status(500).json({ message: 'Failed to fetch questions', error: err.message });
  }
});

app.post('/api/questions', validateQuestion, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const question = new Question({ // Fixed: Changed 'new Post' to 'new Question'
    question: req.body.question,
    author: req.body.author && req.body.author.trim() !== '' ? req.body.author.trim() : 'Anonymous',
    date: new Date(),
    answers: 0,
    votes: 0,
    tags: ['New'],
    answersList: [],
    comments: []
  });
  try {
    const newQuestion = await question.save();
    res.status(201).json(newQuestion);
  } catch (err) {
    console.error('Error in POST /api/questions:', err);
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
    console.error('Error in PATCH /api/questions/:id/vote:', err);
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
      author: req.body.author && req.body.author.trim() !== '' ? req.body.author.trim() : 'Anonymous',
      text: req.body.text,
      date: new Date()
    });
    const updatedQuestion = await question.save();
    res.json(updatedQuestion);
  } catch (err) {
    console.error('Error in PATCH /api/questions/:id/answer:', err);
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
      author: req.body.author && req.body.author.trim() !== '' ? req.body.author.trim() : 'Anonymous',
      text: req.body.text,
      date: new Date(),
      parentId: req.body.parentId || null
    });
    const updatedQuestion = await question.save();
    res.json(updatedQuestion);
  } catch (err) {
    console.error('Error in PATCH /api/questions/:id/comment:', err);
    res.status(400).json({ message: err.message });
  }
});

app.get('/api/questions/:id', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ message: 'Question not found' });
    res.json(question);
  } catch (err) {
    console.error('Error in GET /api/questions/:id:', err);
    res.status(500).json({ message: err.message });
  }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  heartbeatFrequencyMS: 10000,
})
  .then(() => {
    console.log('Connected to MongoDB');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });