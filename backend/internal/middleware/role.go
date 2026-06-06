package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// RequireRole checks if the logged-in user has one of the allowed roles.
// It reads the user's role directly from the context, which was set by AuthMiddleware 
// decoding the JWT claims, completely avoiding an extra database hit!
func RequireRole(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}

		userRole, ok := role.(string)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid role format"})
			return
		}

		allowed := false
		for _, r := range allowedRoles {
			if userRole == r {
				allowed = true
				break
			}
		}

		if !allowed {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
			return
		}

		c.Next()
	}
}
