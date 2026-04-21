# 🚀 ZEARCH

### Ask anything. Get a live app.

> Search gives answers. **LiveAnswer gives tools.**

---

## ✨ What is LiveAnswer?

LiveAnswer turns natural language into **fully functional, live web applications** in seconds.

Instead of returning text, it generates **interactive tools** — dashboards, simulators, data explorers — and deploys them instantly using Locus.

---

## ⚡ Demo

Type a prompt like:

> “Show me IPL team stats and predictions.”

<p align="center">
  <img src="./assets/ipl_demo0.png" width="700"/>
</p>

👇

You get:

- 🌐 A live deployed web app
- 📊 Interactive charts
- 🎚 Sliders to explore scenarios
- 🔄 Instant recalculation
<p align="center">
  <img src="./assets/ipl_demo.png" width="45%"/>
  <img src="./assets/ipl_demo2.png" width="45%"/>
  <img src="./assets/ipl_demo3.png" width="45%"/>
</p>

👉 Not a response. An **interactive working product**.

---

## 🧠 Core Features

- 🧠 **Prompt → App Generation**  
  Converts natural language into a complete web app (React + Tailwind + charts)

- 🚀 **Instant Deployment (Locus)**  
  Every app is deployed as a real service with a public URL

- 🔄 **Modify & Evolve Apps**  
  Update apps with follow-up prompts and redeploy instantly

- ⏳ **Ephemeral Infrastructure**  
  Apps auto-expire and are destroyed after use

- 📡 **Live Infrastructure Orchestration**  
  Projects, services, and deployments created dynamically per request

---

## 🏗️ How it works

```text
Prompt
  ↓
AI generates app code (HTML + React)
  ↓
App deployed via Locus (project + service)
  ↓
Live URL returned
  ↓
Auto teardown after inactivity
```

---

## 🧩 Tech Stack

- ⚙️ Locus — deployment, infra, lifecycle
- 🤖 AI Code Generation — via Locus-wrapped Anthropic API
- 🟢 Node.js + Express — orchestrator backend
- 🎨 React + Tailwind + Recharts — generated frontend apps

---

## 🚀 Getting Started

1. **Clone the repo**
   ```
   git clone https://github.com/your-username/liveanswer.git
   cd liveanswer/backend
   ```
2. **Install dependencies**
   ```
   npm install
   ```
3. **Set environment variables**
   ```
    set LOCUS_API_KEY=your_locus_api_key
    set LOCUS_BUILD_TOKEN=your_locus_build_token
   ```
4. **Run the server**
   ```
    node index.js
   ```

Server runs at:

```
http://localhost:8080
```

---

## 🎯 Use Cases

- 📊 Financial simulators
- 📁 CSV → interactive dashboards
- 🧠 Decision tools
- 📈 Data visualizations
- 🎓 Learning apps

---

## 🛣️ Roadmap

- [ ] Multi-app sessions
- [ ] Shareable app links
- [ ] Version history (v1 → v2 → v3)
- [ ] Real-time deployment timeline
- [ ] Team collaboration

---

## 💥 Built for Hackathons

This project showcases:

- 🤖 Agent-driven infrastructure
- ⚡ Real-time deployment orchestration
- ⏳ Ephemeral app lifecycle management
