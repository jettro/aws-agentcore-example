import { useEffect, useRef } from 'react';
import { Message } from './types';
import './MessageList.css';

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
        <div className="message-list">
            {messages.length === 0 ? (
                <div className="empty-state">
                    <h2>Welcome to AgentCore Chat</h2>
                    <p>Start a conversation with your AI agent by typing a message below.</p>
                </div>
            ) : (
                messages.map((message) => (
                    <div
                        key={message.id}
                        className={`message ${message.role}`}
                    >
                        <div className="message-header">
                            <span className="message-role">
                                {message.role === 'user' ? 'You' : 'Agent'}
                            </span>
                            <span className="message-time">
                                {message.timestamp.toLocaleTimeString()}
                            </span>
                        </div>
                        <div className="message-content">
                            {message.isLoading ? (
                                <div className="loading-dots">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            ) : (
                                message.content
                            )}
                        </div>
                    </div>
                ))
            )}
            <div ref={messagesEndRef} />
        </div>
    );
}
