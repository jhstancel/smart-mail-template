# Smart Mail Template – 3-Week Development Roadmap

This document outlines the complete development plan for turning **Smart Mail Template** into a professional, ready-to-demo SaaS product. It describes what we will build, why, and how each part fits together over three weeks. The plan includes technical steps, user-experience goals, and presentation preparation for showing the project to programmers and logistics professionals.

---

## Project Vision

**Smart Mail Template** is a web application that helps professionals generate, detect, and manage structured email templates automatically. It saves time by creating organized, reusable emails for different industries.

The system allows users to:
1. Import previously sent emails.
2. Classify them into “intents” (like *quote_request*, *order_confirmation*, etc.).
3. Generate new emails automatically using AI assistance.
4. Filter and use templates by industry.
5. Manage templates, settings, and global variables through a simple interface.

The long-term goal is a fully web-based SaaS product with optional downloadable components, a modern tutorial system, automatic template detection, and paid subscription tiers.

---

## Stage 1 — Foundation and Tutorial System (Days 1–5)

**Goal:** Build a working onboarding tutorial, organize templates by industry, and prepare for data import.

### 1.1 Tutorial Framework (User Flow and Design)
- Create a guided overlay that highlights parts of the interface and explains each section step by step.
- The tutorial sequence:
  1. Welcome screen explaining the mission and value of Smart Mail Template.
  2. Industry selection screen that filters templates by industry.
  3. Explanation of how “intents” work — including their names, descriptions, IDs, required fields, subject, and body.
  4. Introduction to optional settings (global constants, global footers, typing animation, visible intents).
  5. “Get Started” screen with a smooth water-ripple or fade animation.

- Deliverables:
  - `tutorial.js` to handle overlay steps.
  - JSON configuration for tutorial steps and messages.
  - Replay option in Settings.

### 1.2 Industry Template Loader
- Add an `industry` field in each intent `.yml` file.
- Enable the frontend to display only templates related to the user’s chosen industry.
- Collect and import example templates for various industries (aviation, logistics, construction, healthcare, etc.).
- Deliverables:
  - Updated YAML schema to support industry tagging.
  - `/industries` API endpoint for listing industries.
  - Industry selection screen in the tutorial.

### 1.3 Tutorial Replay and Persistence
- Allow the user to restart the tutorial at any time from the Settings panel.
- Save progress in `localStorage` so users can pick up where they left off.

---

## Stage 2 — AI Auto-Detect and Email Import System (Days 6–10)

**Goal:** Allow users to upload sent emails, train the autodetect system, and classify templates with varying levels of automation.

### 2.1 Email Import Pipeline
- Add an “Import Emails” button for users to upload `.eml`, `.msg`, or `.txt` files.
- Backend route `/upload` will:
  - Parse emails and extract text.
  - Convert data into `.xlsx` format with columns such as sender, subject, body, and date.
  - Clean and normalize the data.
  - Show a visual progress bar for users during processing.
- Use Python libraries like `mailparser`, `extract-msg`, and `pandas`.

### 2.2 Labeling Interface (User Interaction)
- Build an interface that shows one uploaded email at a time.
- Allow navigation between emails using “Next” and “Previous” buttons.
- Let users choose how much control they want:
  1. **Automatic mode** – AI labels and extracts intents automatically (faster but less accurate).
  2. **Semi-automatic mode** – User selects intents; AI extracts keywords and builds fields.
  3. **Manual mode** – User designs each template’s body, fields, and subject manually; AI only helps with keyword detection.

### 2.3 Training Integration
- Store parsed email data as a training dataset in the backend.
- Add a new route or function (e.g., `/train_autodetect`) that:
  - Retrains or fine-tunes the autodetect model.
  - Updates the rules file (`autodetect_rules_generated.py`).
  - Returns training statistics or accuracy metrics.
- Display a “Training in progress” indicator and success message when complete.

---

## Stage 3 — Accounts, Paywall, and Monetization (Days 11–14)

**Goal:** Add user authentication, subscription plans, and usage limits for the trial version.

### 3.1 Authentication System
- Add a simple login system with OAuth (Google, GitHub, or similar) using Supabase or Auth0.
- Include a Guest Mode that works entirely in the browser for people who want to test it quickly.

