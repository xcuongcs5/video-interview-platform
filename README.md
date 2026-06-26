# Video Interview Platform

A comprehensive platform designed for conducting technical interviews remotely. It combines real-time video conferencing, a collaborative code editor, live chat, and robust authentication to provide a seamless interview experience for both interviewers and candidates.

## 🚀 Features

- **Real-time Video Conferencing:** High-quality video and audio calls powered by Stream Video.
- **Collaborative Code Editor:** Live coding environment supporting multiple languages using Monaco Editor (VS Code's editor).
- **Real-time Chat:** Instant messaging alongside the video call, powered by Stream Chat.
- **User Authentication:** Secure login and user management handled by Clerk.
- **Real-time Synchronization:** WebSocket integration via Socket.io for live state syncing.
- **Responsive UI:** Modern, responsive design built with React, Tailwind CSS, and DaisyUI.
- **Background Jobs:** Reliable background task processing using Inngest.
- **Database:** MongoDB integration via Mongoose for persistent data storage.

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS v4, DaisyUI
- **Editor:** `@monaco-editor/react`
- **Video & Chat:** `@stream-io/video-react-sdk`, `stream-chat-react`
- **Auth:** Clerk (`@clerk/clerk-react`)
- **State/Data:** React Query, Socket.io-client

### Backend
- **Framework:** Node.js, Express
- **Database:** MongoDB (Mongoose)
- **Sockets:** Socket.io
- **Auth:** Clerk (`@clerk/express`)
- **Video & Chat:** Stream SDKs
- **Background Jobs:** Inngest

---

## 💻 Installation & Setup

### Prerequisites
Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas URL)
- Accounts for [Clerk](https://clerk.com/) and [Stream](https://getstream.io/) to get API keys.

### 1. Clone the repository

```bash
git clone https://github.com/xcuongcs5/video-interview-platform.git
cd video-interview-platform
```

### 2. Install Dependencies

You can install dependencies for both frontend and backend using the root package.json:

```bash
# Installs dependencies for both frontend and backend, and builds the frontend
npm run build
```

*Alternatively, you can install them separately:*
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Environment Variables setup

You will need to create `.env` files in both the `frontend` and `backend` directories.

**Frontend (`frontend/.env`):**
Create a `.env` file in the `frontend` directory and add your public keys:
```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_STREAM_API_KEY=your_stream_api_key
# Add any other required VITE_ variables
```

**Backend (`backend/.env`):**
Create a `.env` file in the `backend` directory and add your secret keys:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
CLERK_SECRET_KEY=your_clerk_secret_key
STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret
# Add any other required backend variables
```

### 4. Running the Application

To run the application locally for development, you need to start both the frontend and backend servers.

**Start the Backend:**
```bash
cd backend
npm run dev
```
*The backend will run on `http://localhost:5000` (or the port specified in your .env).*

**Start the Frontend:**
```bash
cd frontend
npm run dev
```
*The frontend will run on `http://localhost:5173` (Vite's default port).*

## 📄 License

This project is licensed under the ISC License.