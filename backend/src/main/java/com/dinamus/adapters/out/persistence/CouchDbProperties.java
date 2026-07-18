package com.dinamus.adapters.out.persistence;

import io.micronaut.context.annotation.ConfigurationProperties;

@ConfigurationProperties("couchdb")
public class CouchDbProperties {
    private boolean enabled;
    private String url = "http://localhost:5984";
    private String database = "dnms_platform";
    private String username = "admin";
    private String password = "password";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getDatabase() {
        return database;
    }

    public void setDatabase(String database) {
        this.database = database;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