### 3.2 Subscription Plans
- **Trial Mode:** 5 free intents and autodetect enabled.
- **Personal Plan:** All prebuilt industry templates, 3 personal templates, global variables, and visible intents.
- **Premium Plan:** Everything from Personal plus themes and unlimited templates.
- **Business Plan:** Includes everything from Premium for each employee at a team rate ($10 per month per user).
- Backend should include endpoints for checking and upgrading subscriptions.

### 3.3 License Enforcement
- Frontend will disable certain buttons or options once free limits are reached.
- Backend will validate user plans and restrict API calls (for example, limit how many `/generate` requests per day).

### 3.4 Payment Integration
- Start with a mock Stripe checkout page to simulate payments.
- Log all upgrade attempts and store active plan information in a small database table (`users`, `plan`, `active_until`).

---

## Stage 4 — AI Integration, UI Polish, and Stability (Days 15–18)

**Goal:** Improve AI performance, polish the interface, and make the application stable and user-friendly.

### 4.1 Advanced AI Detect
- Integrate a small text-embedding model (for example, `sentence-transformers` or the OpenAI API).
- Keep the existing keyword-based fallback if the AI service is offline.
- Add a visible confidence score and top-K prediction results.

### 4.2 User Interface Improvements
- Add smooth transitions and effects such as the water-ripple animation on the welcome screen.
- Improve visual consistency across light and dark themes.
- Add a “feedback” or “report issue” modal that links to GitHub issues.

### 4.3 Quality Assurance and Testing
- Test every tutorial path, including replay and skipped states.
- Validate that all YAML-defined fields render properly.
- Test across multiple screen sizes and browsers.
- Optimize `main.py` endpoints for async behavior and response speed.

---

## Stage 5 — Presentation and Demo Preparation (Days 19–21)

**Goal:** Prepare a professional demonstration and finalize all documentation.

### 5.1 Demo Environment
- Build a local `docker-compose.yml` file containing FastAPI, Postgres, Redis, and MinIO.
- Seed the database with a few example users and preloaded intents.
- Add a small landing screen with a clear “Try it Free” button.

### 5.2 Presentation for Programmers and Logistics Company
- Target audience: programmers, product managers, and professionals in logistics or operations.
- Presentation outline:
  1. Vision and problem statement.
  2. System architecture (FastAPI backend, YAML intents, Jinja2 templates, and autodetect model).
  3. Live demo or recorded walkthrough.
  4. Development process overview.
  5. Practical applications in logistics and customer communication.

- Deliverable: a 10- to 15-slide deck (PowerPoint, Keynote, or PDF).

### 5.3 Documentation and Wrap-Up
- Update `README.md` for end users and contributors.
- Add `DEVELOPER_GUIDE.md` explaining setup, schema, and how to contribute.
- Record a short 2–3 minute video walkthrough showing the main features.

---

## Timeline Overview

| Week | Focus | Major Deliverables |
|------|--------|--------------------|
| Week 1 | Tutorial and industry features | Guided onboarding, industry tagging, replay system |
| Week 2 | Email import and AI training | Upload/label/train system, account setup, trial paywall |
| Week 3 | Final polish and presentation | UI improvements, AI refinements, live demo, presentation deck |

---

## Ongoing Quality and Maintenance Tasks
These tasks continue through all stages to keep the code stable and easy to maintain.

- Add clear error messages and toasts when something goes wrong.
- Test responsive layouts for both desktop and mobile.
- Autosave all unsent input to prevent data loss.
- Cache schema and intents locally to reduce reload times.
- Add a `DEV_MODE` environment flag to bypass the paywall during testing.
- Create Makefile commands for common actions (`make dev`, `make train`, `make deploy`).
- Run `validate_repo.py` regularly to ensure YAML and schema consistency.

---

### Summary
By following this roadmap, Smart Mail Template will evolve from a functional prototype into a polished, scalable SaaS-ready product. Each stage builds directly upon the previous one, minimizing rework and ensuring a clear path toward a fully hosted version that can later be commercialized or demonstrated to potential partners.

