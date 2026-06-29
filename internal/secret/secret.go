// Package secret encrypts the sensitive values Miso must store but also read
// back in cleartext — repository auth tokens (to clone) and webhook secrets (to
// verify HMAC signatures). They are reversible secrets, so this uses
// authenticated symmetric encryption (AES-GCM), not hashing.
package secret

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
)

// KeyEnvVar names the environment variable that, when set, supplies the master
// key as 64 hex characters (32 bytes) instead of the on-disk key file.
const KeyEnvVar = "MISO_SECRET_KEY"

// prefix tags encrypted values so they can be told apart from legacy plaintext
// during migration. The "1" is a format version for future changes.
const prefix = "enc:1:"

// Cipher encrypts and decrypts short secret strings with AES-GCM.
type Cipher struct {
	aead cipher.AEAD
}

// NewCipher builds a Cipher from a 16, 24 or 32-byte key (AES-128/192/256).
func NewCipher(key []byte) (*Cipher, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	return &Cipher{aead: aead}, nil
}

// Encrypt returns a prefixed base64 token of nonce||ciphertext. An empty input
// is returned unchanged so an unset secret stays distinguishable in storage
// (and so SQL "value != ”" presence checks keep working).
func (c *Cipher) Encrypt(plaintext string) (string, error) {
	if plaintext == "" {
		return "", nil
	}
	nonce := make([]byte, c.aead.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	sealed := c.aead.Seal(nonce, nonce, []byte(plaintext), nil)
	return prefix + base64.StdEncoding.EncodeToString(sealed), nil
}

// Decrypt reverses Encrypt. A value without the prefix is treated as legacy
// plaintext and returned as-is, so a database written before encryption keeps
// working until it is migrated.
func (c *Cipher) Decrypt(stored string) (string, error) {
	if !strings.HasPrefix(stored, prefix) {
		return stored, nil
	}
	raw, err := base64.StdEncoding.DecodeString(stored[len(prefix):])
	if err != nil {
		return "", err
	}
	ns := c.aead.NonceSize()
	if len(raw) < ns {
		return "", errors.New("ciphertext too short")
	}
	nonce, ciphertext := raw[:ns], raw[ns:]
	plaintext, err := c.aead.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}

// IsEncrypted reports whether a stored value is already in encrypted form.
func IsEncrypted(stored string) bool {
	return strings.HasPrefix(stored, prefix)
}

// LoadOrCreateKey resolves the 32-byte master key. It prefers KeyEnvVar; failing
// that it reads keyPath, creating it with a fresh random key (mode 0600) when it
// does not yet exist.
func LoadOrCreateKey(keyPath string) ([]byte, error) {
	if env := strings.TrimSpace(os.Getenv(KeyEnvVar)); env != "" {
		key, err := hex.DecodeString(env)
		if err != nil {
			return nil, fmt.Errorf("%s must be hex-encoded: %w", KeyEnvVar, err)
		}
		if len(key) != 32 {
			return nil, fmt.Errorf("%s must decode to 32 bytes, got %d", KeyEnvVar, len(key))
		}
		return key, nil
	}

	data, err := os.ReadFile(keyPath)
	if err == nil {
		key, derr := hex.DecodeString(strings.TrimSpace(string(data)))
		if derr != nil || len(key) != 32 {
			return nil, fmt.Errorf("key file %s is malformed; delete it to regenerate", keyPath)
		}
		return key, nil
	}
	if !errors.Is(err, os.ErrNotExist) {
		return nil, err
	}

	key := make([]byte, 32)
	if _, err := io.ReadFull(rand.Reader, key); err != nil {
		return nil, err
	}
	if err := os.WriteFile(keyPath, []byte(hex.EncodeToString(key)), 0o600); err != nil {
		return nil, fmt.Errorf("write key file %s: %w", keyPath, err)
	}
	return key, nil
}
