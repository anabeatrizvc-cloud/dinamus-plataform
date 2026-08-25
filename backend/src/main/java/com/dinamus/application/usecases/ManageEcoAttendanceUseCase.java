package com.dinamus.application.usecases;

import com.dinamus.application.ports.ContentRepository;
import com.dinamus.domain.model.EcoAttendance;
import com.dinamus.domain.model.EcoLesson;
import jakarta.inject.Singleton;

import java.time.Instant;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

@Singleton
public class ManageEcoAttendanceUseCase {
    public static final String ECO_LESSON_DATE = "2026-08-25";
    public static final String ECO_LESSON_ID = "eco-2026-08-25";
    private static final Pattern PHOTO_PATTERN = Pattern.compile("^data:image/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=\\r\\n]+$");

    private final ContentRepository repository;

    public ManageEcoAttendanceUseCase(ContentRepository repository) {
        this.repository = repository;
    }

    public EcoLesson publicLesson() {
        return new EcoLesson(ECO_LESSON_ID, "Aula", ECO_LESSON_DATE);
    }

    public List<EcoLesson> listLessons() {
        return repository.listEcoLessons();
    }

    public List<EcoAttendance> listAttendances(String lessonId) {
        ensureKnownLesson(lessonId);
        return repository.listEcoAttendances(lessonId).stream()
            .sorted(Comparator.comparing(EcoAttendance::createdAt).reversed())
            .toList();
    }

    public EcoAttendance register(String name, String phone, String lessonDate, String photoDataUrl) {
        if (!ECO_LESSON_DATE.equals(lessonDate)) {
            throw new IllegalArgumentException("A aula informada não está aberta para presença.");
        }

        String normalizedPhone = normalizePhone(phone);
        validatePhoto(photoDataUrl);
        String now = Instant.now().toString();
        EcoAttendance existing = repository.listEcoAttendances(ECO_LESSON_ID).stream()
            .filter(attendance -> attendance.phone().equals(normalizedPhone))
            .findFirst()
            .orElse(null);

        EcoAttendance attendance = new EcoAttendance(
            existing == null ? UUID.randomUUID().toString() : existing.id(),
            ECO_LESSON_ID,
            ECO_LESSON_DATE,
            normalizeName(name),
            normalizedPhone,
            photoDataUrl.replaceAll("\\s+", ""),
            "PENDING",
            existing == null ? now : existing.createdAt(),
            ""
        );
        return repository.saveEcoAttendance(attendance);
    }

    public EcoAttendance validate(String lessonId, String attendanceId, boolean validated) {
        ensureKnownLesson(lessonId);
        EcoAttendance current = repository.listEcoAttendances(lessonId).stream()
            .filter(attendance -> attendance.id().equals(attendanceId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Presença não encontrada."));

        EcoAttendance updated = new EcoAttendance(
            current.id(),
            current.lessonId(),
            current.lessonDate(),
            current.name(),
            current.phone(),
            current.photoDataUrl(),
            validated ? "VALIDATED" : "REJECTED",
            current.createdAt(),
            Instant.now().toString()
        );
        return repository.saveEcoAttendance(updated);
    }

    private void ensureKnownLesson(String lessonId) {
        if (!ECO_LESSON_ID.equals(lessonId)) {
            throw new IllegalArgumentException("Aula do Eco não encontrada.");
        }
    }

    private String normalizeName(String value) {
        String normalized = value == null ? "" : value.trim().replaceAll("\\s+", " ");
        if (normalized.length() < 3) {
            throw new IllegalArgumentException("Informe um nome válido.");
        }
        return normalized;
    }

    private String normalizePhone(String value) {
        String digits = value == null ? "" : value.replaceAll("\\D", "");
        if (digits.startsWith("55") && digits.length() == 13) {
            digits = digits.substring(2);
        }
        if (!digits.matches("[1-9]{2}9[0-9]{8}")) {
            throw new IllegalArgumentException("Informe um celular brasileiro com DDD e nono dígito.");
        }
        return "(%s) %s-%s".formatted(digits.substring(0, 2), digits.substring(2, 7), digits.substring(7));
    }

    private void validatePhoto(String photoDataUrl) {
        String normalized = photoDataUrl == null ? "" : photoDataUrl.trim();
        if (!PHOTO_PATTERN.matcher(normalized.toLowerCase(Locale.ROOT)).matches()) {
            throw new IllegalArgumentException("Envie uma selfie em JPG, PNG ou WebP.");
        }
        String base64 = normalized.substring(normalized.indexOf(',') + 1).replaceAll("\\s+", "");
        try {
            byte[] bytes = Base64.getDecoder().decode(base64);
            if (bytes.length < 64 || bytes.length > 1_100_000) {
                throw new IllegalArgumentException("A selfie precisa ter até 1 MB.");
            }
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("A selfie enviada não é válida.");
        }
    }
}
