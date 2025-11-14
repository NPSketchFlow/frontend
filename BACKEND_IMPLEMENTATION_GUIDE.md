# Backend Implementation Guide - Whiteboard Erase Functionality

## 🔧 Backend Implementation Summary

This guide covers all the backend changes needed to support the whiteboard erase/delete functionality that has already been implemented in the frontend.

---

## 🔴 **CRITICAL FIX: JWT Authentication Filter**

### Problem
JWT filter is **NOT executing** for POST/DELETE requests to `/api/whiteboard/sessions/{sessionId}/actions`

### Evidence
- Frontend sends valid JWT token in Authorization header
- Backend returns 401 Unauthorized
- **NO JWT filter logs appear** in console (filter is being skipped)
- Same token works perfectly for GET requests
- Frontend shows: `⚠️ Got 401 on save - Backend JWT filter not executing for POST requests!`

### Root Cause
The `JwtAuthenticationFilter` is not being triggered for POST/DELETE requests to the whiteboard endpoints.

---

### Required Fix 1: Add Debug Logging

Add this at the **VERY START** of your `JwtAuthenticationFilter.doFilterInternal()` method:

```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // ✅ ADD THIS AT THE VERY START
        System.err.println("========================================");
        System.err.println("🔍 JWT FILTER EXECUTING!");
        System.err.println("   URI: " + request.getRequestURI());
        System.err.println("   Method: " + request.getMethod());
        System.err.println("   Thread: " + Thread.currentThread().getName());
        System.err.println("========================================");

        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt)) {
                System.out.println("✅ JWT token FOUND in Authorization header");
                
                if (tokenProvider.validateToken(jwt)) {
                    String username = tokenProvider.getUsernameFromToken(jwt);
                    System.out.println("✅ Token validated! Username: " + username);

                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                    
                    UsernamePasswordAuthenticationToken authentication = 
                        new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities()
                        );
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    System.out.println("🎉 AUTHENTICATION SET IN SECURITY CONTEXT!");
                } else {
                    System.out.println("❌ TOKEN VALIDATION FAILED!");
                }
            } else {
                System.out.println("⚠️ NO JWT TOKEN found in Authorization header!");
            }
        } catch (Exception ex) {
            System.err.println("❌ Error in JWT filter: " + ex.getMessage());
            ex.printStackTrace();
        }

        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
```

**If you DON'T see these logs when making POST/DELETE requests, the filter is being skipped!**

---

### Required Fix 2: Check shouldNotFilter Method

Make sure your `JwtAuthenticationFilter` does **NOT** have a `shouldNotFilter()` method that excludes whiteboard endpoints:

```java
// ❌ BAD - Don't do this:
@Override
protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
    String path = request.getRequestURI();
    return path.startsWith("/api/whiteboard/"); // This would skip the filter!
}

// ✅ GOOD - Either don't override shouldNotFilter, or only skip public endpoints:
@Override
protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
    String path = request.getRequestURI();
    return path.startsWith("/api/auth/") || 
           path.startsWith("/api/public/") ||
           path.equals("/error");
}
```

---

### Required Fix 3: Verify SecurityConfig

