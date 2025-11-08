package com.example.notionclone.domain.notification.controller;

import com.example.notionclone.domain.notification.entity.Notification;
import com.example.notionclone.domain.notification.service.NotificationService;
import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.user.repository.UserRepository;
import com.example.notionclone.security.CurrentUser;
import com.example.notionclone.security.UserPrincipal;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    
    @GetMapping
    public List<Notification> getMyNotifications(@CurrentUser UserPrincipal userPrincipal) {
      User user = userRepository.findById(userPrincipal.getId())
      .orElseThrow(() -> new RuntimeException("User not found"));
      return notificationService.getUserNotifications(user);
    }

    @PostMapping("/{id}/accept")
    public Notification accept(@PathVariable Long id, @CurrentUser UserPrincipal userPrincipal) {
      User user = userRepository.findById(userPrincipal.getId())
      .orElseThrow(() -> new RuntimeException("User not found"));
        return notificationService.acceptNotification(id, user);
    }

    @PostMapping("/{id}/reject")
    public Notification reject(@PathVariable Long id, @CurrentUser UserPrincipal userPrincipal) {
      User user = userRepository.findById(userPrincipal.getId())
      .orElseThrow(() -> new RuntimeException("User not found"));
        return notificationService.rejectNotification(id, user);
    }

    @PostMapping("/{id}/read")
    public Notification markAsRead(@PathVariable Long id, @CurrentUser UserPrincipal userPrincipal) {
      User user = userRepository.findById(userPrincipal.getId())
      .orElseThrow(() -> new RuntimeException("User not found"));
        return notificationService.markAsRead(id, user);
    }
} 