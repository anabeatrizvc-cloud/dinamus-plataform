package com.dinamus.application.usecases;

import com.dinamus.application.ports.ContentRepository;
import com.dinamus.domain.model.EcoAttendance;
import com.dinamus.domain.model.EcoLesson;
import jakarta.inject.Singleton;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Singleton
public class ManageEcoAttendanceUseCase {
    public static final String PREVIOUS_ECO_LESSON_DATE = "2026-08-25";
    public static final String PREVIOUS_ECO_LESSON_ID = "eco-2026-08-25";
    public static final String ECO_LESSON_DATE = "2026-09-01";
    public static final String ECO_LESSON_ID = "eco-2026-09-01";
    public static final List<EcoLesson> ECO_LESSONS = List.of(
        new EcoLesson(ECO_LESSON_ID, "Aula", ECO_LESSON_DATE),
        new EcoLesson(PREVIOUS_ECO_LESSON_ID, "Aula", PREVIOUS_ECO_LESSON_DATE)
    );

    private static final Pattern PHOTO_PATTERN = Pattern.compile("^data:image/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=\\r\\n]+$");

    private final ContentRepository repository;

    public ManageEcoAttendanceUseCase(ContentRepository repository) {
        this.repository = repository;
    }

    public EcoLesson publicLesson() {
        return ECO_LESSONS.getFirst();
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

    public Optional<StudentSuggestion> findStudentByPhone(String phone) {
        String normalizedPhone = normalizePhone(phone);
        return allAttendances().stream()
            .filter(attendance -> normalizedPhone.equals(attendance.phone()))
            .sorted(Comparator.comparing(EcoAttendance::createdAt, Comparator.nullsLast(String::compareTo)).reversed())
            .findFirst()
            .map(attendance -> new StudentSuggestion(attendance.name(), attendance.phone()));
    }

    public EcoAttendance register(String name, String phone, String lessonDate, String photoDataUrl) {
        EcoLesson lesson = lessonByDate(lessonDate)
            .orElseThrow(() -> new IllegalArgumentException("A aula informada não está aberta para presença."));
        if (!lesson.id().equals(publicLesson().id())) {
            throw new IllegalArgumentException("A aula informada não está aberta para presença.");
        }

        String normalizedPhone = normalizePhone(phone);
        validatePhoto(photoDataUrl);
        String now = Instant.now().toString();
        EcoAttendance existing = repository.listEcoAttendances(lesson.id()).stream()
            .filter(attendance -> attendance.phone().equals(normalizedPhone))
            .findFirst()
            .orElse(null);

        EcoAttendance attendance = new EcoAttendance(
            existing == null ? UUID.randomUUID().toString() : existing.id(),
            lesson.id(),
            lesson.lessonDate(),
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
            "",
            validated ? "VALIDATED" : "REJECTED",
            current.createdAt(),
            Instant.now().toString()
        );
        return repository.saveEcoAttendance(updated);
    }

    public List<EcoAttendance> validateAll(String lessonId) {
        ensureKnownLesson(lessonId);
        String now = Instant.now().toString();
        return repository.listEcoAttendances(lessonId).stream()
            .map(attendance -> {
                EcoAttendance updated = new EcoAttendance(
                    attendance.id(),
                    attendance.lessonId(),
                    attendance.lessonDate(),
                    attendance.name(),
                    attendance.phone(),
                    "",
                    "VALIDATED",
                    attendance.createdAt(),
                    now
                );
                return repository.saveEcoAttendance(updated);
            })
            .sorted(Comparator.comparing(EcoAttendance::createdAt, Comparator.nullsLast(String::compareTo)).reversed())
            .toList();
    }

    public int purgeReviewedPhotos(String lessonId) {
        ensureKnownLesson(lessonId);
        int updated = 0;
        for (EcoAttendance attendance : repository.listEcoAttendances(lessonId)) {
            boolean reviewed = "VALIDATED".equals(attendance.status()) || "REJECTED".equals(attendance.status());
            if (reviewed && attendance.photoDataUrl() != null && !attendance.photoDataUrl().isBlank()) {
                repository.saveEcoAttendance(new EcoAttendance(
                    attendance.id(),
                    attendance.lessonId(),
                    attendance.lessonDate(),
                    attendance.name(),
                    attendance.phone(),
                    "",
                    attendance.status(),
                    attendance.createdAt(),
                    attendance.validatedAt()
                ));
                updated++;
            }
        }
        return updated;
    }

    public String lessonAttendanceCsv(String lessonId) {
        EcoLesson lesson = ensureKnownLesson(lessonId);
        List<String> lines = new ArrayList<>();
        lines.add(csvLine(List.of("Aula", "Data", "Nome", "Telefone", "Status", "Enviado em", "Validado em")));
        listAttendances(lessonId).forEach(attendance -> lines.add(csvLine(List.of(
            lesson.title(),
            formatDateForCsv(lesson.lessonDate()),
            attendance.name(),
            attendance.phone(),
            statusLabel(attendance.status()),
            attendance.createdAt(),
            attendance.validatedAt()
        ))));
        return "\uFEFF" + String.join("\n", lines) + "\n";
    }

    public String studentSummaryCsv() {
        Map<String, StudentSummary> summaries = new LinkedHashMap<>();
        allAttendances().stream()
            .sorted(Comparator.comparing(EcoAttendance::name, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
            .forEach(attendance -> {
                String key = attendance.phone();
                StudentSummary summary = summaries.computeIfAbsent(key, ignored -> new StudentSummary(attendance.name(), attendance.phone()));
                summary.name = attendance.name();
                if ("VALIDATED".equals(attendance.status())) {
                    summary.validatedLessons.put(attendance.lessonId(), true);
                }
            });

        List<String> lines = new ArrayList<>();
        lines.add(csvLine(List.of("Nome", "Telefone", "Total de aulas", "Presencas", "Faltas")));
        summaries.values().forEach(summary -> {
            int totalLessons = ECO_LESSONS.size();
            int attended = summary.validatedLessons.size();
            lines.add(csvLine(List.of(
                summary.name,
                summary.phone,
                String.valueOf(totalLessons),
                String.valueOf(attended),
                String.valueOf(Math.max(0, totalLessons - attended))
            )));
        });
        return "\uFEFF" + String.join("\n", lines) + "\n";
    }

    private EcoLesson ensureKnownLesson(String lessonId) {
        return ECO_LESSONS.stream()
            .filter(lesson -> lesson.id().equals(lessonId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Aula do Eco não encontrada."));
    }

    private Optional<EcoLesson> lessonByDate(String lessonDate) {
        return ECO_LESSONS.stream()
            .filter(lesson -> lesson.lessonDate().equals(lessonDate))
            .findFirst();
    }

    private List<EcoAttendance> allAttendances() {
        return ECO_LESSONS.stream()
            .flatMap(lesson -> repository.listEcoAttendances(lesson.id()).stream())
            .collect(Collectors.toList());
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

    private String csvLine(List<String> values) {
        return values.stream()
            .map(value -> value == null ? "" : value)
            .map(value -> "\"" + value.replace("\"", "\"\"") + "\"")
            .collect(Collectors.joining(","));
    }

    private String formatDateForCsv(String value) {
        String[] parts = value.split("-");
        if (parts.length != 3) {
            return value;
        }
        return "%s/%s/%s".formatted(parts[2], parts[1], parts[0]);
    }

    private String statusLabel(String status) {
        return switch (status) {
            case "VALIDATED" -> "Validada";
            case "REJECTED" -> "Nao validada";
            default -> "Pendente";
        };
    }

    public record StudentSuggestion(String name, String phone) {
    }

    private static final class StudentSummary {
        private String name;
        private final String phone;
        private final Map<String, Boolean> validatedLessons = new LinkedHashMap<>();

        private StudentSummary(String name, String phone) {
            this.name = name;
            this.phone = phone;
        }
    }
}
