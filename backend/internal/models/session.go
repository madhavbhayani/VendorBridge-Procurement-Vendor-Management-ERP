package models

import "time"

type UserSession struct {
    ID           int64      `db:"id"`
    UserID       int64      `db:"user_id"`
    RefreshToken string     `db:"refresh_token"`
    IPAddress    *string    `db:"ip_address"`
    UserAgent    *string    `db:"user_agent"`
    ExpiresAt    time.Time  `db:"expires_at"`
    RevokedAt    *time.Time `db:"revoked_at"`
    CreatedAt    time.Time  `db:"created_at"`
}