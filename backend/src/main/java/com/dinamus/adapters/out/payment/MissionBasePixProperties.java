package com.dinamus.adapters.out.payment;

import io.micronaut.context.annotation.ConfigurationProperties;

@ConfigurationProperties("mission-base.pix")
public class MissionBasePixProperties {
    private String key = "pix@dinamus.local";
    private String receiverName = "IGREJA DINAMUS RECIFE";
    private String receiverCity = "RECIFE";
    private String description = "BASE MISSIONARIA";

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public String getReceiverName() {
        return receiverName;
    }

    public void setReceiverName(String receiverName) {
        this.receiverName = receiverName;
    }

    public String getReceiverCity() {
        return receiverCity;
    }

    public void setReceiverCity(String receiverCity) {
        this.receiverCity = receiverCity;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
