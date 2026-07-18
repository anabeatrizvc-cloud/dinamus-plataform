package com.dinamus.application.ports;

import com.dinamus.domain.model.AgendaItem;
import com.dinamus.domain.model.EventSummary;
import com.dinamus.domain.model.FirstVisit;
import com.dinamus.domain.model.GrowthGroup;
import com.dinamus.domain.model.PrayerRequest;
import com.dinamus.domain.model.UserAccount;

import java.util.List;
import java.util.Optional;

public interface ContentRepository {
    List<AgendaItem> listAgenda();

    List<EventSummary> listEvents();

    EventSummary saveEvent(EventSummary event);

    void deleteEvent(String id);

    List<GrowthGroup> listGrowthGroups();

    PrayerRequest savePrayerRequest(PrayerRequest request);

    FirstVisit saveFirstVisit(FirstVisit visit);

    Optional<UserAccount> findUserByEmail(String email);
}
