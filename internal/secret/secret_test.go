package secret

import (
	"crypto/rand"
	"os"
	"path/filepath"
	"testing"
)

func newTestCipher(t *testing.T) *Cipher {
	t.Helper()
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		t.Fatalf("rand: %v", err)
	}
	c, err := NewCipher(key)
	if err != nil {
		t.Fatalf("NewCipher: %v", err)
	}
	return c
}

func TestEncryptRoundTrip(t *testing.T) {
	c := newTestCipher(t)
	for _, plain := range []string{"ghp_secret", "a", "with spaces and =/+ chars", "🔐"} {
		enc, err := c.Encrypt(plain)
		if err != nil {
			t.Fatalf("Encrypt(%q): %v", plain, err)
		}
		if !IsEncrypted(enc) {
			t.Errorf("Encrypt(%q) = %q, expected encrypted prefix", plain, enc)
		}
		if enc == plain {
			t.Errorf("Encrypt(%q) returned plaintext", plain)
		}
		got, err := c.Decrypt(enc)
		if err != nil {
			t.Fatalf("Decrypt: %v", err)
		}
		if got != plain {
			t.Errorf("round trip = %q, want %q", got, plain)
		}
	}
}

func TestEncryptEmptyStaysEmpty(t *testing.T) {
	c := newTestCipher(t)
	enc, err := c.Encrypt("")
	if err != nil || enc != "" {
		t.Errorf("Encrypt(\"\") = %q, %v; want empty", enc, err)
	}
	if IsEncrypted("") {
		t.Error("empty string reported as encrypted")
	}
}

func TestDecryptLegacyPlaintext(t *testing.T) {
	c := newTestCipher(t)
	// Values stored before encryption have no prefix and must pass through.
	got, err := c.Decrypt("ghp_legacy_plaintext")
	if err != nil || got != "ghp_legacy_plaintext" {
		t.Errorf("Decrypt(legacy) = %q, %v", got, err)
	}
}

func TestDecryptTamperedFails(t *testing.T) {
	c := newTestCipher(t)
	enc, _ := c.Encrypt("secret")
	// Flip a byte in the base64 body; GCM authentication must reject it.
	tampered := enc[:len(enc)-2] + "AA"
	if _, err := c.Decrypt(tampered); err == nil {
		t.Error("Decrypt accepted tampered ciphertext")
	}
}

func TestWrongKeyFails(t *testing.T) {
	enc, _ := newTestCipher(t).Encrypt("secret")
	if _, err := newTestCipher(t).Decrypt(enc); err == nil {
		t.Error("Decrypt with a different key succeeded")
	}
}

func TestLoadOrCreateKey(t *testing.T) {
	t.Setenv(KeyEnvVar, "") // ensure the env override is off
	dir := t.TempDir()
	path := filepath.Join(dir, "miso.key")

	key1, err := LoadOrCreateKey(path)
	if err != nil {
		t.Fatalf("first load: %v", err)
	}
	if len(key1) != 32 {
		t.Fatalf("key length = %d, want 32", len(key1))
	}

	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("key file not created: %v", err)
	}
	if perm := info.Mode().Perm(); perm != 0o600 {
		t.Errorf("key file perm = %o, want 600", perm)
	}

	// A second load must return the same persisted key.
	key2, err := LoadOrCreateKey(path)
	if err != nil {
		t.Fatalf("second load: %v", err)
	}
	if string(key1) != string(key2) {
		t.Error("key not stable across loads")
	}
}

func TestLoadKeyFromEnv(t *testing.T) {
	t.Setenv(KeyEnvVar, "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff")
	key, err := LoadOrCreateKey(filepath.Join(t.TempDir(), "unused.key"))
	if err != nil {
		t.Fatalf("LoadOrCreateKey: %v", err)
	}
	if len(key) != 32 {
		t.Errorf("key length = %d, want 32", len(key))
	}
}

func TestLoadKeyInvalidEnv(t *testing.T) {
	t.Setenv(KeyEnvVar, "tooshort")
	if _, err := LoadOrCreateKey(filepath.Join(t.TempDir(), "unused.key")); err == nil {
		t.Error("expected error for short env key")
	}
}
