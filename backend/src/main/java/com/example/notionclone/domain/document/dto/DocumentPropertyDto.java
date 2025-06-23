package com.example.notionclone.domain.document.dto;

import com.example.notionclone.domain.document.entity.DocumentProperty;
import com.example.notionclone.domain.document.entity.PropertyType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentPropertyDto {
    private Long id;
    private String name;
    private PropertyType type;
    private Integer sortOrder;

    public static DocumentPropertyDto from(DocumentProperty property) {
        return DocumentPropertyDto.builder()
                .id(property.getId())
                .name(property.getName())
                .type(property.getType())
                .sortOrder(property.getSortOrder())
                .build();
    }
} 