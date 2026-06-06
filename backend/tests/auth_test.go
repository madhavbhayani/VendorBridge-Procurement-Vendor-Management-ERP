package tests

import (
    "encoding/json"
    "net/http"
    "testing"
)

func TestLoginEndpoint(t *testing.T) {
    // Use a known test user (create manually in your DB before test)
    payload := map[string]string{
        "email":    "officer@vendorbridge.com",
        "password": "test123", // replace with actual password
    }
    w, _ := JSONRequest("POST", "/api/auth/login", payload)

    if w.Code != http.StatusOK {
        t.Fatalf("Expected status 200, got %d", w.Code)
    }
    var resp map[string]string
    if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
        t.Fatal("Failed to parse response")
    }
    if resp["code"] == "" {
        t.Fatal("Login code not returned")
    }
    t.Logf("✅ Login successful, code: %s", resp["code"])

    // Now test assign-token
    assignPayload := map[string]string{"code": resp["code"]}
    w2, _ := JSONRequest("POST", "/api/auth/assign-token", assignPayload)
    if w2.Code != http.StatusOK {
        t.Fatalf("Assign token failed with status %d", w2.Code)
    }
    var tokenResp map[string]string
    json.Unmarshal(w2.Body.Bytes(), &tokenResp)
    if tokenResp["access_token"] == "" || tokenResp["refresh_token"] == "" {
        t.Fatal("Missing tokens")
    }
    t.Logf("✅ Access token: %s...", tokenResp["access_token"][:20])
    t.Logf("✅ Refresh token: %s...", tokenResp["refresh_token"][:20])

    // Test refresh token
    refreshPayload := map[string]string{"refresh_token": tokenResp["refresh_token"]}
    w3, _ := JSONRequest("POST", "/api/auth/refresh-token", refreshPayload)
    if w3.Code != http.StatusOK {
        t.Fatalf("Refresh failed with status %d", w3.Code)
    }
    var newAccess map[string]string
    json.Unmarshal(w3.Body.Bytes(), &newAccess)
    if newAccess["access_token"] == "" {
        t.Fatal("No new access token")
    }
    t.Logf("✅ Refresh successful, new access token: %s...", newAccess["access_token"][:20])
}

func TestInvalidLogin(t *testing.T) {
    payload := map[string]string{
        "email":    "wrong@example.com",
        "password": "whatever",
    }
    w, _ := JSONRequest("POST", "/api/auth/login", payload)
    if w.Code != http.StatusUnauthorized {
        t.Fatalf("Expected 401, got %d", w.Code)
    }
    t.Log("✅ Invalid login correctly rejected")
}