Ensure your `SecurityConfig` is correctly configured:

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private UserDetailsService userDetailsService;

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Autowired
    private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .exceptionHandling(exception -> exception.authenticationEntryPoint(jwtAuthenticationEntryPoint))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/debug/**").permitAll()
                .requestMatchers("/api/test/**").permitAll()
                .requestMatchers("/error").permitAll()
                
                // ✅ Whiteboard endpoints REQUIRE authentication
                .requestMatchers("/api/whiteboard/**").authenticated()
                
                // All other requests require authentication
                .anyRequest().authenticated()
            )
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList("http://localhost:3000", "http://localhost:*"));
        
        // ✅ Ensure DELETE method is allowed
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept"));
        configuration.setExposedHeaders(Arrays.asList("Authorization"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }
}
```

---

## ✅ **Erase Functionality - Backend Endpoints**

### 1. Delete Single Drawing Action (Erase)

**Endpoint**: `DELETE /api/whiteboard/sessions/{sessionId}/actions/{actionId}`

**Controller** (`DrawingActionController.java`):

```java
@RestController
@RequestMapping("/api/whiteboard")
@CrossOrigin(origins = "*")
public class DrawingActionController {

    @Autowired
    private DrawingActionService drawingActionService;

    @Autowired
    private AuthService authService;

    /**
     * Delete a single drawing action (Erase)
     */
    @DeleteMapping("/sessions/{sessionId}/actions/{actionId}")
    public ResponseEntity<?> deleteDrawingAction(
            @PathVariable String sessionId,
            @PathVariable String actionId) {
        
        try {
            // Get authenticated user
            User currentUser = authService.getCurrentUser();
            if (currentUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "User not authenticated"));
            }

            // Delete the action
            drawingActionService.deleteAction(sessionId, actionId, currentUser.getId());

            return ResponseEntity.ok().body(Map.of(
                "message", "Action deleted successfully",
                "actionId", actionId
            ));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", e.getMessage()));
        } catch (ForbiddenException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to delete action: " + e.getMessage()));
        }
    }

    /**
     * Clear all drawing actions (Clear Canvas)
     */
    @DeleteMapping("/sessions/{sessionId}/actions")
    public ResponseEntity<?> clearCanvas(@PathVariable String sessionId) {
        
        try {
            // Get authenticated user
            User currentUser = authService.getCurrentUser();
            if (currentUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "User not authenticated"));
            }

            // Clear all actions
            drawingActionService.clearCanvas(sessionId, currentUser.getId());

            return ResponseEntity.ok().body(Map.of(
                "message", "Canvas cleared successfully",
                "sessionId", sessionId
            ));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to clear canvas: " + e.getMessage()));
        }
    }
}
```

---

### 2. Service Layer Implementation

**Service** (`DrawingActionService.java`):

```java
@Service
public class DrawingActionService {

    @Autowired
    private DrawingActionRepository drawingActionRepository;

    @Autowired
    private WhiteboardSessionRepository sessionRepository;

    @Autowired
    private WebSocketService webSocketService;

    /**
     * Delete a single drawing action
     */
    public void deleteAction(String sessionId, String actionId, String userId) {
        // Find the action
        DrawingAction action = drawingActionRepository.findById(actionId)
            .orElseThrow(() -> new ResourceNotFoundException("Drawing action not found"));

        // Verify it belongs to the session
        if (!action.getSessionId().equals(sessionId)) {
            throw new IllegalArgumentException("Action does not belong to this session");
        }

        // Optional: Check if user owns the action (uncomment if you want ownership validation)
        // if (!action.getUserId().equals(userId)) {
        //     throw new ForbiddenException("You can only delete your own drawings");
        // }

        // Delete the action
        drawingActionRepository.delete(action);

        // Broadcast erase event via WebSocket to other users
        webSocketService.broadcastEraseAction(sessionId, actionId);
    }

    /**
     * Clear all drawing actions in a session (Clear Canvas)
     */
    public void clearCanvas(String sessionId, String userId) {
        // Verify session exists
        WhiteboardSession session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new ResourceNotFoundException("Whiteboard session not found"));

        // Optional: Check if user has permission to clear (e.g., only session creator)
        // if (!session.getCreatedBy().equals(userId)) {
        //     throw new ForbiddenException("Only the session creator can clear the canvas");
        // }

        // Delete all actions for this session
        drawingActionRepository.deleteBySessionId(sessionId);

        // Broadcast clear event via WebSocket
        webSocketService.broadcastClearCanvas(sessionId);
    }
}
```

---

### 3. Repository Methods

**Repository** (`DrawingActionRepository.java`):

```java
@Repository
public interface DrawingActionRepository extends MongoRepository<DrawingAction, String> {
    
    // Existing methods
    List<DrawingAction> findBySessionId(String sessionId);
    List<DrawingAction> findBySessionIdOrderByTimestampAsc(String sessionId);
    
    // ✅ NEW: Delete all actions in a session (for clear canvas)
    void deleteBySessionId(String sessionId);
    
