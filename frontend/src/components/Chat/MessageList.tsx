import { useEffect, useRef } from 'react';
import { Box, Flex, Text, Heading, Spinner, VStack } from '@chakra-ui/react';
import type {Message} from './types';

interface MessageListProps {
    messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <VStack 
            flex="1" 
            gap={5} 
            px={{ base: 4, md: 6, lg: 8 }} 
            py={6} 
            overflow="auto" 
            maxW="900px" 
            mx="auto" 
            w="full" 
            align="stretch"
        >
            {messages.length === 0 ? (
                <Flex direction="column" align="center" justify="center" h="full" textAlign="center">
                    <Heading size="md" color="gray.600" mb={2}>Welcome to AgentCore Chat</Heading>
                    <Text color="gray.500" fontSize="sm">
                        Start a conversation with your AI agent by typing a message below.
                    </Text>
                </Flex>
            ) : (
                messages.map((message) => (
                    <Flex
                        key={message.id}
                        justify={message.role === 'user' ? 'flex-end' : 'flex-start'}
                    >
                        <Box
                            maxW="75%"
                            px={4}
                            py={3}
                            borderRadius="lg"
                            bg={message.role === 'user' ? 'blue.500' : 'gray.100'}
                            color={message.role === 'user' ? 'white' : 'gray.800'}
                        >
                            <Flex justify="space-between" align="center" mb={2} gap={4}>
                                <Text fontSize="xs" fontWeight="600">
                                    {message.role === 'user' ? 'You' : 'Agent'}
                                </Text>
                                <Text fontSize="xs" opacity={0.7}>
                                    {message.timestamp.toLocaleTimeString()}
                                </Text>
                            </Flex>
                            <Text fontSize="sm" whiteSpace="pre-wrap" wordBreak="break-word">
                                {message.isLoading ? (
                                    <Spinner size="sm" />
                                ) : (
                                    message.content
                                )}
                            </Text>
                        </Box>
                    </Flex>
                ))
            )}
            <div ref={messagesEndRef} />
        </VStack>
    );
}
