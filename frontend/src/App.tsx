import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Flex, Text, Button } from '@chakra-ui/react';
import awsConfig from './config/aws-config';
import { ChatInterface } from './components/Chat/ChatInterface';

// Configure Amplify
Amplify.configure(awsConfig);

function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <Flex direction="column" h="100vh" bg="gray.50">
          <Flex
            px={6}
            py={3}
            bg="white"
            borderBottom="1px"
            borderColor="gray.200"
            justify="space-between"
            align="center"
          >
            <Text fontSize="sm" color="gray.600">
              Welcome, {user?.signInDetails?.loginId}
            </Text>
            <Button onClick={signOut} size="sm" variant="ghost" colorScheme="blue">
              Sign Out
            </Button>
          </Flex>
          <ChatInterface />
        </Flex>
      )}
    </Authenticator>
  );
}

export default App;
