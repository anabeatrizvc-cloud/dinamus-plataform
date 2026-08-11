package com.dinamus.adapters.out.notification;

import com.dinamus.application.ports.InvitationPort;
import com.dinamus.domain.model.MemberAccount;
import io.micronaut.context.annotation.Value;
import jakarta.inject.Singleton;
import jakarta.mail.Authenticator;
import jakarta.mail.Message;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;

import java.util.Properties;

@Singleton
public class EmailInvitationAdapter implements InvitationPort {
    private final InvitationProperties mail;
    private final String publicUrl;

    public EmailInvitationAdapter(InvitationProperties mail, @Value("${app.public-url}") String publicUrl) {
        this.mail = mail;
        String configuredUrl = publicUrl == null ? "" : publicUrl.trim();
        this.publicUrl = (configuredUrl.contains("://") ? configuredUrl : "http://localhost:4200").replaceAll("/+$", "");
    }

    @Override
    public void sendPasswordSetup(MemberAccount member) {
        if (member.email().isBlank() || member.passwordSetupToken().isBlank()) {
            return;
        }

        String setupUrl = publicUrl + "/setup-password?token=" + member.passwordSetupToken();
        if (!mail.configured()) {
            System.out.printf("DNMS invite for %s: %s%n", member.email(), setupUrl);
            return;
        }

        try {
            MimeMessage message = new MimeMessage(session());
            message.setFrom(new InternetAddress(mail.getFrom()));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(member.email(), false));
            message.setSubject("Seu acesso à DNMS Platform", "UTF-8");
            message.setText(body(member.name(), setupUrl), "UTF-8", "html");
            Transport.send(message);
        } catch (Exception exception) {
            System.err.printf("Could not send DNMS invite to %s: %s%n", member.email(), exception.getMessage());
            System.err.printf("DNMS invite fallback for %s: %s%n", member.email(), setupUrl);
        }
    }

    private Session session() {
        Properties properties = new Properties();
        properties.put("mail.smtp.host", mail.getHost());
        properties.put("mail.smtp.port", String.valueOf(mail.getPort()));
        properties.put("mail.smtp.auth", String.valueOf(!mail.getUsername().isBlank()));
        properties.put("mail.smtp.starttls.enable", String.valueOf(mail.isStarttls()));

        if (mail.getUsername().isBlank()) {
            return Session.getInstance(properties);
        }

        return Session.getInstance(properties, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(mail.getUsername(), mail.getPassword());
            }
        });
    }

    private String body(String name, String setupUrl) {
        return """
            <div style="font-family:Arial,sans-serif;background:#050505;color:#f7f7f4;padding:28px">
              <h1 style="margin:0 0 12px;color:#ff521f">DNMS Platform</h1>
              <p>Olá, %s.</p>
              <p>Seu cadastro foi criado. Clique no botão abaixo para definir sua senha e acessar a plataforma.</p>
              <p><a href="%s" style="display:inline-block;background:#ff521f;color:#050505;font-weight:700;padding:12px 18px;border-radius:999px;text-decoration:none">Criar minha senha</a></p>
              <p style="color:#b9b9b0;font-size:13px">Se o botão não abrir, copie este link:<br>%s</p>
            </div>
            """.formatted(escape(name), setupUrl, setupUrl);
    }

    private String escape(String value) {
        return value == null ? "" : value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
