package com.oauth.server.config;

import com.oauth.server.entity.Product;
import com.oauth.server.entity.User;
import com.oauth.server.repository.ProductRepository;
import com.oauth.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedUsers();
        seedProducts();
    }

    private void seedUsers() {
        if (userRepository.count() == 0) {
            User admin = User.builder()
                    .username("admin")
                    .email("admin@example.com")
                    .password(passwordEncoder.encode("Admin@1234"))
                    .enabled(true)
                    .roles(Set.of("ADMIN", "USER"))
                    .build();

            User user = User.builder()
                    .username("john")
                    .email("john@example.com")
                    .password(passwordEncoder.encode("User@1234"))
                    .enabled(true)
                    .roles(Set.of("USER"))
                    .build();

            userRepository.saveAll(List.of(admin, user));
            log.info("Seeded default users: admin / john");
        }
    }

    private void seedProducts() {
        if (productRepository.count() == 0) {
            List<Product> products = List.of(
                    Product.builder()
                            .name("Spring Boot in Action")
                            .description("Comprehensive guide to Spring Boot")
                            .price(new BigDecimal("49.99"))
                            .stock(100)
                            .build(),
                    Product.builder()
                            .name("Angular: The Complete Guide")
                            .description("Master Angular from scratch")
                            .price(new BigDecimal("39.99"))
                            .stock(75)
                            .build(),
                    Product.builder()
                            .name("OAuth 2.0 in Practice")
                            .description("Secure your APIs with OAuth2")
                            .price(new BigDecimal("44.99"))
                            .stock(50)
                            .build()
            );
            productRepository.saveAll(products);
            log.info("Seeded {} sample products", products.size());
        }
    }
}
