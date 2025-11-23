# 보안 토큰 관리 개선 가이드

## 개요

현재 프로젝트는 JWT 토큰을 클라이언트 측 저장소(localStorage → sessionStorage)에 저장하고 있습니다. 이는 XSS(Cross-Site Scripting) 공격에 취약할 수 있습니다. 본 문서는 더 안전한 HttpOnly 쿠키 기반 인증으로 마이그레이션하는 방법을 안내합니다.

## 현재 상태

### 단기 개선 (완료)
- ✅ **sessionStorage 사용**: localStorage에서 sessionStorage로 변경하여 탭별 격리
  - XSS 위험은 여전히 존재하지만, 탭별로 격리되어 한 탭에서 탈취되어도 다른 탭은 안전
  - 브라우저 탭이 닫히면 자동으로 토큰 삭제

### 장기 개선 (권장)
- 🔄 **HttpOnly 쿠키 사용**: JavaScript에서 접근 불가능한 쿠키로 토큰 저장
  - XSS 공격으로부터 완전히 보호
  - CSRF 토큰과 함께 사용 권장

## HttpOnly 쿠키 마이그레이션 가이드

### 1. 백엔드 변경사항

#### 1.1 AuthController 수정

**현재 코드:**
```java
@PostMapping("/login")
public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
    // ... 인증 로직 ...
    String jwt = authService.createTokenWithSession(user);
    return ResponseEntity.ok(new AuthResponse(jwt, new UserResponse(user)));
}
```

**변경 후:**
```java
@PostMapping("/login")
public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest, 
                               HttpServletResponse response) {
    // ... 인증 로직 ...
    String jwt = authService.createTokenWithSession(user);
    
    // HttpOnly 쿠키로 토큰 설정
    Cookie cookie = new Cookie("accessToken", jwt);
    cookie.setHttpOnly(true);  // JavaScript 접근 불가
    cookie.setSecure(true);     // HTTPS에서만 전송
    cookie.setPath("/");        // 모든 경로에서 사용 가능
    cookie.setMaxAge((int) (jwtTokenProvider.getValidityInMilliseconds() / 1000)); // JWT 만료 시간과 동일
    cookie.setSameSite(Cookie.SameSite.STRICT); // CSRF 보호
    
    response.addCookie(cookie);
    
    // 응답 본문에서는 토큰 제거 (보안)
    return ResponseEntity.ok(new AuthResponse(null, new UserResponse(user)));
}
```

#### 1.2 SecurityConfig 수정

CORS 설정에 credentials 허용 추가:

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(Arrays.asList("http://localhost:5173", "https://yourdomain.com"));
    configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    configuration.setAllowedHeaders(Arrays.asList("*"));
    configuration.setAllowCredentials(true); // 쿠키 전송 허용
    configuration.setExposedHeaders(Arrays.asList("Set-Cookie"));
    
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
}
```

#### 1.3 JwtAuthenticationFilter 수정

쿠키에서 토큰 읽기:

```java
private String getJwtFromRequest(HttpServletRequest request) {
    // 1. 쿠키에서 토큰 확인 (우선)
    Cookie[] cookies = request.getCookies();
    if (cookies != null) {
        for (Cookie cookie : cookies) {
            if ("accessToken".equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
    }
    
    // 2. 기존 방식 (Authorization 헤더) - 하위 호환성
    String bearerToken = request.getHeader("Authorization");
    if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
        return bearerToken.substring(7);
    }
    
    return null;
}
```

#### 1.4 로그아웃 처리

쿠키 삭제:

```java
@PostMapping("/logout")
public ResponseEntity<?> logout(HttpServletResponse response) {
    // 쿠키 삭제
    Cookie cookie = new Cookie("accessToken", null);
    cookie.setHttpOnly(true);
    cookie.setSecure(true);
    cookie.setPath("/");
    cookie.setMaxAge(0); // 즉시 만료
    response.addCookie(cookie);
    
    return ResponseEntity.ok().build();
}
```

### 2. 프론트엔드 변경사항

#### 2.1 API 요청 설정

**현재 코드 (api.js):**
```javascript
api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('accessToken');
    if (token) {
        config.headers = {
            ...config.headers,
            Authorization: `Bearer ${token}`
        };
    }
    return config;
});
```

**변경 후:**
```javascript
api.interceptors.request.use((config) => {
    // 쿠키는 자동으로 전송되므로 별도 설정 불필요
    // 단, credentials를 포함해야 함
    config.withCredentials = true;
    return config;
});
```

#### 2.2 axios 기본 설정

```javascript
const api = axios.create({
    baseURL: resolvedBaseURL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // 쿠키 자동 전송
});
```

#### 2.3 인증 함수 수정

**auth.js:**
```javascript
export const login = async (email, password) => {
    try {
        const response = await api.post('/api/auth/login', { email, password });
        // 토큰은 쿠키에 저장되므로 클라이언트에서 처리 불필요
        return response.data;
    } catch (error) {
        log.error('로그인 실패', error);
        throw error;
    }
};

