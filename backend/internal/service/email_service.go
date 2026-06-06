package service

import (
    "crypto/tls"
    "errors"
    "fmt"
    "net/smtp"
)

// EmailService provides simple email sending functionality.
type EmailService struct {
    smtpHost string
    smtpPort int
    username string
    password string
    fromAddr string
    // TLS config to allow self-signed certs if needed.
    tlsConfig *tls.Config
}

// NewEmailService creates a new EmailService. Configuration is read from environment variables.
func NewEmailService(host string, port int, username, password, from string) *EmailService {
    return &EmailService{
        smtpHost: host,
        smtpPort: port,
        username: username,
        password: password,
        fromAddr: from,
        tlsConfig: &tls.Config{InsecureSkipVerify: true},
    }
}

// Send sends an email with the given subject and body to the recipients.
func (es *EmailService) Send(to []string, subject, body string) error {
    if es.smtpHost == "" || es.smtpPort == 0 || es.username == "" || es.password == "" || es.fromAddr == "" {
        return errors.New("email service is not configured")
    }
    if len(to) == 0 {
        return errors.New("no email recipients provided")
    }
    auth := smtp.PlainAuth("", es.username, es.password, es.smtpHost)
    msg := []byte(fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\n\r\n%s", es.fromAddr, to[0], subject, body))
    addr := fmt.Sprintf("%s:%d", es.smtpHost, es.smtpPort)
    // Use TLS connection.
    conn, err := tls.Dial("tcp", addr, es.tlsConfig)
    if err != nil {
        return err
    }
    client, err := smtp.NewClient(conn, es.smtpHost)
    if err != nil {
        return err
    }
    defer client.Close()
    if err = client.Auth(auth); err != nil {
        return err
    }
    if err = client.Mail(es.fromAddr); err != nil {
        return err
    }
    for _, rcpt := range to {
        if err = client.Rcpt(rcpt); err != nil {
            return err
        }
    }
    wc, err := client.Data()
    if err != nil {
        return err
    }
    _, err = wc.Write(msg)
    if err != nil {
        return err
    }
    err = wc.Close()
    if err != nil {
        return err
    }
    return client.Quit()
}
