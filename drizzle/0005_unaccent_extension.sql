-- Enable the unaccent extension for tone-insensitive pinyin search.
-- unaccent strips diacritical marks (e.g., ō → o, ǐ → i) from text,
-- allowing searches like "zhong" to match stored values like "zhōng".
CREATE EXTENSION IF NOT EXISTS unaccent;
