// src/main/java/com/example/notionclone/domain/document/controller/ImageProxyController.java
package com.example.notionclone.domain.document.controller;

import com.example.notionclone.domain.document.service.CloudinaryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
public class ImageProxyController {

    private static final Logger log = LoggerFactory.getLogger(ImageProxyController.class);

    private final RestTemplate restTemplate = new RestTemplate();
    private final CloudinaryService cloudinaryService;
    private final String cloudinaryUploadPreset;

    public ImageProxyController(CloudinaryService cloudinaryService,
                                @Value("${cloudinary.upload_preset}") String cloudinaryUploadPreset) {
        this.cloudinaryService = cloudinaryService;
        this.cloudinaryUploadPreset = cloudinaryUploadPreset;
    }

    @GetMapping("/image-proxy")
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
                System.out.println("Invalid Content-Type received: " + (contentType != null ? contentType : "null") + " for URL: " + externalUrl);
                 return ResponseEntity.status(HttpStatus.BAD_REQUEST).contentType(MediaType.APPLICATION_JSON).body(Map.of("error", "Invalid content type: " + (contentType != null ? contentType : "null")));
            }

            byte[] imageBytes = response.getBody();
            if (imageBytes == null || imageBytes.length == 0) {
                 return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Empty image data"));
            }

            String uploadedImageUrl = cloudinaryService.uploadImage(imageBytes, cloudinaryUploadPreset);

            return ResponseEntity.ok(Map.of("imageUrl", uploadedImageUrl));

        } catch (Exception e) {
            System.err.println("Error proxying and uploading image: " + externalUrl + " - " + e.getMessage());
            return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .contentType(MediaType.APPLICATION_JSON)
            .body(Map.of("error", "Failed to process image: " + e.getMessage()));
        }
    }
}