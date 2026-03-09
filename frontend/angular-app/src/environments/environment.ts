// src/environments/environment.ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:9000',
  oauth: {
    clientId: 'angular-client',
    redirectUri: 'http://localhost:4200/callback',
    scope: 'openid profile email read write',
    authorizationEndpoint: 'http://localhost:9000/oauth2/authorize',
    tokenEndpoint: 'http://localhost:9000/oauth2/token',
    endSessionEndpoint:    'http://localhost:9000/connect/logout',
    // MUST exactly match one of the postLogoutRedirectUri values
    // registered in RegisteredClient on the backend.
    postLogoutRedirectUri: 'http://localhost:4200/logout-callback',
  }
};
