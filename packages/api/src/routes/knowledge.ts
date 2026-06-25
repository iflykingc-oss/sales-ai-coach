import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { callAiService } from '../services/ai.service.js';
import { logger } from '../lib/logger.js';

// ---------- pgvector helpers ----------

/** Cache pgvector availability to avoid repeated checks */
let _pgvectorAvailable: boolean | null = null;

async function isPgvectorAvailable(): Promise<boolean> {
  if (_pgvectorAvailable !== null) return _pgvectorAvailable;
  try {
    await prisma.$queryRaw`SELECT 1 FROM pg_extension WHERE extname = 'vector'`;
    _pgvectorAvailable = true;
  } catch {
    _pgvectorAvailable = false;
  }
  return _pgvectorAvailable;
}

/** Get embedding vector from AI service */
async function getEmbedding(text: string): Promise<number[] | null> {
  try {
    const result = await callAiService<{ embedding: number[]; dimension: number }>({
      path: '/knowledge/embedding',
      body: { text: text.slice(0, 2000) },
    });
    return result?.embedding || null;
  } catch (err) {
    logger.warn('Failed to get embedding from AI service', { error: String(err) });
    return null;
  }
}

/** Store embedding for a knowledge item via raw SQL */
async function storeEmbedding(itemId: string, embedding: number[]): Promise<void> {
  try {
    const vectorStr = `[${embedding.join(',')}]`;
    await prisma.$executeRawUnsafe(
      `UPDATE "knowledge_items" SET embedding = $1::vector WHERE id = $2`,
      vectorStr,
      itemId,
    );
  } catch (err) {
    logger.warn('Failed to store embedding', { itemId, error: String(err) });
  }
}

/** pgvector cosine similarity search via raw SQL */
async function searchByVector(
  userId: string,
  embedding: number[],
  limit: number,
  industry?: string,
): Promise<Array<{ id: string; content: string; source: string; tags: string[]; weight: number; similarity: number }>> {
  const vectorStr = `[${embedding.join(',')}]`;
  const rows = await prisma.$queryRawUnsafe<
    Array<{ id: string; content: string; source: string; tags: string[]; weight: number; similarity_score: number }>
  >(
    `SELECT id, content, source, tags, weight,
            (1 - (embedding <=> $1::vector))::float AS similarity_score
     FROM knowledge_items
     WHERE user_id = $2
       AND status = 'ACTIVE'
       AND embedding IS NOT NULL
       ${industry ? `AND (industry = $4 OR industry IS NULL)` : ''}
     ORDER BY embedding <=> $1::vector
     LIMIT $3::int`,
    vectorStr,
    userId,
    limit,
    ...(industry ? [industry] : []),
  );
  return rows.map((r) => ({ ...r, similarity: r.similarity_score }));
}

// Fire-and-forget embedding generation for a batch of items
async function generateEmbeddingsBackground(items: Array<{ id: string; content: string }>): Promise<void> {
  try {
    const available = await isPgvectorAvailable();
    if (!available) return;

    for (const item of items) {
      const embedding = await getEmbedding(item.content);
      if (embedding) {
        await storeEmbedding(item.id, embedding);
      }
    }
  } catch (err) {
    logger.warn('Background embedding generation failed', { error: String(err) });
  }
}

const createKnowledgeSchema = z.object({
  source: z.string().max(200).optional(),
  content: z.string().min(1, '内容不能为空').max(50000),
  tags: z.array(z.string().max(50)).max(20).optional(),
  industry: z.string().max(100).optional(),
});

