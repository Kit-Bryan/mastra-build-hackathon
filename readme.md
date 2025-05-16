# Mastra Weather Workflow

Features:
- Natural language processing for weather queries
- Interactive location selection
- Confirmation workflow for weather requests
- Intelligent handling of non-weather queries
- Persistent storage using LibSQL
- Nested workflows with human-in-the-loop interactions:
  - Location selection suspension for user input
  - Confirmation suspension for user approval
  - Graceful handling of rejected confirmations
  - Intelligent branching for non-weather queries

## Quick Start

```bash
git clone https://github.com/Kit-Bryan/mastra-build-hackathon.git
npm install
npm run dev
```
