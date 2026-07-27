import express from 'express';
import { handleChat } from '../controllers/chatbotController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, handleChat); // POST /api/chat

export default router;