const updateKnowledgeSchema = z.object({
  content: z.string().max(50000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'PENDING']).optional(),
  weight: z.number().min(0).max(100).optional(),
}).refine(data => Object.keys(data).length > 0, { message: '至少需要一个更新字段' });

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
async function extractTextFromBuffer(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  // Text-based formats: read directly
  if (['txt', 'csv', 'md', 'json'].includes(ext)) {
    return buffer.toString('utf-8').trim();
  }

  // PDF parsing
  if (ext === 'pdf') {
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      return data.text.trim() || `[PDF文件: ${filename}] 无法提取文本内容，可能是扫描件。`;
    } catch (err) {
      logger.warn('PDF parse failed', { filename, error: String(err) });
      return `[PDF文件: ${filename}] 解析失败，请将文字内容复制粘贴到知识库中。`;
    }
  }

  // DOCX parsing
  if (ext === 'docx') {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value.trim() || `[DOCX文件: ${filename}] 文档内容为空。`;
    } catch (err) {
      logger.warn('DOCX parse failed', { filename, error: String(err) });
      return `[DOCX文件: ${filename}] 解析失败，请将文字内容复制粘贴到知识库中。`;
    }
  }

  // Excel parsing
  if (ext === 'xlsx' || ext === 'xls') {
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const texts: string[] = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        if (csv.trim()) {
          texts.push(`[Sheet: ${sheetName}]\n${csv}`);
        }
      }
      return texts.join('\n\n').trim() || `[Excel文件: ${filename}] 表格内容为空。`;
    } catch (err) {
      logger.warn('Excel parse failed', { filename, error: String(err) });
      return `[Excel文件: ${filename}] 解析失败，请将表格数据复制粘贴到知识库中。`;
    }
  }

  return `[${filename}] 不支持的文件格式，请手动粘贴内容。`;
}

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { tag, industry, q, page: pageStr, limit: limitStr } = req.query;
    const page = Math.max(1, parseInt(pageStr as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr as string) || 50));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId: req.user!.id, status: 'ACTIVE' };
    if (tag) where.tags = { has: tag as string };
    if (industry) where.industry = industry;
    if (q && typeof q === 'string' && q.trim()) {
      where.content = { contains: q, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      prisma.knowledgeItem.findMany({
        where,
        orderBy: [{ weight: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.knowledgeItem.count({ where }),
    ]);

    res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

// Semantic search — tries pgvector first, then AI service brute-force, then text search
router.get('/search', authMiddleware, async (req, res, next) => {
  try {
    const { q, limit = '5' } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ success: false, error: '缺少搜索关键词' });
    }
    const searchLimit = parseInt(limit as string, 10);

    // --- Strategy 1: pgvector cosine search (fast, server-side) ---
    try {
      const available = await isPgvectorAvailable();
      if (available) {
        const embedding = await getEmbedding(q);
        if (embedding) {
          const vectorResults = await searchByVector(req.user!.id, embedding, searchLimit);
          if (vectorResults.length > 0) {
            logger.info('Knowledge search via pgvector', { query: q.slice(0, 50), hits: vectorResults.length });
            return res.json({
              success: true,
              data: vectorResults.map((r) => ({ ...r, relevanceScore: r.similarity })),
              strategy: 'pgvector',
            });
          }
        }
      }
    } catch (err) {
      logger.warn('pgvector search failed, falling back', { error: String(err) });
    }

    // --- Strategy 2: AI service brute-force embedding search ---
    const items = await prisma.knowledgeItem.findMany({
      where: { userId: req.user!.id, status: 'ACTIVE' },
      orderBy: [{ weight: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });

    if (items.length === 0) {
      return res.json({ success: true, data: [] });
    }

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
          limit: searchLimit,
        },
      });

      const idToItem = new Map(items.map((item) => [item.id, item]));
      const results = (result.results || [])
        .map((r) => ({
          ...idToItem.get(r.id),
          relevanceScore: r.score,
        }))
        .filter(Boolean);

      // Fire-and-forget: store embeddings for items that don't have them yet
      const itemsWithoutEmbedding = items.slice(0, 20); // batch limit
      generateEmbeddingsBackground(itemsWithoutEmbedding.map((i) => ({ id: i.id, content: i.content })));

      return res.json({ success: true, data: results, strategy: 'ai-service' });
    } catch {
      // --- Strategy 3: plain text search fallback ---
      const filtered = items.filter((item) =>
        item.content.toLowerCase().includes(q.toLowerCase()),
      );
      return res.json({ success: true, data: filtered.slice(0, searchLimit), strategy: 'text' });
    }
  } catch (err) { next(err); }
});

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const parsed = createKnowledgeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }
    const { source, content, tags, industry } = parsed.data;
    const item = await prisma.knowledgeItem.create({
      data: {
        userId: req.user!.id,
        source: source || null,
        content,
        tags: tags || [],
        industry: industry || null,
      },
    });

    // Fire-and-forget: generate and store embedding for vector search
    generateEmbeddingsBackground([{ id: item.id, content: item.content }]);

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
        // Fire-and-forget: generate embedding
        generateEmbeddingsBackground([{ id: item.id, content: item.content }]);
        return res.status(201).json({ success: true, data: [item], count: 1 });
      }
      return res.status(400).json({ success: false, error: '没有上传文件' });
    }

    const imported = [];
    for (const file of files) {
      const textContent = await extractTextFromBuffer(file.buffer, file.originalname);

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

    // Fire-and-forget: generate embeddings for all imported items
    generateEmbeddingsBackground(imported.map((i) => ({ id: i.id, content: i.content })));

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
    const parsed = updateKnowledgeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }
    const result = await prisma.knowledgeItem.updateMany({
      where: { id: req.params.id as string, userId: req.user!.id },
      data: parsed.data,
    });
    if (result.count === 0) return res.status(404).json({ success: false, error: 'Item not found' });

    // Regenerate embedding if content was updated
    if (parsed.data.content) {
      generateEmbeddingsBackground([{ id: req.params.id as string, content: parsed.data.content }]);
    }

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

// Bulk delete
router.post('/bulk-delete', authMiddleware, async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: '缺少要删除的 ID 列表' });
    }
    const result = await prisma.knowledgeItem.deleteMany({
      where: { id: { in: ids }, userId: req.user!.id },
    });
    res.json({ success: true, data: { deleted: result.count } });
  } catch (err) { next(err); }
});

export default router;
