import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { callAiService } from '../services/ai.service.js';

const router = Router();

// Configure multer for file upload (memory storage, 10MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.txt', '.csv', '.md', '.json', '.xlsx', '.xls', '.pdf', '.doc', '.docx'];
    const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件格式: ${ext}`));
    }
  },
});

// Extract text content from uploaded file buffer
function extractTextFromBuffer(buffer: Buffer, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  // Text-based formats: read directly
  if (['txt', 'csv', 'md', 'json'].includes(ext)) {
    return buffer.toString('utf-8').trim();
  }

  // Binary formats — return placeholder (user should paste text manually)
  if (ext === 'pdf') {
    return `[PDF文件: ${filename}] 请将PDF中的文字内容复制粘贴到知识库中，以获得最佳效果。`;
  }

  if (ext === 'docx') {
    return `[DOCX文件: ${filename}] 请将文档中的文字内容复制粘贴到知识库中，以获得最佳效果。`;
  }

  if (ext === 'xlsx' || ext === 'xls') {
    return `[Excel文件: ${filename}] 请将表格数据复制粘贴到知识库中。`;
  }

  return `[${filename}] 无法提取文本内容，请手动粘贴。`;
}

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { tag, industry, q } = req.query;
    const where: Record<string, unknown> = { userId: req.user!.id, status: 'ACTIVE' };
    if (tag) where.tags = { has: tag as string };
    if (industry) where.industry = industry;

    // Server-side text search
    if (q && typeof q === 'string' && q.trim()) {
      where.content = { contains: q, mode: 'insensitive' };
    }

    const items = await prisma.knowledgeItem.findMany({
      where,
      orderBy: [{ weight: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
});

// Semantic search via AI service embeddings
router.get('/search', authMiddleware, async (req, res, next) => {
  try {
    const { q, limit = '5' } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ success: false, error: '缺少搜索关键词' });
    }

    // Get user's knowledge items
    const items = await prisma.knowledgeItem.findMany({
      where: { userId: req.user!.id, status: 'ACTIVE' },
      orderBy: [{ weight: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });

    if (items.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Call AI service for semantic search
    try {
      const result = await callAiService<{ results: Array<{ id: string; score: number }> }>({
        path: '/knowledge/search',
        body: {
          query: q,
          items: items.map((item) => ({
            id: item.id,
            content: item.content,
            source: item.source,
          })),
          limit: parseInt(limit as string, 10),
        },
      });

      // Map results back to full items
      const idToItem = new Map(items.map((item) => [item.id, item]));
      const results = (result.results || [])
        .map((r) => ({
          ...idToItem.get(r.id),
          relevanceScore: r.score,
        }))
        .filter(Boolean);

      res.json({ success: true, data: results });
    } catch {
      // Fallback to text search if AI service unavailable
      const filtered = items.filter((item) =>
        item.content.toLowerCase().includes(q.toLowerCase()),
      );
      res.json({ success: true, data: filtered.slice(0, parseInt(limit as string, 10)) });
    }
  } catch (err) { next(err); }
});

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { source, content, tags, industry } = req.body;
    const item = await prisma.knowledgeItem.create({
      data: {
        userId: req.user!.id,
        source,
        content,
        tags: tags || [],
        industry: industry || null,
      },
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.post('/import', authMiddleware, upload.array('files', 10), async (req, res, next) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    const { industry, tags } = req.body;
    const tagList = tags ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : ['导入'];

    if (!files || files.length === 0) {
      // Fallback: handle text content passed as body (paste import)
      const { content } = req.body;
      if (content && typeof content === 'string' && content.trim()) {
        const item = await prisma.knowledgeItem.create({
          data: {
            userId: req.user!.id,
            source: 'paste',
            content: content.trim(),
            tags: tagList,
            industry: industry || null,
            weight: 5,
          },
        });
        return res.status(201).json({ success: true, data: [item], count: 1 });
      }
      return res.status(400).json({ success: false, error: '没有上传文件' });
    }

    const imported = [];
    for (const file of files) {
      const textContent = extractTextFromBuffer(file.buffer, file.originalname);

      // Split large content into chunks if needed
      const chunks = splitIntoChunks(textContent, 5000);

      for (const chunk of chunks) {
        if (chunk.trim()) {
          const item = await prisma.knowledgeItem.create({
            data: {
              userId: req.user!.id,
              source: 'file',
              content: chunk,
              tags: [...tagList, file.originalname],
              industry: industry || null,
              weight: 5,
            },
          });
          imported.push(item);
        }
      }
    }

    res.status(201).json({ success: true, data: imported, count: imported.length });
  } catch (err) { next(err); }
});

// Split text into chunks at sentence boundaries
function splitIntoChunks(text: string, maxSize: number): string[] {
  if (text.length <= maxSize) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxSize) {
      chunks.push(remaining);
      break;
    }

    // Find a good break point (sentence end, newline, or space)
    let breakAt = maxSize;
    const sentenceEnd = remaining.lastIndexOf('。', maxSize);
    const newline = remaining.lastIndexOf('\n', maxSize);
    const space = remaining.lastIndexOf(' ', maxSize);

    if (sentenceEnd > maxSize * 0.5) breakAt = sentenceEnd + 1;
    else if (newline > maxSize * 0.5) breakAt = newline + 1;
    else if (space > maxSize * 0.5) breakAt = space + 1;

    chunks.push(remaining.slice(0, breakAt));
    remaining = remaining.slice(breakAt);
  }

  return chunks;
}

router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { content, tags, status, weight } = req.body;
    const result = await prisma.knowledgeItem.updateMany({
      where: { id: req.params.id as string, userId: req.user!.id },
      data: { content, tags, status, weight },
    });
    if (result.count === 0) return res.status(404).json({ success: false, error: 'Item not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const result = await prisma.knowledgeItem.deleteMany({
      where: { id: req.params.id as string, userId: req.user!.id },
    });
    if (result.count === 0) return res.status(404).json({ success: false, error: 'Item not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
