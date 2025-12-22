import { useState, KeyboardEvent } from 'react';
import './InputBox.css';

interface InputBoxProps {
    onSend: (message: string) => void;
    disabled?: boolean;
}

export function InputBox({ onSend, disabled = false }: InputBoxProps) {
    const [input, setInput] = useState('');

    const handleSend = () => {
        if (input.trim() && !disabled) {
            onSend(input.trim());
            setInput('');
        }
    };

    const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="input-box">
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                disabled={disabled}
                rows={3}
            />
            <button
                onClick={handleSend}
                disabled={disabled || !input.trim()}
                className="send-button"
            >
                Send
            </button>
        </div>
    );
}
