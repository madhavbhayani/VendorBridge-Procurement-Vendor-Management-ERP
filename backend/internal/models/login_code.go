package models

import "time"

type LoginCode struct {
    ID        int64      `db:"id"`
    Code      string     `db:"code"`
    UserID    int64      `db:"user_id"`
    ExpiresAt time.Time  `db:"expires_at"`
    UsedAt    *time.Time `db:"used_at"`
    CreatedAt time.Time  `db:"created_at"`
}