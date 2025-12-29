import { useState } from 'react';
import { Box, Flex, Heading, Alert, AlertIcon, CloseButton } from '@chakra-ui/react';
import { MessageList } from './MessageList';
import { InputBox } from './InputBox';
import { SessionId } from './SessionId';
import type {Message} from './types';
import { agentService } from '../../services/agentService';

export function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string>();
    const [error, setError] = useState<string | null>(null);

    const handleSendMessage = async (content: string) => {
        console.log('=== Frontend Request Debug ===');
        console.log('Current sessionId:', sessionId || '(none - first message)');
        console.log('Prompt:', content);
        
        // Add user message
        const userMessage: Message = {
            id: `user-${Date.now()}`,
            content,
            role: 'user',
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);
        setError(null);

        // Add loading message
        const loadingMessage: Message = {
            id: `loading-${Date.now()}`,
            content: '',
            role: 'assistant',
            timestamp: new Date(),
            isLoading: true,
        };

        setMessages((prev) => [...prev, loadingMessage]);

        try {
            const request = {
                prompt: content,
                sessionId,
            };
            console.log('Request to backend:', JSON.stringify(request, null, 2));
            
            const response = await agentService.invokeAgent(request);

            // Update session ID if provided
            console.log('Response sessionId:', response.sessionId);
            if (response.sessionId) {
                console.log('Updating sessionId to:', response.sessionId);
                setSessionId(response.sessionId);
            } else {
                console.warn('No sessionId in response!');
            }

            // Replace loading message with actual response
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === loadingMessage.id
                        ? {
                              ...msg,
                              content: response.response,
                              isLoading: false,
                          }
                        : msg
                )
            );
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An error occurred';
            setError(errorMessage);

            // Remove loading message and show error
            setMessages((prev) =>
                prev.filter((msg) => msg.id !== loadingMessage.id)
            );

            // Optionally add error message to chat
            const errorChatMessage: Message = {
                id: `error-${Date.now()}`,
                content: `Error: ${errorMessage}`,
                role: 'assistant',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorChatMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearSession = () => {
        setSessionId(undefined);
    };

    return (
        <Flex direction="column" h="calc(100vh - 60px)" bg="gray.50">
            {/* Header */}
            <Box borderBottom="1px" borderColor="gray.200" bg="white" boxShadow="sm">
                <Flex 
                    maxW="900px" 
                    mx="auto" 
                    px={{ base: 4, md: 6, lg: 8 }} 
                    py={5} 
                    justify="space-between" 
                    align="center"
                >
                    <Heading size={{ base: "md", md: "lg" }}>AgentCore Chat</Heading>
                    <SessionId sessionId={sessionId} onClear={handleClearSession} />
                </Flex>
            </Box>

            {/* Error Alert */}
            {error && (
                <Box maxW="900px" mx="auto" w="full" px={{ base: 4, md: 6, lg: 8 }} pt={4}>
                    <Alert status="error" borderRadius="md">
                        <AlertIcon />
                        <Box flex="1">{error}</Box>
                        <CloseButton onClick={() => setError(null)} />
                    </Alert>
                </Box>
            )}

            {/* Messages */}
            <MessageList messages={messages} />
            
            {/* Input */}
            <Box borderTop="1px" borderColor="gray.200" bg="white" boxShadow="lg">
                <Box maxW="900px" mx="auto" w="full">
                    <InputBox onSend={handleSendMessage} disabled={isLoading} />
                </Box>
            </Box>
        </Flex>
    );
}
