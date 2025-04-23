package com.example.notionclone.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsService userDetailsService;
    
    private final List<String> excludedPaths = Arrays.asList(
        "/auth/register",
        "/auth/login",
        "/auth/google"
    );

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String contextPath = request.getContextPath();
        String requestUri = request.getRequestURI();
        String path = requestUri.substring(contextPath.length());
        
        log.debug("Context Path: {}", contextPath);
        log.debug("Request URI: {}", requestUri);
        log.debug("Extracted Path: {}", path);
        
        boolean shouldExclude = excludedPaths.stream().anyMatch(path::equals);
        log.debug("Should exclude path: {}", shouldExclude);
        
        return shouldExclude;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);
            log.debug("JWT Token: {}", jwt);

            if (jwt != null && jwtTokenProvider.validateToken(jwt)) {
                String email = jwtTokenProvider.getEmailFromToken(jwt);
                log.debug("Email from token: {}", email);
                
                UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                log.debug("UserDetails loaded: {}", userDetails);
                
                if (!(userDetails instanceof UserPrincipal)) {
                    log.error("UserDetails is not an instance of UserPrincipal: {}", userDetails.getClass());
                    throw new RuntimeException("UserDetails is not an instance of UserPrincipal");
                }
                
                UserPrincipal userPrincipal = (UserPrincipal) userDetails;
                log.debug("User ID: {}", userPrincipal.getId());
                log.debug("User Email: {}", userPrincipal.getEmail());
                log.debug("User Authorities: {}", userPrincipal.getAuthorities());
                
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
                log.debug("Authentication set in SecurityContext for user: {}", email);
                log.debug("Current Authentication: {}", SecurityContextHolder.getContext().getAuthentication());
            } else {
                if (jwt == null) {
                    log.debug("No JWT token found in request");
                } else {
                    log.debug("Invalid JWT token");
                }
            }
        } catch (Exception e) {
            log.error("Could not set user authentication in security context", e);
        }

        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        log.debug("Authorization header: {}", bearerToken);
        
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
} 