    // ✅ NEW: Count actions in a session
    long countBySessionId(String sessionId);
}
```

---

## 🎨 **DrawingAction Model Updates**

### Remove `isEraser` Field

The frontend no longer sends the `isEraser` field in the `properties` object. Update your model:

**Before** (causes 400 Bad Request):
```java
@Data
public static class Properties {
    private Integer lineWidth;
    private Boolean isEraser;  // ❌ Remove this - frontend doesn't send it
}
```

**After** (works correctly):
```java
@Data
public static class Properties {
    private Integer lineWidth;
    // isEraser removed - no longer needed
}
```

**OR** add `@JsonIgnoreProperties` to ignore unknown fields:
```java
@Data
@JsonIgnoreProperties(ignoreUnknown = true)  // ✅ Ignore unknown fields
public static class Properties {
    private Integer lineWidth;
}
```

---

### Complete DrawingAction Model

```java
@Document(collection = "drawing_actions")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class DrawingAction {
    
    @Id
    private String actionId;
    
    private String sessionId;
    private String userId;
    private String tool;        // "pen", "circle", "rectangle", "line", "arrow"
    private String color;       // Hex color code
    private String actionType;  // "draw"
    private Coordinates coordinates;
    private Properties properties;
    
    @CreatedDate
    private Date timestamp;
    
    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Properties {
        private Integer lineWidth;
        // isEraser field removed
    }
    
    @Data
    public static class Coordinates {
        private List<Point> points;  // For pen tool (freehand drawing)
        private Point start;          // For shapes (circle, rectangle, line, arrow)
        private Point end;            // For shapes (circle, rectangle, line, arrow)
    }
    
    @Data
    public static class Point {
        private Double x;
        private Double y;
    }
}
```

---

## 🔌 **WebSocket Broadcasting for Real-time Sync**

### Update WebSocket Message Types

**WebSocketMessageType.java**:

```java
public enum WebSocketMessageType {
    DRAW,
    ERASE,        // ✅ NEW: For single action deletion
    CLEAR,        // ✅ NEW: For canvas clear
    USER_JOINED,
    USER_LEFT,
    CURSOR_MOVE
}
```

---

### WebSocket Service Implementation

**WebSocketService.java**:

```java
@Service
public class WebSocketService {
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    /**
     * Broadcast when a drawing action is erased
     */
    public void broadcastEraseAction(String sessionId, String actionId) {
        Map<String, Object> message = new HashMap<>();
        message.put("type", "ERASE");
        message.put("actionId", actionId);
        message.put("timestamp", System.currentTimeMillis());
        
        // Send to all users in this session
        messagingTemplate.convertAndSend(
            "/topic/whiteboard/" + sessionId,
            message
        );
        
        System.out.println("📡 Broadcasted ERASE event for action: " + actionId);
    }
    
    /**
     * Broadcast when canvas is cleared
     */
    public void broadcastClearCanvas(String sessionId) {
        Map<String, Object> message = new HashMap<>();
        message.put("type", "CLEAR");
        message.put("timestamp", System.currentTimeMillis());
        
        // Send to all users in this session
        messagingTemplate.convertAndSend(
            "/topic/whiteboard/" + sessionId,
            message
        );
        
        System.out.println("📡 Broadcasted CLEAR event for session: " + sessionId);
    }
    
    /**
     * Existing method - broadcast drawing action
     */
    public void broadcastDrawAction(String sessionId, DrawingAction action) {
        Map<String, Object> message = new HashMap<>();
        message.put("type", "DRAW");
        message.put("tool", action.getTool());
        message.put("color", action.getColor());
        message.put("coordinates", action.getCoordinates());
        message.put("userId", action.getUserId());
        message.put("timestamp", System.currentTimeMillis());
        
        messagingTemplate.convertAndSend(
            "/topic/whiteboard/" + sessionId,
            message
        );
    }
}
```

---

## 📋 **Complete Implementation Checklist**

### **Priority 1: Fix JWT Filter (CRITICAL)** 🔴

- [ ] Add `System.err.println` debug logging at start of `JwtAuthenticationFilter.doFilterInternal()`
- [ ] Verify logs appear for POST/DELETE requests to `/api/whiteboard/sessions/{id}/actions`
- [ ] Check if `shouldNotFilter()` method exists and excludes whiteboard endpoints
- [ ] Confirm `SecurityContextHolder.getContext().getAuthentication()` is populated
- [ ] Test with Postman/curl that DELETE requests work with JWT token
- [ ] Restart backend and check console for filter execution logs

**Expected Result**: 
```
========================================
🔍 JWT FILTER EXECUTING!
   URI: /api/whiteboard/sessions/xxx/actions/yyy
   Method: DELETE
