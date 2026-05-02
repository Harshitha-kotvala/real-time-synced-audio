# TuneIn - Audio Sync Application

A real-time audio synchronization application that allows multiple users to listen to YouTube videos together simultaneously. Perfect for virtual listening parties, movie nights, or shared music experiences.

## Features

- **Real-time Synchronization**: All participants stay perfectly in sync with the host's playback
- **YouTube Integration**: Seamlessly play any YouTube video in synchronized rooms
- **Room Management**: Create public, private, or invite-only rooms with optional passwords
- **User Authentication**: Secure login system with session management
- **Live Chat**: Real-time messaging between room participants
- **Host Controls**: Designated hosts control video playback, seeking, and video selection
- **Automatic Host Transfer**: If the host leaves, a new host is automatically assigned
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

### Frontend (Client)
- **React 18** - Modern UI framework
- **Vite** - Fast development server and build tool
- **React Router** - Client-side routing
- **Socket.IO Client** - Real-time communication
- **React YouTube** - YouTube player integration

### Backend (Server)
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - Real-time WebSocket communication
- **MongoDB** - Database for user and room data
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing

## Project Structure

```
audio-sync/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── pages/         # Page components
│   │   └── App.jsx        # Main application component
│   ├── package.json       # Frontend dependencies
│   └── vite.config.js     # Vite configuration
├── server/                # Node.js backend application
│   ├── handles/           # Socket event handlers
│   ├── middleware/        # Express middleware
│   ├── models/           # MongoDB data models
│   ├── routes/           # API routes
│   ├── server.js         # Main server file
│   └── package.json      # Backend dependencies
└── README.md             # This file
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local instance or MongoDB Atlas)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd audio-sync
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

### Environment Setup

1. **Server Environment Variables**
   Create `server/.env` file:
   ```env
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/audio-sync
   JWT_SECRET=your-super-secret-jwt-key
   CLIENT_URL=http://localhost:5173
   ```

2. **Client Environment Variables**
   Create `client/.env` file:
   ```env
   VITE_API_URL=http://localhost:3001
   ```

### Running the Application

1. **Start the MongoDB server** (if running locally)
   ```bash
   mongod
   ```

2. **Start the backend server**
   ```bash
   cd server
   npm run dev
   ```

3. **Start the frontend development server**
   ```bash
   cd client
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - Health check: http://localhost:3001/health

## Usage

### Creating an Account
1. Navigate to the application
2. Click on the authentication link
3. Register a new account with username and password

### Creating a Room
1. Log in to your account
2. Click "Create room" tab
3. Choose room privacy (Public/Private)
4. Optionally set a password for private rooms
5. Enable invite-only if required
6. Click "Create room"

### Joining a Room
1. Log in to your account
2. Click "Join room" tab
3. Enter the room code or paste the invite link
4. Provide password if joining a private room
5. Click "Join room"

### Using the Sync Room
- **Host**: Can control playback, change videos, and manage the room
- **Listeners**: Can watch the synchronized video and participate in chat
- **Chat**: All participants can send real-time messages
- **Video Sync**: Playback is automatically synchronized across all users

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user info

### Rooms
- `POST /room/create` - Create new room
- `GET /room/:roomId/exists` - Check if room exists
- `GET /room/my-rooms` - Get user's rooms

### Socket Events
- `join-room` - Join a room
- `play/pause/seek` - Control playback
- `video-change` - Change video
- `chat-message` - Send chat message

## Development Scripts

### Server
```bash
npm start        # Start production server
npm run dev      # Start development server with nodemon
```

### Client
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check the MONGODB_URI in server/.env

2. **CORS Errors**
   - Verify CLIENT_URL in server/.env matches frontend URL
   - Check VITE_API_URL in client/.env matches backend URL

3. **Socket Connection Issues**
   - Ensure both servers are running
   - Check firewall settings
   - Verify WebSocket connections are not blocked

4. **Authentication Issues**
   - Clear browser cookies
   - Check JWT_SECRET is set in server/.env

### Development Tips

- Use browser developer tools to monitor WebSocket connections
- Check server console for real-time connection logs
- Use MongoDB Compass to inspect database state
- Test with multiple browser tabs to simulate multiple users

## Future Enhancements

- [ ] Support for other video platforms (Vimeo, etc.)
- [ ] Room playlists and queue management
- [ ] User profiles and avatars
- [ ] Room moderation tools
- [ ] Mobile app development
- [ ] Screen sharing capabilities
- [ ] Audio-only mode for music listening
