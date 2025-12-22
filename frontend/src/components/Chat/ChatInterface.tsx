import { useState } from 'react';
import { MessageList } from './MessageList';
import { InputBox } from './InputBox';
import { Message } from './types';
import { agentService } from '../../services/agentService';
import './ChatInterface.css';

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
        <div className="chat-interface">
            <div className="chat-header">
                <h1>AgentCore Chat</h1>
                {sessionId && (
                    <span className="session-id">Session: {sessionId.substring(0, 8)}...</span>
                )}
            </div>

            {error && (
                <div className="error-banner">
                    {error}
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            <MessageList messages={messages} />
            <InputBox onSend={handleSendMessage} disabled={isLoading} />
        </div>
    );
}
