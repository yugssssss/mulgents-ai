# 🚀 mulgentsAi — Render Backend Deployment Guide

This guide provides a comprehensive, step-by-step walkthrough for deploying the **mulgentsAi** backend microservices architecture to **Render**, connecting it seamlessly with your existing **Vercel** frontend deployment.

---

## 🏗️ Architecture Overview

The mulgentsAi backend follows a microservices monorepo architecture consisting of:

```
                      +-----------------------------+
                      |   Vercel Frontend (React)   |
                      +--------------+--------------+
                                     |
                                     v HTTPS
                      +-----------------------------+
                      |   Render API Gateway        |
                      |   (mulgents-gateway:8000)   |
                      +--------------+--------------+
                                     |
         +-------------------+-------+-------+-------------------+
         |                   |               |                   |
         v                   v               v                   v
+-----------------+ +-----------------+ +-----------------+ +------------------+
| Auth Service    | | Chat Service    | | Agent Service   | | Billing Service  |
| (Port 8001)     | | (Port 8002)     | | (Port 8003)     | | (Port 8004)      |
+--------+--------+ +--------+--------+ +--------+--------+ +--------+---------+
         |                   |               |                   |
         +-------------------+---------------+-------------------+
                             |               |
                             v               v
                     +---------------+---------------+
                     | MongoDB Atlas | Managed Redis |
                     +---------------+---------------+
```

1. **API Gateway (`mulgents-gateway`)**: The public entry point (`https://mulgents-gateway.onrender.com`). Receives all frontend requests, enforces auth rules, handles CORS, and proxies traffic internally.
2. **Private Microservices (`auth`, `chat`, `agent`, `billing`)**: Internal services running on separate ports, shielded from public internet access.
3. **Database & Cache**: MongoDB Atlas (Persistent Storage) & Redis (Session / Caching).

---

## 📋 Step 1: Prerequisites & External Services Preparation

Before creating services on Render, complete these 3 prerequisites:

### 1.1 Configure MongoDB Atlas IP Access
Render uses dynamic IP addresses for its cloud containers.
1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/).
2. Navigate to **Network Access** under Security.
3. Click **+ Add IP Address**.
4. Select **ALLOW ACCESS FROM ANYWHERE** (`0.0.0.0/0`) or add Render IP ranges.
5. Confirm that your MongoDB connection string (URI) contains the database names for each service (e.g. `/auth`, `/chat`, `/agent`, `/billing`).

### 1.2 Understanding Redis for Production Deployment

#### 💡 Why can't you use your local Docker Redis (`redis://localhost:6379`) on Render?
- On your laptop, you run Redis in a Docker container at `localhost:6379`.
- When deployed on Render in the cloud, each microservice runs in its own isolated container on different cloud servers. On Render, `localhost` points only to that single service's container (where Node.js is running, not Redis).
- Therefore, your cloud backend needs a cloud-accessible Redis database URL (`REDIS_URL`).

#### You have 2 simple options on Render:

* **Option A: Render Redis (Automatic — Zero Extra Setup)**
  - Render allows you to launch a Redis instance directly inside Render with 1 click.
  - **If you use our Blueprint (`render.yaml`)**, Render **automatically creates a Redis instance** called `mulgents-redis` and wires `REDIS_URL=redis://mulgents-redis:6379` into your services automatically. **You do NOT need to set up anything extra!**

