# Software Requirements Specification (SRS)
## Chat World v2

---

### 1. Introduction

#### 1.1 Purpose
This document specifies the software requirements for **Chat World v2**, a modern, flagship real-time chat application. It replaces the legacy Chat World BCA application, upgrading it to a highly scalable, secure, and responsive enterprise-grade architecture.

#### 1.2 Scope
Chat World v2 is a web-based, mobile-first chat platform that enables real-time messaging, public and private chat rooms, media sharing, and user profile management. The system will leverage a FastAPI backend, a React + Vite frontend, a PostgreSQL database, and WebSocket connections for instant communication.

#### 1.3 Definitions and Abbreviations
*   **SRS:** Software Requirements Specification
*   **JWT:** JSON Web Token (used for secure session authentication)
*   **WS:** WebSocket Protocol (bidirectional, real-time messaging channel)
*   **RBAC:** Role-Based Access Control (User/Admin roles)
*   **DDD:** Domain-Driven Design
*   **ERD:** Entity Relationship Diagram
*   **WCAG:** Web Content Accessibility Guidelines

---

### 2. Overall Description

#### 2.1 Product Perspective
Chat World v2 is a complete rewrite of the original local socket-based chat application. The application is designed using Clean Architecture and Domain-Driven Design (DDD) principles. It is split into a containerized frontend, backend, and database, deployment-ready on Render (as a single Web Service serving both frontend and backend) or locally via Docker Compose.

#### 2.2 Product Functions
*   **User Authentication & Authorization:** Secure signup, login, password hashing, and JWT double-token session management (Access + Refresh tokens).
*   **Role-Based Access Control (RBAC):** Distinct permissions for `User` and `Admin` roles.
*   **Real-time Communication:** Low-latency chat delivery in one-to-one and room formats.
*   **Presence & Status Tracking:** Real-time online/offline indicators and typing statuses.
*   **Channel Management:** User-created public rooms and invite-only private rooms.
*   **Media Sharing:** Uploading and viewing file attachments (images, PDFs, documents) in chat.
*   **User Profile Customization:** Custom avatars, usernames, and status messages.

#### 2.3 User Classes and Characteristics
*   **General User:** Can register, login, customize profiles, join rooms, create rooms, invite others, chat, share files, and view presence stats.
*   **Room Admin/Owner:** The user who created the room. Can edit room settings, invite/remove users, or delete the room.
*   **System Admin:** Possesses administrative access to delete any room, suspend users, and perform server-level operations.

#### 2.4 Design and Implementation Constraints
*   **Backend Language:** Python 3.11+ using the FastAPI framework following Clean Architecture.
*   **Frontend Framework:** React 18.3.1, TypeScript, and Vite, styled with Tailwind CSS and styled UI libraries.
*   **Database:** PostgreSQL 16+ for production, and SQLite for local development, integrated using SQLAlchemy 2.x and Alembic.
*   **Caching & Broker:** Redis for caching and WebSocket pub/sub propagation.
*   **Authentication:** JWT with standard short-lived Access Tokens (stored in memory) and long-lived HTTP-only Cookies for Refresh Tokens.
*   **Accessibility:** Adherence to WCAG 2.1 AA guidelines (proper contrast ratios, keyboard navigation, screen reader accessibility).
*   **Deployment:** Fully dockerized (Docker Compose), deployed to Render as a unified Web Service serving both React assets and backend API endpoints on a single URL.

---

### 3. Functional Requirements

#### 3.1 Module 1: Authentication & User Management
*   **FR-1.1 (Registration):** Users must be able to sign up with a unique email, username, and secure password.
*   **FR-1.2 (Login):** Users must be able to authenticate with email/password and receive a JWT.
*   **FR-1.3 (Token Refresh):** The system must silently refresh expired access tokens using a secure refresh token.
*   **FR-1.4 (Profile Update):** Users can edit their profile username, status message, and upload an avatar image.
*   **FR-1.5 (User Search):** Users can search for other registered users by username or email.
*   **FR-1.6 (Role Management):** Users are assigned a default `User` role. Admin accounts can perform administrative tasks.

#### 3.2 Module 2: Chat Rooms & Channels
*   **FR-2.1 (Room Creation):** Users can create rooms, setting a name, description, and privacy level (Public vs Private).
*   **FR-2.2 (Room Join/Leave):** Users can join public rooms or leave rooms they are part of.
*   **FR-2.3 (Private Room Invites):** Room owners can invite other users to private rooms.
*   **FR-2.4 (Room History):** Users joining or opening a room must see paginated historical chat logs.

#### 3.3 Module 3: Real-Time Messaging & Presence
*   **FR-3.1 (Message Transmission):** Messages sent via WebSockets must be delivered to all active room members with sub-100ms latency.
*   **FR-3.2 (Typing Indicators):** When a user is typing, a status event must propagate to all other active users in the room.
*   **FR-3.3 (Online Presence):** User online/offline status must update instantly using a WebSocket heartbeat.
*   **FR-3.4 (Read Receipts):** Messages must show delivery status (Sent, Delivered, Read) dynamically.

#### 3.4 Module 4: Media & Attachments
*   **FR-4.1 (Media Upload):** Users can attach files (images, audio, files up to 10MB) in chat rooms.
*   **FR-4.2 (Media Storage):** Media files must be uploaded securely, returning a URL to be embedded in the chat message.

---

### 4. Non-Functional Requirements

#### 4.1 Performance & Scalability
*   **NFR-4.1.1 (Latency):** Real-time messages must have a round-trip latency under 150ms on standard connections.
*   **NFR-4.1.2 (Concurrency):** The backend must scale to support 10,000+ concurrent WebSocket connections using Redis Pub/Sub.
*   **NFR-4.1.3 (Page Load):** Initial frontend loading time must be under 1.5 seconds.

#### 4.2 Security
*   **NFR-4.2.1 (Data Protection):** Passwords must be hashed using bcrypt before database storage.
*   **NFR-4.2.2 (Transport Security):** All HTTP and WebSocket traffic must be encrypted via HTTPS/WSS (SSL/TLS).
*   **NFR-4.2.3 (Token Security):** Refresh tokens must be stored in secure, `HttpOnly`, `SameSite=Strict` cookies to mitigate XSS and CSRF risks.
*   **NFR-4.2.4 (OWASP Compliance):** Protection against SQL Injection, XSS, CSRF, and Broken Object Level Authorization.

#### 4.3 Reliability & Availability
*   **NFR-4.3.1 (Uptime):** System availability goal is 99.9% uptime.
*   **NFR-4.3.2 (Reconnection):** Frontend must implement exponential backoff reconnection strategies for WebSocket drops.

#### 4.4 Usability & Accessibility
*   **NFR-4.4.1 (Responsive Design):** The UI must dynamically adapt to Desktop (1920x1080), Tablet (768x1024), and Mobile (375x812) screens.
*   **NFR-4.4.2 (Theme Support):** Cohesive dark and light modes must be fully supported.
*   **NFR-4.4.3 (Accessibility):** Design must conform to WCAG 2.1 AA standards (alt attributes, contrast ratio >= 4.5:1, semantic landmarks).