export const logout = async () => {
    try {
        await api.post('/api/auth/logout');
        // 쿠키는 서버에서 삭제되므로 클라이언트에서 처리 불필요
        window.location.href = '/login';
    } catch (error) {
        log.error('로그아웃 실패', error);
        window.location.href = '/login';
    }
};

export const isAuthenticated = async () => {
    try {
        // 서버에 인증 상태 확인 요청
        await api.get('/api/users/me');
        return true;
    } catch (error) {
        return false;
    }
};
```

#### 2.4 WebSocket 연결

쿠키는 자동으로 전송되지만, WebSocket은 쿠키를 자동으로 포함하지 않을 수 있습니다:

```javascript
// useDocumentSocket.js
const wsUrl = '/ws/document'; // 쿠키는 자동으로 포함됨
const stompClient = new Client({
    webSocketFactory: () => new SockJS(wsUrl),
    // 쿠키는 자동으로 포함되므로 별도 설정 불필요
});
```

### 3. CSRF 보호 추가 (권장)

HttpOnly 쿠키 사용 시 CSRF 공격에 취약할 수 있으므로, CSRF 토큰을 추가하는 것을 권장합니다.

#### 3.1 백엔드 CSRF 토큰 생성

```java
@GetMapping("/api/csrf-token")
public ResponseEntity<?> getCsrfToken(HttpServletRequest request) {
    CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
    return ResponseEntity.ok(Map.of("token", csrfToken.getToken()));
}
```

#### 3.2 프론트엔드 CSRF 토큰 사용

```javascript
// api.js
let csrfToken = null;

// 앱 시작 시 CSRF 토큰 가져오기
api.get('/api/csrf-token').then(response => {
    csrfToken = response.data.token;
});

api.interceptors.request.use((config) => {
    config.withCredentials = true;
    if (csrfToken) {
        config.headers['X-CSRF-TOKEN'] = csrfToken;
    }
    return config;
});
```

### 4. 마이그레이션 체크리스트

#### 백엔드
- [ ] AuthController에서 쿠키 설정 추가
- [ ] SecurityConfig에서 CORS credentials 허용
- [ ] JwtAuthenticationFilter에서 쿠키 읽기 지원
- [ ] 로그아웃 엔드포인트에서 쿠키 삭제
- [ ] CSRF 토큰 엔드포인트 추가 (선택)
- [ ] 기존 Authorization 헤더 방식 하위 호환성 유지 (점진적 마이그레이션)

#### 프론트엔드
- [ ] axios withCredentials 설정
- [ ] sessionStorage 토큰 접근 코드 제거
- [ ] 인증 함수 수정 (토큰 저장/삭제 로직 제거)
- [ ] WebSocket 연결 확인
- [ ] CSRF 토큰 처리 추가 (선택)

#### 테스트
- [ ] 로그인/로그아웃 테스트
- [ ] API 요청 인증 테스트
- [ ] WebSocket 연결 테스트
- [ ] CORS 설정 테스트
- [ ] 쿠키 전송 확인 (브라우저 개발자 도구)

### 5. 점진적 마이그레이션 전략

1. **Phase 1**: 백엔드에서 쿠키와 헤더 모두 지원 (하위 호환성)
2. **Phase 2**: 프론트엔드에서 쿠키 방식으로 전환
3. **Phase 3**: 백엔드에서 헤더 방식 제거 (선택)

### 6. 보안 고려사항

#### 장점
- ✅ XSS 공격으로부터 토큰 보호
- ✅ JavaScript로 토큰 접근 불가능
- ✅ SameSite 속성으로 CSRF 보호

#### 주의사항
- ⚠️ CSRF 공격에 취약할 수 있음 (SameSite=STRICT로 완화)
- ⚠️ CORS 설정 필요 (credentials 허용)
- ⚠️ HTTPS 필수 (Secure 쿠키 사용 시)

### 7. 참고 자료

- [OWASP - Secure Cookie Flags](https://owasp.org/www-community/HttpOnly)
- [MDN - Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [Spring Security - CSRF Protection](https://docs.spring.io/spring-security/reference/features/exploits/csrf.html)

