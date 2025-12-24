import { useState } from 'react';
import { Box, Flex, Heading, Badge, Alert, AlertIcon, CloseButton } from '@chakra-ui/react';
import { MessageList } from './MessageList';
import { InputBox } from './InputBox';
import type {Message} from './types';
import { agentService } from '../../services/agentService';

export function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string>();
    const [error, setError] = useState<string | null>(null);

    const handleSendMessage = async (content: string) => {
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
            const response = await agentService.invokeAgent({
                prompt: content,
                sessionId,
            });

            // Update session ID if provided
            if (response.sessionId) {
                setSessionId(response.sessionId);
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

    return (
        <Flex direction="column" h="calc(100vh - 60px)" maxW="1400px" mx="auto" bg="white">
            <Flex px={8} py={5} borderBottom="1px" borderColor="gray.200" justify="space-between" align="center" bg="gray.50">
                <Heading size="lg">AgentCore Chat</Heading>
                {sessionId && (
                    <Badge colorScheme="blue" fontSize="xs" px={3} py={1} borderRadius="full">
                        Session: {sessionId.substring(0, 8)}...
                    </Badge>
                )}
            </Flex>

            {error && (
                <Alert status="error">
                    <AlertIcon />
                    <Box flex="1">{error}</Box>
                    <CloseButton onClick={() => setError(null)} />
                </Alert>
            )}

            <MessageList messages={messages} />
            <InputBox onSend={handleSendMessage} disabled={isLoading} />
        </Flex>
    );
}
