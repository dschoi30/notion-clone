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

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.Map;

@RestController
public class ImageProxyController {

    private static final Logger log = LoggerFactory.getLogger(ImageProxyController.class);

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    private static final int MAX_IMAGE_WIDTH = 10000;
    private static final int MAX_IMAGE_HEIGHT = 10000;
    
    private static final String[] ALLOWED_CONTENT_TYPES = {
        "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"
    };
    
    private static final String[] ALLOWED_EXTENSIONS = {
        ".jpg", ".jpeg", ".png", ".gif", ".webp"
    };
    
    // Magic numbers (file signatures) for image validation
    private static final byte[] JPEG_SIGNATURE = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG_SIGNATURE = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] GIF_SIGNATURE_87 = {0x47, 0x49, 0x46, 0x38, 0x37, 0x61}; // GIF87a
    private static final byte[] GIF_SIGNATURE_89 = {0x47, 0x49, 0x46, 0x38, 0x39, 0x61}; // GIF89a
    private static final byte[] WEBP_SIGNATURE = {0x52, 0x49, 0x46, 0x46}; // RIFF

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

            // 파일 크기 검증
            if (imageBytes.length > MAX_FILE_SIZE) {
                log.warn("File size too large: {} bytes from URL: {}", imageBytes.length, externalUrl);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("error", "파일 크기는 10MB를 초과할 수 없습니다."));
            }

            // Magic number 검증 (파일 시그니처 검증)
            if (!isValidImageSignature(imageBytes)) {
                log.warn("Invalid image signature (magic number) from URL: {}", externalUrl);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("error", "유효하지 않은 이미지 파일입니다. 파일이 손상되었거나 지원하지 않는 형식일 수 있습니다."));
            }

            // 이미지 크기 검증 (실제 이미지 크기 확인)
            try {
                BufferedImage image = ImageIO.read(new ByteArrayInputStream(imageBytes));
                if (image == null) {
                    log.warn("Failed to read image from URL: {}", externalUrl);
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of("error", "이미지 파일을 읽을 수 없습니다. 파일이 손상되었을 수 있습니다."));
                }
                
                int width = image.getWidth();
                int height = image.getHeight();
                
                if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
                    log.warn("Image dimensions too large: {}x{} from URL: {}", width, height, externalUrl);
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of("error", String.format("이미지 크기가 너무 큽니다. 최대 크기: %dx%d", MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT)));
                }
                
                log.debug("Image validated: {}x{} pixels from URL: {}", width, height, externalUrl);
            } catch (IOException e) {
                log.error("Error reading image dimensions from URL: {}", externalUrl, e);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("error", "이미지 파일을 처리하는 중 오류가 발생했습니다."));
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

            // 파일 타입 검증 (MIME type)
            String contentType = file.getContentType();
            if (contentType == null || !isAllowedContentType(contentType)) {
                log.warn("Invalid content type: {}", contentType);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("error", "지원하지 않는 이미지 형식입니다. (JPEG, PNG, GIF, WebP만 지원)"));
            }

            // 파일 확장자 검증
            String originalFilename = file.getOriginalFilename();
            if (originalFilename == null || !hasAllowedExtension(originalFilename)) {
                log.warn("Invalid file extension: {}", originalFilename);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("error", "지원하지 않는 파일 확장자입니다. (JPG, JPEG, PNG, GIF, WebP만 지원)"));
            }

            // 파일을 byte 배열로 변환
            byte[] imageBytes = file.getBytes();
            
            // Magic number 검증 (파일 시그니처 검증)
            if (!isValidImageSignature(imageBytes)) {
                log.warn("Invalid image signature (magic number) for file: {}", originalFilename);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("error", "유효하지 않은 이미지 파일입니다. 파일이 손상되었거나 지원하지 않는 형식일 수 있습니다."));
            }

            // 이미지 크기 검증 (실제 이미지 크기 확인)
            try {
                BufferedImage image = ImageIO.read(new ByteArrayInputStream(imageBytes));
                if (image == null) {
                    log.warn("Failed to read image file: {}", originalFilename);
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of("error", "이미지 파일을 읽을 수 없습니다. 파일이 손상되었을 수 있습니다."));
                }
                
                int width = image.getWidth();
                int height = image.getHeight();
                
                if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
                    log.warn("Image dimensions too large: {}x{} for file: {}", width, height, originalFilename);
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of("error", String.format("이미지 크기가 너무 큽니다. 최대 크기: %dx%d", MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT)));
                }
                
                log.debug("Image validated: {}x{} pixels, file: {}", width, height, originalFilename);
            } catch (IOException e) {
                log.error("Error reading image dimensions: {}", originalFilename, e);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("error", "이미지 파일을 처리하는 중 오류가 발생했습니다."));
            }

            // 모든 검증 통과 후 업로드
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

    /**
     * 허용된 파일 확장자인지 확인
     */
    private boolean hasAllowedExtension(String filename) {
        if (filename == null || filename.isEmpty()) {
            return false;
        }
        String lowerFilename = filename.toLowerCase();
        for (String extension : ALLOWED_EXTENSIONS) {
            if (lowerFilename.endsWith(extension)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Magic number (파일 시그니처)를 검증하여 실제 이미지 파일인지 확인
     * MIME type 스푸핑 공격을 방지합니다.
     */
    private boolean isValidImageSignature(byte[] imageBytes) {
        if (imageBytes == null || imageBytes.length < 12) {
            return false;
        }

        // JPEG 검증: FF D8 FF
        if (startsWithSignature(imageBytes, JPEG_SIGNATURE)) {
            return true;
        }

        // PNG 검증: 89 50 4E 47 0D 0A 1A 0A
        if (startsWithSignature(imageBytes, PNG_SIGNATURE)) {
            return true;
        }

        // GIF 검증: GIF87a 또는 GIF89a
        if (startsWithSignature(imageBytes, GIF_SIGNATURE_87) || 
            startsWithSignature(imageBytes, GIF_SIGNATURE_89)) {
            return true;
        }

        // WebP 검증: RIFF...WEBP
        // RIFF 시그니처 확인 (0-3 바이트)
        if (startsWithSignature(imageBytes, WEBP_SIGNATURE)) {
            // WebP는 RIFF 다음에 파일 크기(4바이트), 그 다음 "WEBP" 문자열이 있어야 함
            if (imageBytes.length >= 12) {
                String webpCheck = new String(imageBytes, 8, 4);
                if ("WEBP".equals(webpCheck)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * 바이트 배열이 주어진 시그니처로 시작하는지 확인
     */
    private boolean startsWithSignature(byte[] data, byte[] signature) {
        if (data == null || signature == null || data.length < signature.length) {
            return false;
        }
        for (int i = 0; i < signature.length; i++) {
            if (data[i] != signature[i]) {
                return false;
            }
        }
        return true;
    }
}