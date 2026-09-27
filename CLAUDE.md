# 📚 MINI READING TRACKER - AI CONTEXT FILE

## 1. PROJECT OVERVIEW
- **Project**: Mini Reading Tracker (Single-user web app).
- **Goal**: Search books via Open Library API, add to personal library, and track reading progress.
- **Architecture**: 
  - Frontend: Vue 3 (Composition API).
  - Backend: Node.js (NestJS) acts as a PROXY to Open Library API. Frontend NEVER calls Open Library directly.
  - Database: MySQL (Relational) via TypeORM

## 2. STRICT CODING STANDARDS

### A. Backend (Node.js/NestJS)
- **Architecture Pattern**: Use NestJS Modular Architecture (Module -> Controller -> Service). 
- **Paradigm**: ALWAYS use Object-Oriented Programming (OOP) and TypeScript. Leverage Dependency Injection.
- **Naming Conventions**:
  - File names: `{name}.{type}.ts` (e.g., `book.controller.ts`, `book.service.ts`, `book.dto.ts`).
  - Class names: `PascalCase` (e.g., `BookService`).
  - Variables/Functions: `camelCase`.
- **Validation**: Use DTOs (Data Transfer Objects) with `class-validator` and `class-transformer`. Enable global `ValidationPipe`.
- **API Response Format**: Use standard NestJS serialization or Interceptors to maintain a consistent JSON structure:
  ```json
  { "success": true/false, "data": null/object, "error": null/string, "message": "..." }

```

* **Error Handling**: Throw built-in NestJS exceptions (e.g., `new ConflictException()`, `new BadRequestException()`). Do not use raw try-catch blocks for HTTP responses unless necessary; use global Exception Filters.
* **Proxy Rule**: All Open Library API calls must be handled within the Backend Service layer using `@nestjs/axios` (HttpModule).

### B. Frontend (Vue 3)

* **Paradigm**: Use Functional Programming. STRICTLY DO NOT use OOP (Classes) for state management.
* **Component Style**: ALWAYS use `<script setup>` syntax (Composition API) with TypeScript.
* **State Management**: Use Vue `ref`, `reactive`, or `composables` (e.g., `useBooks()`).
* **UI States**: Every API call must explicitly handle 3 states in the UI: `loading`, `error`, and `empty` (no results).

### C. Database (MySQL)

* **Table Naming**: `snake_case`, plural (e.g., `books`, `user_library`).
* **Column Naming**: `snake_case` (e.g., `open_library_id`, `pages_read`).
* **Dates**: Always store timestamps for `started_at` and `finished_at`.

## 3. BUSINESS LOGIC RULES & DEFINITION OF DONE (DoD)

Before completing any feature, AI must verify these rules are met:

* **Conflict Rule**: If a user adds an existing book to the library, backend MUST return `HTTP 409 Conflict` (`ConflictException`).
* **Progress Validation**: `pages_read` must be `>= 0` and `<= total_pages` (Enforce this in DTO).
* **Rating Validation**: Rating must be an integer between 1 and 5 (or null).
* **Auto-transition Rule**: If `pages_read` equals `total_pages`, automatically update status to `read` and set `finished_at` timestamp.
* **First-time Reading Rule**: When status changes to `reading` for the first time, set `started_at` timestamp.

## 4. SCRIPTS & WORKFLOW

* **Frontend Start**: `cd frontend && npm run dev`
* **Backend Start**: `cd backend && npm run start:dev`
* **Database**: Ensure MySQL connection matches the `.env` file credentials. No hardcoded credentials in source code.