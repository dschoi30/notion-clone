package com.example.notionclone.domain.document.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Service
public class CloudinaryService {

  private final Cloudinary cloudinary;

  public CloudinaryService(@Value("${cloudinary.cloud_name}") String cloudName,
                           @Value("${cloudinary.api_key}") String apiKey,
                           @Value("${cloudinary.api_secret}") String apiSecret) {
      Map<String, String> config = new HashMap<>();
      config.put("cloud_name", cloudName);
      config.put("api_key", apiKey);
      config.put("api_secret", apiSecret);
      this.cloudinary = new Cloudinary(config);
  }

  public String uploadImage(byte[] imageBytes, String uploadPreset) throws IOException {
      Map uploadResult = cloudinary.uploader().upload(imageBytes, ObjectUtils.asMap(
              "upload_preset", uploadPreset // 프론트와 동일한 프리셋 사용
              // 필요시 public_id, folder 등 옵션 추가 가능
      ));
      return (String) uploadResult.get("secure_url");
  }
}
