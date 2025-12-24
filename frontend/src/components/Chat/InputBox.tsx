import { useState, type KeyboardEvent } from 'react';
import { Flex, Textarea, Button } from '@chakra-ui/react';
import { FiSend } from 'react-icons/fi';

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
        <Flex
            px={8}
            py={6}
            borderTop="1px"
            borderColor="gray.200"
            gap={3}
            bg="white"
            maxW="1000px"
            mx="auto"
            w="full"
        >
            <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                isDisabled={disabled}
                rows={3}
                resize="none"
                flex="1"
                borderRadius="md"
            />
            <Button
                colorScheme="blue"
                onClick={handleSend}
                isDisabled={disabled || !input.trim()}
                size="lg"
                rightIcon={<FiSend />}
            >
                Send
            </Button>
        </Flex>
    );
}