========================================
✅ JWT token FOUND in Authorization header
✅ Token validated! Username: testuser
🎉 AUTHENTICATION SET IN SECURITY CONTEXT!
```

---

### **Priority 2: Implement Erase Endpoints** 🟡

- [ ] Add `deleteDrawingAction()` method in `DrawingActionController`
- [ ] Add `clearCanvas()` method in `DrawingActionController`
- [ ] Implement `deleteAction()` in `DrawingActionService`
- [ ] Implement `clearCanvas()` in `DrawingActionService`
- [ ] Add `deleteBySessionId()` method in `DrawingActionRepository`
- [ ] Test DELETE `/api/whiteboard/sessions/{id}/actions/{actionId}` returns 200 OK
- [ ] Test DELETE `/api/whiteboard/sessions/{id}/actions` returns 200 OK
- [ ] Verify actions are actually deleted from MongoDB

---

### **Priority 3: Update DrawingAction Model** 🟢

- [ ] Remove `isEraser` field from `DrawingAction.Properties` class
- [ ] OR add `@JsonIgnoreProperties(ignoreUnknown = true)` annotation
- [ ] Test that POST `/api/whiteboard/sessions/{id}/actions` no longer returns 400
- [ ] Verify drawings can be saved without validation errors

---

### **Priority 4: WebSocket Broadcasting** 🟢

- [ ] Add `ERASE` to `WebSocketMessageType` enum
- [ ] Add `CLEAR` to `WebSocketMessageType` enum
- [ ] Implement `broadcastEraseAction()` in `WebSocketService`
- [ ] Implement `broadcastClearCanvas()` in `WebSocketService`
- [ ] Call broadcast methods after successful delete/clear operations
- [ ] Test that other users receive WebSocket messages in real-time

---

### **Priority 5: Testing** 🧪

- [ ] Test DELETE single action with valid JWT token → should return 200 OK
- [ ] Test DELETE single action without JWT token → should return 401
- [ ] Test DELETE single action with invalid actionId → should return 404
- [ ] Test CLEAR canvas with valid JWT token → should return 200 OK
- [ ] Test CLEAR canvas without JWT token → should return 401
- [ ] Verify WebSocket messages are received by other clients
- [ ] Test with frontend - erase should work without console errors

---

## 🧪 **Testing the Endpoints**

### Test 1: Delete Single Action

```bash
curl -X DELETE \
  http://localhost:8080/api/whiteboard/sessions/d9bede56-3582-45ad-b48c-c15ce17adb5c/actions/eaaa1035-56da-4f73-9d13-0ffd820b4a74 \
  -H "Authorization: Bearer eyJhbGciOiJIUzUxMiJ9..." \
  -v
```

**Expected Response**:
```json
{
  "message": "Action deleted successfully",
  "actionId": "eaaa1035-56da-4f73-9d13-0ffd820b4a74"
}
```

**Status Code**: `200 OK` (NOT 401!)

---

### Test 2: Clear Canvas

```bash
curl -X DELETE \
  http://localhost:8080/api/whiteboard/sessions/d9bede56-3582-45ad-b48c-c15ce17adb5c/actions \
  -H "Authorization: Bearer eyJhbGciOiJIUzUxMiJ9..." \
  -v
