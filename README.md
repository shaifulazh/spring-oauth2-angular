# OAuth2 Full-Stack Application
### Spring Boot 3.5 Authorization + Resource Server · Angular 21 SPA

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER (Angular SPA)                        │
│  ┌──────────┐  ┌─────────────┐  ┌───────────┐  ┌────────────────┐  │
│  │  Login   │  │  Callback   │  │ Dashboard │  │    Profile     │  │
│  │   Page   │  │  Component  │  │   Page    │  │     Page       │  │
│  └─────┬────┘  └──────┬──────┘  └─────┬─────┘  └───────┬────────┘  │
│        │              │               │                  │           │
│  ┌─────▼──────────────▼───────────────▼──────────────────▼────────┐ │
│  │            AuthService · ApiService · AuthInterceptor            │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬──────────────────────────┬──────────────┘
                             │  ①  /oauth2/authorize    │  ④  Bearer JWT
                             │  ③  /oauth2/token        │
                             ▼                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│              SPRING BOOT APPLICATION  (port 9000)                    │
│                                                                      │
│  ┌──────────────────────────────────────────┐                        │
│  │        AUTHORIZATION SERVER              │                        │
│  │  • /oauth2/authorize  (redirect + login) │                        │
│  │  • /oauth2/token      (code → JWT)       │                        │
│  │  • /oauth2/jwks       (public keys)      │                        │
│  │  • RSA-signed JWT access tokens          │                        │
│  │  • PKCE enforcement (no client secret)   │                        │
│  └──────────────────────────────────────────┘                        │
│                                                                      │
│  ┌──────────────────────────────────────────┐                        │
│  │         RESOURCE SERVER                  │                        │
│  │  • Validates JWT via /oauth2/jwks        │                        │
│  │  • GET  /api/profile   (authenticated)   │                        │
│  │  • GET  /api/products  (authenticated)   │                        │
│  │  • POST /api/products  (ROLE_ADMIN)      │                        │
│  └──────────────────────────────────────────┘                        │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │  Spring Data JPA → MySQL 8  (users, roles, products)        │     │
│  └─────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

## OAuth2 Authorization Code + PKCE Flow

```
Angular               Auth Server              Resource Server
   │                      │                          │
   │  ① GET /oauth2/authorize?                        │
   │      response_type=code                          │
   │      client_id=angular-client                   │
   │      code_challenge=<S256>        ──────────►   │
   │      state=<random>                              │
   │                      │                          │
   │  ② User logs in (Spring form login)             │
   │                      │                          │
   │  ◄── 302 redirect to /callback?code=XXX         │
   │                      │                          │
   │  ③ POST /oauth2/token                           │
   │      code=XXX                     ──────────►   │
   │      code_verifier=<original>                   │
   │      grant_type=authorization_code              │
   │                                                 │
   │  ◄── { access_token (JWT), refresh_token }      │
   │                                                 │
   │  ④ GET /api/profile                             │
   │      Authorization: Bearer <JWT>  ──────────────►
   │                                                 │  validate JWT
   │                                                 │  via /jwks
   │  ◄────────────────── { profile data } ◄─────────│
```

---

## Project Structure

```
project/
├── backend/
│   └── spring-boot-oauth-server/
│       ├── pom.xml
│       └── src/main/
│           ├── java/com/oauth/server/
│           │   ├── OAuthServerApplication.java
│           │   ├── config/
│           │   │   ├── AuthorizationServerConfig.java   ← CORE security config
│           │   │   ├── JwkConfig.java                   ← RSA key pair / JWK
│           │   │   └── DataInitializer.java             ← seeds DB on startup
│           │   ├── controller/
│           │   │   ├── AuthController.java              ← POST /api/auth/register
│           │   │   ├── ProfileController.java           ← GET  /api/profile
│           │   │   └── ProductController.java           ← GET/POST /api/products
│           │   ├── service/
│           │   │   ├── CustomUserDetailsService.java
│           │   │   ├── UserService.java
│           │   │   └── ProductService.java
│           │   ├── repository/
│           │   │   ├── UserRepository.java
│           │   │   └── ProductRepository.java
│           │   ├── entity/
│           │   │   ├── User.java
│           │   │   └── Product.java
│           │   ├── dto/
│           │   │   ├── UserRegistrationRequest.java
│           │   │   ├── ProductRequest.java
│           │   │   └── ProfileResponse.java
│           │   └── security/
│           │       └── GlobalExceptionHandler.java
│           └── resources/
│               └── application.yml
│
├── frontend/
│   └── angular-app/
│       ├── angular.json
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── main.ts
│           ├── index.html
│           ├── styles.css
│           ├── environments/
│           │   └── environment.ts
│           └── app/
│               ├── app.component.ts
│               ├── app.config.ts
│               ├── app.routes.ts
│               ├── models/
│               │   ├── auth.model.ts
│               │   └── product.model.ts
│               ├── services/
│               │   ├── auth.service.ts        ← OAuth2 PKCE flow + token mgmt
│               │   ├── api.service.ts         ← protected API calls
│               │   └── pkce.service.ts        ← PKCE code_verifier/challenge
│               ├── interceptors/
│               │   └── auth.interceptor.ts    ← injects Bearer token
│               ├── guards/
│               │   └── auth.guard.ts
│               └── pages/
│                   ├── login/login.component.ts
│                   ├── callback/callback.component.ts
│                   ├── dashboard/dashboard.component.ts
│                   └── profile/profile.component.ts
│
└── database/
    └── schema.sql
```

