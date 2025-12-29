import { Box, Flex, Text, IconButton, Tooltip } from '@chakra-ui/react';
import { CloseIcon } from '@chakra-ui/icons';

interface SessionIdProps {
    sessionId?: string;
    onClear: () => void;
}

export function SessionId({ sessionId, onClear }: SessionIdProps) {
    if (!sessionId) {
        return (
            <Box
                px={{ base: 2, md: 4 }}
                py={2}
                bg="gray.100"
                borderRadius="md"
                border="1px"
                borderColor="gray.300"
            >
                <Text fontSize={{ base: "xs", md: "sm" }} color="gray.500">
                    No session
                </Text>
            </Box>
        );
    }

    return (
        <Box
            px={{ base: 2, md: 4 }}
            py={2}
            bg="blue.50"
            borderRadius="md"
            border="1px"
            borderColor="blue.200"
            maxW={{ base: "200px", md: "300px", lg: "400px" }}
        >
            <Flex align="center" justify="space-between" gap={2}>
                <Box flex="1" minW={0}>
                    <Text fontSize="xs" color="gray.600" fontWeight="semibold" mb={1}>
                        Session ID
                    </Text>
                    <Text
                        fontSize="xs"
                        color="gray.800"
                        fontFamily="mono"
                        wordBreak="break-all"
                        lineHeight="1.4"
                        noOfLines={{ base: 1, md: 2 }}
                    >
                        {sessionId}
                    </Text>
                </Box>
                <Tooltip label="Clear session (start new session)">
                    <IconButton
                        aria-label="Clear session"
                        icon={<CloseIcon />}
                        size="xs"
                        colorScheme="blue"
                        variant="ghost"
                        onClick={onClear}
                        flexShrink={0}
                    />
                </Tooltip>
            </Flex>
        </Box>
    );
}
