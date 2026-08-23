package com.dinamus.adapters.in.web;

import io.micronaut.core.async.publisher.Publishers;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.MutableHttpResponse;
import io.micronaut.http.annotation.Filter;
import io.micronaut.http.filter.HttpServerFilter;
import io.micronaut.http.filter.ServerFilterChain;
import org.reactivestreams.Publisher;

@Filter("/**")
public class SecurityHeadersFilter implements HttpServerFilter {
    @Override
    public Publisher<MutableHttpResponse<?>> doFilter(HttpRequest<?> request, ServerFilterChain chain) {
        return Publishers.map(chain.proceed(request), response -> response
            .header("X-Content-Type-Options", "nosniff")
            .header("X-Frame-Options", "DENY")
            .header("Referrer-Policy", "strict-origin-when-cross-origin")
            .header("Permissions-Policy", "camera=(self), microphone=(), geolocation=()")
            .header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-src https://www.youtube.com https://www.youtube-nocookie.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'")
        );
    }
}
