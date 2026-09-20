package com.dinamus.domain.model;

public class MissionBaseConflictException extends RuntimeException {
    public MissionBaseConflictException() {
        super("A Base foi alterada por outra pessoa. Recarregue os dados antes de salvar novamente.");
    }
}
