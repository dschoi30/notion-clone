package com.example.notionclone.domain.document.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * 테이블 문서 목록 조회용 경량 DTO
 * DummyDataTestPanel에서 테이블 문서 선택을 위한 최소 필드만 포함
 */
@Getter

@Builder
public class DocumentTableListResponse {
    private Long id;
    private String title;
    private String viewType;
    
    /**
     * Object[] 배열에서 DocumentTableListResponse로 변환
     * @param result [id, title, viewType] 형태의 Object 배열
     * @return DocumentTableListResponse
     */
    public static DocumentTableListResponse fromObjectArray(Object[] result) {
        return DocumentTableListResponse.builder()
                .id((Long) result[0])
                .title((String) result[1])
                .viewType(String.valueOf(result[2]))
                .build();
    }
}