* **Option B: Upstash Redis (Free Managed Serverless Redis)**
  - If you want a free 24/7 cloud Redis database that never sleeps, create a free account on [Upstash Redis](https://upstash.com/).
  - Create a Redis database with 1 click on Upstash.
  - Copy the provided `REDIS_URL` connection string (looks like `rediss://default:password@xxx.upstash.io:6379`).
  - Paste this `REDIS_URL` in your Render Environment Variables for `mulgents-gateway` and `mulgents-auth-service`.

### 1.3 Ensure Repository is Pushed to GitHub / GitLab
Make sure your latest code including the `backend/` directory and Dockerfiles is committed and pushed to your git provider.

---

## ⚡ Step 2: Deployment Methods on Render

You can deploy the backend using **Option A (Render Blueprint - Recommended)** or **Option B (Manual Dashboard Setup)**.

---

### Option A: One-Click Automated Deployment using Render Blueprint (Recommended)

Render Blueprints allow you to deploy all services, private networking, and Redis at once using Infrastructure-as-Code via `backend/render.yaml`.

#### Step-by-Step Blueprint Deployment:
1. Log into your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** at the top right and select **Blueprint**.
3. Connect your GitHub/GitLab repository containing your project.
4. Render will detect the `backend/render.yaml` blueprint file. Specify the blueprint path if prompted (`backend/render.yaml`).
5. Render will show a list of resources to create:
   - `mulgents-gateway` (Web Service)
   - `mulgents-auth-service` (Private Service)
   - `mulgents-chat-service` (Private Service)
   - `mulgents-agent-service` (Private Service)
   - `mulgents-billing-service` (Private Service)
   - `mulgents-redis` (Redis)
6. Fill in the required **Environment Variables** (MongoDB URLs, API keys) prompted on screen.
7. Click **Apply**. Render will automatically build Docker containers and wire all internal URLs!

---

### Option B: Manual UI Deployment Step-by-Step

If you prefer creating services manually through the Render Web Interface:

#### 1. Create Internal Redis Instance
1. Click **New +** -> **Redis**.
2. Name: `mulgents-redis`.
3. Select Plan: **Free**.
4. Once created, copy the **Internal Redis URL** (`redis://mulgents-redis:6379`).

#### 2. Deploy Microservices (Private Services)
Create each microservice as a **Private Service** (so they are hidden from the internet and only accessible by the Gateway):

| Service Name | Service Type | Root Directory | Dockerfile Path | Internal Port |
| :--- | :--- | :--- | :--- | :--- |
| `mulgents-auth-service` | Private Service | `backend` | `services/auth/Dockerfile` | `8001` |
| `mulgents-chat-service` | Private Service | `backend` | `services/chat/Dockerfile` | `8002` |
| `mulgents-agent-service` | Private Service | `backend` | `services/agent/Dockerfile` | `8003` |
| `mulgents-billing-service` | Private Service | `backend` | `services/billing/Dockerfile` | `8004` |

**Steps for each Private Service:**
1. Click **New +** -> **Private Service**.
2. Connect your repository.
3. Set **Root Directory** to `backend`.
4. Runtime: **Docker**.
5. Set **Dockerfile Path** to `services/<service-name>/Dockerfile`.
6. Add Environment Variables (see Environment Variables Reference below).
7. Click **Create Private Service**.
8. Note down the Internal Hostname generated by Render (e.g. `http://mulgents-auth-service:8001` or `http://mulgents-auth-service.onrender.com`).

#### 3. Deploy API Gateway (Public Web Service)
1. Click **New +** -> **Web Service**.
2. Connect your repository.
3. Name: `mulgents-gateway`.
4. Set **Root Directory** to `backend`.
5. Runtime: **Docker**.
6. Set **Dockerfile Path** to `gateway/Dockerfile`.
7. Set Environment Variables:
   - `PORT`: `8000`
   - `REDIS_URL`: `redis://mulgents-redis:6379` (or your Upstash URL)
   - `AUTH_SERVICE`: `http://mulgents-auth-service:8001`
   - `CHAT_SERVICE`: `http://mulgents-chat-service:8002`
   - `AGENT_SERVICE`: `http://mulgents-agent-service:8003`
   - `BILLING_SERVICE`: `http://mulgents-billing-service:8004`
8. Click **Create Web Service**.
9. Render will assign a public HTTPS URL (e.g., `https://mulgents-gateway.onrender.com`).

---

## 🔑 Step 3: Environment Variables Reference Table

Set these variables in the Render Dashboard for each respective service:

### 1. `mulgents-gateway` (Web Service)
```env
PORT=8000
REDIS_URL=redis://<redis-host>:6379
AUTH_SERVICE=http://mulgents-auth-service:8001
CHAT_SERVICE=http://mulgents-chat-service:8002
AGENT_SERVICE=http://mulgents-agent-service:8003
BILLING_SERVICE=http://mulgents-billing-service:8004
```

### 2. `mulgents-auth-service` (Private Service)
```env
PORT=8001
MONGODB_URL=mongodb+srv://<user>:<password>@cluster0.mongodb.net/auth?retryWrites=true&w=majority
FRONTEND_URL=https://your-frontend-domain.vercel.app
REDIS_URL=redis://<redis-host>:6379
```

### 3. `mulgents-chat-service` (Private Service)
```env
PORT=8002
MONGODB_URL=mongodb+srv://<user>:<password>@cluster0.mongodb.net/chat?retryWrites=true&w=majority
```

### 4. `mulgents-agent-service` (Private Service)
```env
PORT=8003
MONGODB_URL=mongodb+srv://<user>:<password>@cluster0.mongodb.net/agent?retryWrites=true&w=majority
GOOGLE_API_KEY=your_google_gemini_api_key
GROQ_API_KEY=your_groq_api_key
TAVILY_API_KEY=your_tavily_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_api_key
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=ap-south-1
AWS_BUCKET_NAME=your_s3_bucket_name
CHAT_SERVICE=http://mulgents-chat-service:8002
AUTH_SERVICE=http://mulgents-auth-service:8001
GATEWAY_URL=https://mulgents-gateway.onrender.com
```

### 5. `mulgents-billing-service` (Private Service)
```env
PORT=8004
MONGODB_URL=mongodb+srv://<user>:<password>@cluster0.mongodb.net/billing?retryWrites=true&w=majority
AUTH_SERVICE=http://mulgents-auth-service:8001
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

---

## 🌐 Step 4: Connecting Vercel Frontend to Render Backend

Now that the backend Gateway is deployed on Render (`https://mulgents-gateway.onrender.com`), update your Vercel deployment:

1. Log into [Vercel Dashboard](https://vercel.com/).
2. Select your **mulgentsAi Frontend** project.
3. Go to **Settings** -> **Environment Variables**.
4. Add / Update `VITE_SERVER_URL`:
   - **Key**: `VITE_SERVER_URL`
   - **Value**: `https://mulgents-gateway.onrender.com` (Replace with your exact Gateway URL from Render).
5. Go to **Deployments** tab -> Click on the latest deployment -> Click **Redeploy** (without cache) so the new environment variable takes effect in the client bundle.

---

## ✅ Step 5: Verification & Testing

1. **Gateway Health Check**:
   Open `https://mulgents-gateway.onrender.com/` in your browser. You should see:
   ```json
   {
     "service": "gateway",
     "status": "ok"
   }
   ```
2. **Frontend Integration Test**:
   - Open your Vercel app URL.
   - Test Login / Signup (Auth Service through Gateway).
   - Test Chat & AI Agent execution (Chat & Agent Services through Gateway).
   - Check browser developer tools Console / Network tab to verify API calls point to `https://mulgents-gateway.onrender.com`.

---

## 🛠️ Step 6: Troubleshooting & Best Practices

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **504 Gateway Timeout / Initial Delay** | Render Free Instance Spin-Down (Cold Start) | Free tier instances sleep after 15 mins of inactivity. First request takes 30-50s to wake up. Upgrade to Starter tier ($7/mo) or use a heartbeat ping service (Cron/UptimeRobot). |
| **CORS Errors in Browser** | Gateway origin blocking Vercel domain | In Gateway `index.js`, CORS is configured to allow requests. Ensure `credentials: true` and helmet COP policies match. |
| **MongoNetworkTimeoutError** | IP Whitelist blocking Render | Ensure `0.0.0.0/0` is added to MongoDB Atlas Network Access rules. |
| **Docker Build Failed on Render** | Incorrect build context | Ensure **Root Directory** is set to `backend` in Render settings when pointing to `services/<service>/Dockerfile`. |

---
*Created for mulgentsAi System Architecture.*
