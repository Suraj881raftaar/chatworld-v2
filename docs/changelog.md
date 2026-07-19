# Changelog
## Chat World v2

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

### [2.0.0-alpha.1] - 2026-07-19

This initial pre-release establishes the specifications, architecture blueprints, database layouts, and devops planning for Chat World v2.

#### Added
*   **Software Requirements Specification (srs.md):** Formulating system scopes, modules, functional requirements, and WCAG AA guidelines.
*   **System Architecture (system_architecture.md):** Defining Clean Architecture layouts, DDD components boundaries, Redis Pub/Sub message propagation pipelines, and Cloudflare reverse proxies.
*   **Database Specifications (database_erd.md):** Drawing entity relationship diagrams, tables fields type specifications, and configuring SQLAlchemy 2.0 mapped schemas.
*   **API specifications (api_documentation.md & api_contract.md):** Listing REST endpoints and JSON validation contracts for authentication, room setups, and WebSocket JSON protocols.
*   **Folder Structure Map (folder_structure.md):** Outlining workspace directory patterns for backend packages, React client layout structures, devops folders, database migrations, and docs.
*   **UI Mockups (ui_wireframes.md & ui_design_system.md):** Sketching ASCII grid layouts for desktop/mobile views and providing theme HSL variables color tokens.
*   **Development Roadmap (roadmap.md & milestones.md):** Providing task lists sorted from easiest to hardest, chronological development charts, and release criteria.
*   **GitHub Issues backlog (github_issues.md):** Outlining templates tickets for tracking project board development.
*   **Testing Strategy (testing_strategy.md):** Outlining async db isolation fixtures and websocket testing mock clients.
*   **Security (security.md):** Defining password hashing protocols, cookie rotation security rules, and OWASP vulnerability checkers.
*   **Performance (performance.md):** Detailing database index setups, query optimizations, caching, and client load configurations.
*   **Contribution Guidelines (contribution_guide.md):** Guiding onboarding developers through project setups and quality checks.
