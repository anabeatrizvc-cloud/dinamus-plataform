package com.dinamus.adapters.in.web;

import io.micronaut.core.async.publisher.Publishers;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.MutableHttpResponse;
import io.micronaut.http.annotation.Filter;
import io.micronaut.http.filter.HttpServerFilter;
import io.micronaut.http.filter.ServerFilterChain;
import org.reactivestreams.Publisher;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Filter("/api/**")
public class RateLimitFilter implements HttpServerFilter {
    private static final int MAX_REQUESTS_PER_MINUTE = 120;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    @Override
    public Publisher<MutableHttpResponse<?>> doFilter(HttpRequest<?> request, ServerFilterChain chain) {
        String key = request.getRemoteAddress().getAddress().getHostAddress();
        Window window = windows.compute(key, (ignored, current) -> current == null || current.expired() ? new Window() : current);
        if (window.count.incrementAndGet() > MAX_REQUESTS_PER_MINUTE) {
            return Publishers.just(HttpResponse.status(HttpStatus.TOO_MANY_REQUESTS));
        }
        return chain.proceed(request);
    }

    private static final class Window {
        private final long startedAt = Instant.now().getEpochSecond();
        private final AtomicInteger count = new AtomicInteger();

        private boolean expired() {
            return Instant.now().getEpochSecond() - startedAt >= 60;
        }
    }
}
