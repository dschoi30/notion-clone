package com.example.notionclone.domain.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddOrUpdateValueResponse {
    private Long id;
    private Long documentId;
    private Long propertyId;
    private String value;
    private LocalDateTime updatedAt; // 최신 메타(문서 vs 값) 기준
    private String updatedBy;        // 최신 메타(문서 vs 값) 기준
}


