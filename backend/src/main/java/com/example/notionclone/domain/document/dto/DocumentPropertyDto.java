package com.example.notionclone.domain.document.dto;

import com.example.notionclone.domain.document.entity.DocumentProperty;
import com.example.notionclone.domain.document.entity.DocumentPropertyTagOption;
import com.example.notionclone.domain.document.entity.PropertyType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentPropertyDto {
    private Long id;
    private String name;
    private PropertyType type;
    private Integer sortOrder;
    private Integer width;
    private List<TagOptionDto> tagOptions;

    public static DocumentPropertyDto from(DocumentProperty property) {
        DocumentPropertyDto.DocumentPropertyDtoBuilder builder = DocumentPropertyDto.builder()
                .id(property.getId())
                .name(property.getName())
                .type(property.getType())
                .sortOrder(property.getSortOrder())
                .width(property.getWidth());
        if (property.getType() == PropertyType.TAG && property.getTagOptions() != null) {
            builder.tagOptions(property.getTagOptions().stream()
                .map(TagOptionDto::from)
                .collect(Collectors.toList()));
        }
        return builder.build();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TagOptionDto {
        private Long id;
        private String label;
        private String color;
        private Integer sortOrder;

        public TagOptionDto(DocumentPropertyTagOption entity) {
            this.id = entity.getId();
            this.label = entity.getLabel();
            this.color = entity.getColor();
            this.sortOrder = entity.getSortOrder();
        }

        public static TagOptionDto from(DocumentPropertyTagOption option) {
            return TagOptionDto.builder()
                    .id(option.getId())
                    .label(option.getLabel())
                    .color(option.getColor())
                    .sortOrder(option.getSortOrder())
                    .build();
        }
    }
} 