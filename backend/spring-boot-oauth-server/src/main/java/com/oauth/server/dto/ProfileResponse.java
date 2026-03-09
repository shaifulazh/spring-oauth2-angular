package com.oauth.server.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProfileResponse {
    private String username;
    private String email;
    private Set<String> roles;
    private LocalDateTime createdAt;
}
