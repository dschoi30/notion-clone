// src/main/java/com/example/notionclone/domain/document/controller/ImageProxyController.java
package com.example.notionclone.domain.document.controller;

import com.example.notionclone.domain.document.service.CloudinaryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
public class ImageProxyController {

    private static final Logger log = LoggerFactory.getLogger(ImageProxyController.class);

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    private static final String[] ALLOWED_CONTENT_TYPES = {
        "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"
    };

    private final RestTemplate restTemplate = new RestTemplate();
    private final CloudinaryService cloudinaryService;
    private final String cloudinaryUploadPreset;

    public ImageProxyController(CloudinaryService cloudinaryService,
                                @Value("${cloudinary.upload_preset}") String cloudinaryUploadPreset) {
        this.cloudinaryService = cloudinaryService;
        this.cloudinaryUploadPreset = cloudinaryUploadPreset;
    }

    /**
     * 외부 이미지 URL을 프록시하여 Cloudinary에 업로드
     */
    @GetMapping("/api/image-proxy")
    public ResponseEntity<?> proxyAndUploadImage(@RequestParam("url") String externalUrl) {
        try {
            HttpHeaders requestHeaders = new HttpHeaders();
            requestHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");
            HttpEntity<String> entity = new HttpEntity<>(requestHeaders);

            ResponseEntity<byte[]> response = restTemplate.exchange(
                externalUrl,
                HttpMethod.GET,
                entity,
                byte[].class
            );

            MediaType contentType = response.getHeaders().getContentType();
            if (contentType == null || !contentType.getType().equalsIgnoreCase("image")) {
                log.warn("Invalid Content-Type received: {} for URL: {}", contentType, externalUrl);
                 return ResponseEntity.status(HttpStatus.BAD_REQUEST).contentType(MediaType.APPLICATION_JSON).body(Map.of("error", "Invalid content type: " + (contentType != null ? contentType : "null")));
            }

            byte[] imageBytes = response.getBody();
            if (imageBytes == null || imageBytes.length == 0) {
                 return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Empty image data"));
            }

            String uploadedImageUrl = cloudinaryService.uploadImage(imageBytes, cloudinaryUploadPreset);

            return ResponseEntity.ok(Map.of("imageUrl", uploadedImageUrl));

        } catch (Exception e) {
            log.error("Error proxying and uploading image: {}", externalUrl, e);
            return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .contentType(MediaType.APPLICATION_JSON)
            .body(Map.of("error", "Failed to process image: " + e.getMessage()));
        }
    }

    /**
     * 파일 업로드를 받아 Cloudinary에 업로드
     * 인증이 필요하며, 파일 크기 및 타입 검증을 수행합니다.
     */
    @PostMapping("/api/image-upload")
    public ResponseEntity<?> uploadImage(@RequestParam("file") MultipartFile file) {
        try {
            // 파일 존재 확인
            if (file == null || file.isEmpty()) {
                log.warn("Empty file uploaded");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("error", "파일이 비어있습니다."));
            }

            // 파일 크기 검증
            if (file.getSize() > MAX_FILE_SIZE) {
                log.warn("File size too large: {} bytes", file.getSize());
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("error", "파일 크기는 10MB를 초과할 수 없습니다."));
            }

            // 파일 타입 검증
            String contentType = file.getContentType();
            if (contentType == null || !isAllowedContentType(contentType)) {
                log.warn("Invalid content type: {}", contentType);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("error", "지원하지 않는 이미지 형식입니다. (JPEG, PNG, GIF, WebP만 지원)"));
            }

            // 파일을 byte 배열로 변환하여 업로드
            byte[] imageBytes = file.getBytes();
            String uploadedImageUrl = cloudinaryService.uploadImage(imageBytes, cloudinaryUploadPreset);

            log.debug("Image uploaded successfully: {}", uploadedImageUrl);
            return ResponseEntity.ok(Map.of("imageUrl", uploadedImageUrl));

        } catch (Exception e) {
            log.error("Error uploading image", e);
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("error", "이미지 업로드에 실패했습니다: " + e.getMessage()));
        }
    }

    /**
     * 허용된 Content-Type인지 확인
     */
    private boolean isAllowedContentType(String contentType) {
        if (contentType == null) {
            return false;
        }
        for (String allowed : ALLOWED_CONTENT_TYPES) {
            if (contentType.equalsIgnoreCase(allowed)) {
                return true;
            }
        }
        return false;
    }
}