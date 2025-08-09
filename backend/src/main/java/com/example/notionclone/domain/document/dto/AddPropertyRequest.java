package com.example.notionclone.domain.document.dto;

import com.example.notionclone.domain.document.entity.PropertyType;

public class AddPropertyRequest {
    private String name;
    private PropertyType type;
    private Integer sortOrder;
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public PropertyType getType() { return type; }
    public void setType(PropertyType type) { this.type = type; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
} 