# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (React/Vite)
```bash
cd frontend
pnpm install          # Install dependencies
pnpm dev              # Start development server (http://localhost:5173)
pnpm build            # Build for production
pnpm lint             # Run ESLint with quiet mode
pnpm preview          # Preview production build
```

### Backend (Spring Boot)
```bash
cd backend
./gradlew bootRun     # Start development server (http://localhost:8080)
./gradlew build       # Build the application
./gradlew test        # Run tests
```

### Docker Development
```bash
# Development mode (hot reload)
docker compose -f docker-compose.dev.yml up --build

# Production mode
docker compose up --build -d
```

### Environment Setup
1. Copy `.env.example` to `.env` in project root
2. Configure database, JWT, and OAuth settings as needed

## Architecture Overview

### Project Structure
- **Frontend**: React SPA with Vite, Tailwind CSS, shadcn/ui components
- **Backend**: Spring Boot 3 with Java 17, PostgreSQL, WebSocket support
- **Database**: PostgreSQL with JPA/Hibernate
- **Authentication**: JWT with Google OAuth integration
- **Real-time**: WebSocket (STOMP) for collaborative editing
- **File Storage**: Cloudinary for images

### Domain-Driven Design (Backend)
The backend follows DDD patterns with clear domain separation:

```
backend/src/main/java/com/example/notionclone/
├── domain/
│   ├── user/           # User management, authentication
│   ├── workspace/      # Workspace organization
│   ├── document/       # Core document entities and logic
│   ├── permission/     # Access control and sharing
│   └── notification/   # User notifications
├── config/             # Security, WebSocket, JPA configuration
├── security/           # JWT, authentication filters
└── exception/          # Global exception handling
```

Each domain follows the pattern:
- `entity/` - JPA entities with business logic
- `dto/` - Request/Response objects
- `repository/` - Data access layer
- `service/` - Business logic layer
- `controller/` - REST/WebSocket endpoints

### Frontend Architecture
Multi-layered React architecture with context-based state management:

```
frontend/src/
├── App.jsx             # Root component with provider hierarchy
├── components/
│   ├── layout/         # Main layout, sidebar, routing
│   ├── auth/           # Authentication forms
│   ├── documents/      # Document management (page/table views)
│   ├── editor/         # TipTap rich text editor
│   ├── workspace/      # Workspace management
│   ├── notifications/  # Notification system
│   ├── error/          # Error boundaries and handling
│   └── ui/             # shadcn/ui reusable components
├── contexts/           # React contexts for global state
├── hooks/              # Custom React hooks
├── services/           # API communication layer
└── lib/                # Utilities (colors, logger, error handling)
```

### Key Architectural Patterns

#### Provider Hierarchy
```jsx
ErrorBoundary → AuthProvider → Router →
  NotificationProvider → WorkspaceProvider → DocumentProvider → MainLayout
```

#### Real-time Collaboration
- WebSocket connection for document editing
- STOMP protocol for message routing
- JWT authentication via query parameters for WebSocket
- Presence tracking for active users

#### Document Views
The application supports two primary document views:
- **Page View**: Rich text editing with TipTap editor
- **Table View**: Spreadsheet-like interface with sortable/filterable columns

#### State Management
- **Zustand**: For complex component state (document properties)
- **React Context**: For global application state (auth, workspace, documents)
- **Custom Hooks**: For domain-specific logic and API integration

## Development Guidelines

### Cursor Integration
Before writing code, always read:
- `.cursor/rules/memory-bank/notion_clone_prd.md` - Product requirements
- Update `.cursor/rules/memory-bank/progress.md` after code changes
- Ask for confirmation before commits

### API Structure
- **REST API**: `/api/**` for standard CRUD operations
- **WebSocket**: `/ws/**` for real-time features (SockJS/STOMP)
- **Authentication**: JWT tokens in Authorization header
- **WebSocket Auth**: JWT via `?token=...` query parameter

### Database Conventions
- All entities extend `BaseEntity` (created/modified timestamps)
- Use `@Builder` pattern for entity construction
- Soft deletion with `isTrashed` boolean flag
- JPA auditing enabled for tracking changes

### Frontend Conventions
- Use `@/` alias for `src/` directory imports
- shadcn/ui components in `components/ui/`
- Context providers wrap logical application boundaries
- Custom hooks prefix with `use` and encapsulate domain logic
- Error boundaries wrap major application sections

### WebSocket Integration
Document editing uses WebSocket for real-time collaboration:
```javascript
// Connection with JWT
client.configure({
  brokerURL: `ws://localhost:8080/ws?token=${token}`,
  onConnect: () => {
    client.subscribe(`/topic/document/${documentId}`, handleMessage);
  }
});
```

### Testing Strategy
- Frontend: React Testing Library, Jest, Playwright for E2E
- Backend: JUnit with Spring Boot Test
- Run individual tests: specific test commands not specified in package.json

### Common Patterns

#### Error Handling
- Global error boundary catches React errors
- API interceptor handles token expiration and redirects
- Custom `useErrorHandler` hook for component-level error management

#### Document Properties
- Dynamic property system similar to Notion databases
- Properties have types (Text, Date, Select, etc.)
- Table view renders properties as columns
- Page view shows properties in header area

#### Permission System
- Role-based access control (OWNER, EDITOR, VIEWER)
- Document sharing via invitation system
- Permission checks at both frontend and backend levels

### Build and Deployment
- **Development**: Vite dev server with backend proxy
- **Production**: Nginx serves static files and proxies API/WebSocket
- **Docker**: Multi-stage builds for frontend, single-stage for backend
- **Environment**: `.env` file controls all configuration