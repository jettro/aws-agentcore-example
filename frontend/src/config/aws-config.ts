import { ResourcesConfig } from 'aws-amplify';

// These values should come from environment variables or CDK outputs
const awsConfig: ResourcesConfig = {
    Auth: {
        Cognito: {
            userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
            userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
            loginWith: {
                oauth: {
                    domain: import.meta.env.VITE_COGNITO_DOMAIN || '',
                    scopes: ['openid', 'email', 'profile'],
                    redirectSignIn: [import.meta.env.VITE_APP_URL || 'http://localhost:5173'],
                    redirectSignOut: [import.meta.env.VITE_APP_URL || 'http://localhost:5173'],
                    responseType: 'code',
                },
            },
        },
    },
};

export default awsConfig;

export const apiConfig = {
    endpoint: import.meta.env.VITE_API_ENDPOINT || '',
};
