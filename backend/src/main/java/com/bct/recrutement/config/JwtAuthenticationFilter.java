package com.bct.recrutement.config;

import com.bct.recrutement.service.CustomUserDetailsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    @Autowired
    private JwtUtils jwtUtils;
    @Autowired
    private CustomUserDetailsService userDetailsService;

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        System.out.println("=== JwtAuthenticationFilter exécuté pour : " + request.getRequestURI() + " ===");
        try {
            String jwt = parseJwtFromCookie(request);
            System.out.println("JWT depuis cookie : " + jwt);
            if (jwt != null) {
                if (jwtUtils.validateJwtToken(jwt)) {
                    System.out.println("JWT valide");
                    String username = jwtUtils.getUserNameFromJwtToken(jwt);
                    System.out.println("Username extrait : " + username);
                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    System.out.println("Authentification placée dans le contexte");
                } else {
                    System.out.println("JWT invalide");
                }
            } else {
                System.out.println("Aucun JWT trouvé dans les cookies");
            }
        } catch (Exception e) {
            System.out.println("Exception dans le filtre JWT : " + e.getMessage());
            e.printStackTrace();
        }
        filterChain.doFilter(request, response);
    }
    private String parseJwtFromCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("accessToken".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }
}