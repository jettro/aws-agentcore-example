# Frontend - React + Vite + AWS Amplify

React-based frontend for the AgentCore chat application with AWS Amplify UI for authentication.

## Technology Stack

- **React 18** with TypeScript
- **Vite** for fast development and building  
- **AWS Amplify** for authentication
- **AWS Amplify UI** for pre-built auth components
- **Fetch API** for HTTP requests with bearer token authentication

## Features

- ✅ AWS Cognito authentication with Amplify UI
- ✅ Secure token management (automatic refresh)
- ✅ Chat interface with real-time message updates
- ✅ Loading states and error handling
- ✅ Session management
- ✅ Responsive design
- ✅ Sign out functionality

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the template and fill in your values:

```bash
cp .env.local.template .env.local
```

Then get configuration values from CDK outputs and update `.env.local`.

## Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## License

Part of aws-agentcore-example project.