---

## Prerequisites

| Tool       | Version  |
|------------|----------|
| Java       | 21+      |
| Maven      | 3.9+     |
| Node.js    | 20+      |
| npm        | 10+      |
| MySQL      | 8.0+     |

---

## Running Locally

### Step 1: MySQL setup

```bash
# Start MySQL and create the database
mysql -u root -p < database/schema.sql

# OR let Spring create it automatically (createDatabaseIfNotExist=true in application.yml)
```

Update credentials in `backend/spring-boot-oauth-server/src/main/resources/application.yml`:

```yaml
spring:
  datasource:
    username: root
    password: your_password_here
```

### Step 2: Start the Backend

```bash
cd backend/spring-boot-oauth-server
mvn spring-boot:run
```

The backend starts on **http://localhost:9000**

On first startup `DataInitializer` seeds:
- **admin** / `Admin@1234` (roles: ADMIN, USER)
- **john**  / `User@1234`  (roles: USER)

### Step 3: Start the Angular Frontend

```bash
cd frontend/angular-app
npm install
npm start
```

The Angular app starts on **http://localhost:4200**

### Step 4: Test the OAuth2 flow

1. Open **http://localhost:4200**
2. Click **"Sign in with OAuth2"**
3. You are redirected to the Spring login page at `http://localhost:9000/login`
4. Enter credentials: `admin` / `Admin@1234`
5. Accept the consent screen
6. You are redirected back to Angular at `/callback`
7. The Angular app exchanges the code for a JWT and navigates to `/dashboard`
8. Browse **Dashboard** (calls `GET /api/products`) and **Profile** (calls `GET /api/profile`)

---

## API Reference

All endpoints below require `Authorization: Bearer <access_token>` except where noted.

| Method | Endpoint              | Auth Required | Role     | Description              |
|--------|-----------------------|---------------|----------|--------------------------|
| POST   | /api/auth/register    | No            | —        | Register a new user      |
| GET    | /api/profile          | Yes (JWT)     | USER     | Get current user profile |
| GET    | /api/products         | Yes (JWT)     | USER     | List all products        |
| GET    | /api/products/{id}    | Yes (JWT)     | USER     | Get product by ID        |
| POST   | /api/products         | Yes (JWT)     | ADMIN    | Create a product         |
| PUT    | /api/products/{id}    | Yes (JWT)     | ADMIN    | Update a product         |
| DELETE | /api/products/{id}    | Yes (JWT)     | ADMIN    | Delete a product         |

### OAuth2 Endpoints (Authorization Server)

| Endpoint               | Description                            |
|------------------------|----------------------------------------|
| GET  /oauth2/authorize | Begin authorization code flow          |
| POST /oauth2/token     | Exchange code for tokens               |
| GET  /oauth2/jwks      | JSON Web Key Set (public keys)         |
| GET  /.well-known/openid-configuration | OIDC discovery document |

---

## Security Design Decisions

### Why PKCE?
Angular runs in the browser as a **public client** — it cannot safely store a client secret. PKCE (Proof Key for Code Exchange) replaces the secret with a cryptographic challenge/verifier pair, preventing authorization code interception attacks.

### Token Storage
Access tokens are held **in-memory only** (JavaScript variable) — never in `localStorage` or `sessionStorage` — eliminating XSS-based token theft.

### RSA Key Pair
The JWT signing key is generated at startup. For production, replace `JwkConfig.java` with a Vault or KMS integration so keys survive restarts and scale across multiple instances.

### BCrypt (cost=12)
Password hashing uses BCrypt with a work factor of 12, appropriate for production throughput vs. security trade-off.

---

## Configuration Reference

### Backend: `application.yml`

```yaml
server:
  port: 9000

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/oauth2_db?createDatabaseIfNotExist=true&...
    username: root
    password: rootpassword

  security:
    oauth2:
      authorizationserver:
        issuer: http://localhost:9000   # MUST match Angular environment.ts
```

### Frontend: `src/environments/environment.ts`

```typescript
export const environment = {
  apiBaseUrl: 'http://localhost:9000',
  oauth: {
    clientId: 'angular-client',        // MUST match RegisteredClient in backend
    redirectUri: 'http://localhost:4200/callback',
    scope: 'openid profile email read write',
    authorizationEndpoint: 'http://localhost:9000/oauth2/authorize',
    tokenEndpoint: 'http://localhost:9000/oauth2/token',
  }
};
```

---

## Production Checklist

- [ ] Replace in-memory `InMemoryRegisteredClientRepository` with `JdbcRegisteredClientRepository`
- [ ] Replace in-memory RSA key generation with Vault/KMS persistent keys
- [ ] Enable HTTPS — JWT validation requires matching `issuer` URI
- [ ] Set `spring.jpa.hibernate.ddl-auto=validate` (use Flyway/Liquibase)
- [ ] Externalize DB credentials via environment variables or Secrets Manager
- [ ] Update CORS allowed origins to production Angular domain
- [ ] Set `requireAuthorizationConsent=false` for seamless SSO in internal apps
- [ ] Configure token TTLs appropriate for your security posture
- [ ] Enable audit logging for authorization events
