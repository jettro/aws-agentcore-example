import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import awsConfig from './config/aws-config';
import { ChatInterface } from './components/Chat/ChatInterface';
import './App.css';

// Configure Amplify
Amplify.configure(awsConfig);

function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div className="app">
          <div className="user-info">
            <span>Welcome, {user?.signInDetails?.loginId}</span>
            <button onClick={signOut} className="sign-out-button">
              Sign Out
            </button>
          </div>
          <ChatInterface />
        </div>
      )}
    </Authenticator>
  );
}

export default App;
