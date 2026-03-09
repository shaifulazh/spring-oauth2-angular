package com.oauth.server.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Serves the custom Thymeleaf login page at GET /login.
 * Spring Security's form-login configuration in AuthorizationServerConfig
 * points loginPage("/login") here.
 */
@Controller
public class LoginController {

    @GetMapping("/login")
    public String loginPage() {
        return "login"; // resolves to templates/login.html
    }
}
