# Project Summary
The Notion Clone project aims to create a web-based document collaboration platform that enables users to manage, edit, and share documents in real-time. It incorporates features such as a rich text editor, drag-and-drop functionality, and a kanban board for task management. The application is designed to facilitate seamless collaboration among users while maintaining a user-friendly interface.

# Project Module Description
The project consists of several functional modules:
1. **Authentication Module**: Handles user registration, login, and OAuth integration.
2. **Document Management Module**: Supports CRUD operations for documents, version control, and real-time editing.
3. **Workspace Management Module**: Organizes documents into folders and manages user permissions.
4. **Kanban Board Module**: Allows users to manage tasks visually with drag-and-drop capabilities.
5. **Real-time Collaboration Module**: Enables multiple users to edit documents simultaneously and see changes in real-time.

# Directory Tree
```
docs/
│   ├── notion_clone_architecture.md
│   ├── notion_clone_class_diagram.mermaid
│   ├── notion_clone_prd.md
│   ├── notion_clone_sequence_diagram.mermaid
│   ├── notion_clone_design.md
│   ├── notion_clone_system_design.md
│   ├── system_design.md
│   └── notion_clone_erd.mermaid
```

# File Description Inventory
- `notion_clone_prd.md`: Product Requirements Document detailing the project's goals, features, and phases.
- `notion_clone_architecture.md`: Document outlining the system architecture, technologies used, and design decisions.
- `notion_clone_system_design.md`: Comprehensive design document covering system components, data structures, and interfaces.
- `notion_clone_class_diagram.mermaid`: Class diagram representing the relationships between core entities in the system.
- `notion_clone_sequence_diagram.mermaid`: Sequence diagram illustrating the interactions between various components during key operations.

# Technology Stack
- **Frontend**: Vite, React, shadcn/ui, react-beautiful-dnd
- **Backend**: Spring Framework, Spring Security, Spring Data JPA
- **Database**: PostgreSQL
- **Real-time Features**: WebSocket
- **Authentication**: JWT
- **Caching**: Redis

# Usage
1. **Installation**: 
   - Install dependencies using a package manager like npm or yarn.
   - Set up the backend environment with Spring Framework and PostgreSQL.
  
2. **Building**: 
   - Build the frontend using Vite for optimized performance.
  
3. **Running**: 
   - Start the backend server and connect it to the database.
   - Launch the frontend application to access the user interface.
