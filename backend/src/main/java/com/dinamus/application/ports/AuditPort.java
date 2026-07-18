package com.dinamus.application.ports;

public interface AuditPort {
    void record(String actor, String action, String entityId);
}
