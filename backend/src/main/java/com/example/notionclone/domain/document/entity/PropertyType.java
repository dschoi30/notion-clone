package com.example.notionclone.domain.document.entity;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum PropertyType {
    TEXT,
    NUMBER,
    TAG,
    DATE,

    // System managed types
    CREATED_BY,
    LAST_UPDATED_BY,
    CREATED_AT,
    LAST_UPDATED_AT;

    @JsonCreator
    public static PropertyType from(String s) {
        return PropertyType.valueOf(s.toUpperCase());
    }
} 