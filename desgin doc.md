# Design Document: Dev

## Version: 1.0

## Date: 2025-04-18

## Author: Jonathan Reed

## 1. Introduction / Overview

Simple-Dev-Tools is a web-based application designed to provide developers, data analysts, and related technical roles with a convenient, integrated suite of commonly used tools. It aims to streamline workflows by combining API interaction utilities, diagramming capabilities, and ad-hoc data exploration into a single, cohesive interface. The application will run entirely client-side, leveraging modern web technologies like WebAssembly (WASM), ensuring user data remains private and eliminating the need for backend infrastructure.

## 2. Goals

Provide a unified interface for three distinct but complementary developer tools:
API Integration Snippet Generator for AI model api's from openrouter,groq,openai,antropic,gemini,mistral,hugging face, grok,fireworks, and many more a provider.
Mermaid Flowchart & Diagram Editor
SQLite WASM Data Explorer
Ensure the entire application runs client-side (zero-backend) for simplicity, privacy, and ease of deployment.
Offer a seamless and intuitive user experience for each tool, adhering to the specified visual theme.
Build using the T3 Stack for a type-safe, modern, and efficient development experience.
Deploy as a static web application using Cloudflare Pages for performance, scalability, and cost-effectiveness.
Generate practical, ready-to-use outputs (code snippets, diagrams, query results).

## 3. Non-Goals (Version 1.0)

User accounts or authentication.
Server-side data storage or persistence (all state is ephemeral or uses browser local storage/session storage).
Real-time collaboration features.
Support for languages/formats beyond the initially specified ones (e.g., other code snippets, other diagramming tools, non-CSV/JSON data formats).
Backend API endpoints hosted by the application itself (though it generates snippets to call other APIs).

## 4. Target Audience

Software Developers (Frontend, Backend, Fullstack)
DevOps Engineers / SREs
Data Analysts / Data Scientists
Technical Writers
Students learning development or data analysis

## 5. Proposed Solution / Architecture

The application will be a Single Page Application (SPA) built using the T3 Stack core components suitable for client-side development.

Framework: Next.js (configured for static export) will provide the React-based structure, component model, and build system.
Language: TypeScript will be used for end-to-end type safety.
Styling: Tailwind CSS will be used for utility-first styling and rapid UI development, implementing the specified theme.
Core Logic: Each tool (API Snippets, Mermaid Editor, DuckDB Explorer) will be implemented as distinct React components, potentially within a tabbed or sectioned layout managed by Next.js routing or client-side state management.
State Management: Simple state can be managed via React Context or hooks. For more complex cross-component state (e.g., managing DuckDB instance, file states), a lightweight state manager like Zustand or Jotai might be considered if needed.
Client-Side Libraries: Key external libraries (Mermaid.js, DuckDB-WASM, potentially a CSV/JSON parser if needed) will be integrated.

## 6. Technology Stack

Core Framework: Next.js (React) - Configured for static export (output: 'export' in next.config.js)
Language: TypeScript
Styling: Tailwind CSS
Package Manager: npm
Key Libraries:
mermaid: For rendering Mermaid diagrams.
@sqlite-wasm: For the in-browser SQL engine.
Deployment Platform: Cloudflare Pages
Version Control: Git (Repository hosted on GitHub, GitLab, etc.)
(Unused T3 Components for V1): tRPC, Prisma, NextAuth.js - These standard T3 components focus on backend/DB/auth integration and are not required for this purely client-side V1.

## 7. Detailed Features

### 7.1 Main Interface

Single-page layout.
Clear navigation (e.g., tabs, sidebar) to switch between the three tools, styled according to the theme.
Responsive design for usability on different screen sizes.

### 7.2 API Integration Snippet Generator

Input fields for: HTTP Method (GET, POST, PUT, DELETE, etc.), API Endpoint URL, Headers (key-value pairs), Payload (e.g., JSON textarea). Styled textareas/inputs using theme colors.
Output area displaying generated snippets for:
cURL
JavaScript Workspace()
Python requests
"Copy to Clipboard" button for each snippet, using a Neon Accent color.

### 7.3 Mermaid Flowchart & Diagram Editor

Textarea input for writing Mermaid DSL syntax, using theme background/text colors.
Live preview pane showing the rendered diagram, updating as the user types. Diagrams should render legibly against the dark backgrounds.
Support for common diagram types (Flowchart, Sequence, Class).
Buttons for exporting the diagram (e.g., SVG, potentially PNG via canvas conversion), styled with Neon Accents.

### 7.4 SQLite WASM Data Explorer

File input area supporting drag-and-drop for CSV and JSON files, styled according to the theme.
Mechanism to load file data into the in-browser SQLite instance (creating tables based on file structure).
Textarea for entering SQL queries, using theme background/text colors.
"Run Query" button, styled with a Neon Accent color.
Results area displaying query output in an interactive HTML table (sortable columns), styled with theme colors (dark backgrounds, light text, accent highlights).
Basic error handling for invalid SQL or file loading issues, potentially using an accent color for error messages.
Display loaded table names/schemas.

## 8. UI/UX Design Principles

Clarity: Easy to understand what each tool does and how to use it.
Efficiency: Minimize clicks and effort required to achieve common tasks.
Consistency: Maintain a consistent visual language and interaction patterns across all tools within the application, adhering to the specified theme.
Feedback: Provide clear visual feedback for actions (e.g., successful copy, query running, file loaded, errors) using accent colors and subtle animations where appropriate.
Minimalism: Avoid unnecessary clutter; focus on core functionality. Leverage negative space effectively within the dark theme.
Aesthetic: Implement a modern, tech-focused "OLED Dark/Neon" theme as specified, drawing inspiration from the provided image_051605.png.

## 8.1 Visual Design & Theme

This section details the specific color palette and visual style to be implemented, matching your other projects' branding.

Overall Style: Dark Mode ("OLED") aesthetic with vibrant neon accents for key elements, creating high contrast and a futuristic feel, similar to the provided image_051605.png.
Color Palette:
Backgrounds:
Primary: OLED Black (#000000) - Used for the main application background.
Secondary: Midnight Blue (#0a0f29) - Used for larger containers, sidebars, or distinct sections.
Tertiary: Deep Purple (#260b41) - Used for cards, input backgrounds, or less prominent containers to create depth.
Neon Accents: Applied strategically to interactive elements, highlights, icons, and potentially data visualizations.
Pink: #ff4dc4
Blue: #3399ff (Consider as a primary interactive color, similar to button in example)
Gold: #ffd24d
Purple: #9933ff
Cyan: #4dfff0 (Consider as a primary interactive color, similar to button/graphic in example)
Text:
Primary Body Text: High-contrast off-white or light grey (e.g., #E0E0E0) for readability against dark backgrounds.
Headings: Primary text color, potentially using a neon accent color sparingly for major headings if desired.
Application:
Use primary background (#000000) for the main canvas.
Employ secondary/tertiary backgrounds for structuring content areas (e.g., the input/output sections of each tool).
Use Neon Accents for:
Buttons (like the Cyan/Blue ones in the image).
Links.
Focus indicators on inputs or interactive elements.
Icons.
Active state indicators (e.g., selected tab).
Subtle borders or highlights.
Visualizations (e.g., color-coding elements in Mermaid diagrams if possible, status indicators).
Consider applying subtle glow effects (e.g., CSS box-shadow or text-shadow) to neon elements to enhance the theme.
Typography: Select a clean, modern sans-serif font that complements the tech aesthetic (similar to the font used in the example image). Ensure appropriate font weights and sizes for hierarchy.
