package com.oauth.server.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Handles the OIDC RP-Initiated Logout GET redirect.
 *
 * Spring Authorization Server handles POST /logout (session invalidation) and
 * GET /connect/logout (OIDC end-session endpoint) automatically.
 *
 * This controller only adds an explicit mapping for GET /logout so that if a
 * user navigates to /logout directly in the browser they are cleanly redirected
 * to the login page instead of seeing a 405 Method Not Allowed.
 */
@Controller
public class LogoutController {

    /**
     * GET /logout — redirect to login page.
     * The actual POST /logout is handled by Spring Security's LogoutFilter.
     */
    @GetMapping("/logout")
    public String logoutPage() {
        return "redirect:/login";
    }
}
