package com.dinamus.adapters.in.web;

import com.dinamus.adapters.in.web.dto.MemberDtos;
import com.dinamus.application.usecases.ManageMembersUseCase;
import com.dinamus.domain.model.MemberSummary;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Delete;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.annotation.Put;
import io.micronaut.security.annotation.Secured;
import io.micronaut.validation.Validated;
import jakarta.validation.Valid;

import java.util.List;

@Validated
@Controller("/api/v1/admin/members")
@Secured("ADMIN")
public class AdminMembersController {
    private final ManageMembersUseCase members;

    public AdminMembersController(ManageMembersUseCase members) {
        this.members = members;
    }

    @Get
    public List<MemberSummary> list() {
        return members.list();
    }

    @Post
    public MemberSummary create(@Valid @Body MemberDtos.MemberRequest request) {
        return members.create(request.name(), request.phone(), request.email(), request.roles());
    }

    @Put("/{id}")
    public MemberSummary update(@PathVariable String id, @Valid @Body MemberDtos.MemberRequest request) {
        return members.update(id, request.name(), request.phone(), request.email(), request.roles(), request.active());
    }

    @Delete("/{id}")
    public HttpResponse<?> delete(@PathVariable String id) {
        members.delete(id);
        return HttpResponse.noContent();
    }
}
