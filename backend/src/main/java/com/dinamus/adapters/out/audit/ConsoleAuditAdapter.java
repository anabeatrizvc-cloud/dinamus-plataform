package com.dinamus.adapters.out.audit;

import com.dinamus.application.ports.AuditPort;
import io.micronaut.context.annotation.Requires;
import jakarta.inject.Singleton;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Singleton
@Requires(missingBeans = AuditPort.class)
public class ConsoleAuditAdapter implements AuditPort {
    private static final Logger LOG = LoggerFactory.getLogger(ConsoleAuditAdapter.class);

    @Override
    public void record(String actor, String action, String entityId) {
        LOG.info("audit actor={} action={} entityId={}", actor, action, entityId);
    }
}
