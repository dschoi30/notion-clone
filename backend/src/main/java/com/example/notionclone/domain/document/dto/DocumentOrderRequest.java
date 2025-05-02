package com.example.notionclone.domain.document.dto;

import java.util.List;
import lombok.Getter;

@Getter
public class DocumentOrderRequest {
    private List<Long> documentIds;
}