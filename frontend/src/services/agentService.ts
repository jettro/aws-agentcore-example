import {fetchAuthSession} from 'aws-amplify/auth';
import {apiConfig} from '../config/aws-config';

export interface InvokeRequest {
    prompt: string;
    sessionId?: string;
}

export interface InvokeResponse {
    response: string;
    sessionId: string;
    userId: string;
}

export interface ErrorResponse {
    message: string;
    error: string;
    status: number;
}

class AgentService {
    private async getAuthToken(): Promise<string> {
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.accessToken?.toString();
            
            if (!token) {
                throw new Error('No access token available');
            }
            
            return token;
        } catch (error) {
            console.error('Failed to get auth token:', error);
            throw new Error('Authentication required');
        }
    }

    async invokeAgent(request: InvokeRequest): Promise<InvokeResponse> {
        try {
            const token = await this.getAuthToken();
            
            console.log('=== AgentService HTTP Request ===');
            console.log('Endpoint:', `${apiConfig.endpoint}/agent/invoke`);
            console.log('Request body:', JSON.stringify(request, null, 2));
            console.log('Has sessionId:', !!request.sessionId);
            
            const response = await fetch(`${apiConfig.endpoint}/agent/invoke`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                const errorData: ErrorResponse = await response.json();
                console.error('Agent invocation failed:', errorData);
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const responseData = await response.json();
            console.log('=== AgentService HTTP Response ===');
            console.log('Response:', JSON.stringify(responseData, null, 2));
            return responseData;
        } catch (error) {
            console.error('Error invoking agent:', error);
            throw error;
        }
    }
}

export const agentService = new AgentService();
