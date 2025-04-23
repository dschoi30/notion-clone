# System Design

## Stack

Frontend:
- React/Vite
- shadcn/ui
- react-beautiful-dnd

Backend:
- Spring Framework
- Spring Security
- Spring Data JPA

Infra:
- PostgreSQL
- WebSocket
- JWT auth
- Redis cache

## Components

Frontend:
- Auth Module
- Editor Module
- Workspace Module
- Kanban Module

Backend:
- Auth Service
- Document Service
- Workspace Service
- Collab Service

## APIs

REST:
- /api/auth/*
- /api/docs/*
- /api/spaces/*
- /api/boards/*

Socket:
- /ws/doc/{id}
- /ws/presence

## Phases

1. MVP
- Auth
- Docs
- Editor

2. Core
- Drag-drop
- Kanban
- UI

3. Collab
- Real-time
- Perms
- Comments

4. Extra
- Templates
- Search
- Import/export

## Questions

- Conflict resolution
- Cache strategy
- Scale plan