package com.dinamus.application.usecases;

import com.dinamus.application.ports.ContentRepository;
import com.dinamus.domain.model.AgendaItem;
import com.dinamus.domain.model.EventSummary;
import com.dinamus.domain.model.GrowthGroup;
import jakarta.inject.Singleton;

import java.util.List;

@Singleton
public class ListPublicContentUseCase {
    private final ContentRepository repository;

    public ListPublicContentUseCase(ContentRepository repository) {
        this.repository = repository;
    }

    public List<AgendaItem> agenda() {
        return repository.listAgenda();
    }

    public List<EventSummary> events() {
        return repository.listEvents();
    }

    public List<GrowthGroup> growthGroups() {
        return repository.listGrowthGroups();
    }
}
