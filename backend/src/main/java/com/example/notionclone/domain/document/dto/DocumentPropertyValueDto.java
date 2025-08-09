package com.example.notionclone.domain.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentPropertyValueDto {
    private Long id;
    private Long documentId;
    private Long propertyId;
    private String value;
} 