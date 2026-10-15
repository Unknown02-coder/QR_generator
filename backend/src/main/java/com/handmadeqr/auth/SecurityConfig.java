package com.handmadeqr.auth;

import java.io.IOException;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestCustomizers;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    GithubOAuth2UserService githubOAuth2UserService(UserAccountRepository accounts) {
        return new GithubOAuth2UserService(accounts);
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, ClientRegistrationRepository registrations,
            GithubOAuth2UserService userService, OAuthLoginHandler loginHandler) throws Exception {
        var resolver = new DefaultOAuth2AuthorizationRequestResolver(registrations, "/oauth2/authorization");
        resolver.setAuthorizationRequestCustomizer(OAuth2AuthorizationRequestCustomizers.withPkce());

        http.authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/api/csrf", "/oauth2/**", "/login/oauth2/**", "/auth/**").permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().denyAll());
        http.exceptionHandling(exceptions -> exceptions
                .defaultAuthenticationEntryPointFor((request, response, error) ->
                        jsonError(response, 401, "unauthorized"),
                        request -> request.getRequestURI().startsWith("/api/"))
                .accessDeniedHandler((request, response, error) -> jsonError(response, 403, "forbidden")));
        http.oauth2Login(oauth -> oauth
                .authorizationEndpoint(endpoint -> endpoint.authorizationRequestResolver(resolver))
                .userInfoEndpoint(endpoint -> endpoint.userService(userService))
                .successHandler(loginHandler)
                .failureHandler(loginHandler));
        http.csrf(Customizer.withDefaults());
        http.logout(logout -> logout.logoutUrl("/logout")
                .logoutSuccessHandler((request, response, authentication) -> response.setStatus(204)));
        return http.build();
    }

    private static void jsonError(HttpServletResponse response, int status, String code) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"error\":\"" + code + "\"}");
    }
}
