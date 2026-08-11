package com.dinamus.adapters.out.notification;

import io.micronaut.context.annotation.ConfigurationProperties;

@ConfigurationProperties("mail.smtp")
public class InvitationProperties {
    private boolean enabled;
    private String host = "";
    private int port = 587;
    private String username = "";
    private String password = "";
    private String from = "no-reply@dinamus.local";
    private boolean starttls = true;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getHost() {
        return host;
    }

    public void setHost(String host) {
        this.host = value(host);
    }

    public int getPort() {
        return port;
    }

    public void setPort(int port) {
        this.port = port;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = value(username);
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = value(password);
    }

    public String getFrom() {
        return from;
    }

    public void setFrom(String from) {
        this.from = value(from);
    }

    public boolean isStarttls() {
        return starttls;
    }

    public void setStarttls(boolean starttls) {
        this.starttls = starttls;
    }

    boolean configured() {
        return enabled && !host.isBlank() && !from.isBlank();
    }

    private String value(String input) {
        return input == null ? "" : input.trim();
    }
}
