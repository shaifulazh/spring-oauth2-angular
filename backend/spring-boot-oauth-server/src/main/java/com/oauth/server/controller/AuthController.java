package com.oauth.server.controller;

import com.oauth.server.dto.UserRegistrationRequest;
import com.oauth.server.entity.User;
import com.oauth.server.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.authorization.OAuth2Authorization;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.OAuth2TokenType;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final UserService userService;
    private final OAuth2AuthorizationService authorizationService;

    /**
     * POST /api/auth/register — public endpoint to register a new user.
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(
            @Valid @RequestBody UserRegistrationRequest request) {

        User user = userService.registerUser(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of(
                        "message", "User registered successfully",
                        "username", user.getUsername()
                ));
    }

    /**
     * POST /api/auth/logout
     *
     * Called by the Angular SPA before redirecting to the AS end-session endpoint.
     * Responsibilities:
     *  1. Revoke the OAuth2 authorization (access token + refresh token) from the
     *     Authorization Server's token store.
     *  2. Invalidate the server-side HttpSession (if one exists for the user's
     *     browser session from the consent / login flow).
     *  3. Clear the Spring SecurityContext.
     *
     * The client then performs an OIDC RP-Initiated Logout redirect to
     * /oauth2/logout?post_logout_redirect_uri=http://localhost:4200/ which
     * completes the full logout on the AS side.
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            @AuthenticationPrincipal Jwt jwt,
            HttpServletRequest request,
            HttpServletResponse response) {

        if (jwt != null) {
            String tokenValue = jwt.getTokenValue();
            try {
                // Look up the OAuth2Authorization by access token and remove it,
                // which also invalidates the associated refresh token.
                OAuth2Authorization authorization = authorizationService
                        .findByToken(tokenValue, OAuth2TokenType.ACCESS_TOKEN);

                if (authorization != null) {
                    authorizationService.remove(authorization);
                    log.info("Revoked OAuth2 authorization for principal: {}", jwt.getSubject());
                }
            } catch (Exception ex) {
                log.warn("Could not revoke OAuth2 authorization: {}", ex.getMessage());
            }
        }

        // Invalidate server session + clear SecurityContext
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        new SecurityContextLogoutHandler().logout(request, response, auth);

        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }
}
