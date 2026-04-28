const express = require('express');
const path = require('path');
const https = require('https');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// GitHub config
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'astresow14/personal-knowledge-base';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const GITHUB_FOLDER = process.env.GITHUB_FOLDER || 'zettelkasten';

let cachedNotes = [];
let lastFetch = 0;
const CACHE_TTL = 60_000; // 1 minute

function githubFetch(urlPath) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: urlPath,
      headers: {
        'User-Agent': 'kb-viz',
        'Accept': 'application/vnd.github.v3+json',
        ...(GITHUB_TOKEN ? { 'Authorization': `token ${GITHUB_TOKEN}` } : {})
      }
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) resolve(JSON.parse(data));
        else reject(new Error(`GitHub ${res.statusCode}: ${data.slice(0, 200)}`));
      });
    }).on('error', reject);
  });
}

async function fetchNotes() {
  if (Date.now() - lastFetch < CACHE_TTL && cachedNotes.length) return cachedNotes;

  const [owner, repo] = GITHUB_REPO.split('/');
  const files = await githubFetch(`/repos/${owner}/${repo}/contents/${GITHUB_FOLDER}?ref=${GITHUB_BRANCH}`);

  const notes = [];
  for (const file of files) {
    if (!file.name.endsWith('.md') || file.name.startsWith('_')) continue;
    const content = await githubFetch(`/repos/${owner}/${repo}/contents/${GITHUB_FOLDER}/${file.name}?ref=${GITHUB_BRANCH}`);
    const decoded = Buffer.from(content.content, 'base64').toString('utf-8');
    notes.push({ name: file.name, content: decoded });
  }

  cachedNotes = notes;
  lastFetch = Date.now();
  return notes;
}

function parseNote(name, content) {
  const slug = name.replace('.md', '');
  let type = 'concept';
  let displayType = 'concept';
  let department = 'general';
  let tags = [];
  let links = [];
  let title = slug;
  let confidential = false;

  // Parse frontmatter
  if (content.startsWith('---')) {
    const parts = content.split('---');
    if (parts.length >= 3) {
      const fm = parts[1];
      const typeMatch = fm.match(/^type:\s*(.+)$/m);
      if (typeMatch) type = typeMatch[1].trim();
      const dtMatch = fm.match(/^display_type:\s*(.+)$/m);
      if (dtMatch) displayType = dtMatch[1].trim();
      const confMatch = fm.match(/^confidential:\s*true/m);
      if (confMatch) confidential = true;
      // Parse department
      const deptMatch = fm.match(/^department:\s*\[([^\]]*)\]/m);
      if (deptMatch) department = deptMatch[1].split(',')[0].trim();
    }
  }

  // Parse inline tags
  const tagLine = content.match(/^tags:\s*(.+)$/m);
  if (tagLine) {
    tags = tagLine[1].match(/#([\w-]+)/g)?.map(t => t.slice(1)) || [];
  }

  // Parse title
  const titleMatch = content.match(/^# (.+)$/m);
  if (titleMatch) title = titleMatch[1].trim();

  // Parse links
  const linkLine = content.match(/^Links:\s*(.+)$/m);
  if (linkLine) {
    links = linkLine[1].match(/\[\[([^\]]+)\]\]/g)?.map(l => l.slice(2, -2)) || [];
  }

  return { slug, title, type, displayType, department, tags, links, confidential };
}

// API endpoints
app.get('/api/graph', async (req, res) => {
  try {
    const raw = await fetchNotes();
    const notes = raw.map(n => parseNote(n.name, n.content));
    const slugSet = new Set(notes.map(n => n.slug));

    const nodes = notes.map(n => ({
      id: n.slug,
      label: n.title,
      type: n.displayType,
      department: n.department,
      tags: n.tags,
      confidential: n.confidential
    }));

    const edges = [];
    for (const n of notes) {
      for (const link of n.links) {
        if (slugSet.has(link)) {
          edges.push({ source: n.slug, target: link });
        }
      }
    }

    res.json({ nodes, edges });
  } catch (err) {
    console.error('Graph fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/note/:slug', async (req, res) => {
  try {
    const raw = await fetchNotes();
    const note = raw.find(n => n.name === req.params.slug + '.md');
    if (!note) return res.status(404).json({ error: 'Not found' });
    const parsed = parseNote(note.name, note.content);
    res.json({ ...parsed, raw: note.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/refresh', (req, res) => {
  cachedNotes = [];
  lastFetch = 0;
  res.json({ ok: true, message: 'Cache cleared' });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`KB Viz running on port ${PORT}`);
  console.log(`GitHub repo: ${GITHUB_REPO}`);
});