```

**Expected Response**:
```json
{
  "message": "Canvas cleared successfully",
  "sessionId": "d9bede56-3582-45ad-b48c-c15ce17adb5c"
}
```

**Status Code**: `200 OK` (NOT 401!)

---

### Test 3: Save Drawing Action (Should work after isEraser fix)

```bash
curl -X POST \
  http://localhost:8080/api/whiteboard/sessions/d9bede56-3582-45ad-b48c-c15ce17adb5c/actions \
  -H "Authorization: Bearer eyJhbGciOiJIUzUxMiJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "69131367709e683f053184f9",
    "tool": "circle",
    "color": "#3B82F6",
    "actionType": "draw",
    "coordinates": {
      "start": {"x": 100, "y": 100},
      "end": {"x": 200, "y": 200}
    },
    "properties": {
      "lineWidth": 3
    }
  }' \
  -v
```

**Expected Response**:
```json
{
  "actionId": "generated-action-id-here",
  "message": "Drawing action saved successfully"
}
```

**Status Code**: `200 OK` or `201 Created` (NOT 400 or 401!)

---

## 📊 **Current vs Expected Behavior**

| Operation | Current Backend | Expected Backend | Frontend Status |
|-----------|----------------|------------------|-----------------|
| POST /actions | ❌ Returns 401 | ✅ Returns 200 + actionId | ✅ Complete |
| DELETE /actions/{id} | ❌ Returns 401 | ✅ Returns 200 | ✅ Complete |
| DELETE /actions | ❌ Returns 401 | ✅ Returns 200 | ✅ Complete |
| JWT Filter | ❌ Not executing | ✅ Executes for all requests | N/A |
| WebSocket ERASE | ❌ Not implemented | ✅ Broadcasts to users | ✅ Handler ready |
| WebSocket CLEAR | ❌ Not implemented | ✅ Broadcasts to users | ✅ Handler ready |
| Model validation | ❌ Rejects isEraser | ✅ Accepts or ignores | ✅ Removed from frontend |

---

## 🎯 **Implementation Time Estimates**

| Task | Estimated Time |
|------|----------------|
| Fix JWT filter (add logging, test) | 30 minutes |
| Remove `isEraser` from model | 5 minutes |
| Add DELETE endpoints (controller + service) | 20 minutes |
| Add WebSocket broadcasting | 15 minutes |
| Testing all endpoints | 20 minutes |
| **Total** | **~1.5 hours** |

---

## ✅ **Success Criteria**

Once all backend changes are complete, you should see:

1. **In Backend Console**:
   ```
   🔍 JWT FILTER EXECUTING! URI: /api/whiteboard/sessions/xxx/actions Method: POST
   ✅ JWT token FOUND in Authorization header
   ✅ Token validated! Username: testuser
   🎉 AUTHENTICATION SET IN SECURITY CONTEXT!
   📡 Broadcasted ERASE event for action: xxx
   ```

2. **In Frontend Console**:
   ```
   ✅ Drawing action saved with actionId: xxx
   ✅ Action erased: xxx
   ✅ Canvas cleared successfully
   ```

3. **NO Errors**:
   - ❌ No `401 Unauthorized` errors
   - ❌ No `400 Bad Request` errors
   - ❌ No `⚠️ Got 401` warnings

4. **Real-time Functionality**:
   - Drawing on one browser appears on another browser
   - Erasing on one browser removes drawing on another browser
   - Clearing canvas on one browser clears on all browsers

---

## 🚀 **After Implementation**

Once the backend is complete:

1. The frontend will work **perfectly** without any errors
2. All drawings will be saved with `actionId`
3. Click-to-delete eraser will work
4. Clear canvas will work
5. Real-time collaboration will be fully functional
6. No more 401 or 400 errors in console

The frontend code is **already 100% complete** and ready to work with the backend once these changes are made! 🎉

---

## 📞 **Need Help?**

If you encounter issues:

1. **Check JWT filter logs** - If you don't see filter execution logs, the filter is being skipped
2. **Check CORS** - Ensure DELETE method is allowed in CORS configuration
3. **Check Spring Security config** - Ensure `/api/whiteboard/**` requires authentication
4. **Test with Postman** - Verify endpoints work with JWT token outside of frontend
5. **Check MongoDB** - Verify actions are actually being deleted

---

**Good luck with the implementation! The frontend team is ready and waiting! 🚀**
