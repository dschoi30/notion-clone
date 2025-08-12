package com.example.notionclone.domain.document.dto;

import com.example.notionclone.domain.document.entity.ViewType;
import lombok.*;

import java.time.LocalDateTime;

public class DocumentVersionDtos {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateRequest {
        private String title;
        private ViewType viewType;
        private Integer titleWidth;
        private String content; // PAGE 전용
        private String propertiesJson;
        private String propertyValuesJson;
        private String snapshotHash; // 클라이언트 계산 or 서버 계산 대비 입력 허용
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ResponseItem {
        private Long id;
        private String title;
        private ViewType viewType;
        private Integer titleWidth;
        private String createdBy;
        private LocalDateTime createdAt;
        private boolean locked; // 미래 확장
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DetailResponse {
        private Long id;
        private String title;
        private ViewType viewType;
        private Integer titleWidth;
        private String content;
        private String propertiesJson;
        private String propertyValuesJson;
        private String createdBy;
        private LocalDateTime createdAt;
    }
}


