# KB Knowledge Graph Visualization

Interactive force-directed graph visualization for your knowledge base.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/new?repo=https://github.com/astresow14/personal-kb-viz&envs=GITHUB_TOKEN,GITHUB_REPO&GITHUB_TOKENDesc=GitHub%20PAT%20with%20repo%20scope&GITHUB_REPODesc=owner/repo%20for%20your%20knowledge%20base&GITHUB_REPODefault=astresow14/personal-knowledge-base)

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `GITHUB_TOKEN` | GitHub PAT with repo scope | (required) |
| `GITHUB_REPO` | `owner/repo` for your KB | `astresow14/personal-knowledge-base` |
| `GITHUB_BRANCH` | Branch to read from | `main` |
| `GITHUB_FOLDER` | Folder containing notes | `zettelkasten` |
| `PORT` | Server port | `3000` |

## Features

- Force-directed graph layout
- Filter by node type and tags
- Search notes
- Click nodes to view content
- Drag nodes to rearrange
- Zoom and pan
- Auto-refreshes via `/api/refresh` endpoint
