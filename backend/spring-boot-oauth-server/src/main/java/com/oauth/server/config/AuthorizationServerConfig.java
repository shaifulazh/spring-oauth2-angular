package com.oauth.server.config;

import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.oidc.OidcScopes;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.authorization.client.InMemoryRegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.config.annotation.web.configuration.OAuth2AuthorizationServerConfiguration;
import org.springframework.security.oauth2.server.authorization.config.annotation.web.configurers.OAuth2AuthorizationServerConfigurer;
import org.springframework.security.oauth2.server.authorization.settings.AuthorizationServerSettings;
import org.springframework.security.oauth2.server.authorization.settings.ClientSettings;
import org.springframework.security.oauth2.server.authorization.settings.TokenSettings;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.security.web.util.matcher.MediaTypeRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import org.springframework.security.oauth2.server.authorization.InMemoryOAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class AuthorizationServerConfig {

    private final UserDetailsService userDetailsService;

    // ─────────────────────────────────────────────────────────────────
    // 1. Authorization Server Security Filter Chain  (highest priority)
    // ─────────────────────────────────────────────────────────────────
    @Bean
    @Order(1)
    public SecurityFilterChain authorizationServerSecurityFilterChain(HttpSecurity http)
            throws Exception {

        OAuth2AuthorizationServerConfiguration.applyDefaultSecurity(http);

        http.getConfigurer(OAuth2AuthorizationServerConfigurer.class)
                .oidc(Customizer.withDefaults()); // Enable OpenID Connect 1.0

        http
                // Redirect to login page when not authenticated from the authorization endpoint
                .exceptionHandling(exceptions -> exceptions
                        .defaultAuthenticationEntryPointFor(
                                new LoginUrlAuthenticationEntryPoint("/login"),
                                new MediaTypeRequestMatcher(MediaType.TEXT_HTML)
                        )
                )
                // Accept access tokens for User Info and/or Client Registration
                .oauth2ResourceServer(rs -> rs.jwt(Customizer.withDefaults()))
                .cors(cors -> cors.configurationSource(corsConfigurationSource()));

        return http.build();
    }

    // ─────────────────────────────────────────────────────────────────
    // 2. Default Security Filter Chain  (form login + resource server)
    // ─────────────────────────────────────────────────────────────────
    @Bean
    @Order(2)
    public SecurityFilterChain defaultSecurityFilterChain(HttpSecurity http)
            throws Exception {

        // Use CookieCsrfTokenRepository so Thymeleaf can read the token from the
        // request attribute AND the cookie is available for SPA clients if needed.
        CsrfTokenRequestAttributeHandler csrfRequestHandler = new CsrfTokenRequestAttributeHandler();

        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // ── CSRF: keep it ENABLED for form login ──────────────────────
                // Only ignore stateless /api/** endpoints (JWT-protected, no session).
                .csrf(csrf -> csrf
                        .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                        .csrfTokenRequestHandler(csrfRequestHandler)
                        .ignoringRequestMatchers(
                                new AntPathRequestMatcher("/api/**"),
                                new AntPathRequestMatcher("/oauth2/**"),  // handled by chain 1
                                new AntPathRequestMatcher("/logout")      // SPA posts here without CSRF cookie
                        )
                )

                .authorizeHttpRequests(auth -> auth
                        // ── Static resources must be permitted BEFORE anyRequest ──
                        .requestMatchers(
                                "/css/**",
                                "/js/**",
                                "/images/**",
                                "/favicon.ico",
                                "/webjars/**"
                        ).permitAll()
                        // ── Public endpoints ──────────────────────────────────────
                        .requestMatchers(
                                "/login",
                                "/error",
                                "/actuator/health",
                                "/api/auth/register"
                        ).permitAll()
                        // ── Protected API — JWT required ──────────────────────────
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().authenticated()
                )

                // Spring form-based login for the authorization endpoint redirect
                .formLogin(form -> form
                        .loginPage("/login")
                        .permitAll()
                )

                // ── Logout ────────────────────────────────────────────────────
                // POST /logout invalidates the server session, clears cookies,
                // and redirects to /login?logout.
                // Angular calls POST /api/auth/logout first (OAuth2 token revocation),
                // then triggers this endpoint to clean up the server-side session.
                .logout(logout -> logout
                        .logoutUrl("/logout")
                        .logoutSuccessUrl("/login?logout")
                        .invalidateHttpSession(true)
                        .clearAuthentication(true)
                        .deleteCookies("JSESSIONID", "XSRF-TOKEN")
                        .permitAll()
                )

                // Protect /api/** endpoints as a Resource Server (JWT validation)
                .oauth2ResourceServer(rs -> rs.jwt(Customizer.withDefaults()));

        return http.build();
    }

    // ─────────────────────────────────────────────────────────────────
    // 3. Registered OAuth2 Client (the Angular SPA)
    // ─────────────────────────────────────────────────────────────────
    @Bean
    public RegisteredClientRepository registeredClientRepository() {
        RegisteredClient angularClient = RegisteredClient
                .withId(UUID.randomUUID().toString())
                .clientId("angular-client")
                // Public client: no secret (PKCE only)
                .clientAuthenticationMethod(ClientAuthenticationMethod.NONE)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .authorizationGrantType(AuthorizationGrantType.REFRESH_TOKEN)
                // Angular dev server redirect URIs
                .redirectUri("http://localhost:4200/callback")
                .redirectUri("http://localhost:4200/silent-refresh.html")
                // Allowed post-logout redirect URIs
                // The AS validates post_logout_redirect_uri strictly — exact match only.
                // Angular redirects to /logout-callback after the AS clears its session.
                .postLogoutRedirectUri("http://localhost:4200/logout-callback")
                .scope(OidcScopes.OPENID)
                .scope(OidcScopes.PROFILE)
                .scope(OidcScopes.EMAIL)
                .scope("read")
                .scope("write")
                .clientSettings(ClientSettings.builder()
                        .requireAuthorizationConsent(false)    // show consent screen
                        .requireProofKey(true)                // enforce PKCE
                        .build())
                .tokenSettings(TokenSettings.builder()
                        .accessTokenTimeToLive(Duration.ofMinutes(30))
                        .refreshTokenTimeToLive(Duration.ofDays(1))
                        .reuseRefreshTokens(false)
                        .build())
                .build();

        return new InMemoryRegisteredClientRepository(angularClient);
    }

    // ─────────────────────────────────────────────────────────────────
    // 4. Authorization Server global settings
    // ─────────────────────────────────────────────────────────────────
    @Bean
    public AuthorizationServerSettings authorizationServerSettings() {
        return AuthorizationServerSettings.builder()
                .issuer("http://localhost:9000")
                .build();
    }

    // ─────────────────────────────────────────────────────────────────
    // 5. OAuth2 Authorization Service — stores active authorizations/tokens.
    //    InMemoryOAuth2AuthorizationService is fine for dev/single-node.
    //    In production swap for JdbcOAuth2AuthorizationService.
    // ─────────────────────────────────────────────────────────────────
    @Bean
    public OAuth2AuthorizationService authorizationService() {
        return new InMemoryOAuth2AuthorizationService();
    }

    // ─────────────────────────────────────────────────────────────────
    // 6. JWT Decoder (delegates to JWKSource bean from JwkConfig)
    // ─────────────────────────────────────────────────────────────────
    @Bean
    public JwtDecoder jwtDecoder(JWKSource<SecurityContext> jwkSource) {
        return OAuth2AuthorizationServerConfiguration.jwtDecoder(jwkSource);
    }

    // ─────────────────────────────────────────────────────────────────
    // 8. Password encoder (BCrypt)
    // ─────────────────────────────────────────────────────────────────
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    // ─────────────────────────────────────────────────────────────────
    // 9. Authentication Manager
    // ─────────────────────────────────────────────────────────────────
    @Bean
    public AuthenticationManager authenticationManager() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return new ProviderManager(provider);
    }

    // ─────────────────────────────────────────────────────────────────
    // 10. CORS — allow Angular dev server to call the backend
    // ─────────────────────────────────────────────────────────────────
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:4200"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
